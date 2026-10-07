"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"
import type { VirtualFileSystem } from "@/lib/vfs"
import { MANIFEST_URL, VM_BASE_URL, buildV86Options, parseManifest, type VmManifest } from "./manifest"
import { EXIT_OSC, isEscape, winsizeMessage, formatMegabytes } from "./protocol"
import { portfolioFiles } from "./portfolio"
import { injectPortfolio, type Fs9p } from "./inject"
import { loadScript } from "./load-script"

/** The parts of the v86 emulator API this overlay uses (libv86.js is loaded at runtime, not bundled). */
interface V86Emulator {
  add_listener(event: "serial0-output-byte", listener: (byte: number) => void): void
  add_listener(event: "download-progress", listener: (progress: DownloadProgress) => void): void
  add_listener(event: "emulator-started", listener: () => void): void
  serial0_send(data: string): void
  serial_send_bytes(port: number, data: Uint8Array): void
  destroy(): Promise<void>
  fs9p?: Fs9p
}
type V86Constructor = new (options: ReturnType<typeof buildV86Options>) => V86Emulator

interface DownloadProgress {
  file_index: number
  loaded: number
}

type Phase =
  | { kind: "manifest" }
  | { kind: "missing" }
  | { kind: "confirm"; manifest: VmManifest }
  | { kind: "loading"; manifest: VmManifest }
  | { kind: "running" }
  | { kind: "error"; message: string }

interface DebianVmProps {
  onExit: () => void
  vfs: VirtualFileSystem
}

// Touch keyboards lack these; each button sends the raw sequence to the guest.
const TOUCH_KEYS: [label: string, seq: string][] = [
  ["Esc", "\x1b"],
  ["Tab", "\t"],
  ["^C", "\x03"],
  ["^D", "\x04"],
  ["↑", "\x1b[A"],
  ["↓", "\x1b[B"],
  ["←", "\x1b[D"],
  ["→", "\x1b[C"],
]

const isCoarsePointer = () => typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches

function needsConfirm(): boolean {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  return isCoarsePointer() || saveData === true
}

function xtermTheme(el: HTMLElement) {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    fontFamily: getComputedStyle(el).fontFamily || "monospace",
    theme: {
      background: v("--background", "#000000"),
      foreground: v("--foreground", "#e5e5e5"),
      cursor: v("--primary", "#e5e5e5"),
      selectionBackground: v("--secondary", "#444444"),
    },
  }
}

