import type { Preview } from '@storybook/react-vite'
import { INITIAL_VIEWPORTS } from 'storybook/viewport'
import '../src/styles/app.css'
import './storybook.css'

/** The game is phone-first; a desktop canvas misrepresents nearly every screen. */
const VIEWPORTS = {
  iphone: { ...INITIAL_VIEWPORTS.iphone14, name: 'iPhone' },
  iphoneLandscape: {
    name: 'iPhone landscape',
    type: 'mobile' as const,
    styles: { width: INITIAL_VIEWPORTS.iphone14.styles.height, height: INITIAL_VIEWPORTS.iphone14.styles.width },
  },
  ipad: { ...INITIAL_VIEWPORTS.ipad10p, name: 'iPad' },
  desktop: { name: 'Desktop', type: 'desktop' as const, styles: { width: '1280px', height: '800px' } },
}

export default {
  parameters: {
    layout: 'centered',
    backgrounds: {
      options: {
        bg: { name: 'App background', value: '#080a10' },
        panel: { name: 'Panel', value: '#151926' },
      },
    },
    viewport: { options: VIEWPORTS },
    a11y: {
      // Failing a11y checks fail the story test run.
      test: 'error',
    },
    options: {
      storySort: {
        order: ['Foundations', 'Primitives', 'Components', 'Run', 'Map', 'Results', 'Sheets', 'Screens'],
      },
    },
  },
  globalTypes: {
    region: {
      description: 'Sets --ink to the region accent, like the screens do with data-region.',
      toolbar: {
        title: 'Region',
        icon: 'paintbrush',
        items: [
          { value: 'add', title: 'Plus Plains (amber)' },
          { value: 'sub', title: 'Minus Marsh (white)' },
          { value: 'mul', title: 'Times Tundra (violet)' },
          { value: 'div', title: 'Divided Desert (cyan)' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    region: 'add',
    backgrounds: { value: 'bg' },
    viewport: { value: 'iphone', isRotated: false },
  },
  decorators: [
    (Story, { globals }) => (
      <div data-region={globals.region} className="sb-region">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Preview
