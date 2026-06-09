import notesData from '@/data/notes.json'
import { getSiteUrl } from '@/lib/site'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const site = getSiteUrl().toString().replace(/\/$/, '')

  const items = notesData
    .map((note, idx) => {
      const link = `${site}/?cmd=${encodeURIComponent(`notes ${idx + 1}`)}`
      const description = escapeXml(note.content.join('\n'))
      return [
        '    <item>',
        `      <title>${escapeXml(note.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">note-${idx + 1}</guid>`,
        `      <pubDate>${new Date(note.date).toUTCString()}</pubDate>`,
        `      <author>${escapeXml(note.author)}</author>`,
        `      <description>${description}</description>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Zachary Blevins — Notes</title>
    <link>${escapeXml(site)}</link>
    <description>Blog posts and updates from the terminal portfolio</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
