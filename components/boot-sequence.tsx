"use client"

import { useState, useEffect } from "react"

interface BootSequenceProps {
  onComplete: () => void
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const bootText = [
      "BIOS Date 01/15/25 14:22:51 Ver: 1.0.2",
      "CPU: Quantum Core i9 @ 8.5 GHz",
      "Memory Test: 64GB OK",
      "",
      "Detecting Primary Master ... 2TB SSD",
      "Detecting Primary Slave ... None",
      "Detecting Secondary Master ... CD-ROM",
      "",
      "Booting from Primary Master...",
      "Loading Kernel...",
      "Mounting File Systems...",
      "Starting System Services...",
      "Initializing Graphics Adapter...",
      "Loading User Interface...",
      "WELCOME TO ZACHARY_OS",
      "",
      "_"
    ]

    let currentIndex = 0
    
    const interval = setInterval(() => {
      if (currentIndex >= bootText.length) {
        clearInterval(interval)
        setTimeout(() => {
          setIsComplete(true)
          onComplete()
        }, 800)
        return
      }

      setLines(prev => {
        // If the last line was a cursor, remove it before adding new line
        const newLines = [...prev]
        if (newLines.length > 0 && newLines[newLines.length - 1] === "_") {
          newLines.pop()
        }
        return [...newLines, bootText[currentIndex]]
      })
      
      currentIndex++
    }, 150) // Adjust speed here

    return () => clearInterval(interval)
  }, [onComplete])

  if (isComplete) return null

  return (
    <div className="fixed inset-0 bg-background text-primary font-mono p-8 z-50 flex flex-col justify-start items-start overflow-hidden">
      {lines.map((line, index) => (
        <div key={index} className="whitespace-pre-wrap min-h-[1.5em]">
          {line}
        </div>
      ))}
    </div>
  )
}
