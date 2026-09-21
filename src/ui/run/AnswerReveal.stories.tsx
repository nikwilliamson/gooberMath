import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { AnswerReveal } from './AnswerReveal'

const meta = {
  title: 'Run/AnswerReveal',
  component: AnswerReveal,
  decorators: [
    (Story) => (
      <div className="run" style={{ width: 390, height: 420, flex: 'none' }}>
        <div className="board">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { left: '7 + 8', answer: 15, entry: '14', ready: true, onDismiss: fn() },
} satisfies Meta<typeof AnswerReveal>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

/** The first 450ms: the hint is dim and taps are ignored. */
export const NotYet: Story = {
  args: { ready: false },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next problem' }))
    await expect(args.onDismiss).not.toHaveBeenCalled()
  },
}

/** Spoken answers can be wider than the slots; the reveal shows exactly what was heard. */
export const SpokenWrong: Story = { args: { entry: '100', answer: 10, left: '5 × 2' } }

/** Timed out with nothing entered. */
export const NoEntry: Story = { args: { entry: '' } }

export const Dismiss: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next problem' }))
    await expect(args.onDismiss).toHaveBeenCalledTimes(1)
  },
}
