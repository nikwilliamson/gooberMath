import { useEffect, useRef } from 'react'
import { INKS } from '../art'

interface Blob {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  max: number
  color: string
}

/**
 * Splat particles on a canvas, outside the React tree: a hot loop should not
 * re-render anything.
 */
export function InkLayer({ pulse, enabled, intensity = 1 }: { pulse: number; enabled: boolean; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blobs = useRef<Blob[]>([])
  const raf = useRef(0)
  const lastPulse = useRef(pulse)

  useEffect(() => {
    if (pulse === lastPulse.current) return
    lastPulse.current = pulse
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width
    const h = canvas.height
    const n = 8 + Math.round(intensity * 7)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 7 * intensity
      blobs.current.push({
        x: w / 2,
        y: h * 0.45,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 2,
        r: 2.5 + Math.random() * 7,
        life: 0,
        max: 26 + Math.random() * 24,
        color: INKS[Math.floor(Math.random() * INKS.length)],
      })
    }
  }, [pulse, enabled, intensity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const next: Blob[] = []
      for (const b of blobs.current) {
        b.life++
        b.x += b.vx
        b.y += b.vy
        b.vy += 0.35
        b.vx *= 0.985
        if (b.life < b.max) {
          const t = 1 - b.life / b.max
          ctx.globalAlpha = Math.min(0.85, t * 1.2)
          ctx.fillStyle = b.color
          ctx.beginPath()
          ctx.arc(b.x, b.y, b.r * (0.5 + t * 0.7), 0, Math.PI * 2)
          ctx.fill()
          next.push(b)
        }
      }
      ctx.globalAlpha = 1
      blobs.current = next
      raf.current = requestAnimationFrame(draw)
    }
    raf.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="inklayer" aria-hidden />
}
