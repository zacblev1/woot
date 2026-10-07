import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { VirtualFileSystem } from '@/lib/vfs'

// --- xterm + v86 fakes (tests never load real emulator code or assets) ---
const term = vi.hoisted(() => ({
  current: null as null | {
    onDataHandler?: (d: string) => void
    oscHandlers: Map<number, () => boolean>
    written: string[]
    disposed: boolean
  },
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 100
    rows = 30
    onDataHandler?: (d: string) => void
    oscHandlers = new Map<number, () => boolean>()
    written: string[] = []
    disposed = false
    parser = { registerOscHandler: (n: number, h: () => boolean) => this.oscHandlers.set(n, h) }
    constructor() {
      term.current = this
    }
    loadAddon() {}
    open() {}
    focus() {}
    write(s: string) {
      this.written.push(s)
    }
    onData(h: (d: string) => void) {
      this.onDataHandler = h
      return { dispose() {} }
    }
    onResize() {
      return { dispose() {} }
    }
    dispose() {
      this.disposed = true
    }
  },
}))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }))

const loadScript = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../load-script', () => ({ loadScript }))

class FakeV86 {
  static last: FakeV86 | null = null
  listeners = new Map<string, ((arg?: unknown) => void)[]>()
  serial0: string[] = []
  serial1: string[] = []
  destroyed = false
  fs9p = {
    // Every parent "exists" (id 1), so each file reaches CreateBinaryFile.
    SearchPath: vi.fn((path: string) => ({ id: -1, parentid: 1, name: path.split('/').pop()! })),
    CreateDirectory: vi.fn(() => 2),
    // Real 9p writes resolve on a later task, i.e. after React commits.
    CreateBinaryFile: vi.fn(() => new Promise((r) => setTimeout(r, 0))),
  }
  constructor(public options: Record<string, unknown>) {
    FakeV86.last = this
  }
  add_listener(e: string, f: (arg?: unknown) => void) {
    this.listeners.set(e, [...(this.listeners.get(e) ?? []), f])
  }
  emit(e: string, arg?: unknown) {
    this.listeners.get(e)?.forEach((f) => f(arg))
  }
  serial0_send(s: string) {
    this.serial0.push(s)
  }
  serial_send_bytes(port: number, data: Uint8Array) {
    if (port === 1) this.serial1.push(new TextDecoder().decode(data))
  }
  async destroy() {
    this.destroyed = true
  }
}

const manifest = {
  format: 1,
  builtAt: '2026-10-07T14:00:00Z',
  v86: '0.5.470',
  memoryMb: 256,
  libv86: 'libv86-0123456789ab.js',
  wasm: 'v86-0123456789ab.wasm',
  bios: 'seabios-0123456789ab.bin',
  vgaBios: 'vgabios-0123456789ab.bin',
  fsIndex: 'debian-base-fs-0123456789ab.json',
  fsBase: 'flat/',
  state: 'debian-state-0123456789ab.bin.zst',
  downloadBytes: 23_000_000,
}

import { DebianVm } from '../DebianVm'

function vfs() {
  const fs = new VirtualFileSystem()
  const books = fs.createDir('/home/zachary/books')
  books.children!['dune'] = { name: 'dune', type: 'file', parent: books, content: { title: 'Dune' } }
  return fs
}

function serveManifest(body: unknown = manifest, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

function setCoarsePointer(coarse: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: coarse && q.includes('coarse'), media: q, addEventListener() {}, removeEventListener() {} }))
}

beforeEach(() => {
  FakeV86.last = null
  term.current = null
  loadScript.mockClear()
  ;(window as unknown as { V86: typeof FakeV86 }).V86 = FakeV86
  setCoarsePointer(false)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
})

async function boot() {
  const onExit = vi.fn()
  serveManifest()
  render(<DebianVm onExit={onExit} vfs={vfs()} />)
  await waitFor(() => expect(FakeV86.last).not.toBeNull())
  return { onExit, vm: FakeV86.last! }
}

describe('DebianVm', () => {
  it('explains when the image is not installed, and Escape returns to the terminal', async () => {
    const onExit = vi.fn()
    serveManifest({}, 404)
    render(<DebianVm onExit={onExit} vfs={vfs()} />)
    expect(await screen.findByText(/isn't installed on this server/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalled()
    expect(loadScript).not.toHaveBeenCalled()
  })

  it('loads the hashed emulator script and boots with the safe options', async () => {
    const { vm } = await boot()
    expect(loadScript).toHaveBeenCalledWith('/vm/libv86-0123456789ab.js')
    expect(vm.options.net_device).toEqual({ type: 'none' })
    expect(vm.options).not.toHaveProperty('network_relay_url')
  })

  it('shows download progress while fetching', async () => {
    const { vm } = await boot()
    act(() => vm.emit('download-progress', { file_name: 'x', file_index: 0, file_count: 1, lengthComputable: true, loaded: 11_500_000, total: 23_000_000 }))
    expect(screen.getByText(/11\.5 MB/)).toBeInTheDocument()
  })

  it('once started: seeds portfolio files, sends the terminal size, and redraws the motd', async () => {
    const { vm } = await boot()
    await act(async () => vm.emit('emulator-started'))
    await waitFor(() => expect(vm.serial0.join('')).toMatch(/clear; cat \/etc\/motd/))
    expect(vm.fs9p.CreateDirectory).toHaveBeenCalledWith('zachary', 1)
    expect(vm.fs9p.CreateBinaryFile).toHaveBeenCalledWith('dune', 1, expect.any(Uint8Array))
    expect(vm.serial1).toContain('30 100\n')
  })

  it('keeps one VM across parent re-renders (inline onExit props)', async () => {
    serveManifest()
    const { rerender } = render(<DebianVm onExit={() => {}} vfs={vfs()} />)
    await waitFor(() => expect(FakeV86.last).not.toBeNull())
    const first = FakeV86.last
    rerender(<DebianVm onExit={() => {}} vfs={vfs()} />)
    await act(async () => first!.emit('emulator-started'))
    expect(FakeV86.last).toBe(first)
    expect(first!.destroyed).toBe(false)
  })

  it('pipes keystrokes to the guest serial console', async () => {
    const { vm } = await boot()
    act(() => term.current!.onDataHandler!('ls\r'))
    expect(vm.serial0).toContain('ls\r')
  })

  it('Ctrl+] tears the VM down and exits', async () => {
    const { vm, onExit } = await boot()
    await act(async () => term.current!.onDataHandler!('\x1d'))
    expect(onExit).toHaveBeenCalled()
    expect(vm.destroyed).toBe(true)
    expect(term.current!.disposed).toBe(true)
  })

  it('exits when the guest logs out (private OSC 7337)', async () => {
    const { onExit } = await boot()
    await act(async () => term.current!.oscHandlers.get(7337)!())
    expect(onExit).toHaveBeenCalled()
  })

  it('on touch devices asks before the big download; "n" exits without loading', async () => {
    setCoarsePointer(true)
    const onExit = vi.fn()
    serveManifest()
    render(<DebianVm onExit={onExit} vfs={vfs()} />)
    expect(await screen.findByText(/downloads about 23\.0 MB/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'n' })
    expect(onExit).toHaveBeenCalled()
    expect(loadScript).not.toHaveBeenCalled()
  })

  it('on touch devices "y" proceeds to boot', async () => {
    setCoarsePointer(true)
    serveManifest()
    render(<DebianVm onExit={() => {}} vfs={vfs()} />)
    await screen.findByText(/downloads about/)
    fireEvent.keyDown(window, { key: 'y' })
    await waitFor(() => expect(FakeV86.last).not.toBeNull())
  })
})
