import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { COSMETICS } from '@/store/cosmetics'
import { withAppRoot } from '@/stories/decorators'
import { ResultsView, type ResultsViewProps } from './ResultsView'

const base: ResultsViewProps = {
  region: 'add',
  title: 'Run Complete',
  untimed: false,
  stats: { score: 2_140, newBest: false, cleared: false, mastered: false, correct: 26, wrong: 4, bestStreak: 9, avgMs: 1_520, xpGained: 72 },
  pose: 'stride',
  seed: 2_140,
  unlock: { score: 2_140, target: 2_500 },
  mastery: { learned: 6, required: 10 },
  reward: null,
  canGoNext: false,
  onMap: fn(),
  onPlayAgain: fn(),
  onNext: fn(),
  onEquip: fn(),
  onLater: fn(),
}

const meta = {
  title: 'Results/ResultsView',
  component: ResultsView,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
  args: base,
} satisfies Meta<typeof ResultsView>

export default meta
type Story = StoryObj<typeof meta>

export const RunComplete: Story = {}

export const QuestClear: Story = {
  args: {
    title: 'Quest Clear',
    stats: { ...base.stats, score: 3_180, newBest: true, cleared: true, wrong: 0, xpGained: 168 },
    pose: 'cheer',
    unlock: null,
    canGoNext: true,
  },
}

export const FactsMastered: Story = {
  args: {
    title: 'Facts Mastered',
    stats: { ...base.stats, score: 3_420, mastered: true, cleared: true, xpGained: 248 },
    pose: 'cheer',
    unlock: null,
    mastery: null,
    canGoNext: true,
  },
}

export const NewBest: Story = {
  args: { stats: { ...base.stats, newBest: true }, pose: 'jump' },
}

export const BadRun: Story = {
  args: {
    stats: { score: 180, newBest: false, cleared: false, mastered: false, correct: 3, wrong: 7, bestStreak: 1, avgMs: 3_900, xpGained: 26 },
    pose: 'sad',
    seed: 180,
    unlock: { score: 180, target: 2_500 },
    mastery: { learned: 1, required: 10 },
  },
}

export const NothingAnswered: Story = {
  args: {
    stats: { score: 0, newBest: false, cleared: false, mastered: false, correct: 0, wrong: 0, bestStreak: 0, avgMs: null, xpGained: 20 },
    pose: 'dizzy',
    seed: 0,
    unlock: { score: 0, target: 2_500 },
  },
}

export const WarmUpDone: Story = {
  args: { title: 'Warm-up Done', untimed: true, unlock: null, mastery: null, pose: 'ready', region: 'mul' },
}

export const WithReward: Story = {
  args: { ...QuestClear.args, reward: { reward: COSMETICS.find((c) => c.id === 'goober-slate')!, index: 0 } },
}

export const MinusMarsh: Story = { args: { region: 'sub' } }
export const DividedDesert: Story = { args: { region: 'div' } }
