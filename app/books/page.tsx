"use client"

import Link from "next/link"
import { Terminal } from "@/components/terminal"
import booksData from "@/data/books.json"

export default function BooksPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 border-2 border-primary bg-black/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="mb-2 font-mono text-xs text-accent">●●●LIBRARY_ACCESS_GRANTED</div>
              <h1 className="font-mono text-3xl font-bold uppercase tracking-wider text-primary md:text-4xl">
                [ Book Library ]
              </h1>
            </div>
            <Link
              href="/"
              className="border-2 border-secondary bg-black px-4 py-2 font-mono text-sm uppercase text-secondary transition-colors hover:bg-secondary hover:text-black"
            >
              {"<"} Back
            </Link>
          </div>
          <p className="font-mono text-sm text-muted-foreground">user@portfolio:~/books$ cat collection.txt</p>
          <p className="mt-2 font-mono text-sm text-foreground">Total entries: {booksData.length}</p>
        </div>

        <div className="mb-8">
          <Terminal />
        </div>

        <div className="space-y-2">
          {booksData.map((book, index) => (
            <div
              key={index}
              className="group border-2 border-primary bg-black/50 p-4 transition-all hover:border-accent hover:bg-black/70"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-bold uppercase text-primary">{book.title}</h3>
                  <p className="font-mono text-xs text-secondary">by {book.author}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="border border-accent bg-black px-2 py-1 font-mono text-xs text-accent">
                    {book.genre}
                  </span>
                  <span className="border border-secondary bg-black px-2 py-1 font-mono text-xs text-secondary">
                    {book.format}
                  </span>
                  {book.pages && (
                    <span className="border border-primary bg-black px-2 py-1 font-mono text-xs text-primary">
                      {book.pages}p
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
