import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { withAppRoot, withGame } from '@/stories/decorators'
import { saves } from '@/stories/fixtures'
import { GrownUpsSheet } from './GrownUpsSheet'
import { SettingsSheet } from './SettingsSheet'

const meta = {
  title: 'Sheets/Sheets',
  component: SettingsSheet,
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
  args: { onClose: fn() },
} satisfies Meta<typeof SettingsSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Settings: Story = {
  decorators: [withGame({ save: saves.midway(), screen: 'map' })],
  render: (args) => <SettingsSheet {...args} />,
}

/** Every cosmetic owned. */
export const SettingsAllSkins: Story = {
  decorators: [withGame({ save: saves.mastered(), screen: 'map' })],
  render: (args) => <SettingsSheet {...args} />,
}

export const GrownUps: Story = {
  decorators: [withGame({ save: saves.midway(), screen: 'map' })],
  render: (args) => <GrownUpsSheet {...args} />,
}
