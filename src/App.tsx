import { useEffect, useState } from 'react'
import { audio } from './audio/engine'
import { useGame } from './store/game'
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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const firstRun = !localStorage.getItem('goobermath:seen')
    if (reduce && firstRun) setSettings({ flashes: false, shake: false, particles: false })
    try {
      localStorage.setItem('goobermath:seen', '1')
    } catch {
      /* private mode: harmless */
    }
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
    </>
  )
}
