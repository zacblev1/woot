"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Terminal } from "@/components/terminal"
import { BootSequence } from "@/components/boot-sequence"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"

export default function Home() {
  const [bootComplete, setBootComplete] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Check if we've already booted in this session
    const hasBooted = sessionStorage.getItem("hasBooted")
    if (hasBooted) {
      setBootComplete(true)
      setShowContent(true)
    }
  }, [])

  const handleBootComplete = () => {
    setBootComplete(true)
    sessionStorage.setItem("hasBooted", "true")
    setTimeout(() => setShowContent(true), 100)
  }

  const collections = [
    {
      title: "PROJECTS",
      symbol: "[>]",
      description: "Curated selection of work.",
      href: "https://github.com/zacblev1",
      count: 12,
    },
    {
      title: "VINYL",
      symbol: "[♫]",
      description: "Audio database.",
      href: "/vinyl",
      count: vinylData.length,
    },
    {
      title: "BOOKS",
      symbol: "[#]",
      description: "Knowledge archive.",
      href: "/books",
      count: booksData.length,
    },
    {
      title: "HARDWARE",
      symbol: "[⚡]",
      description: "Equipment inventory.",
      href: "/hardware",
      count: hardwareData.length,
    },
  ]

  const recentPosts: Array<{
    id: number
    title: string
    excerpt: string
    date: string
    slug: string
  }> = []

  if (!bootComplete) {
    return <BootSequence onComplete={handleBootComplete} />
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-opacity duration-1000 ${showContent ? "opacity-100" : "opacity-0"}`}>

      {/* Main Container Frame */}
      <div className="max-w-5xl mx-auto border-2 border-primary p-2 md:p-4 relative min-h-[90vh]">
        {/* Frame Decorators */}
        <div className="absolute top-0 left-0 -mt-3 ml-4 bg-background px-2 text-xs font-bold text-primary">
          SYSTEM_ROOT
        </div>
        <div className="absolute top-0 right-0 -mt-3 mr-4 bg-background px-2 text-xs font-bold text-primary">
          [CONNECTED]
        </div>
        <div className="absolute bottom-0 right-0 -mb-3 mr-4 bg-background px-2 text-xs font-bold text-primary">
          v2.0.4
        </div>

        <header className="mb-8 border-b border-primary/30 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-tighter">
                ZACHARY<span className="animate-pulse">_</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                CREATIVE_TECHNOLOGIST :: INTENTIONAL_DESIGN :: SUSTAINABLE_SYSTEMS
              </p>
            </div>
            <div className="text-xs text-right hidden md:block">
              <div>MEM: 64GB OK</div>
              <div>CPU: 12% LOAD</div>
              <div>NET: ONLINE</div>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Terminal & Info */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent">{">"}</span>
                <h2 className="text-lg font-bold bg-primary/10 px-2 inline-block">INTERACTIVE_TERMINAL</h2>
              </div>
              <Terminal />
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-accent">{">"}</span>
                <h2 className="text-lg font-bold bg-primary/10 px-2 inline-block">ABOUT_USER</h2>
              </div>
              <div className="border border-primary/30 p-4 relative">
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary"></div>

                <p className="leading-relaxed text-sm md:text-base mb-4">
                  I believe in creating digital experiences that are thoughtful, accessible, and built to last.
                  When I'm not coding or designing, you'll find me exploring philosophy, diving into programming projects,
                  traveling to new places, and making things.
                </p>
                <div className="flex gap-4 text-sm">
                  <a href="mailto:zachary@thefrenchjockey.com" className="hover:bg-primary hover:text-background px-1 transition-colors">
                    [EMAIL]
                  </a>
                  <a href="https://github.com/zacblev1" target="_blank" rel="noopener noreferrer" className="hover:bg-primary hover:text-background px-1 transition-colors">
                    [GITHUB]
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Navigation & Status */}
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-accent">{">"}</span>
                <h2 className="text-lg font-bold bg-primary/10 px-2 inline-block">DIRECTORY_INDEX</h2>
              </div>
              <nav className="grid gap-2">
                {collections.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group block border border-primary/30 p-3 hover:bg-primary/10 transition-colors relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center z-10 relative">
                      <div className="flex items-center gap-3">
                        <span className="text-accent font-mono">{item.symbol}</span>
                        <span className="font-bold group-hover:underline decoration-2 underline-offset-4">{item.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">[{item.count.toString().padStart(2, '0')}]</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-9 truncate">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </nav>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-accent">{">"}</span>
                <h2 className="text-lg font-bold bg-primary/10 px-2 inline-block">LATEST_LOGS</h2>
              </div>
              <div className="border-l-2 border-primary/30 pl-4 space-y-4">
                {recentPosts.length > 0 ? (
                  recentPosts.map((post) => (
                    <Link key={post.id} href={`/writing/${post.slug}`} className="block group">
                      <div className="text-xs text-muted-foreground mb-1">{post.date}</div>
                      <div className="font-bold group-hover:text-accent transition-colors">
                        {post.title}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    // NO_LOGS_FOUND
                    <br />
                    // CHECK_BACK_LATER
                  </div>
                )}
              </div>
            </section>
          </div>

        </main>

        <footer className="mt-12 border-t border-primary/30 pt-4 text-xs text-muted-foreground flex justify-between items-center">
          <div>
            user@portfolio:~$ uptime
            <br />
            up 42 days, 14:22, 1 user
          </div>
          <div className="text-right">
            SYSTEM_STATUS: <span className="text-accent">OPERATIONAL</span>
            <br />
            LAST_UPDATE: 2025.10.15
          </div>
        </footer>
      </div>
    </div>
  )
}
