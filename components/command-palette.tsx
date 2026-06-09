"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { VALID_COMMANDS } from '@/components/terminal/types'
import { COMMAND_DESCRIPTIONS } from '@/lib/terminal-config'
import booksData from '@/data/books.json'
import vinylData from '@/data/vinyl.json'
import hardwareData from '@/data/hardware.json'
import notesData from '@/data/notes.json'

interface PaletteItem {
  type: 'command' | 'book' | 'vinyl' | 'hardware' | 'note'
  icon: string
  title: string
  subtitle: string
  command: string
}

interface CommandPaletteProps {
  onClose: () => void
  onExecute: (command: string) => void
}

function buildIndex(): PaletteItem[] {
  const items: PaletteItem[] = []

  // Commands
  for (const cmd of VALID_COMMANDS) {
    items.push({
      type: 'command',
      icon: '>',
      title: cmd,
      subtitle: COMMAND_DESCRIPTIONS[cmd] || '',
      command: cmd,
    })
  }

  // Books
  booksData.forEach((book: { title: string; author: string | string[] }) => {
    const filename = book.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'book',
      icon: '📖',
      title: book.title,
      subtitle: Array.isArray(book.author)
        ? book.author.map(a => a.trim()).join(', ')
        : book.author,
      command: `cd ~/books && view ${filename}`,
    })
  })

  // Vinyl
  vinylData.forEach((record: { title: string; artist: string }) => {
    const filename = record.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'vinyl',
      icon: '💿',
      title: record.title,
      subtitle: record.artist,
      command: `cd ~/vinyl && view ${filename}`,
    })
  })

  // Hardware
  hardwareData.forEach((hw: { name: string; type: string }) => {
    const filename = hw.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    items.push({
      type: 'hardware',
      icon: '🖥',
      title: hw.name,
      subtitle: hw.type,
      command: `cd ~/hardware && view ${filename}`,
    })
  })

  // Notes
  notesData.forEach((note: { title: string; date: string }, idx: number) => {
    items.push({
      type: 'note',
      icon: '📝',
      title: note.title,
      subtitle: note.date,
      command: `notes ${idx + 1}`,
    })
  })

  return items
}

export function CommandPalette({ onClose, onExecute }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const allItems = useMemo(() => buildIndex(), [])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show all commands when empty
      return allItems.filter(item => item.type === 'command')
    }
    const q = query.toLowerCase()
    return allItems
      .filter(item =>
        item.title.toLowerCase().includes(q) ||
        String(item.subtitle).toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [query, allItems])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) {
        onExecute(item.command)
        onClose()
      }
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-[20%]" onClick={onClose}>
      <div
        className="w-[90%] max-w-[500px] bg-card border border-border font-mono"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search commands, books, vinyl, hardware, notes..."
          className="w-full bg-background border-b border-border px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((item, i) => (
            <div
              key={`${item.type}-${item.title}-${i}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                i === selectedIndex ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => {
                onExecute(item.command)
                onClose()
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="w-5 text-center shrink-0">{item.icon}</span>
              <span className="text-foreground">{item.title}</span>
              <span className="text-muted-foreground text-xs truncate">{item.subtitle}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">No results</div>
          )}
        </div>
      </div>
    </div>
  )
}
