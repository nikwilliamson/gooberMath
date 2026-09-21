import type { Meta, StoryObj } from '@storybook/react-vite'
import { withAppRoot, withGame } from '@/stories/decorators'
import { results, saves } from '@/stories/fixtures'
import { ResultsScreen } from './ResultsScreen'

const meta = {
  title: 'Screens/Results',
  component: ResultsScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
} satisfies Meta<typeof ResultsScreen>

export default meta
type Story = StoryObj<typeof meta>

const at = (r: () => ReturnType<typeof results.cleared>, save = saves.midway()) =>
  withGame(() => ({ save, screen: 'results', ...r() }))

/** Unlocked the next quest: cheer pose, "Unlocked next" pill, Next button. */
export const Cleared: Story = { decorators: [at(results.cleared)] }

/** Beat the best, not the unlock score: the unlock bar shows how close. */
export const NewBest: Story = { decorators: [at(results.newBest)] }

/** Mastery takes the headline. */
export const Mastered: Story = { decorators: [at(results.mastered)] }

/** Levelled up: the reward card sits over the results. */
export const Reward: Story = { decorators: [at(results.reward)] }

/** More misses than hits. */
export const BadRun: Story = { decorators: [at(results.badRun)] }

/** Warm-up done: no bars, no bests. */
export const WarmUp: Story = { decorators: [at(results.warmup)] }
