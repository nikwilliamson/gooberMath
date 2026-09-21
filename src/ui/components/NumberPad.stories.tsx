import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { NumberPad } from './NumberPad'

const meta = {
  title: 'Components/NumberPad',
  component: NumberPad,
  args: { onDigit: fn(), onBackspace: fn(), disabled: false },
} satisfies Meta<typeof NumberPad>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }

/** Keys submit on pointerdown, not click: the tap has to count the instant it lands. */
export const Taps: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const seven = canvas.getByRole('button', { name: '7' })
    await userEvent.pointer({ keys: '[MouseLeft>]', target: seven })
    await expect(args.onDigit).toHaveBeenCalledWith(7)
    await userEvent.pointer({ keys: '[MouseLeft>]', target: canvas.getByRole('button', { name: '0' }) })
    await expect(args.onDigit).toHaveBeenLastCalledWith(0)
    await userEvent.pointer({ keys: '[MouseLeft>]', target: canvas.getByRole('button', { name: 'Backspace' }) })
    await expect(args.onBackspace).toHaveBeenCalledTimes(1)
  },
}
