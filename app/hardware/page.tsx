import Link from "next/link"
import { Terminal } from "@/components/terminal"
import hardwareData from "@/data/hardware.json"

export default function HardwarePage() {
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

        <div className="mb-8">
          <Link
            href="/"
            className="text-primary hover:text-accent transition-colors font-medium inline-flex items-center gap-2 text-sm"
          >
            <span>{"<"}</span> BACK_TO_HOME
          </Link>
        </div>

        <div className="border-l-4 border-primary pl-6 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 uppercase tracking-tight">
            {">"} HARDWARE_COLLECTION
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            My personal computing hardware collection. {hardwareData.length} devices and counting.
          </p>
        </div>

        <div className="space-y-4">
          {hardwareData.map((device) => (
            <div
              key={device.id}
              className="border-2 border-border hover:border-primary transition-all duration-200 p-6 bg-card/50 hover:bg-card relative overflow-hidden"
            >
              <div className="absolute top-2 left-2 text-primary/30 text-xs">┌</div>
              <div className="absolute top-2 right-2 text-primary/30 text-xs">┐</div>
              <div className="absolute bottom-2 left-2 text-primary/30 text-xs">└</div>
              <div className="absolute bottom-2 right-2 text-primary/30 text-xs">┘</div>

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1 uppercase">{device.name}</h3>
                  <p className="text-sm text-accent font-mono">{device.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-mono px-2 py-1 border ${
                      device.status === "Active"
                        ? "border-accent text-accent"
                        : "border-muted-foreground text-muted-foreground"
                    }`}
                  >
                    {device.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono">CPU:</span>
                  <span className="text-muted-foreground">{device.processor}</span>
                </div>
                {device.graphics && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">GPU:</span>
                    <span className="text-muted-foreground">{device.graphics}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono">RAM:</span>
                  <span className="text-muted-foreground">{device.memory}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono">STORAGE:</span>
                  <span className="text-muted-foreground">{device.storage}</span>
                </div>
                {device.screen && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">SCREEN:</span>
                    <span className="text-muted-foreground">{device.screen}</span>
                  </div>
                )}
                {device.camera && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">CAMERA:</span>
                    <span className="text-muted-foreground">{device.camera}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-primary font-mono">OS:</span>
                  <span className="text-muted-foreground">{device.operating_system}</span>
                </div>
                {device.hostname && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-mono">HOST:</span>
                    <span className="text-muted-foreground">{device.hostname}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3">{device.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                <span>ACQUIRED: {device.year_acquired}</span>
                <span>PRODUCED: {device.year_produced}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
