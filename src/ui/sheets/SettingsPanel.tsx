import { COSMETICS, type Cosmetic } from '@/store/cosmetics'
import type { Settings } from '@/store/types'
import { Goober } from '../art'
import { Button, Sheet, SheetSection, Toggle, cx } from '../primitives'
import './SettingsPanel.css'

export const SETTING_TOGGLES: Array<{ key: keyof Settings; icon: string; label: string }> = [
  { key: 'music', icon: '🎵', label: 'Music' },
  { key: 'sfx', icon: '🔊', label: 'Sounds' },
  { key: 'flashes', icon: '✨', label: 'Flashes' },
  { key: 'shake', icon: '💥', label: 'Shake' },
]

export interface SettingsPanelProps {
  settings: Settings
  /** Cosmetic ids he owns. */
  owned: string[]
  /** Equipped goober skin id. */
  goober: string
  onToggle: (key: keyof Settings, on: boolean) => void
  /** Flip flashes and shake together. */
  onCalm: (calm: boolean) => void
  onCosmetic: (id: Cosmetic['id']) => void
  onClose: () => void
}

/** The settings sheet from plain props. SettingsSheet wires it to the store. */
export function SettingsPanel({ settings, owned, goober, onToggle, onCalm, onCosmetic, onClose }: SettingsPanelProps) {
  const calm = !settings.flashes && !settings.shake
  return (
    <Sheet title="Settings" onClose={onClose}>
      <SheetSection label="Sound & effects">
        <div className="toggles">
          {SETTING_TOGGLES.map((t) => (
            <Toggle key={t.key} icon={t.icon} label={t.label} on={settings[t.key]} onChange={(on) => onToggle(t.key, on)} />
          ))}
        </div>
        <Button onClick={() => onCalm(!calm)}>
          {calm ? 'Turn effects back on' : 'Calm mode (no flashes or shake)'}
        </Button>
      </SheetSection>

      <SheetSection label="Goobers">
        <div className="cosmetics">
          {COSMETICS.filter((c) => c.kind === 'goober').map((c) => {
            const has = owned.includes(c.id)
            return (
              <button
                key={c.id}
                className={cx('cosmetic', goober === c.id && 'cosmetic--active', !has && 'cosmetic--locked')}
                disabled={!has}
                onClick={() => onCosmetic(c.id)}
              >
                <Goober tint={c.tint} size={46} mood="idle" />
                {has ? c.name : `Lv ${c.level}`}
              </button>
            )
          })}
        </div>
      </SheetSection>
    </Sheet>
  )
}