export function DebianVm({ onExit, vfs }: DebianVmProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "manifest" })
  // Set once when booting starts and never cleared, so phase changes (e.g.
  // loading -> running) don't tear the boot effect down.
  const [bootManifest, setBootManifest] = useState<VmManifest | null>(null)
  const [downloaded, setDownloaded] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const session = useRef<{ emulator?: V86Emulator; term?: XTerm; teardown: (() => void)[] }>({ teardown: [] })
  const exited = useRef(false)
  // Read through refs: the terminal passes an inline onExit, and a new
  // callback identity must not reboot the VM.
  const onExitRef = useRef(onExit)
  const vfsRef = useRef(vfs)
  useEffect(() => {
    onExitRef.current = onExit
    vfsRef.current = vfs
  })
  const [touch] = useState(isCoarsePointer)

  const stop = useCallback(() => {
    const s = session.current
    s.teardown.splice(0).forEach((f) => f())
    s.emulator?.destroy().catch(() => {})
    s.term?.dispose()
    session.current = { teardown: [] }
  }, [])

  const exit = useCallback(() => {
    if (exited.current) return
    exited.current = true
    stop()
    onExitRef.current()
  }, [stop])

  useEffect(() => stop, [stop])

  const startBoot = useCallback((manifest: VmManifest) => {
    setPhase({ kind: "loading", manifest })
    setBootManifest(manifest)
  }, [])

  // 1. Manifest: is the image installed, and how big is it?
  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL, { cache: "no-cache" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const manifest = parseManifest(await res.json())
        if (cancelled) return
        if (needsConfirm()) setPhase({ kind: "confirm", manifest })
        else startBoot(manifest)
      })
      .catch(() => {
        if (!cancelled) setPhase({ kind: "missing" })
      })
    return () => {
      cancelled = true
    }
  }, [startBoot])

  // 2. Boot: load the emulator, attach xterm to the guest's serial console.
  useEffect(() => {
    const manifest = bootManifest
    if (!manifest) return
    let cancelled = false

    const boot = async () => {
      await loadScript(VM_BASE_URL + manifest.libv86)
      const V86 = (window as unknown as { V86?: V86Constructor }).V86
      const host = hostRef.current
      if (cancelled || !V86 || !host) throw new Error("emulator unavailable")

      const term = new XTerm({ ...xtermTheme(host), fontSize: 14, cursorBlink: true, scrollback: 5000 })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(host)
      fit.fit()
      term.parser.registerOscHandler(EXIT_OSC, () => {
        exit()
        return true
      })

      const emulator = new V86(buildV86Options(manifest))
      session.current.emulator = emulator
      session.current.term = term

      const sendSize = () => {
        const msg = winsizeMessage(term.rows, term.cols)
        if (msg) emulator.serial_send_bytes(1, new TextEncoder().encode(msg))
      }

      // Serial output arrives a byte at a time; hand xterm whole frames so it
      // decodes UTF-8 and renders efficiently.
      let pending: number[] = []
      let frame = 0
      const flush = () => {
        frame = 0
        term.write(new Uint8Array(pending))
        pending = []
      }
      emulator.add_listener("serial0-output-byte", (byte) => {
        pending.push(byte)
        if (!frame) frame = requestAnimationFrame(flush)
      })

      const progress = new Map<number, number>()
      emulator.add_listener("download-progress", (e) => {
        progress.set(e.file_index, e.loaded)
        setDownloaded([...progress.values()].reduce((a, b) => a + b, 0))
      })

      emulator.add_listener("emulator-started", () => {
        if (cancelled) return
        setPhase({ kind: "running" })
        const fs9p = emulator.fs9p
        const seeded = fs9p ? injectPortfolio(fs9p, portfolioFiles(vfsRef.current)).catch(() => 0) : Promise.resolve(0)
        seeded.then(() => {
          if (cancelled) return
          sendSize()
          // Leading space keeps it out of bash history; clear wipes the echo.
          emulator.serial0_send(" clear; cat /etc/motd\n")
          term.focus()
        })
      })

      const onData = term.onData((data) => (isEscape(data) ? exit() : emulator.serial0_send(data)))
      const onResize = term.onResize(sendSize)
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => fit.fit()) : null
      observer?.observe(host)

      session.current.teardown.push(
        () => onData.dispose(),
        () => onResize.dispose(),
        () => observer?.disconnect(),
        () => frame && cancelAnimationFrame(frame)
      )
    }

    boot().catch(() => {
      if (!cancelled) setPhase({ kind: "error", message: "Couldn't start the Debian VM." })
    })
    return () => {
      cancelled = true
    }
  }, [bootManifest, exit])

  // Keys outside the running VM: Esc leaves; y/n answers the size prompt.
  useEffect(() => {
    if (phase.kind === "running") return
    const onKey = (e: KeyboardEvent) => {
      if (phase.kind === "confirm") {
        if (e.key === "y" || e.key === "Y" || e.key === "Enter") startBoot(phase.manifest)
        else if (e.key === "n" || e.key === "N" || e.key === "Escape") exit()
        return
      }
      if (e.key === "Escape") exit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, exit, startBoot])

  const sendKey = (seq: string) => {
    session.current.emulator?.serial0_send(seq)
    session.current.term?.focus()
  }

  const total = phase.kind === "loading" ? phase.manifest.downloadBytes : 0

  return (
    <div className="flex h-full w-full flex-col bg-background font-mono text-foreground">
      <div className="flex items-center justify-between border-b border-border px-3 py-1 text-xs text-muted-foreground">
        <span>
          <span className="text-primary">debian</span> · real Debian 12, running in your browser · Ctrl+] to exit
        </span>
        <button type="button" aria-label="Exit Debian" onClick={exit} className="p-1 hover:text-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0 p-1" data-testid="debian-vm-terminal" />

        {phase.kind !== "running" && (
          <div className="absolute inset-0 flex flex-col items-start justify-center gap-2 bg-background p-6 text-sm">
            {phase.kind === "manifest" && <p>Checking for the Debian image…</p>}
            {phase.kind === "missing" && (
              <>
                <p className="text-destructive">The Debian image isn&apos;t installed on this server.</p>
                <p className="text-muted-foreground">Press Esc to return.</p>
              </>
            )}
            {phase.kind === "error" && (
              <>
                <p className="text-destructive">{phase.message}</p>
                <p className="text-muted-foreground">Press Esc to return.</p>
              </>
            )}
            {phase.kind === "confirm" && (
              <>
                <p>
                  This boots a real Debian machine in your browser and downloads about{" "}
                  {formatMegabytes(phase.manifest.downloadBytes)}.
                </p>
                <p>
                  Continue? <span className="text-primary">[y/N]</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" className="border border-border px-3 py-1" onClick={() => startBoot(phase.manifest)}>
                    yes
                  </button>
                  <button type="button" className="border border-border px-3 py-1" onClick={exit}>
                    no
                  </button>
                </div>
              </>
            )}
            {phase.kind === "loading" && (
              <>
                <p>
                  Fetching Debian… {formatMegabytes(downloaded)} / {formatMegabytes(total)}
                </p>
                <div className="h-2 w-64 max-w-full border border-border" aria-hidden>
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, total ? (downloaded / total) * 100 : 0)}%` }} />
                </div>
                <p className="text-muted-foreground">Press Esc to cancel.</p>
              </>
            )}
          </div>
        )}
      </div>

      {touch && phase.kind === "running" && (
        <div className="flex gap-1 overflow-x-auto border-t border-border p-1">
          {TOUCH_KEYS.map(([label, seq]) => (
            <button
              key={label}
              type="button"
              className="min-w-10 border border-border px-2 py-1 text-xs"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => sendKey(seq)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
