import type { FactSpec } from './facts'
import type { Op } from './types'

export interface RegionDef {
  id: Op
  name: string
  /** CSS custom property suffix; see styles/theme.css */
  ink: string
  blurb: string
}

export interface QuestDef {
  id: string
  region: Op
  name: string
  blurb: string
  spec: FactSpec
  /** Floor for the clear target. Live target also tracks his own best. */
  baseTarget: number
  /** New content: play it untimed once before the clock starts. */
  untimedFirst: boolean
  boss?: boolean
}

export const REGIONS: RegionDef[] = [
  { id: 'add', name: 'Plusfall Coast', ink: 'cyan', blurb: 'Where the numbers wash together.' },
  { id: 'sub', name: 'Minus Marsh', ink: 'magenta', blurb: 'Take away, and the tide goes out.' },
  { id: 'mul', name: 'Multiplex Peaks', ink: 'lime', blurb: 'Groups stack all the way up.' },
  { id: 'div', name: 'Divide Depths', ink: 'orange', blurb: 'Split the haul, share it out.' },
]

/**
 * Quest order is by strategy, not by table number, which is how fluency
 * curricula sequence facts. Targets are data: retune them from the grown-up
 * screen without touching code.
 */
export const QUESTS: QuestDef[] = [
  // --- Plusfall Coast -------------------------------------------------------
  {
    id: 'add-1', region: 'add', name: 'First Splash',
    blurb: 'Adding nothing, one, or two. Warm up the ink.',
    spec: { op: 'add', pairs: { kind: 'addend', values: [0, 1, 2], maxSum: 12 } },
    baseTarget: 2500, untimedFirst: false,
  },
  {
    id: 'add-2', region: 'add', name: 'Double Trouble',
    blurb: 'Two of the same. These are the fastest facts you own.',
    spec: { op: 'add', pairs: { kind: 'doubles', max: 9 } },
    baseTarget: 3000, untimedFirst: false,
  },
  {
    id: 'add-3', region: 'add', name: 'Ten Pact',
    blurb: 'Every pair that makes exactly ten.',
    spec: { op: 'add', pairs: { kind: 'sumTo', sum: 10 } },
    baseTarget: 3200, untimedFirst: false,
  },
  {
    id: 'add-4', region: 'add', name: 'Near Miss',
    blurb: 'Almost-doubles, plus eight and plus nine.',
    spec: { op: 'add', pairs: { kind: 'nearDoubles', max: 9 } },
    baseTarget: 3500, untimedFirst: false,
  },
  {
    id: 'add-5', region: 'add', name: 'Plus Nine Gang',
    blurb: 'Add eight, add nine. Think ten, then step back.',
    spec: { op: 'add', pairs: { kind: 'addend', values: [8, 9], maxSum: 18 } },
    baseTarget: 3800, untimedFirst: false,
  },
  {
    id: 'add-boss', region: 'add', name: 'Coast Guardian',
    blurb: 'Every sum to twenty, all at once. Beat it to open the Marsh.',
    spec: { op: 'add', pairs: { kind: 'allSums', maxSum: 18 } },
    baseTarget: 5000, untimedFirst: false, boss: true,
  },

  // --- Minus Marsh ----------------------------------------------------------
  {
    id: 'sub-1', region: 'sub', name: 'Backwash',
    blurb: 'Take away nothing, one, or two.',
    spec: { op: 'sub', pairs: { kind: 'addend', values: [0, 1, 2], maxSum: 12 } },
    baseTarget: 2500, untimedFirst: false,
  },
  {
    id: 'sub-2', region: 'sub', name: 'Half Back',
    blurb: 'Undo a double. If you know 7+7, you know 14-7.',
    spec: { op: 'sub', pairs: { kind: 'doubles', max: 9 } },
    baseTarget: 3000, untimedFirst: false,
  },
  {
    id: 'sub-3', region: 'sub', name: 'Ten Breaker',
    blurb: 'Break ten apart, every way there is.',
    spec: { op: 'sub', pairs: { kind: 'sumTo', sum: 10 } },
    baseTarget: 3200, untimedFirst: false,
  },
  {
    id: 'sub-4', region: 'sub', name: 'Close Call',
    blurb: 'The near-doubles, running backwards.',
    spec: { op: 'sub', pairs: { kind: 'nearDoubles', max: 9 } },
    baseTarget: 3500, untimedFirst: false,
  },
  {
    id: 'sub-boss', region: 'sub', name: 'Marsh Guardian',
    blurb: 'Every difference inside twenty. Beat it to open the Peaks.',
    spec: { op: 'sub', pairs: { kind: 'allSums', maxSum: 18 } },
    baseTarget: 5000, untimedFirst: false, boss: true,
  },

  // --- Multiplex Peaks ------------------------------------------------------
  {
    id: 'mul-1', region: 'mul', name: 'Skip Step',
    blurb: 'Twos, fives and tens. Count the steps, then stop counting.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [2, 5, 10], max: 100 } },
    baseTarget: 2000, untimedFirst: true,
  },
  {
    id: 'mul-2', region: 'mul', name: 'Square Up',
    blurb: 'Threes, fours, and the squares.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [3, 4], max: 100 } },
    baseTarget: 2400, untimedFirst: true,
  },
  {
    id: 'mul-3', region: 'mul', name: 'Perfect Corners',
    blurb: 'Every square from 1x1 to 10x10.',
    spec: { op: 'mul', pairs: { kind: 'squares', max: 10 } },
    baseTarget: 2600, untimedFirst: true,
  },
  {
    id: 'mul-boss', region: 'mul', name: 'Peak Guardian',
    blurb: 'Sixes through nines, the hard ridge. Beat it to open the Depths.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [6, 7, 8, 9], max: 100 } },
    baseTarget: 3600, untimedFirst: true, boss: true,
  },

  // --- Divide Depths --------------------------------------------------------
  {
    id: 'div-1', region: 'div', name: 'Split Step',
    blurb: 'Share into twos, fives and tens.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [2, 5, 10], max: 100 } },
    baseTarget: 2000, untimedFirst: true,
  },
  {
    id: 'div-2', region: 'div', name: 'Fair Shares',
    blurb: 'Threes and fours, split clean.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [3, 4], max: 100 } },
    baseTarget: 2400, untimedFirst: true,
  },
  {
    id: 'div-boss', region: 'div', name: 'Depth Guardian',
    blurb: 'Sixes through nines. The last one.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [6, 7, 8, 9], max: 100 } },
    baseTarget: 3400, untimedFirst: true, boss: true,
  },
]

export const questById = (id: string) => QUESTS.find((q) => q.id === id)
export const questsIn = (region: Op) => QUESTS.filter((q) => q.region === region)
export const questIndex = (id: string) => QUESTS.findIndex((q) => q.id === id)
export const regionById = (id: Op) => REGIONS.find((r) => r.id === id)!
