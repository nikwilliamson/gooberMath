import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { formatFact } from '@/engine/facts'
import { buildCtx, type RunState } from '@/engine/run'
import { comboMult } from '@/engine/scoring'
import { withAppRoot } from '@/stories/decorators'
import { quest, runs } from '@/stories/fixtures'
import { STICKER_ANCHORS } from '../sprites'
import { RunView, type RunViewProps } from './RunView'

/**
 * The run's rendering with no store, no countdown and no clock: every state
 * is a frozen frame, which is what you want for looking at layout.
 */
function fromRun(run: RunState, patch: Partial<RunViewProps> = {}): RunViewProps {
  const q = quest(run.questId)
  const fact = buildCtx(q).byKey.get(run.currentKey)!
  const mult = comboMult(run.streak)
  const held = run.phase === 'feedback' && run.lastCorrect === false
  const n = run.answers.length
  const last = run.answers[n - 1]
  const width = String(fact.answer).length
  return {
    region: q.region,
    mode: run.mode,
    untimed: run.untimed,
    count: 0,
    hud: { untimed: run.untimed, msLeft: run.msLeft, problemsLeft: run.problemsLeft, streak: run.streak, mult, comboStep: mult > 1 ? 1 : 0, onQuit: fn() },
    problem: {
      factKey: run.currentKey,
      left: formatFact(fact),
      slots: run.phase === 'playing' ? Array.from({ length: width }, (_, i) => run.entry[i] ?? '') : run.entry.split(''),
      glow: 0,
    },
    sticker: last ? { at: n, index: n + 3, missed: !last.correct, points: last.points, anchor: STICKER_ANCHORS[(n + 3) % 4] } : null,
    reveal: held ? { left: formatFact(fact), answer: fact.answer, entry: run.entry, ready: true } : null,
    shake: false,
    padLive: run.phase === 'playing',
    onDigit: fn(),
    onBackspace: fn(),
    onDismiss: fn(),
    ...patch,
  }
}

const meta = {
  title: 'Run/RunView',
  component: RunView,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
} satisfies Meta<typeof RunView>

export default meta
type Story = StoryObj<typeof meta>

export const Countdown: Story = { args: fromRun(runs.start(), { count: 3 }) }
export const FirstProblem: Story = { args: fromRun(runs.start()) }
export const Streak: Story = { args: fromRun(runs.streak()) }
export const PartialEntry: Story = { args: fromRun(runs.partialEntry()) }
export const HeldWrong: Story = { args: fromRun(runs.heldWrong()) }
export const LastTenSeconds: Story = { args: fromRun(runs.lastTen()) }
export const Untimed: Story = { args: fromRun(runs.untimed()) }
export const Blitz: Story = { args: fromRun(runs.streak({ mode: 'blitz' })) }
export const Shaking: Story = { args: fromRun(runs.heldWrong(), { shake: true }) }
export const MinusMarsh: Story = { args: fromRun(runs.streak({ questId: 'sub-2' })) }
export const TimesTundra: Story = { args: fromRun(runs.streak({ questId: 'mul-3' })) }
export const DividedDesert: Story = { args: fromRun(runs.streak({ questId: 'div-2' })) }
