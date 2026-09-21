import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { withAppRoot } from '@/stories/decorators'
import { TitleView } from './TitleView'

const meta = {
  title: 'Screens/TitleView',
  component: TitleView,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
  args: { onPlay: fn(), onSettings: fn(), onGrownUps: fn() },
} satisfies Meta<typeof TitleView>

export default meta
type Story = StoryObj<typeof meta>

export const Title: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Play/ }))
    await expect(args.onPlay).toHaveBeenCalledTimes(1)
  },
}
