"use client"

import { useState } from "react"
import Link from "next/link"
import vinylData from "@/data/vinyl.json"
import { Terminal } from "@/components/terminal"

export default function VinylPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string>("all")
  const [selectedFormat, setSelectedFormat] = useState<string>("all")

  const genres = ["all", ...Array.from(new Set(vinylData.map((record) => record.genre))).sort()]
  const formats = ["all", ...Array.from(new Set(vinylData.map((record) => record.format))).sort()]

  const filteredVinyl = vinylData.filter((record) => {
    const matchesSearch =
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.artist.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGenre = selectedGenre === "all" || record.genre === selectedGenre
    const matchesFormat = selectedFormat === "all" || record.format === selectedFormat
    return matchesSearch && matchesGenre && matchesFormat
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="text-primary hover:text-accent transition-colors font-medium inline-flex items-center gap-2 mb-6"
          >
            <span>{"<"}</span> BACK_TO_HOME
          </Link>

          <div className="border-l-4 border-primary pl-6 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 uppercase tracking-tight">
              {">"} VINYL_COLLECTION
            </h1>
            <p className="text-base text-muted-foreground">
              [{vinylData.length.toString().padStart(3, "0")}] records across multiple genres and formats
            </p>
          </div>
        </div>

        <div className="mb-8">
          <Terminal />
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-primary mb-2 block uppercase tracking-wider">SEARCH_QUERY</label>
              <input
                type="text"
                placeholder="Search by title or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card/50 border border-primary/30 px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-xs text-primary mb-2 block uppercase tracking-wider">GENRE_FILTER</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="bg-card/50 border border-primary/30 px-4 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre === "all" ? "ALL" : genre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-primary mb-2 block uppercase tracking-wider">FORMAT_FILTER</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-card/50 border border-primary/30 px-4 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
                >
                  {formats.map((format) => (
                    <option key={format} value={format}>
                      {format === "all" ? "ALL" : format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground font-mono">
            SHOWING: [{filteredVinyl.length.toString().padStart(3, "0")}] / [
            {vinylData.length.toString().padStart(3, "0")}] records
          </div>
        </div>

        <div className="space-y-2">
          {filteredVinyl.map((record, index) => (
            <div
              key={index}
              className="border border-primary/30 bg-card/30 p-4 hover:border-primary hover:bg-card/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-accent text-xs font-mono">[{(index + 1).toString().padStart(3, "0")}]</span>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight truncate">
                      {record.title}
                    </h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="text-primary">ARTIST:</span> {record.artist}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="text-muted-foreground">
                        <span className="text-secondary">GENRE:</span> {record.genre}
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-secondary">FORMAT:</span> {record.format}
                      </span>
                      <span className="text-muted-foreground">
                        <span className="text-secondary">LABEL:</span> {record.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVinyl.length === 0 && (
          <div className="text-center py-12 border border-primary/30 bg-card/30">
            <p className="text-muted-foreground font-mono">NO_RECORDS_FOUND</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
