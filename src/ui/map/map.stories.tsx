import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { UNLOCK_SCORE } from '@/engine/scoring'
import type { Op } from '@/engine/types'
import { quest, questKeys, statsAt } from '@/stories/fixtures'
import { FactGrid } from '../components/FactGrid'
import { MapHeader } from './MapHeader'
import { OpTabs } from './OpTabs'
import { QuestBar } from './QuestBar'
import { QuestNode } from './QuestNode'

const meta = {
  title: 'Map/Parts',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="map" style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta

export const Header: StoryObj<typeof MapHeader> = {
  render: (args) => <MapHeader {...args} />,
  args: { worldNo: 1, name: 'Plus Plains', op: 'add', blurb: 'Where the numbers gather.', cleared: 3, total: 6, onBack: fn(), onSettings: fn() },
}

const q = quest('add-4')
const nodeArgs = {
  index: 3,
  quest: q,
  status: 'open' as const,
  marker: 'current' as const,
  active: false,
  learned: 5,
  required: 10,
  mastered: false,
  perfect: false,
  onSelect: fn(),
}

/** The five marker states a rung can be in, in a `.nodes` list. */
export const Nodes: StoryObj<typeof QuestNode> = {
  render: () => (
    <div className="nodes">
      <QuestNode {...nodeArgs} index={0} quest={quest('add-1')} status="cleared" marker="mastered" learned={12} required={12} mastered perfect>
        <FactGrid keys={questKeys(quest('add-1'))} stats={statsAt(questKeys(quest('add-1')), 'automatic')} />
      </QuestNode>
      <QuestNode {...nodeArgs} index={1} quest={quest('add-2')} status="cleared" marker="cleared" learned={7} required={8}>
        <FactGrid keys={questKeys(quest('add-2'))} stats={statsAt(questKeys(quest('add-2')), 'known')} />
      </QuestNode>
      <QuestNode {...nodeArgs} index={2} quest={quest('add-3')} status="open" marker="current" active>
        <FactGrid keys={questKeys(quest('add-3'))} stats={statsAt(questKeys(quest('add-3')), 'mixed')} />
      </QuestNode>
      <QuestNode {...nodeArgs} index={3} quest={quest('add-4')} status="open" marker="open" learned={0}>
        <FactGrid keys={questKeys(quest('add-4'))} stats={{}} />
      </QuestNode>
      <QuestNode {...nodeArgs} index={5} quest={quest('add-boss')} status="locked" marker="locked" learned={0}>
        <FactGrid keys={questKeys(quest('add-boss'))} stats={{}} />
      </QuestNode>
    </div>
  ),
}

const barArgs = {
  quest: q,
  cleared: false,
  mastered: false,
  unlockScore: UNLOCK_SCORE,
  learned: 5,
  required: 10,
  best: 1760,
  bestVoice: 0,
  warmUp: false,
  onWarmUp: fn(),
  onBlitz: fn(),
  onPlay: fn(),
}

export const Bar: StoryObj<typeof QuestBar> = {
  render: (args) => (
    <div className="questbar">
      <QuestBar {...args} />
    </div>
  ),
  args: barArgs,
}

export const BarCleared: StoryObj<typeof QuestBar> = { ...Bar, args: { ...barArgs, cleared: true, mastered: true, learned: 10, best: 3480, bestVoice: 2210 } }

/** New content offers a warm-up the first time. */
export const BarWithWarmUp: StoryObj<typeof QuestBar> = { ...Bar, args: { ...barArgs, quest: quest('mul-1'), warmUp: true } }

const counts: Record<Op, { done: number; total: number }> = {
  add: { done: 3, total: 6 }, sub: { done: 0, total: 6 }, mul: { done: 0, total: 4 }, div: { done: 0, total: 3 },
}

export const Tabs: StoryObj<typeof OpTabs> = {
  render: (args) => (
    <div className="questbar">
      <OpTabs {...args} />
    </div>
  ),
  args: { region: 'add', counts, onChange: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Multiply/ }))
    await expect(args.onChange).toHaveBeenCalledWith('mul')
  },
}
