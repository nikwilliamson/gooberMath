import { useEffect, useState } from 'react'
import { audio } from '@/audio/engine'
import { questById, questsIn } from '@/engine/quests'
import { COSMETICS } from '@/store/cosmetics'
import { questProgress, questStatus, targetFor, useGame } from '@/store/game'
import { GooberCap, RoughText, SplatBurst, SplatField } from '../art'
import { GooberSprite, type Pose } from '../sprites'

/** The Goober reacts to the run: clearing is a celebration, a bad run is not. */
function poseForRun(
  accuracy: number,
  correct: number,
  cleared: boolean,
  newBest: boolean,
  perfect: boolean,
): Pose {
  if (cleared) return 'cheer'
  if (newBest || (perfect && correct > 5)) return 'jump'
  if (correct === 0) return 'dizzy'
  if (accuracy >= 0.85) return 'ready'
  if (accuracy >= 0.65) return 'stride'
  if (accuracy >= 0.45) return 'think'
  return 'sad'
}

export function ResultsScreen() {
  const summary = useGame((s) => s.summary)
  const awards = useGame((s) => s.awards)
  const save = useGame((s) => s.save)
  const go = useGame((s) => s.go)
  const begin = useGame((s) => s.begin)
  const setCosmetic = useGame((s) => s.setCosmetic)
  const [rewardIdx, setRewardIdx] = useState(0)

  const quest = summary ? questById(summary.questId) : null

  useEffect(() => {
    if (!awards) return
    audio.fanfare(awards.cleared || awards.newBest)
  }, [awards])

  if (!summary || !quest || !awards) return null

  const target = targetFor(save, quest)
  const prog = questProgress(save, quest.id)
  const pct = Math.min(100, Math.round((summary.score / target) * 100))
  const siblings = questsIn(quest.region)
  const idx = siblings.findIndex((q) => q.id === quest.id)
  const nextQuest = siblings[idx + 1]
  const nextOpen = nextQuest ? questStatus(save, nextQuest) !== 'locked' : false

  const rewards = awards.unlocked
  const showReward = rewardIdx < rewards.length
  const reward = showReward ? COSMETICS.find((c) => c.id === rewards[rewardIdx]) : null

  const title = awards.cleared
    ? 'Quest Clear'
    : summary.untimed
      ? 'Warm-up Done'
      : 'Run Complete'

  return (
    <div className="app" data-region={quest.region}>
      <div className="scene scene--deep scene--vignette">
        <SplatField count={2} seed={summary.score % 13} color="#f5b21f" opacity={0.05} />
      </div>

      <div className="results screen-in">
        <div className="results__card">
          <h1 className="results__title screen-in">{title}</h1>

          <div className="results__body">
            <div className="results__stats">
              <div className="statrow stagger" style={{ ['--i' as string]: 0 }}>
                <span className="statrow__icon">&#9733;</span>
                <div className="statrow__body">
                  <span className="label">Score</span>
                  <span className="statrow__v tnum">
                    {summary.score.toLocaleString()}
                    {awards.newBest && <span className="pill">New best!</span>}
                    {awards.cleared && <span className="pill">Cleared</span>}
                  </span>
                </div>
              </div>
              <div className="statrow stagger" style={{ ['--i' as string]: 1 }}>
                <span className="statrow__icon">&#10003;</span>
                <div className="statrow__body">
                  <span className="label">Answers</span>
                  <span className="statrow__v tnum">
                    {summary.correct}
                    {summary.wrong > 0 && (
                      <small style={{ color: 'var(--dim)', fontWeight: 400 }}>&middot; {summary.wrong} missed</small>
                    )}
                  </span>
                </div>
              </div>
              <div className="statrow stagger" style={{ ['--i' as string]: 2 }}>
                <span className="statrow__icon">&#9889;</span>
                <div className="statrow__body">
                  <span className="label">Best streak</span>
                  <span className="statrow__v tnum">{summary.bestStreak}</span>
                </div>
              </div>
              {summary.avgMs !== null && (
                <div className="statrow stagger" style={{ ['--i' as string]: 3 }}>
                  <span className="statrow__icon">&#9201;</span>
                  <div className="statrow__body">
                    <span className="label">Avg time</span>
                    <span className="statrow__v tnum">{(summary.avgMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              )}
              <div className="statrow stagger" style={{ ['--i' as string]: 4 }}>
                <span className="statrow__icon">&#9819;</span>
                <div className="statrow__body">
                  <span className="label">Stars earned</span>
                  <span className="statrow__v tnum">+{awards.xpGained}</span>
                </div>
              </div>
            </div>

            <div className="results__mascot">
              <SplatBurst className="splatbg fb-splat" color="#f5b21f" color2="#35d6ef" seed={summary.score % 7} />
              <GooberSprite
                pose={poseForRun(
                  summary.accuracy,
                  summary.correct,
                  awards.cleared,
                  awards.newBest,
                  summary.perfect,
                )}
                width={160}
                className="reward-in"
              />
            </div>
          </div>

          {!summary.untimed && !prog.cleared && (
            <div style={{ display: 'grid', gap: 6 }}>
              <span className="label">
                {pct}% of {target.toLocaleString()} to clear
              </span>
              <div className="targetbar">
                <div className="targetbar__fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <span className="results__quote">
            &ldquo;Faster facts.
            <br />
            Brighter worlds.&rdquo;
          </span>

          <div className="results__actions stagger" style={{ ['--i' as string]: 5 }}>
            <button className="btn btn--ghost" onClick={() => go('map')}>
              Map
            </button>
            <button className="btn btn--amber" onClick={() => begin(quest.id, summary.mode, false)}>
              &#8635; Play again
            </button>
            {nextQuest && nextOpen && prog.cleared && (
              <button className="btn btn--ghost" onClick={() => begin(nextQuest.id, 'sniper', nextQuest.untimedFirst)}>
                Next &#8594;
              </button>
            )}
          </div>
        </div>
      </div>

      {showReward && reward && (
        <div className="reward">
          <div className="reward__card">
            <RoughText text="New Reward!" size={72} color="#ffffff" seed={6} className="fb-word" style={{ maxWidth: 420 }} />
            <div className="reward__art">
              <span className="reward__glow reward-glow" />
              <SplatBurst className="reward__splat fb-splat" color="#f5b21f" color2="#35d6ef" seed={rewardIdx + 3} />
              {reward.kind === 'goober' ? (
                <GooberSprite pose="cheer" width={180} className="reward-in" />
              ) : (
                <GooberCap size={190} className="reward-in" />
              )}
            </div>
            <span className="reward__name">{reward.name}</span>
            <span className="reward__kind">
              {reward.kind === 'goober' ? 'Goober skin' : reward.kind === 'pad' ? 'Pad skin' : 'Sound pack'}
            </span>
            <div className="reward__actions">
              <button
                className="btn btn--amber"
                onClick={() => {
                  audio.fanfare(true)
                  setCosmetic(reward.id)
                  setRewardIdx((i) => i + 1)
                }}
              >
                Equip
              </button>
              <button className="btn btn--ghost" onClick={() => setRewardIdx((i) => i + 1)}>
                Later
              </button>
            </div>
            <span className="label">More to unlock. Keep going.</span>
          </div>
        </div>
      )}
    </div>
  )
}
