import type { FileSystemNode, VirtualFileSystem } from '@/lib/vfs'

export const PORTFOLIO_ROOT = '/home/zachary'

export interface PortfolioExport {
  /** Parent-first, so they can be created in order. */
  dirs: string[]
  files: { path: string; content: string }[]
}

const safeSegment = (name: string) => name !== '' && name !== '.' && name !== '..' && !name.includes('/')

/** File body exactly as the portfolio `cat` prints it, newline-terminated. */
function render(content: unknown): string {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
  return text.endsWith('\n') ? text : text + '\n'
}

/**
 * The portfolio home tree, flattened for copying into the Debian guest so
 * `ls /home/zachary/books` works in a real shell too.
 */
export function portfolioFiles(vfs: Pick<VirtualFileSystem, 'resolve'>): PortfolioExport {
  const out: PortfolioExport = { dirs: [], files: [] }
  const home = vfs.resolve(PORTFOLIO_ROOT)
  if (!home || home.type !== 'directory') return out

  const walk = (node: FileSystemNode, path: string) => {
    out.dirs.push(path)
    for (const name of Object.keys(node.children ?? {}).sort()) {
      if (!safeSegment(name)) continue
      const child = node.children![name]
      const childPath = `${path}/${name}`
      if (child.type === 'directory') walk(child, childPath)
      else out.files.push({ path: childPath, content: render(child.content) })
    }
  }
  walk(home, PORTFOLIO_ROOT)
  return out
}
