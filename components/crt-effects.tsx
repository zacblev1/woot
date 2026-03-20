// components/crt-effects.tsx
export function CRTEffects() {
  return (
    <>
      {/* Scan lines */}
      <div
        data-crt="scanlines"
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
          mixBlendMode: 'multiply',
        }}
      />
      {/* Vignette */}
      <div
        data-crt="vignette"
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)',
        }}
      />
    </>
  )
}
