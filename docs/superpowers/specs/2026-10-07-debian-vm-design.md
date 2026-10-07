# Debian VM — Design

**Date:** 2026-10-07
**Status:** Approved 2026-10-07: command `debian`, image hosted via bind-mounted volume (option 1)
**Origin:** Feature request via the site's form, from a student in a CS class.
They asked for "a Debian command line". The goal is a real one, not more
reimplemented commands, and it has to be safe to expose publicly.

## Decision

Run a **real Debian 12 (i386) machine inside the visitor's browser** using
[v86](https://github.com/copy/v86) (BSD-2), an x86 emulator that JITs to
WebAssembly. A real Linux kernel boots real Debian userland. Nothing in the
VM is reimplemented.

### Why this is safe

| Threat | Why it doesn't apply |
|---|---|
| Code execution on the homelab | The server only serves **static files**. There is no shell process, container, websocket or API. |
| Abuse as a proxy, scanner, or miner on our bandwidth | The VM has **no network device**. It can't reach anything. |
| Visitors affecting each other | Each VM lives in one tab's memory. There is no shared state, and a reload resets it. |
| Visitor harming their own machine | It runs inside the browser sandbox, inside a WASM sandbox. The worst case is a hung tab. |
| Header or site-wide changes | v86 doesn't need cross-origin isolation (COOP/COEP), and nothing else on the site changes. |

Because the box is disposable, the visitor gets **passwordless sudo**.
`sudo rm -rf --no-preserve-root /` is a feature: the kid gets to see what it
does, and a reload fixes it.

### Rejected alternatives

- **Server-side shell** (Docker, gVisor or Firecracker over a websocket):
  strangers' code would run on the homelab, with container-escape exposure,
  outbound abuse, and per-session quotas and cleanup to maintain forever.
  This option is not on the table.
- **WebVM / CheerpX:** faster, but the license forbids self-hosting the
  CheerpX build (you must load from their CDN, and organizational use needs
  a license). It also needs COOP/COEP cross-origin isolation, which affects
  the whole site.
- **container2wasm:** slower than v86 and no snapshot story as mature.

## Spike results (2026-10-07)

Built with `tools/debian-vm/` (in the repo; see "Build pipeline"). The probe
was headless Chromium (Playwright docker image) against a local static
server, so the timings exclude network latency.

| Metric | Result |
|---|---|
| Cold boot (systemd → auto-login), headless Node | 31 s (build time only; browsers never do this) |
| Saved snapshot | 83 MB raw → **18.7 MB zstd** |
| Resume → shell prompt in browser | **~0.7 s** |
| **Initial download** (state + wasm + bios + fs index) | **23.0 MB** in 9 requests |
| `uname; ps -p 1` | `Linux 6.1.0-53-686 i686`, Debian 12.15, PID 1 = `systemd` |
| `python3 -c 'print(2**100)'` | 0.1 s, +3 MB fetched lazily (Python 3.11.2) |
| `gcc h.c -o h && ./h` | ~2 s first run, +16 MB fetched lazily (cc1 is big) |
| `sudo whoami` → `root` | 0.4 s |
| `neofetch` | works; 18 MiB / 221 MiB RAM used |
| Total stored image (served, not downloaded) | 285 MB across ~17k zstd files + 1.3 MB index |

**How lazy loading works:** the root filesystem is served over v86's 9p
virtio filesystem. Each file is a separate content-addressed `.zst`, fetched
only when the guest first opens it. Installing more packages costs disk space
on the server, not download size for visitors who never use them.

### Known rough edges found in the spike

1. **Terminal size.** The guest assumes 80 columns, so long commands wrap
   wrong in a wider xterm. Fix: a tiny guest-side helper listens on the
   second serial port (uart1) for `rows cols` and runs `stty` on the console.
   The host sends the size on attach and on every resize.
2. **Docker export leftovers.** `/.dockerenv` made systemd think it was in a
   container, so it ran `console-getty` with a login prompt. `fix-rootfs.py`
   strips it and the hostname/hosts bind-mount placeholders. Both gettys are
   configured to auto-login. Already fixed.
3. **v86 adds a NIC by default.** Without config it attaches an NE2000
   (`enp0s5` in the guest), wired to nothing. `net_device: { type: "none" }`
   removes the card entirely and is set in both the snapshot builder and the
   page (they must match, since the snapshot records device layout). Verified:
   `/sys/class/net` shows only `lo`, and the page made no non-local requests.
4. **No i386 kernel in trixie.** Debian dropped i386 as a full architecture in
   13, so the image stays on **bookworm** (LTS through mid-2028). Revisit
   then. v86 has no x86-64 support, so there is no path to amd64.

## User experience

- **Command:** `debian` (no aliases). It opens a full-screen overlay,
  lazy-loaded via `next/dynamic` like the canvas games, hosting an xterm.js
  terminal attached to the VM's serial console.
- **Before downloading:** show `Fetching Debian (≈23 MB)…` with a progress
  bar (v86 emits `download-progress`). On touch devices, or when
  `navigator.connection.saveData` is set, first ask
  `This downloads ~23 MB. Continue? [y/N]`.
- **Welcome (motd):** explains that it's real Debian in the tab, there's no
  network, sudo is yours, a reload resets it, and lists things to try.
  Optional line crediting the student who requested it (needs the parent's
  OK on wording).
- **Leaving:** typing `exit` / `logout` in the guest (detected via a
  sentinel the guest's `.bash_logout` prints) or pressing **Ctrl+]** (the
  telnet escape, shown in the overlay chrome) returns to the portfolio
  terminal. The VM is destroyed on exit, so memory is freed. Re-entering
  resumes from the HTTP-cached snapshot.
- **Portfolio files in the VM:** the portfolio's `/home/zachary` tree is
  injected **at runtime** through v86's 9p filesystem API, right after the
  snapshot resumes (contents exactly as the portfolio `cat` prints them). It
  is always current with `data/*.json`, and the image never needs a rebuild
  for content changes.
- **Mobile:** xterm.js plus the existing `MobileKeyBar` row for Ctrl, Tab,
  arrows and Esc. Throughput is fine, but expect gcc to be slow on phones.

## Architecture

```
tools/debian-vm/            image build (offline, by hand; outputs not in git) — see README.md
  Dockerfile                slim bookworm i386, serial-only, visitor+sudo, 9p boot, guest helpers
  woot-winsize(.service)    guest: applies "ROWS COLS" from ttyS1 to the console tty
  build.sh                  docker build → export → fix-rootfs.py → fs2json + flat → snapshot → public/vm
  build-state.mjs           boot headless in Node, wait for shell, snapshot → .zst
  probe.mjs                 end-to-end browser check of the real site (Playwright image)
  package.json              pins v86 (the app itself does not depend on v86)

public/vm/                  build output (volume): manifest.json + content-hashed assets + flat/

lib/commands/commands/debian.ts   `debian` → context.game.start('debian')
components/debian-vm/
  DebianVm.tsx              overlay: manifest → (confirm) → load → run; xterm ↔ serial
  manifest.ts               zod-validated manifest, v86 options (no NIC, uart1)
  protocol.ts               winsize message, exit OSC 7337, Ctrl+] escape
  portfolio.ts, inject.ts   VFS → guest /home/zachary via 9p
  load-script.ts            loads the hashed libv86.js (window.V86)
```

- **Version coupling:** a snapshot only restores on the v86 build that made
  it, so `libv86.js`, `v86.wasm`, the BIOS and the snapshot are served
  together from `public/vm/` with content-hashed names listed in
  `manifest.json`. The app bundles only xterm.js. A v86 bump is a pure image
  rebuild, and mismatches are impossible by construction.
- **Manifest validation:** asset names must be bare file names, so nothing in
  the manifest can point outside `/vm/`.
- **v86 options:** `memory_size` 256 MB, uart1 on, `screen_dummy`,
  keyboard and mouse disabled (serial only), snapshot as `initial_state`, 9p
  `basefs`/`baseurl`. **`net_device: { type: "none" }` and no
  `network_relay_url`**: the guest has no network card, not merely an
  unplugged one. Unit tests pin both.
- **Host ↔ guest:** keystrokes go to `serial0`. Terminal size goes to
  `serial1` (on attach and on every xterm resize). Guest logout prints
  `ESC ] 7337 ; exit BEL`, which xterm's OSC handler turns into "leave".
  Ctrl+] always leaves. On resume the host sends ` clear; cat /etc/motd`
  so the session opens on the welcome text at the right size.
