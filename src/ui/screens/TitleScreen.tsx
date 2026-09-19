import { audio } from '@/audio/engine'
import { cosmeticById } from '@/store/cosmetics'
import { useGame } from '@/store/game'
import { Cloud, Goober, SplatField } from '../art'

export function TitleScreen({ onSettings, onGrownUps }: { onSettings: () => void; onGrownUps: () => void }) {
  const go = useGame((s) => s.go)
  const gooberId = useGame((s) => s.save.goober)
  const hue = cosmeticById(gooberId)?.hue ?? 222

  const play = () => {
    audio.unlock()
    audio.fanfare()
    go('map')
  }

  return (
    <div className="app">
      <div className="scene scene--sky">
        <Cloud style={{ left: '4%', top: '9%', width: 150 }} />
        <Cloud style={{ left: '58%', top: '5%', width: 210 }} />
        <Cloud style={{ left: '30%', top: '21%', width: 110, opacity: 0.8 }} />
        <SplatField count={8} seed={3} opacity={0.42} />
      </div>

      <div className="title">
        <div className="title__top">
          <h1 className="logo outline outline--thick">
            <span>Goober</span>
            <b>Math</b>
          </h1>
          <p className="tagline">Practice today. Bigger tomorrow.</p>
          <Goober mood="cheer" hue={hue} size={190} className="bob" />
        </div>

        <div className="title__actions">
          <button className="btn btn--yellow btn--big" onClick={play}>
            Play
          </button>
          <div className="title__row">
            <button className="btn" onClick={onSettings}>
              <span className="btn__icon">&#9881;</span> Settings
            </button>
            <button className="btn" onClick={onGrownUps}>
              <span className="btn__icon">&#128101;</span> Grown-ups
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
