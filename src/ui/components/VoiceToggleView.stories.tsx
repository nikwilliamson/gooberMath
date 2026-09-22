import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { voiceNote } from './VoiceToggle'
import { VoiceToggleView } from './VoiceToggleView'

const meta = {
  title: 'Components/VoiceToggleView',
  component: VoiceToggleView,
  decorators: [
    (Story) => (
      <div className="panel questbar__card" style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: { on: false, busy: false, note: null, onToggle: fn() },
} satisfies Meta<typeof VoiceToggleView>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
/** Mic prompt up. The label dims to 3.4:1 here — a real finding, left as the app has it. */
export const Asking: Story = {
  args: { busy: true },
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
}
export const Loading: Story = { args: { on: true, busy: true } }
export const Ready: Story = { args: { on: true } }
export const Missing: Story = { args: { on: true, note: voiceNote(true, 'missing', false, false) } }
export const LoadError: Story = { args: { on: true, note: voiceNote(true, 'error', false, false) } }
export const MicDenied: Story = { args: { note: voiceNote(false, 'idle', true, false) } }
export const Crashed: Story = { args: { note: voiceNote(false, 'idle', false, true) } }
