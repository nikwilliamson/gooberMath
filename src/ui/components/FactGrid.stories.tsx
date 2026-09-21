import type { Meta, StoryObj } from '@storybook/react-vite'
import { quest, questKeys, statsAt } from '@/stories/fixtures'
import { FactGrid } from './FactGrid'

const keys = questKeys(quest('add-4'))

const meta = {
  title: 'Components/FactGrid',
  component: FactGrid,
  args: { keys },
} satisfies Meta<typeof FactGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Untouched: Story = { args: { stats: {} } }
export const Learning: Story = { args: { stats: statsAt(keys, 'learning') } }
export const Known: Story = { args: { stats: statsAt(keys, 'known') } }
export const Automatic: Story = { args: { stats: statsAt(keys, 'automatic') } }
export const Mixed: Story = { args: { stats: statsAt(keys, 'mixed', 4) } }

/** The boss quest has the most facts; the grid has to stay tidy. */
export const Boss: Story = {
  args: { keys: questKeys(quest('add-boss')), stats: statsAt(questKeys(quest('add-boss')), 'mixed', 9) },
}
