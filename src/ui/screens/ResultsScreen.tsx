import { useEffect, useState } from 'react'
import { audio } from '@/audio/engine'
import { questById, questsIn } from '@/engine/quests'
import { COSMETICS, cosmeticById } from '@/store/cosmetics'
import { questProgress, questStatus, targetFor, useGame } from '@/store/game'
import { ARENA_INKS, Goober, Rays, SplatField, Starburst } from '../art'

export function ResultsScreen() {
  const summary = useGame((s) => s.summary)
  const awards = useGame((s) => s.awards)
  const save = useGame((s) => s.save)
  const go = useGame((s) => s.go)
  const begin = useGame((s) => s.begin)
  const [unlockIdx, setUnlockIdx] = useState(0)

  const quest = summary ? questById(summary.questId) : null

  useEffect(() => {
    if (!awards) return
    audio.fanfare(awards.cleared || awards.newBest)
  }, [awards])

  if (!summary || !quest || !awards) return null

  const hue = cosmeticById(save.goober)?.hue ?? 222
  const target = targetFor(save, quest)
  const prog = questProgress(save, quest.id)
  const pct = Math.min(100, Math.round((summary.score / target) * 100))
  const siblings = questsIn(quest.region)
  const idx = siblings.findIndex((q) => q.id === quest.id)
  const nextQuest = siblings[idx + 1]
  const nextOpen = nextQuest ? questStatus(save, nextQuest) !== 'locked' : false

  const unlocked = awards.unlocked
  const showUnlock = unlockIdx < unlocked.length
  const current = showUnlock ? COSMETICS.find((c) => c.id === unlocked[unlockIdx]) : null

  const banner = awards.cleared
    ? 'Quest Clear!'
    : summary.untimed
      ? 'Warm-up done!'
      : awards.newBest
        ? 'New Best!'
        : 'Run Complete!'

  const mood = awards.cleared || awards.newBest ? 'cheer' : summary.accuracy > 0.6 ? 'happy' : 'sad'

  return (
    <div className="app" data-region={quest.region}>
      <div className="scene scene--arena">
        <SplatField count={8} seed={summary.score % 17} opacity={0.32} palette={ARENA_INKS} />
      </div>

      <div className="results">
        <div className="results__card">
          <span className="banner outline">{banner}</span>

          <div className="parch" style={{ position: 'relative', display: 'grid', gap: 12 }}>
            {awards.newBest && (
              <div className="starburst">
                <Starburst fill="#ffd233" />
                <span
                  style={{
                    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                    fontSize: '0.62rem', color: '#3b2a17', transform: 'rotate(-12deg)', lineHeight: 1.05,
                    textAlign: 'center',
                  }}
                >
                  NEW
                  <br />
                  BEST!
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Goober mood={mood} hue={hue} size={96} />
              <div className="scorelines" style={{ flex: 1 }}>
                <div className="scoreline">
                  <span className="scoreline__icon">&#11088;</span>
                  <span className="scoreline__k">Score</span>
                  <span className="scoreline__v tnum">{summary.score.toLocaleString()}</span>
                </div>
                <div className="scoreline">
                  <span className="scoreline__icon">&#127919;</span>
                  <span className="scoreline__k">Answers</span>
                  <span className="scoreline__v tnum">
                    {summary.correct}
                    {summary.wrong > 0 && <small style={{ opacity: 0.55 }}>&nbsp;&ndash;{summary.wrong}</small>}
                  </span>
                </div>
                <div className="scoreline">
                  <span className="scoreline__icon">&#128293;</span>
                  <span className="scoreline__k">Best streak</span>
                  <span className="scoreline__v tnum">{summary.bestStreak}</span>
                </div>
                {summary.fastestMs !== null && (
                  <div className="scoreline">
                    <span className="scoreline__icon">&#9889;</span>
                    <span className="scoreline__k">Fastest</span>
                    <span className="scoreline__v tnum">{(summary.fastestMs / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>

            {!summary.untimed && (
              <div className="targetline">
                <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {prog.cleared ? 'Quest cleared' : `${pct}% of ${target.toLocaleString()} to clear`}
                </span>
                <div className="bar">
                  <div className="bar__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="earned">
              <div className="earned__item">
                <span className="earned__icon">&#11088;</span>
                <strong>+{awards.xpGained}</strong>
                <span>Stars</span>
              </div>
              {awards.leveledTo && (
                <div className="earned__item">
                  <span className="earned__icon">&#127894;</span>
                  <strong>Level {awards.leveledTo}</strong>
                  <span>Reached</span>
                </div>
              )}
              {awards.perfect && (
                <div className="earned__item">
                  <span className="earned__icon">&#128081;</span>
                  <strong>Perfect</strong>
                  <span>No misses</span>
                </div>
              )}
              {unlocked.length > 0 && (
                <div className="earned__item">
                  <span className="earned__icon">&#127873;</span>
                  <strong>{unlocked.length}</strong>
                  <span>Unlocked</span>
                </div>
              )}
            </div>
          </div>

          <div className="results__actions">
            <button className="btn" onClick={() => go('map')}>
              &#127968; Map
            </button>
            <button className="btn btn--yellow" onClick={() => begin(quest.id, summary.mode, false)}>
              &#8635; Play again
            </button>
            {nextQuest && nextOpen && (
              <button className="btn btn--purple" onClick={() => begin(nextQuest.id, 'sniper', nextQuest.untimedFirst)}>
                Next quest &#8594;
              </button>
            )}
          </div>
        </div>
      </div>

      {showUnlock && current && (
        <div className="unlock">
          <Rays className="rays" />
          <div className="unlock__card">
            <span className="unlock__title outline outline--thick">Unlocked!</span>
            <span className="unlock__name outline">{current.name}</span>
            <span className="unlock__kind">
              {current.kind === 'goober' ? 'New Goober' : current.kind === 'pad' ? 'Pad Skin' : 'Sound Pack'}
            </span>
            {current.kind === 'goober' ? (
              <Goober mood="cheer" hue={current.hue ?? 222} size={170} className="pop" />
            ) : (
              <div className="pop" style={{ fontSize: '5rem' }}>
                {current.kind === 'pad' ? '🎮' : '🎵'}
              </div>
            )}
            <button
              className="btn btn--yellow btn--big"
              onClick={() => {
                audio.fanfare(true)
                setUnlockIdx((i) => i + 1)
              }}
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
