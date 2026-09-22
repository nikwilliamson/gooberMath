import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { questsIn, regionById } from '@/engine/quests'
import { UNLOCK_SCORE } from '@/engine/scoring'
import type { Op } from '@/engine/types'
import { withAppRoot } from '@/stories/decorators'
import { questKeys, statsAt } from '@/stories/fixtures'
import { MapView, type MapNode, type MapViewProps } from './MapView'

/** A region's ladder with the first `cleared` quests done and the next one current. */
function ladder(region: Op, cleared: number): MapNode[] {
  return questsIn(region).map((q, i) => {
    const done = i < cleared
    const current = i === cleared
    const keys = questKeys(q)
    return {
      quest: q,
      status: done ? 'cleared' : i <= cleared ? 'open' : 'locked',
      marker: done ? (i % 2 === 0 ? 'mastered' : 'cleared') : current ? 'current' : i === cleared + 1 ? 'open' : 'locked',
      active: current,
      learned: done ? keys.length : current ? Math.floor(keys.length / 3) : 0,
      required: Math.ceil(keys.length * 0.8),
      mastered: done && i % 2 === 0,
      perfect: done && i === 0,
      grid: { keys, stats: statsAt(keys, done ? 'automatic' : current ? 'mixed' : 'new', i) },
    }
  })
}

function view(region: Op, cleared: number, patch: Partial<MapViewProps> = {}): MapViewProps {
  const def = regionById(region)
  const nodes = ladder(region, cleared)
  const current = nodes[Math.min(cleared, nodes.length - 1)]
  return {
    region,
    header: { worldNo: ['add', 'sub', 'mul', 'div'].indexOf(region) + 1, name: def.name, blurb: def.blurb, cleared, total: nodes.length, onBack: fn(), onSettings: fn() },
    nodes,
    current: {
      quest: current.quest,
      cleared: current.status === 'cleared',
      mastered: current.mastered,
      unlockScore: current.quest.unlockScore ?? UNLOCK_SCORE,
      learned: current.learned,
      required: current.required,
      best: cleared > 0 ? 1200 + cleared * 300 : 0,
      bestVoice: cleared > 1 ? 2200 : 0,
      warmUp: Boolean(current.quest.untimedFirst),
      onWarmUp: fn(),
      onBlitz: fn(),
      onPlay: fn(),
    },
    tabs: {
      region,
      counts: { add: { done: 3, total: 6 }, sub: { done: 1, total: 6 }, mul: { done: 0, total: 4 }, div: { done: 0, total: 3 } },
      onChange: fn(),
    },
    onSelect: fn(),
    ...patch,
  }
}

const meta = {
  title: 'Map/MapView',
  component: MapView,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
} satisfies Meta<typeof MapView>

export default meta
type Story = StoryObj<typeof meta>

export const PlusPlains: Story = { args: view('add', 3) }
export const MinusMarsh: Story = { args: view('sub', 1) }
export const TimesTundra: Story = { args: view('mul', 0) }
export const DividedDesert: Story = { args: view('div', 0) }
export const AllCleared: Story = { args: view('add', 6) }
export const NothingSelectable: Story = { args: view('add', 0, { current: null }) }
export const BossNext: Story = { args: view('add', 5) }
