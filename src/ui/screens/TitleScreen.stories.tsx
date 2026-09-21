import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { withAppRoot, withGame } from '@/stories/decorators'
import { TitleScreen } from './TitleScreen'

const meta = {
  title: 'Screens/Title',
  component: TitleScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot, withGame()],
  args: { onSettings: fn(), onGrownUps: fn() },
} satisfies Meta<typeof TitleScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Title: Story = {}
