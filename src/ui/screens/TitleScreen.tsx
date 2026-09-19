import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import { Crown, Goober, RoughText, SplatField } from '../art'

export function TitleScreen({ onSettings, onGrownUps }: { onSettings: () => void; onGrownUps: () => void }) {
  const go = useGame((s) => s.go)

  const play = () => {
    audio.unlock()
    audio.primeMusic()
    audio.fanfare()
    go('map')
  }

  return (
    <div className="app">
      <div className="scene scene--deep">
        <SplatField count={3} seed={5} color="#f5b21f" opacity={0.06} />
      </div>

      <span className="micro micro--tl">
        Practice
        <br />
        today.
        <br />
        Bigger
        <br />
        tomorrow.
      </span>
      <span className="micro micro--tr">
        Math
        <br />
        adventures
        <br />
        Real progress
        <br />
        More goobers
      </span>

      <div className="title">
        <div className="title__hero">
          <div className="wordmark">
            <Crown className="wordmark__crown" size={44} />
            <RoughText text="Goober" size={120} color="#ffffff" seed={4} className="wordmark__a" />
            <RoughText text="Math" size={120} color="var(--amber)" seed={9} className="wordmark__b" />
          </div>
          <Goober mood="idle" size={160} className="title__mascot bob" />
        </div>

        <div className="title__actions">
          <button className="btn btn--amber btn--big" onClick={play}>
            Play <span className="btn__icon">&#8594;</span>
          </button>
          <button className="btn btn--ghost" onClick={onSettings}>
            <span className="btn__icon">&#9881;</span> Settings
          </button>
          <button className="btn btn--ghost" onClick={onGrownUps}>
            <span className="btn__icon">&#128101;</span> Grown-ups
          </button>
        </div>
      </div>
    </div>
  )
}
