import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { COSMETICS } from '@/store/cosmetics'
import { ResultsStats } from './ResultsStats'
import { RewardCard } from './RewardCard'

const meta = {
  title: 'Results/Parts',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

const stats = { score: 2_860, newBest: false, cleared: false, mastered: false, correct: 31, wrong: 3, bestStreak: 12, avgMs: 1_340, xpGained: 82 }

export const Stats: StoryObj<typeof ResultsStats> = {
  render: (args) => (
    <div className="results__card" style={{ width: 360 }}>
      <ResultsStats {...args} />
    </div>
  ),
  args: stats,
}

export const StatsAllPills: StoryObj<typeof ResultsStats> = {
  ...Stats,
  args: { ...stats, newBest: true, cleared: true, mastered: true, wrong: 0, xpGained: 248 },
}

export const StatsNothingAnswered: StoryObj<typeof ResultsStats> = {
  ...Stats,
  args: { ...stats, score: 0, correct: 0, wrong: 4, bestStreak: 0, avgMs: null, xpGained: 20 },
}

export const RewardGoober: StoryObj<typeof RewardCard> = {
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="app" style={{ minHeight: '100dvh' }}>
      <RewardCard {...args} />
    </div>
  ),
  args: { reward: COSMETICS.find((c) => c.id === 'goober-slate')!, index: 0, onEquip: fn(), onLater: fn() },
}

export const RewardPad: StoryObj<typeof RewardCard> = {
  ...RewardGoober,
  args: { ...RewardGoober.args!, reward: COSMETICS.find((c) => c.id === 'pad-chunk')! },
}

export const RewardSound: StoryObj<typeof RewardCard> = {
  ...RewardGoober,
  args: { ...RewardGoober.args!, reward: COSMETICS.find((c) => c.id === 'sound-arcade')! },
}
