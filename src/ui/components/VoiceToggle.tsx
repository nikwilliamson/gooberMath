import { useEffect, useState } from 'react'
import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import { primeMicPermission } from '@/voice/permission'
import { VOICE_CRASHED_KEY, useVoiceStatus } from '@/voice/status'
import { readLocal, removeLocal } from '../safeStorage'

const warmModel = () =>
  import('@/voice/listener').then((m) => m.loadModel()).then(
    () => undefined,
    () => undefined, // status carries the reason
  )

/**
 * Voice answers, switched on before a run starts. Off by default. Turning it
 * on asks for the mic right here, from the tap, so the permission prompt goes
 * to a grown-up on the map and never lands in the middle of a countdown.
 */
export function VoiceToggle() {
  const on = useGame((s) => s.save.settings.voice)
  const setSettings = useGame((s) => s.setSettings)
  const model = useVoiceStatus((s) => s.model)
  const mic = useVoiceStatus((s) => s.mic)
  const [busy, setBusy] = useState(false)
  const [crashed, setCrashed] = useState(() => readLocal(VOICE_CRASHED_KEY) === '1')

  // Left on from last time: warm the model before he reaches for Play.
  useEffect(() => {
    if (on) void warmModel()
  }, [on])

  const toggle = async () => {
    if (busy) return
    if (on) {
      setSettings({ voice: false })
      return
    }
    setBusy(true)
    removeLocal(VOICE_CRASHED_KEY)
    setCrashed(false)
    audio.unlock() // the mic joins this context; create it inside the tap
    const ok = await primeMicPermission() // first await: still inside the gesture
    setBusy(false)
    if (ok) setSettings({ voice: true })
  }

  const note = (() => {
    if (!on) {
      if (mic === 'denied') return 'The microphone is blocked. Allow it for this site in Safari settings, then try again.'
      if (crashed) return 'Voice switched itself off after the game restarted mid-run. Tap to try again.'
      return null
    }
    switch (model) {
      case 'ready':
        return 'Say answers out loud. The keypad still works.'
      case 'missing':
        return 'Voice is not included in this build.'
      case 'error':
        return 'Voice could not load. Switch it off and on to try again.'
      default:
        // 'idle' included: on, but the load has not reported yet. Never claim
        // ready before it is.
        return 'Getting voice ready. The first time downloads about 40 MB, then it stays on this device.'
    }
  })()

  return (
    <div className="voicetoggle">
      <button
        className="voicetoggle__btn"
        role="switch"
        aria-checked={on}
        aria-busy={busy || (on && model === 'loading')}
        onClick={() => void toggle()}
        data-on={on || undefined}
      >
        <MicIcon />
        <span>Voice</span>
        <span className="voicetoggle__track" aria-hidden>
          <span className="voicetoggle__thumb" />
        </span>
      </button>
      {note && (
        <span className="voicetoggle__note" data-tone={on && model === 'ready' ? 'ok' : undefined}>
          {note}
        </span>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="voicetoggle__icon" viewBox="0 0 24 24" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
