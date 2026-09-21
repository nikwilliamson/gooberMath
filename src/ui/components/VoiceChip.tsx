import { useEffect, useState } from 'react'
import { useVoiceStatus } from '@/voice/status'
import './VoiceChip.css'

const UNSURE_SHOW_MS = 1400

/**
 * The HUD's mic: an icon whose ring swells with his voice, so he can see it is
 * hearing him. Icon only — the HUD has no room for words at phone width, and
 * the one message he must read (say it again) is shown under the problem by
 * VoiceNudge, where he is already looking. If the mic could not open it turns
 * red and the keypad carries on; the map explains why after the run.
 */
export function VoiceChip() {
  const mic = useVoiceStatus((s) => s.mic)
  const level = useVoiceStatus((s) => s.level)
  if (mic === 'off') return null

  const label =
    mic === 'listening' ? 'Listening' : mic === 'opening' ? 'Starting the microphone' : 'Microphone unavailable'
  return (
    <div
      className="voicechip"
      data-state={mic}
      style={{ ['--level' as string]: mic === 'listening' ? level : 0 }}
      role="img"
      aria-label={label}
      title={label}
    >
      <svg className="voicechip__icon" viewBox="0 0 24 24" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {(mic === 'denied' || mic === 'error') && (
          <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
    </div>
  )
}

/** "Say it again", briefly, under the problem: a number was heard but not clearly enough to score. */
export function VoiceNudge() {
  const unsureAt = useVoiceStatus((s) => s.unsureAt)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    // The status store outlives runs: only a recent nudge belongs to this one.
    const left = UNSURE_SHOW_MS - (performance.now() - unsureAt)
    if (!unsureAt || left <= 0) return
    setShown(true)
    const id = window.setTimeout(() => setShown(false), left)
    return () => window.clearTimeout(id)
  }, [unsureAt])
  if (!shown) return null
  return (
    <span key={unsureAt} className="voicenudge" role="status">
      Say it again
    </span>
  )
}
