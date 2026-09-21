/**
 * `?voicedebug` on the URL records every recognizer result and decision so
 * the thresholds in voice.ts can be tuned from his real voice on his real
 * devices, instead of from a synthesized one. Off otherwise, and costs nothing.
 *
 * Nothing here leaves the device: the overlay copies the log to the clipboard
 * and a grown-up pastes it wherever they choose.
 */

export const VOICE_DEBUG = (() => {
  try {
    return new URLSearchParams(window.location.search).has('voicedebug')
  } catch {
    return false
  }
})()

export type DebugEntry = { t: number; kind: string } & Record<string, unknown>

const MAX = 800
const entries: DebugEntry[] = []
const listeners = new Set<() => void>()

export function vlog(kind: string, data: Record<string, unknown> = {}) {
  if (!VOICE_DEBUG) return
  // kind last, so a `kind` inside data can never overwrite what the entry is.
  entries.push({ t: Math.round(performance.now()), ...data, kind })
  if (entries.length > MAX) entries.splice(0, entries.length - MAX)
  for (const l of listeners) l()
}

export const debugEntries = () => entries

// Reachable from devtools (and tests) in debug mode only.
if (VOICE_DEBUG) (window as unknown as { __voiceLog: DebugEntry[] }).__voiceLog = entries

export function onDebug(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

/** Device context for the log header: thresholds may need to differ by device. */
export function deviceInfo() {
  const ua = navigator.userAgent
  const ios = /(?:iPhone|iPad|iPod).*? OS (\d+)_(\d+)/.exec(ua)
  // iPadOS reports itself as a Mac; touch points give it away.
  const iPadAsMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return {
    ua,
    device: /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || iPadAsMac ? 'iPad' : 'other',
    ios: ios ? `${ios[1]}.${ios[2]}` : null,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    audioSession: 'audioSession' in navigator,
  }
}
