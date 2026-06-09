import { ImageResponse } from 'next/og'

export const alt = 'Zachary Blevins — Terminal Portfolio'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TERMINAL_LINES = [
  { prompt: true, text: 'whoami' },
  { prompt: false, text: 'zachary blevins' },
  { prompt: true, text: 'ls ~' },
  { prompt: false, text: 'books/  vinyl/  hardware/  projects/' },
  { prompt: true, text: 'help' },
]

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a1628',
          padding: 60,
          fontFamily: 'monospace',
        }}
      >
        {/* Terminal window */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            borderRadius: 16,
            border: '2px solid #1e3a5f',
            backgroundColor: '#081120',
            overflow: 'hidden',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '20px 28px',
              borderBottom: '2px solid #1e3a5f',
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#f56565' }} />
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#ecc94b' }} />
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#48bb78' }} />
            <div style={{ display: 'flex', marginLeft: 20, color: '#94a3b8', fontSize: 26 }}>
              zachary@portfolio: ~
            </div>
          </div>
          {/* Terminal body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '36px 44px',
              gap: 14,
              flexGrow: 1,
            }}
          >
            {TERMINAL_LINES.map((line, i) => (
              <div key={i} style={{ display: 'flex', fontSize: 34, gap: 16 }}>
                {line.prompt && <span style={{ color: '#48bb78' }}>$</span>}
                <span style={{ color: line.prompt ? '#e2e8f0' : '#4fd1c5' }}>{line.text}</span>
              </div>
            ))}
            <div style={{ display: 'flex', fontSize: 72, color: '#4fd1c5', marginTop: 30, fontWeight: 700 }}>
              ZACHARY BLEVINS
            </div>
            <div style={{ display: 'flex', fontSize: 32, color: '#94a3b8' }}>
              interactive terminal portfolio — commands, collections, arcade games
            </div>
            <div style={{ display: 'flex', fontSize: 34, marginTop: 24 }}>
              <span style={{ color: '#48bb78' }}>$</span>
              <span
                style={{
                  marginLeft: 16,
                  width: 22,
                  height: 40,
                  backgroundColor: '#4fd1c5',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