- **Wiring:** `GameType` gains `'debian'` (not a game, but it launches through
  the same host hook as the canvas games, so no `ExecuteContext` change).
  `terminal.tsx` renders `<DebianVm vfs onExit>` in the overlay chain.

## Hosting the image (decided: option 1)

The image is ~305 MB on disk (285 MB flat files + 19 MB state + index). It
**should not be in git**, and should not be baked into the app's Docker image
either (that would grow it by roughly 7×). Options:

1. **(Recommended) Bind-mount a volume** into the app container at
   `/app/public/vm/` and serve it as Next static files. Simple, but cache
   headers need setting (`immutable`: the flat files are content-addressed).
   Rebuild the image by running `tools/debian-vm/build.sh` on the homelab and
   swapping the directory.
2. Serve it from the reverse proxy (Caddy/nginx) at `/vm/` directly, so it
   bypasses Node entirely. This is the most efficient for 17k small files.
3. Object storage / CDN (e.g. Cloudflare R2) with CORS. This offloads
   bandwidth from the homelab, but it's a new external dependency.

Bandwidth math: ~23 MB per first visit to `debian` (HTTP-cached afterwards).
1,000 curious visitors comes to about 24 GB.

## Size work (before shipping)

- Prune kernel modules not needed after the snapshot (the 9p/virtio modules
  are already loaded in the state). Expected to save roughly 100 MB of stored
  size and no download size.
- Try 128 MB guest RAM and measure the snapshot size. Not to be taken below
  what `gcc` needs (test compile + `python3` import of stdlib).
- Pre-touch the files the motd suggestions need (bash completion, `ls`
  colors) before snapshotting, so the first commands don't each pay a
  fetch round-trip.

## Testing

- **Unit (Vitest):** `protocol.ts` (sentinel detection across chunk
  boundaries, resize encoding), `vm-config.ts` (no network option, asset
  paths), the `debian` command (launches via context, aliases, man page).
- **Characterization:** `debian` appears in `help` and completion. The
  overlay mounts and unmounts via `gameState` (v86 mocked; tests must not
  fetch).
- **Browser smoke (manual, before deploy):** `tools/debian-vm/probe.mjs` in
  the Playwright docker image: resume under 2 s locally, python/gcc/sudo
  work, `exit` returns to the portfolio prompt, and no network interface
  besides `lo` (`ls /sys/class/net`).

## Out of scope / deferred

- Persisting the VM across reloads (IndexedDB `save_state`). Possible later.
  "Reload resets it" is a feature for now.
- Networking of any kind, including `apt install`. Packages are chosen at
  image build time.
- A graphical desktop. Serial console only.
