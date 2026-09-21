import { Button, Micro, Scene } from '../primitives'
import { ART } from '../sprites'
import './TitleView.css'

export interface TitleViewProps {
  onPlay: () => void
  onSettings: () => void
  onGrownUps: () => void
}

/** The title screen from plain props. TitleScreen wires it to audio and the store. */
export function TitleView({ onPlay, onSettings, onGrownUps }: TitleViewProps) {
  return (
    <div className="app">
      <Scene variant="world" />

      <Micro corner="tl">
        Practice
        <br />
        today.
        <br />
        Bigger
        <br />
        tomorrow.
      </Micro>
      <Micro corner="tr">
        Math
        <br />
        adventures
        <br />
        Real progress
        <br />
        More goobers
      </Micro>

      <div className="title screen-in">
        <div className="title__hero">
          <img src={ART.logo} alt="GooberMath" className="wordmark" width={1000} height={644} />
          <img src={ART.goober} alt="" className="title__mascot bob" width={700} height={678} />
        </div>

        <div className="title__actions">
          <Button variant="amber" big iconAfter={<>&#8594;</>} onClick={onPlay}>
            Play
          </Button>
          <Button variant="ghost" icon={<>&#9881;</>} onClick={onSettings}>
            Settings
          </Button>
          <Button variant="ghost" icon={<>&#128101;</>} onClick={onGrownUps}>
            Grown-ups
          </Button>
        </div>
      </div>
    </div>
  )
}
