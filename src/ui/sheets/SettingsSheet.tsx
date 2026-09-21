import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import type { Settings } from '@/store/types'
import { SettingsPanel } from './SettingsPanel'

/** Wires the settings sheet to the store and the audio engine. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.save.settings)
  const setSettings = useGame((s) => s.setSettings)
  const cosmetics = useGame((s) => s.save.cosmetics)
  const goober = useGame((s) => s.save.goober)
  const setCosmetic = useGame((s) => s.setCosmetic)

  return (
    <SettingsPanel
      settings={settings}
      owned={cosmetics}
      goober={goober}
      onToggle={(key, on) => {
        const next = { [key]: on } as Partial<Settings>
        setSettings(next)
        audio.applySettings({ ...settings, ...next })
        audio.tap()
      }}
      onCalm={(calm) => setSettings({ flashes: !calm, shake: !calm, particles: !calm })}
      onCosmetic={setCosmetic}
      onClose={onClose}
    />
  )
}
