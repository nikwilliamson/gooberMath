import type { ReactNode } from 'react'
import type { Mode, Op } from '@/engine/types'
import { InkLayer } from '../components/InkLayer'
import { NumberPad } from '../components/NumberPad'
import { Micro, Scene, cx } from '../primitives'
import { LEVEL_ART } from '../sprites'
import { AnswerReveal, type AnswerRevealProps } from './AnswerReveal'
import { Countdown } from './Countdown'
import { Hud, type HudProps } from './Hud'
import { ProblemCard, type ProblemCardProps } from './ProblemCard'
import { StickerZone, type StickerProps } from './Sticker'
import './RunView.css'

export interface RunViewProps {
  region: Op
  mode: Mode
  untimed: boolean
  /** Countdown digit; 0 once the run is live. */
  count: number
  hud: Omit<HudProps, 'children'>
  problem: Omit<ProblemCardProps, 'children'>
  sticker: StickerProps | null
  /** The held wrong-answer reveal, when there is one. */
  reveal: Omit<AnswerRevealProps, 'onDismiss'> | null
  effects: {
    particles: boolean
    /** Bumped on every answer; the ink layer bursts on change. */
    pulse: number
    /** 0..1, how hard the ink bursts. */
    intensity: number
    /** The board is mid-shake after a miss. */
    shake: boolean
  }
  /** The pad accepts input. */
  padLive: boolean
  onDigit: (d: number) => void
  onBackspace: () => void
  onDismiss: () => void
  /** Rendered in the HUD between the clock and the combo (the voice chip). */
  hudExtra?: ReactNode
  /** Rendered at the top of the problem card (the voice nudge). */
  problemExtra?: ReactNode
}

export const modeName = (mode: Mode, untimed: boolean) =>
  untimed ? 'Warm-up' : mode === 'blitz' ? 'Blitz Mode' : 'Sniper Mode'

export const modeHint = (mode: Mode) => (mode === 'blitz' ? 'Same facts. Faster you.' : 'Misses cost three seconds.')

/** Everything the run puts on screen, from plain props. RunScreen wires it to the store. */
export function RunView({
  region,
  mode,
  untimed,
  count,
  hud,
  problem,
  sticker,
  reveal,
  effects,
  padLive,
  onDigit,
  onBackspace,
  onDismiss,
  hudExtra,
  problemExtra,
}: RunViewProps) {
  const showWrong = reveal !== null
  return (
    <div className="app" data-region={region}>
      <Scene art={LEVEL_ART[region]} level />

      <div className="run">
        <Hud {...hud}>{hudExtra}</Hud>

        <div className={cx('board', effects.shake && 'shake')}>
          {effects.particles && <InkLayer pulse={effects.pulse} enabled={effects.particles} intensity={effects.intensity} />}

          <StickerZone zone="top" sticker={sticker} />

          <ProblemCard {...problem} dim={showWrong}>
            {problemExtra}
          </ProblemCard>

          <StickerZone zone="bottom" sticker={sticker} />

          {reveal && <AnswerReveal {...reveal} onDismiss={onDismiss} />}
        </div>

        <div className="padwrap" onClick={showWrong && reveal.ready ? onDismiss : undefined}>
          <div className={showWrong ? 'pad--dim' : ''} style={{ width: '100%', display: 'grid', placeItems: 'center' }}>
            <NumberPad onDigit={onDigit} onBackspace={onBackspace} disabled={!padLive} />
          </div>
        </div>

        <Countdown count={count} modeName={modeName(mode, untimed)} hint={modeHint(mode)} />
      </div>

      {count === 0 && (
        <Micro corner="br" run>
          {mode === 'blitz' ? (
            <>
              Focus
              <br />
              Solve
              <br />
              Repeat
            </>
          ) : showWrong ? (
            <>
              Learn
              <br />
              Adapt
              <br />
              Come back
              <br />
              stronger
            </>
          ) : (
            <>
              Keep
              <br />
              the
              <br />
              streak
            </>
          )}
        </Micro>
      )}
    </div>
  )
}
