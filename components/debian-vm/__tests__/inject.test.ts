import { describe, it, expect } from 'vitest'
import { injectPortfolio, type Fs9p } from '../inject'

/** Minimal in-memory stand-in for v86's 9p FS (inode ids, root = 0). */
function fakeFs(existing: string[] = ['/home']) {
  const nodes = new Map<string, number>([['', 0]])
  const files = new Map<string, string>()
  const byId = new Map<number, string>([[0, '']])
  let next = 1
  const add = (path: string) => {
    nodes.set(path, next)
    byId.set(next, path)
    return next++
  }
  existing.forEach(add)
  const fs: Fs9p = {
    SearchPath(path) {
      const parts = path.split('/').filter(Boolean)
      const name = parts[parts.length - 1]
      const parent = '/' + parts.slice(0, -1).join('/')
      const parentKey = parent === '/' ? '' : parent
      const id = nodes.get(path) ?? -1
      const parentid = nodes.get(parentKey) ?? -1
      return { id, parentid, name }
    },
    CreateDirectory(name, parentid) {
      return add(`${byId.get(parentid)}/${name}`)
    },
    async CreateBinaryFile(name, parentid, data) {
      const path = `${byId.get(parentid)}/${name}`
      add(path)
      files.set(path, new TextDecoder().decode(data))
    },
  }
  return { fs, nodes, files }
}

describe('injectPortfolio', () => {
  it('creates directories parent-first, then files with their contents', async () => {
    const { fs, nodes, files } = fakeFs()
    const n = await injectPortfolio(fs, {
      dirs: ['/home/zachary', '/home/zachary/books'],
      files: [{ path: '/home/zachary/books/dune', content: '{"title":"Dune"}\n' }],
    })
    expect(nodes.has('/home/zachary/books')).toBe(true)
    expect(files.get('/home/zachary/books/dune')).toBe('{"title":"Dune"}\n')
    expect(n).toBe(1)
  })

  it('is idempotent: existing entries are left alone', async () => {
    const { fs, files } = fakeFs(['/home', '/home/zachary', '/home/zachary/notes'])
    const data = { dirs: ['/home/zachary', '/home/zachary/notes'], files: [{ path: '/home/zachary/notes', content: 'x' }] }
    expect(await injectPortfolio(fs, data)).toBe(0)
    expect(files.size).toBe(0)
  })

  it('skips anything whose parent is missing instead of throwing', async () => {
    const { fs, files } = fakeFs([])
    expect(await injectPortfolio(fs, { dirs: ['/home/zachary'], files: [{ path: '/home/zachary/a', content: 'a' }] })).toBe(0)
    expect(files.size).toBe(0)
  })
})
