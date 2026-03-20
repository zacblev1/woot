"use client"

import { useRef, useEffect } from 'react'

interface ScreensaverProps {
  onDismiss: () => void
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ァカサタナハマヤラワ'

export function Screensaver({ onDismiss }: ScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)

    // Read --primary CSS variable. In Tailwind v4, custom properties may be stored
    // as raw values. Use a temporary element to resolve the actual computed color.
    let primaryColor = '#4fd1c5'
    try {
      const temp = document.createElement('div')
      temp.style.color = 'var(--primary)'
      document.body.appendChild(temp)
      primaryColor = getComputedStyle(temp).color || primaryColor
      document.body.removeChild(temp)
    } catch {
      // Fallback to default
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = primaryColor
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx.globalAlpha = 0.3 + Math.random() * 0.7
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
      ctx.globalAlpha = 1

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30 w-full h-full transition-opacity duration-500"
      onClick={onDismiss}
      onKeyDown={onDismiss}
      style={{ opacity: 1 }}
    />
  )
}
