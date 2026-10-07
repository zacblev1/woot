import type { PortfolioExport } from './portfolio'

/** The slice of v86's 9p filesystem (emulator.fs9p) used to seed files. */
export interface Fs9p {
  SearchPath(path: string): { id: number; parentid: number; name: string }
  CreateDirectory(name: string, parentid: number): number
  CreateBinaryFile(name: string, parentid: number, data: Uint8Array): Promise<unknown>
}

/**
 * Copy the portfolio tree into the guest's root filesystem (host side, before
 * the guest has looked at /home/zachary). Returns the number of files written.
 */
export async function injectPortfolio(fs: Fs9p, data: PortfolioExport): Promise<number> {
  for (const dir of data.dirs) {
    const { id, parentid, name } = fs.SearchPath(dir)
    if (id === -1 && parentid !== -1) fs.CreateDirectory(name, parentid)
  }
  const encoder = new TextEncoder()
  let written = 0
  for (const file of data.files) {
    const { id, parentid, name } = fs.SearchPath(file.path)
    if (id !== -1 || parentid === -1) continue
    await fs.CreateBinaryFile(name, parentid, encoder.encode(file.content))
    written++
  }
  return written
}
