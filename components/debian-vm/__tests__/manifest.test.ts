import { describe, it, expect } from 'vitest'
import { parseManifest, buildV86Options, VM_BASE_URL } from '../manifest'

const valid = {
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

describe('parseManifest', () => {
  it('accepts a manifest produced by tools/debian-vm/build.sh', () => {
    expect(parseManifest(valid)).toEqual(valid)
  })

  it('rejects an unknown format version', () => {
    expect(() => parseManifest({ ...valid, format: 2 })).toThrow()
  })

  it.each(['../etc/passwd', '/abs.js', 'https://evil.example/x.js', 'a/b.js', ''])(
    'rejects asset name %j (must be a bare file name)',
    (name) => {
      expect(() => parseManifest({ ...valid, libv86: name })).toThrow()
    }
  )

  it('rejects an fsBase that escapes the vm directory', () => {
    expect(() => parseManifest({ ...valid, fsBase: '../' })).toThrow()
    expect(() => parseManifest({ ...valid, fsBase: '//evil.example/' })).toThrow()
  })

  it('rejects absurd memory sizes', () => {
    expect(() => parseManifest({ ...valid, memoryMb: 4096 })).toThrow()
  })
})

describe('buildV86Options', () => {
  const opts = buildV86Options(parseManifest(valid))

  it('resolves every asset under the vm base url', () => {
    expect(VM_BASE_URL).toBe('/vm/')
    expect(opts.wasm_path).toBe('/vm/v86-0123456789ab.wasm')
    expect(opts.bios).toEqual({ url: '/vm/seabios-0123456789ab.bin' })
    expect(opts.vga_bios).toEqual({ url: '/vm/vgabios-0123456789ab.bin' })
    expect(opts.initial_state).toEqual({ url: '/vm/debian-state-0123456789ab.bin.zst' })
    expect(opts.filesystem).toEqual({
      basefs: { url: '/vm/debian-base-fs-0123456789ab.json' },
      baseurl: '/vm/flat/',
    })
  })

  it('gives the guest no network card and no relay (safety invariant)', () => {
    expect(opts.net_device).toEqual({ type: 'none' })
    expect(opts).not.toHaveProperty('network_relay_url')
  })

  it('matches the device layout the snapshot was built with', () => {
    expect(opts.memory_size).toBe(256 * 1024 * 1024)
    expect(opts.uart1).toBe(true)
    expect(opts.screen_dummy).toBe(true)
    expect(opts.disable_keyboard).toBe(true)
    expect(opts.disable_mouse).toBe(true)
    expect(opts.autostart).toBe(true)
  })
})
