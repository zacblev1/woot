import Link from "next/link"
import { Terminal } from "@/components/terminal"
import booksData from "@/data/books.json"
import vinylData from "@/data/vinyl.json"
import hardwareData from "@/data/hardware.json"

export default function Home() {
  const collections = [
    {
      title: "PROJECTS",
      symbol: "[>]",
      description: "A curated selection of my recent work and side projects.",
      href: "https://github.com/zacblev1",
      count: 12,
    },
    {
      title: "VINYL",
      symbol: "[♫]",
      description: "My vinyl collection spanning multiple genres and decades.",
      href: "/vinyl",
      count: vinylData.length,
    },
    {
      title: "BOOKS",
      symbol: "[#]",
      description: "My personal library of books across various genres.",
      href: "/books",
      count: booksData.length,
    },
    {
      title: "HARDWARE",
      symbol: "[⚡]",
      description: "My personal computing hardware and devices.",
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

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="mb-8">
          <Terminal />
        </div>

        {/* Hero Section */}
        <section className="mb-24 md:mb-32">
          <div className="border-l-4 border-primary pl-6 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance uppercase tracking-tight">
              {">"} Hi, I'm <span className="text-primary animate-pulse">Zachary</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 text-pretty">
              [CREATIVE_TECHNOLOGIST] focused on intentional design, sustainable systems, and quiet utility. This is my
              personal space on the web where I share my thoughts, showcase my work, and write about things I love.
            </p>
          </div>
        </section>

        {/* Collections Overview */}
        <section className="mb-24 md:mb-32">
          <div className="flex items-center gap-2 mb-8 text-primary">
            <span className="text-accent">{">>>"}</span>
            <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider">COLLECTIONS_INDEX</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.title}
                href={collection.href}
                className="group p-6 border-2 border-border hover:border-primary transition-all duration-200 bg-card/50 hover:bg-card relative overflow-hidden"
              >
                <div className="absolute top-2 left-2 text-primary/30 text-xs">┌</div>
                <div className="absolute top-2 right-2 text-primary/30 text-xs">┐</div>
                <div className="absolute bottom-2 left-2 text-primary/30 text-xs">└</div>
                <div className="absolute bottom-2 right-2 text-primary/30 text-xs">┘</div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl md:text-2xl text-accent font-bold" aria-hidden="true">
                    {collection.symbol}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold text-foreground group-hover:text-primary transition-colors break-words">
                    {collection.title}
                  </h3>
                </div>
                <p className="text-sm md:text-base text-muted-foreground mb-4 text-pretty">{collection.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">{">"} ACCESS_</span>
                  <span className="text-muted-foreground border border-border px-2 py-1">
                    {collection.count.toString().padStart(3, "0")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Posts */}
        <section className="mb-24 md:mb-32">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-primary">
              <span className="text-accent">{">>>"}</span>
              <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider">RECENT_POSTS</h2>
            </div>
            <Link
              href="/writing"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              VIEW_ALL {">>"}
            </Link>
          </div>
          {recentPosts.length > 0 ? (
            <div className="space-y-6 md:space-y-8">
              {recentPosts.map((post, index) => (
                <Link key={post.id} href={`/writing/${post.slug}`} className="group block">
                  <article className="border-l-2 border-primary/30 pl-4 hover:border-primary transition-colors">
                    <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground md:min-w-[140px]">
                        <span className="text-accent">[{index.toString().padStart(2, "0")}]</span>
                        <time className="font-mono">
                          {new Date(post.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </time>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2 uppercase tracking-tight">
                          {post.title}
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground text-pretty">{post.excerpt}</p>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-2 border-border p-8 text-center bg-card/30">
              <div className="text-accent text-4xl mb-4 font-mono">[ ! ]</div>
              <p className="text-muted-foreground font-mono text-sm mb-2">
                <span className="text-primary">ERROR:</span> NO_POSTS_FOUND
              </p>
              <p className="text-muted-foreground/60 text-xs font-mono">
                {">"} CONTENT_STATUS: <span className="text-accent">COMING_SOON</span>
              </p>
            </div>
          )}
        </section>

        {/* About & Contact */}
        <section className="border-t-2 border-border pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-4 text-primary">
                <span className="text-accent">{">>>"}</span>
                <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider">ABOUT_USER</h2>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed text-pretty">
                I believe in creating digital experiences that are thoughtful, accessible, and built to last. When I'm
                not coding or designing, you'll find me exploring philosophy, diving into programming projects,
                traveling to new places, and making things.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4 text-primary">
                <span className="text-accent">{">>>"}</span>
                <h2 className="text-xs md:text-sm font-bold uppercase tracking-wider">CONTACT_INFO</h2>
              </div>
              <p className="text-sm md:text-base text-muted-foreground mb-4 text-pretty">
                Want to collaborate, share a thought, or just say hello? I'd love to hear from you.
              </p>
              <a
                href="mailto:zachary@thefrenchjockey.com"
                className="text-primary hover:text-accent transition-colors font-medium inline-flex items-center gap-2 border border-primary/30 px-4 py-2 hover:bg-primary/10"
              >
                <span>{">"}</span> zachary@thefrenchjockey.com
              </a>
            </div>
          </div>
        </section>

        <footer className="mt-24 pt-8 border-t border-border/30">
          <div className="text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="text-primary">user@portfolio</span>:~$ uptime
            </div>
            <div className="mt-1">
              SYSTEM_STATUS: <span className="text-accent">OPERATIONAL</span> | LAST_UPDATE: 2025.10.15
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
