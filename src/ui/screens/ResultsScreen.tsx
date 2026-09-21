import { useEffect, useState } from 'react'
import { audio } from '@/audio/engine'
import { questById, questsIn } from '@/engine/quests'
import { UNLOCK_SCORE } from '@/engine/scoring'
import { COSMETICS } from '@/store/cosmetics'
import { questMastery, questProgress, questStatus, useGame } from '@/store/game'
import { ResultsView, poseForRun, type ResultsTitle } from '../results/ResultsView'

/** Wires the run summary to the store; ResultsView draws it. */
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

  const prog = questProgress(save, quest.id)
  const mastery = questMastery(save, quest)
  const siblings = questsIn(quest.region)
  const idx = siblings.findIndex((q) => q.id === quest.id)
  const nextQuest = siblings[idx + 1]
  const nextOpen = nextQuest ? questStatus(save, nextQuest) !== 'locked' : false

  const rewards = awards.unlocked
  const reward = rewardIdx < rewards.length ? COSMETICS.find((c) => c.id === rewards[rewardIdx]) : null

  // Unlocking is the gate; mastery is the achievement, so it takes the headline.
  const unlockScore = quest.unlockScore ?? UNLOCK_SCORE

  const title: ResultsTitle = awards.mastered
    ? 'Facts Mastered'
    : awards.cleared
      ? 'Quest Clear'
      : summary.untimed
        ? 'Warm-up Done'
        : 'Run Complete'

  return (
    <ResultsView
      region={quest.region}
      title={title}
      untimed={summary.untimed}
      stats={{
        score: summary.score,
        newBest: awards.newBest,
        cleared: awards.cleared,
        mastered: awards.mastered,
        correct: summary.correct,
        wrong: summary.wrong,
        bestStreak: summary.bestStreak,
        avgMs: summary.avgMs,
        xpGained: awards.xpGained,
      }}
      pose={poseForRun(summary.accuracy, summary.correct, awards.cleared, awards.newBest, summary.perfect)}
      seed={summary.score}
      unlock={!summary.untimed && !prog.cleared ? { score: summary.score, target: unlockScore } : null}
      mastery={!summary.untimed && !prog.mastered ? { learned: mastery.learned, required: mastery.required } : null}
      reward={reward ? { reward, index: rewardIdx } : null}
      canGoNext={Boolean(nextQuest && nextOpen && prog.cleared)}
      onMap={() => go('map')}
      onPlayAgain={() => begin(quest.id, summary.mode, false)}
      onNext={() => nextQuest && begin(nextQuest.id, 'sniper', nextQuest.untimedFirst)}
      onEquip={() => {
        if (!reward) return
        audio.fanfare(true)
        setCosmetic(reward.id)
        setRewardIdx((i) => i + 1)
      }}
      onLater={() => setRewardIdx((i) => i + 1)}
    />
  )
}
