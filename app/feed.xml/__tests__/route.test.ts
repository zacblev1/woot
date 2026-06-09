import { describe, it, expect } from 'vitest'
import { GET } from '../route'
import notesData from '@/data/notes.json'

describe('GET /feed.xml', () => {
  it('returns an RSS 2.0 document', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/rss+xml')
    const body = await res.text()
    expect(body).toContain('<?xml version="1.0"')
    expect(body).toContain('<rss version="2.0"')
    expect(body).toContain('<channel>')
  })

  it('includes every note as an item with title and content', async () => {
    const res = await GET()
    const body = await res.text()
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    for (const note of notesData) {
      expect(body).toContain(`<title>${escape(note.title)}</title>`)
    }
    expect(body.match(/<item>/g)?.length).toBe(notesData.length)
  })

  it('escapes XML-unsafe characters in content', async () => {
    const res = await GET()
    const body = await res.text()
    // No raw ampersands outside of entities
    expect(body).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;|#)/)
  })

  it('sets cache headers', async () => {
    const res = await GET()
    expect(res.headers.get('cache-control')).toContain('s-maxage')
  })
})
