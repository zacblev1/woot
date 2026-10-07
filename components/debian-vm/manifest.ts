import { z } from 'zod'

/**
 * Where tools/debian-vm/build.sh output is served from. In production this is
 * a read-only volume mounted at public/vm/ (the image is ~305 MB, so it is not
 * in git or the app's Docker image).
 */
export const VM_BASE_URL = '/vm/'
export const MANIFEST_URL = `${VM_BASE_URL}manifest.json`

// Bare, content-hashed file names only: nothing in the manifest may point
// outside VM_BASE_URL.
const assetName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).refine((s) => !s.includes('..'))

const manifestSchema = z.object({
  format: z.literal(1),
  builtAt: z.string(),
  v86: z.string(),
  memoryMb: z.number().int().min(64).max(1024),
  libv86: assetName,
  wasm: assetName,
  bios: assetName,
  vgaBios: assetName,
  fsIndex: assetName,
  fsBase: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*\/$/),
  state: assetName,
  downloadBytes: z.number().int().nonnegative(),
})

export type VmManifest = z.infer<typeof manifestSchema>

export function parseManifest(json: unknown): VmManifest {
  return manifestSchema.parse(json)
}

/**
 * v86 constructor options for a manifest. The device layout (memory, uart1,
 * no NIC) must match tools/debian-vm/build-state.mjs, because the snapshot
 * records it.
 */
export function buildV86Options(m: VmManifest) {
  const url = (name: string) => VM_BASE_URL + name
  return {
    wasm_path: url(m.wasm),
    bios: { url: url(m.bios) },
    vga_bios: { url: url(m.vgaBios) },
    initial_state: { url: url(m.state) },
    filesystem: { basefs: { url: url(m.fsIndex) }, baseurl: url(m.fsBase) },
    memory_size: m.memoryMb * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    bzimage_initrd_from_filesystem: true,
    autostart: true,
    uart1: true,
    screen_dummy: true,
    disable_keyboard: true,
    disable_mouse: true,
    // Safety invariant: the guest gets no network card at all (v86 otherwise
    // adds an ne2k), and there is deliberately no network_relay_url.
    net_device: { type: 'none' as const },
  }
}
