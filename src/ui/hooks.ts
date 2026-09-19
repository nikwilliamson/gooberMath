import { useEffect, useRef } from 'react'

/** rAF loop. The callback is kept in a ref so the loop never restarts. */
export function useRaf(cb: (now: number) => void, active: boolean) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    if (!active) return
    let id = 0
    const loop = (now: number) => {
      ref.current(now)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}

export function useKeypad(
  active: boolean,
  handlers: { digit: (d: number) => void; backspace: () => void; escape?: () => void },
) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (/^[0-9]$/.test(e.key)) {
        ref.current.digit(Number(e.key))
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        ref.current.backspace()
      } else if (e.key === 'Escape') {
        ref.current.escape?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
