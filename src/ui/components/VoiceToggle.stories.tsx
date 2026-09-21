import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { withGame, withVoiceStatus } from '@/stories/decorators'
import { saves } from '@/stories/fixtures'
import { useGame } from '@/store/game'
import { VoiceToggle } from './VoiceToggle'

const voiceOn = () => {
  const s = saves.midway()
  return { ...s, settings: { ...s.settings, voice: true } }
}

const meta = {
  title: 'Components/VoiceToggle',
  component: VoiceToggle,
  decorators: [
    (Story) => (
      <div className="panel questbar__card" style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VoiceToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = { decorators: [withGame({ save: saves.midway() })] }

export const Loading: Story = { decorators: [withGame({ save: voiceOn() }), withVoiceStatus({ model: 'loading' })] }
export const Ready: Story = { decorators: [withGame({ save: voiceOn() }), withVoiceStatus({ model: 'ready' })] }
export const Missing: Story = { decorators: [withGame({ save: voiceOn() }), withVoiceStatus({ model: 'missing' })] }
export const LoadError: Story = { decorators: [withGame({ save: voiceOn() }), withVoiceStatus({ model: 'error' })] }
export const MicDenied: Story = { decorators: [withGame({ save: saves.midway() }), withVoiceStatus({ mic: 'denied' })] }

/** Switching on asks for the mic inside the tap, then flips the setting. */
export const SwitchOn: Story = {
  decorators: [withGame({ save: saves.midway() })],
  play: async ({ canvas, userEvent }) => {
    const sw = canvas.getByRole('switch')
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(useGame.getState().save.settings.voice).toBe(true)
  },
}
