import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { DEFAULT_SAVE } from '@/store/types'
import { withAppRoot } from '@/stories/decorators'
import { GrownUpsPanel, type QuestRow } from './GrownUpsPanel'
import { SettingsPanel } from './SettingsPanel'

const meta = {
  title: 'Sheets/Panels',
  parameters: { layout: 'fullscreen' },
  decorators: [withAppRoot],
} satisfies Meta

export default meta

const settingsArgs = {
  settings: DEFAULT_SAVE.settings,
  owned: ['goober-classic', 'pad-ink', 'goober-slate'],
  goober: 'goober-classic',
  onToggle: fn(),
  onCalm: fn(),
  onCosmetic: fn(),
  onClose: fn(),
}

export const Settings: StoryObj<typeof SettingsPanel> = {
  render: (args) => <SettingsPanel {...args} />,
  args: settingsArgs,
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Music/ }))
    await expect(args.onToggle).toHaveBeenCalledWith('music', false)
    await userEvent.click(canvas.getByRole('button', { name: /Calm mode/ }))
    await expect(args.onCalm).toHaveBeenCalledWith(true)
  },
}

export const SettingsCalm: StoryObj<typeof SettingsPanel> = {
  ...Settings,
  play: undefined,
  args: { ...settingsArgs, settings: { ...DEFAULT_SAVE.settings, flashes: false, shake: false, particles: false }, goober: 'goober-slate' },
}

const rows: QuestRow[] = [
  { id: 'add-1', name: 'Count On', mastered: true, cleared: true, automatic: 12, known: 0, learning: 0, total: 12, medianMs: 910, bestSniper: 4120 },
  { id: 'add-2', name: 'Double Trouble', mastered: true, cleared: true, automatic: 7, known: 1, learning: 0, total: 8, medianMs: 1180, bestSniper: 3480 },
  { id: 'add-3', name: 'Make Ten', mastered: false, cleared: true, automatic: 3, known: 5, learning: 1, total: 9, medianMs: 1900, bestSniper: 2890 },
  { id: 'add-4', name: 'Near Doubles', mastered: false, cleared: false, automatic: 1, known: 2, learning: 7, total: 10, medianMs: 2600, bestSniper: 1760 },
  { id: 'sub-1', name: 'Count Back', mastered: false, cleared: false, automatic: 0, known: 0, learning: 12, total: 12, medianMs: 0, bestSniper: 0 },
]

export const GrownUps: StoryObj<typeof GrownUpsPanel> = {
  render: (args) => <GrownUpsPanel {...args} />,
  args: {
    rows,
    slowest: [
      { key: 'add:8+7', ewmaMs: 4100, accuracy: 0.6, tier: 'learning' },
      { key: 'add:9+6', ewmaMs: 3300, accuracy: 0.8, tier: 'learning' },
      { key: 'add:7+4', ewmaMs: 2400, accuracy: 1, tier: 'known' },
    ],
    voiceNote: 'Installed on this device.',
    onRemoveVoice: fn(),
    io: '',
    onIoChange: fn(),
    ioNote: '',
    onExport: fn(),
    onImport: fn(),
    onClose: fn(),
  },
}

export const GrownUpsExported: StoryObj<typeof GrownUpsPanel> = {
  ...GrownUps,
  args: { ...GrownUps.args!, io: JSON.stringify(DEFAULT_SAVE, null, 2), ioNote: 'Copy this text, then paste it on the other device.' },
}

export const GrownUpsFresh: StoryObj<typeof GrownUpsPanel> = {
  ...GrownUps,
  args: { ...GrownUps.args!, rows: rows.map((r) => ({ ...r, mastered: false, cleared: false, automatic: 0, known: 0, learning: r.total, medianMs: 0, bestSniper: 0 })), slowest: [], voiceNote: '' },
}
