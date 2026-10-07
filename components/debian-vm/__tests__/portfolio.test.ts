import { describe, it, expect } from 'vitest'
import { VirtualFileSystem } from '@/lib/vfs'
import { portfolioFiles } from '../portfolio'

function fixture() {
  const fs = new VirtualFileSystem()
  const books = fs.createDir('/home/zachary/books')
  books.children!['dune'] = {
    name: 'dune',
    type: 'file',
    parent: books,
    content: { title: 'Dune', author: 'Frank Herbert' },
  }
  const style = fs.createDir('/home/zachary/style')
  style.children!['theme'] = { name: 'theme', type: 'file', parent: style, content: 'config' }
  fs.createDir('/home/zachary/empty')
  fs.createDir('/etc/elsewhere')
  return fs
}

describe('portfolioFiles', () => {
  it('mirrors /home/zachary, with file contents exactly as `cat` prints them', () => {
    const { files } = portfolioFiles(fixture())
    expect(files).toContainEqual({
      path: '/home/zachary/books/dune',
      content: JSON.stringify({ title: 'Dune', author: 'Frank Herbert' }, null, 2) + '\n',
    })
    expect(files).toContainEqual({ path: '/home/zachary/style/theme', content: 'config\n' })
  })

  it('lists directories parent-first (including empty ones) so they can be created in order', () => {
    const { dirs } = portfolioFiles(fixture())
    expect(dirs[0]).toBe('/home/zachary')
    expect(dirs).toContain('/home/zachary/empty')
    expect(dirs.indexOf('/home/zachary')).toBeLessThan(dirs.indexOf('/home/zachary/books'))
  })

  it('only exports the home tree', () => {
    const { dirs, files } = portfolioFiles(fixture())
    expect([...dirs, ...files.map((f) => f.path)].every((p) => p.startsWith('/home/zachary'))).toBe(true)
  })

  it('skips names that are not safe single path segments', () => {
    const fs = fixture()
    const home = fs.resolve('/home/zachary')!
    for (const name of ['..', '.', 'a/b', '']) {
      home.children![name] = { name, type: 'file', parent: home, content: 'x' }
    }
    const { files } = portfolioFiles(fs)
    expect(files.map((f) => f.path).sort()).toEqual(['/home/zachary/books/dune', '/home/zachary/style/theme'])
  })
})
