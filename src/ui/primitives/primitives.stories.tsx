import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'
import { Button, Chip, Label, Micro, Num, Panel, Pill, Scene, Sheet, SheetNote, SheetSection, StatRow, TargetBar, Toggle } from './index'
import { REGION_ART } from '../sprites'

const meta = {
  title: 'Primitives/Primitives',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta

const row = { display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }

export const Buttons: StoryObj<typeof Button> = {
  render: (args) => (
    <div style={row}>
      <Button {...args}>Done</Button>
      <Button {...args} variant="ghost" icon="⚙">
        Settings
      </Button>
      <Button {...args} variant="amber">
        Play
      </Button>
      <Button {...args} variant="amber" big iconAfter="→">
        Play
      </Button>
      <Button {...args} disabled>
        Disabled
      </Button>
    </div>
  ),
  args: { onClick: fn() },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

export const Text: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={row}>
        <Label>Current quest</Label>
        <Label amber>Unlock at</Label>
        <Num style={{ fontSize: 28, fontWeight: 700 }}>2,500</Num>
      </div>
      <div style={row}>
        <Pill>New best!</Pill>
        <Pill>Unlocked next</Pill>
        <Chip>
          <span style={{ color: 'var(--amber)' }}>★</span>
          <Num>3/6</Num>
        </Chip>
      </div>
      <Panel style={{ padding: 16 }}>A panel over the scene.</Panel>
    </div>
  ),
}

/** The corner copy is `--dimmer` on near-black (3.3:1) by design: decorative, hidden at phone width in runs. */
export const Scenes: StoryObj = {
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {(['sky', 'world', 'deep'] as const).map((v) => (
        <div key={v} style={{ position: 'relative', height: 180, borderRadius: 12, overflow: 'hidden' }}>
          <Scene variant={v} vignette={v === 'deep'} />
          <Micro corner="tl">{v}</Micro>
        </div>
      ))}
      {(['add', 'sub', 'mul', 'div'] as const).map((op) => (
        <div key={op} style={{ position: 'relative', height: 180, borderRadius: 12, overflow: 'hidden' }} data-region={op}>
          <Scene art={REGION_ART[op]} />
          <Micro corner="tl">art · {op}</Micro>
        </div>
      ))}
    </div>
  ),
}

export const Stats: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 320 }}>
      <StatRow icon="★" label="Score" index={0}>
        2,860 <Pill>New best!</Pill>
      </StatRow>
      <StatRow icon="⚡" label="Best streak" index={1}>
        12
      </StatRow>
      <TargetBar label="2,140 of 2,500 to unlock" pct={86} />
      <TargetBar label="3 of 10 facts learned" pct={30} />
    </div>
  ),
}

export const Toggles: StoryObj = {
  render: () => {
    const [on, setOn] = useState({ music: true, sfx: true, flashes: false })
    return (
      <div className="toggles" style={{ width: 300 }}>
        <Toggle icon="🎵" label="Music" on={on.music} onChange={(v) => setOn({ ...on, music: v })} />
        <Toggle icon="🔊" label="Sounds" on={on.sfx} onChange={(v) => setOn({ ...on, sfx: v })} />
        <Toggle icon="✨" label="Flashes" on={on.flashes} onChange={(v) => setOn({ ...on, flashes: v })} />
      </div>
    )
  },
}

export const SheetStory: StoryObj = {
  name: 'Sheet',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <Sheet title="Example" onClose={fn()}>
      <SheetSection label="A section">
        <SheetNote>Explanatory copy in the section's quiet style.</SheetNote>
        <Button>An action</Button>
      </SheetSection>
    </Sheet>
  ),
}
