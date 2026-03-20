"use client"

import { useState, useCallback, useRef } from 'react'

type SoundName = 'keyclick' | 'error' | 'success' | 'submit'

const SOUND_FILES: Record<SoundName, string> = {
  keyclick: '/sounds/keyclick.mp3',
  error: '/sounds/error.mp3',
  success: '/sounds/success.mp3',
  submit: '/sounds/submit.mp3',
}

const VOLUMES: Record<SoundName, number> = {
  keyclick: 0.1,
  error: 0.3,
  success: 0.3,
  submit: 0.2,
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sound-enabled') === 'true'
  })
  const audioPool = useRef<Map<SoundName, HTMLAudioElement>>(new Map())

  const getAudio = useCallback((name: SoundName): HTMLAudioElement => {
    if (!audioPool.current.has(name)) {
      const audio = new Audio(SOUND_FILES[name])
      audio.volume = VOLUMES[name]
      audioPool.current.set(name, audio)
    }
    return audioPool.current.get(name)!
  }, [])

  const play = useCallback((name: SoundName) => {
    if (!enabled) return
    try {
      const audio = getAudio(name)
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = VOLUMES[name]
      clone.play().catch(() => {})
    } catch {
      // Silently fail if audio is not available
    }
  }, [enabled, getAudio])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sound-enabled', String(next))
      }
      return next
    })
  }, [])

  return { enabled, toggle, play }
}
