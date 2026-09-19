import { audio } from '@/audio/engine'
import { useGame } from '@/store/game'
import { Goober, SplatField } from '../art'
import { ART } from '../sprites'

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
      <div className="scene scene--world">
        <SplatField count={3} seed={5} color="#f5b21f" opacity={0.1} />
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

      <div className="title screen-in">
        <div className="title__hero">
          <img src={ART.logo} alt="GooberMath" className="wordmark" width={1000} height={644} />
          <Goober mood="cheer" size={200} className="title__mascot bob" />
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
