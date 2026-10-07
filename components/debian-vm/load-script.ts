const pending = new Map<string, Promise<void>>()

/** Load a classic script once (libv86.js registers window.V86). */
export function loadScript(src: string): Promise<void> {
  let p = pending.get(src)
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script')
      el.src = src
      el.async = true
      el.onload = () => resolve()
      el.onerror = () => {
        pending.delete(src)
        el.remove()
        reject(new Error(`failed to load ${src}`))
      }
      document.head.appendChild(el)
    })
    pending.set(src, p)
  }
  return p
}
