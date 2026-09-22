import { useEffect, useState } from 'react'
import { useGame } from '@/store/game'
import { useVoiceStatus } from '@/voice/status'
import { VOICE_TIPS, VoiceGateView } from './VoiceGateView'

/** After this long behind the scrim, a way out is offered. */
const SKIP_AFTER_MS = 6_000
/** Under the permission sheet: what to tap. */
const ALLOW = ['Tap Allow so it can hear you.']
/** The first load is a download; say so before the tips. */
const DOWNLOAD = ['One-time download. Hang tight.', ...VOICE_TIPS]

/**
 * Shown while voice is getting ready and the map should not be usable: the
 * permission prompt is up, or voice is on and the model has not loaded. A
 * failed load shows nothing here; the toggle explains and the keypad run goes
 * ahead. The only exit is the skip, which switches voice off.
 */
export function VoiceGate() {
  const voiceOn = useGame((s) => s.save.settings.voice)
  const setSettings = useGame((s) => s.setSettings)
  const model = useVoiceStatus((s) => s.model)
  const downloading = useVoiceStatus((s) => s.downloading)
  const priming = useVoiceStatus((s) => s.priming)

  const loading = voiceOn && (model === 'idle' || model === 'loading')
  const shown = priming || loading

  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) return setSlow(false)
    const id = window.setTimeout(() => setSlow(true), SKIP_AFTER_MS)
    return () => window.clearTimeout(id)
  }, [loading])

  if (!shown) return null
  return (
    <VoiceGateView
      eyebrow={priming ? 'Microphone' : downloading ? 'Downloading voice' : 'Getting voice ready'}
      lines={priming ? ALLOW : downloading ? DOWNLOAD : VOICE_TIPS}
      onSkip={slow ? () => setSettings({ voice: false }) : null}
    />
  )
}
