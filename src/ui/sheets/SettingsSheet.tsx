import { audio } from '@/audio/engine'
import { COSMETICS } from '@/store/cosmetics'
import { useGame } from '@/store/game'
import type { Settings } from '@/store/types'
import { Goober } from '../art'

const TOGGLES: Array<{ key: keyof Settings; icon: string; label: string }> = [
  { key: 'music', icon: '🎵', label: 'Music' },
  { key: 'sfx', icon: '🔊', label: 'Sounds' },
  { key: 'flashes', icon: '✨', label: 'Flashes' },
  { key: 'shake', icon: '💥', label: 'Shake' },
  { key: 'particles', icon: '🎨', label: 'Splats' },
]

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.save.settings)
  const setSettings = useGame((s) => s.setSettings)
  const cosmetics = useGame((s) => s.save.cosmetics)
  const goober = useGame((s) => s.save.goober)
  const setCosmetic = useGame((s) => s.setCosmetic)

  const calm = !settings.flashes && !settings.shake && !settings.particles

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 10 }}>
          <h2 className="sheet__title">Settings</h2>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Sound &amp; effects</span>
          <div className="toggles">
            {TOGGLES.map((t) => (
              <button
                key={t.key}
                className={`toggle${settings[t.key] ? ' toggle--on' : ''}`}
                onClick={() => {
                  const next = { [t.key]: !settings[t.key] } as Partial<Settings>
                  setSettings(next)
                  audio.applySettings({ ...settings, ...next })
                  audio.tap()
                }}
              >
                <span className="toggle__icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
          <button
            className="btn"
            onClick={() => setSettings({ flashes: calm, shake: calm, particles: calm })}
          >
            {calm ? 'Turn effects back on' : 'Calm mode (no flashes, shake or splats)'}
          </button>
        </div>

        <div className="sheet__section">
          <span className="sheet__label">Goobers</span>
          <div className="cosmetics">
            {COSMETICS.filter((c) => c.kind === 'goober').map((c) => {
              const owned = cosmetics.includes(c.id)
              return (
                <button
                  key={c.id}
                  className={`cosmetic${goober === c.id ? ' cosmetic--active' : ''}${owned ? '' : ' cosmetic--locked'}`}
                  disabled={!owned}
                  onClick={() => setCosmetic(c.id)}
                >
                  <Goober hue={c.hue ?? 222} size={48} mood="happy" />
                  {owned ? c.name : `Lv ${c.level}`}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
