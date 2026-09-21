import { useEffect, useState } from 'react'
import { audio } from './audio/engine'
import { useGame } from './store/game'
import { flushSave } from './store/persist'
import { readLocal, removeLocal, writeLocal } from './ui/safeStorage'
import { VoiceDebug } from './ui/components/VoiceDebug'
import { VOICE_DEBUG } from './voice/debug'
import { VOICE_CRASHED_KEY, VOICE_RUN_KEY } from './voice/status'
import { MapScreen } from './ui/screens/MapScreen'
import { ResultsScreen } from './ui/screens/ResultsScreen'
import { RunScreen } from './ui/screens/RunScreen'
import { TitleScreen } from './ui/screens/TitleScreen'
import { GrownUpsSheet } from './ui/sheets/GrownUpsSheet'
import { SettingsSheet } from './ui/sheets/SettingsSheet'

export default function App() {
  const ready = useGame((s) => s.ready)
  const hydrate = useGame((s) => s.hydrate)
  const screen = useGame((s) => s.screen)
  const settings = useGame((s) => s.save.settings)
  const setSettings = useGame((s) => s.setSettings)
  const [sheet, setSheet] = useState<'settings' | 'grownups' | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Reduced motion is a safety net, not the default: he likes the stimulation.
  useEffect(() => {
    if (!ready) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const firstRun = !readLocal('goobermath:seen')
    if (reduce && firstRun) setSettings({ flashes: false, shake: false, particles: false })
    writeLocal('goobermath:seen', '1')
  }, [ready, setSettings])

  // A voice run that never ended cleanly means iOS killed the tab mid-run.
  // Switch voice off rather than walk straight back into the same crash. The
  // switch-off is written before the marker is cleared: if the app dies again
  // in between, the next boot simply does this again.
  useEffect(() => {
    if (!ready || !readLocal(VOICE_RUN_KEY)) return
    void (async () => {
      if (useGame.getState().save.settings.voice) {
        writeLocal(VOICE_CRASHED_KEY, '1')
        setSettings({ voice: false })
        await flushSave()
      }
      removeLocal(VOICE_RUN_KEY)
    })()
  }, [ready, setSettings])

  useEffect(() => {
    audio.applySettings(settings)
  }, [settings])

  if (!ready) {
    return (
      <div className="app">
        <div className="scene scene--sky" />
      </div>
    )
  }

  return (
    <>
      {screen === 'title' && (
        <TitleScreen onSettings={() => setSheet('settings')} onGrownUps={() => setSheet('grownups')} />
      )}
      {screen === 'map' && <MapScreen onSettings={() => setSheet('settings')} />}
      {screen === 'run' && <RunScreen />}
      {screen === 'results' && <ResultsScreen />}
      {sheet === 'settings' && <SettingsSheet onClose={() => setSheet(null)} />}
      {sheet === 'grownups' && <GrownUpsSheet onClose={() => setSheet(null)} />}
      {VOICE_DEBUG && <VoiceDebug />}
    </>
  )
}
