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
  /**
   * Share of this quest's facts that must reach 'known' to master it.
   * Defaults to DEFAULT_CLEAR_RATIO.
   */
  clearRatio?: number
  /** Sniper score that unlocks the next quest. Defaults to UNLOCK_SCORE. */
  unlockScore?: number
  /** New content: play it untimed once before the clock starts. */
  untimedFirst: boolean
  boss?: boolean
}

/**
 * Two separate ideas, deliberately:
 * - UNLOCK_SCORE (in scoring.ts) opens the next quest. Low enough to pass on a
 *   first good run, so progress never stalls on one level.
 * - DEFAULT_CLEAR_RATIO is mastery of the quest's own facts. It is the real
 *   measure of whether he has learned them, and it gates nothing.
 *
 * Neither depends on a previous quest's result. The original rule set each
 * target to 80% of his best on the PREVIOUS quest, which punished a good run by
 * raising the next bar and quietly rewarded sandbagging.
 */
export const DEFAULT_CLEAR_RATIO = 0.8

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
  // Zero and one never appear in a multiply or divide quest, and no quest
  // opens on a zero fact: they are rules, not facts, and the first problem a
  // region ever shows him should be one worth having.

  // --- Plusfall Coast -------------------------------------------------------
  {
    id: 'add-1', region: 'add', name: 'First Splash',
    blurb: 'Count on one or two. Warm up the ink.',
    spec: { op: 'add', pairs: { kind: 'addend', values: [1, 2], maxSum: 12, min: 1 } }, untimedFirst: false,
  },
  {
    id: 'add-2', region: 'add', name: 'Double Trouble',
    blurb: 'Two of the same. These are the fastest facts you own.',
    spec: { op: 'add', pairs: { kind: 'doubles', max: 9 } }, untimedFirst: false,
  },
  {
    id: 'add-3', region: 'add', name: 'Make Ten',
    blurb: 'Pairs that hit ten, then ten plus the rest. This is how you cross ten.',
    spec: { op: 'add', pairs: { kind: 'makeTen' } }, untimedFirst: false,
  },
  {
    id: 'add-4', region: 'add', name: 'Near Miss',
    blurb: 'Almost-doubles: one or two more than a double you own.',
    spec: { op: 'add', pairs: { kind: 'nearDoubles', max: 9, span: 2 } }, untimedFirst: false,
  },
  {
    id: 'add-5', region: 'add', name: 'Plus Nine Gang',
    blurb: 'Add eight, add nine. Think ten, then step back.',
    spec: { op: 'add', pairs: { kind: 'addend', values: [8, 9], maxSum: 18, min: 1 } }, untimedFirst: false,
  },
  {
    id: 'add-boss', region: 'add', name: 'Coast Guardian',
    blurb: 'Every sum to eighteen, all at once. Beat it to own the Coast.',
    spec: { op: 'add', pairs: { kind: 'allSums', maxSum: 18, min: 1 } }, untimedFirst: false, boss: true,
  },

  // --- Minus Marsh ----------------------------------------------------------
  // Each quest mirrors its Coast twin, and takes only the side of the family
  // its strategy teaches ("take away 2" is 7 − 2, not 7 − 5).
  {
    id: 'sub-1', region: 'sub', name: 'Backwash',
    blurb: 'Take away one or two. Count back.',
    spec: { op: 'sub', pairs: { kind: 'addend', values: [1, 2], maxSum: 12, min: 1 }, derive: 'value' }, untimedFirst: false,
  },
  {
    id: 'sub-2', region: 'sub', name: 'Half Back',
    blurb: 'Undo a double. If you know 7+7, you know 14-7.',
    spec: { op: 'sub', pairs: { kind: 'doubles', max: 9 } }, untimedFirst: false,
  },
  {
    id: 'sub-3', region: 'sub', name: 'Break Ten',
    blurb: 'Take ten apart, then step back down over it.',
    spec: { op: 'sub', pairs: { kind: 'makeTen' } }, untimedFirst: false,
  },
  {
    id: 'sub-4', region: 'sub', name: 'Close Call',
    blurb: 'The near-doubles, running backwards.',
    spec: { op: 'sub', pairs: { kind: 'nearDoubles', max: 9, span: 2 } }, untimedFirst: false,
  },
  {
    id: 'sub-5', region: 'sub', name: 'Nine Back',
    blurb: 'Take away eight or nine. Take ten, then give one back.',
    spec: { op: 'sub', pairs: { kind: 'addend', values: [8, 9], maxSum: 18, min: 1 }, derive: 'value' }, untimedFirst: false,
  },
  {
    id: 'sub-boss', region: 'sub', name: 'Marsh Guardian',
    blurb: 'Every difference inside eighteen. Beat it to own the Marsh.',
    spec: { op: 'sub', pairs: { kind: 'allSums', maxSum: 18, min: 1 } }, untimedFirst: false, boss: true,
  },

  // --- Multiplex Peaks ------------------------------------------------------
  {
    id: 'mul-1', region: 'mul', name: 'Skip Step',
    blurb: 'Twos, fives and tens. Count the steps, then stop counting.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [2, 5, 10], max: 100, min: 2 } }, untimedFirst: true,
  },
  {
    id: 'mul-2', region: 'mul', name: 'Square Up',
    blurb: 'Threes and fours. Skip count, then stop counting.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [3, 4], max: 100, min: 2 } }, untimedFirst: true,
  },
  {
    id: 'mul-3', region: 'mul', name: 'Perfect Corners',
    blurb: 'Every square from 2x2 to 10x10.',
    spec: { op: 'mul', pairs: { kind: 'squares', max: 10, min: 2 } }, untimedFirst: true,
  },
  {
    // With 2s, 5s, 10s, 3s, 4s and the squares owned, only six facts are left:
    // 6x7, 6x8, 6x9, 7x8, 7x9, 8x9. This is those six, wrapped in review.
    id: 'mul-boss', region: 'mul', name: 'Peak Guardian',
    blurb: 'Sixes through nines. Only six facts up here you have never met.',
    spec: { op: 'mul', pairs: { kind: 'factor', values: [6, 7, 8, 9], max: 100, min: 2 } }, untimedFirst: true, boss: true,
  },

  // --- Divide Depths --------------------------------------------------------
  // Divisor decides the quest, so each set is a clean "share into N".
  {
    id: 'div-1', region: 'div', name: 'Split Step',
    blurb: 'Share into twos, fives and tens.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [2, 5, 10], max: 100, min: 2 }, derive: 'value' }, untimedFirst: true,
  },
  {
    id: 'div-2', region: 'div', name: 'Fair Shares',
    blurb: 'Threes and fours, split clean.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [3, 4], max: 100, min: 2 }, derive: 'value' }, untimedFirst: true,
  },
  {
    id: 'div-boss', region: 'div', name: 'Depth Guardian',
    blurb: 'Share into sixes through nines. The last one.',
    spec: { op: 'div', pairs: { kind: 'factor', values: [6, 7, 8, 9], max: 100, min: 2 }, derive: 'value' }, untimedFirst: true, boss: true,
  },
]

export const questById = (id: string) => QUESTS.find((q) => q.id === id)
export const questsIn = (region: Op) => QUESTS.filter((q) => q.region === region)
export const questIndex = (id: string) => QUESTS.findIndex((q) => q.id === id)
export const regionById = (id: Op) => REGIONS.find((r) => r.id === id)!
