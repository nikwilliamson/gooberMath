import { Pill, StatRow } from '../primitives'

export interface ResultsStatsProps {
  score: number
  newBest: boolean
  cleared: boolean
  mastered: boolean
  correct: number
  wrong: number
  bestStreak: number
  /** Mean correct-answer time; null when nothing was answered. */
  avgMs: number | null
  xpGained: number
}

/** The five stat rows of the results card. */
export function ResultsStats({ score, newBest, cleared, mastered, correct, wrong, bestStreak, avgMs, xpGained }: ResultsStatsProps) {
  return (
    <div className="results__stats">
      <StatRow icon="&#9733;" label="Score" index={0}>
        {score.toLocaleString()}
        {newBest && <Pill>New best!</Pill>}
        {cleared && <Pill>Unlocked next</Pill>}
        {mastered && <Pill>Mastered</Pill>}
      </StatRow>
      <StatRow icon="&#10003;" label="Answers" index={1}>
        {correct}
        {wrong > 0 && <small style={{ color: 'var(--dim)', fontWeight: 400 }}>&middot; {wrong} missed</small>}
      </StatRow>
      <StatRow icon="&#9889;" label="Best streak" index={2}>
        {bestStreak}
      </StatRow>
      {avgMs !== null && (
        <StatRow icon="&#9201;" label="Avg time" index={3}>
          {(avgMs / 1000).toFixed(1)}s
        </StatRow>
      )}
      <StatRow icon="&#9819;" label="Stars earned" index={4}>
        +{xpGained}
      </StatRow>
    </div>
  )
}
