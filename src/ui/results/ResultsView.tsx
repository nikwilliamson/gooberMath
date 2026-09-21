import type { Op } from '@/engine/types'
import { SplatBurst, SplatField } from '../art'
import { Button, Scene, TargetBar } from '../primitives'
import { GooberSprite, type Pose } from '../sprites'
import { ResultsStats, type ResultsStatsProps } from './ResultsStats'
import { RewardCard, type RewardCardProps } from './RewardCard'

export type ResultsTitle = 'Facts Mastered' | 'Quest Clear' | 'Warm-up Done' | 'Run Complete'

/** The Goober reacts to the run: clearing is a celebration, a bad run is not. */
export function poseForRun(accuracy: number, correct: number, cleared: boolean, newBest: boolean, perfect: boolean): Pose {
  if (cleared) return 'cheer'
  if (newBest || (perfect && correct > 5)) return 'jump'
  if (correct === 0) return 'dizzy'
  if (accuracy >= 0.85) return 'ready'
  if (accuracy >= 0.65) return 'stride'
  if (accuracy >= 0.45) return 'think'
  return 'sad'
}

export interface ResultsViewProps {
  region: Op
  title: ResultsTitle
  /** A warm-up: no bests, no bars. */
  untimed: boolean
  stats: ResultsStatsProps
  pose: Pose
  /** Seeds the decorative splats. */
  seed: number
  /** Progress toward the unlock score; null once the quest is cleared or for a warm-up. */
  unlock: { score: number; target: number } | null
  /** Progress toward mastery; null once mastered or for a warm-up. */
  mastery: { learned: number; required: number } | null
  /** The pending reward, if one was unlocked and not yet answered. */
  reward: Omit<RewardCardProps, 'onEquip' | 'onLater'> | null
  /** The next quest is open and this one is cleared. */
  canGoNext: boolean
  onMap: () => void
  onPlayAgain: () => void
  onNext: () => void
  onEquip: () => void
  onLater: () => void
}

const pct = (n: number, d: number) => Math.min(100, Math.round((n / Math.max(1, d)) * 100))

/** The end-of-run card from plain props. ResultsScreen wires it to the store. */
export function ResultsView({
  region, title, untimed, stats, pose, seed, unlock, mastery, reward, canGoNext, onMap, onPlayAgain, onNext, onEquip, onLater,
}: ResultsViewProps) {
  return (
    <div className="app" data-region={region}>
      <Scene variant="deep" vignette>
        <SplatField count={2} seed={seed % 13} color="#f5b21f" opacity={0.05} />
      </Scene>

      <div className="results screen-in">
        <div className="results__card">
          <h1 className="results__title screen-in">{title}</h1>

          <div className="results__body">
            <ResultsStats {...stats} />

            <div className="results__mascot">
              <SplatBurst className="splatbg fb-splat" color="#f5b21f" color2="#35d6ef" seed={seed % 7} />
              <GooberSprite pose={pose} width={160} className="reward-in" />
            </div>
          </div>

          {!untimed && (
            <div style={{ display: 'grid', gap: 12 }}>
              {unlock && (
                <TargetBar
                  label={`${unlock.score.toLocaleString()} of ${unlock.target.toLocaleString()} to unlock`}
                  pct={pct(unlock.score, unlock.target)}
                />
              )}
              {mastery && (
                <TargetBar
                  label={`${mastery.learned} of ${mastery.required} facts learned`}
                  pct={pct(mastery.learned, mastery.required)}
                />
              )}
            </div>
          )}

          <span className="results__quote">
            &ldquo;Faster facts.
            <br />
            Brighter worlds.&rdquo;
          </span>

          <div className="results__actions stagger" style={{ ['--i' as string]: 5 }}>
            <Button variant="ghost" onClick={onMap}>
              Map
            </Button>
            <Button variant="amber" onClick={onPlayAgain}>
              &#8635; Play again
            </Button>
            {canGoNext && (
              <Button variant="ghost" onClick={onNext}>
                Next &#8594;
              </Button>
            )}
          </div>
        </div>
      </div>

      {reward && <RewardCard {...reward} onEquip={onEquip} onLater={onLater} />}
    </div>
  )
}
