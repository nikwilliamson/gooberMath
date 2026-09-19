# GooberMath

A math-fact speed game for a 2nd grader. Arcade score-attack, not a worksheet:
one problem at a time, a number pad, a 60-second clock, and a personal best to beat.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # engine tests (20)
pnpm build      # static PWA in dist/
```

Fully responsive, phone through desktop, both orientations. Keyboard input works
on a laptop (digits, Backspace, Esc to quit). Installable as a PWA — add to home
screen and it runs full-screen offline. No backend, no accounts; progress lives
in IndexedDB on the device.

## Modes

- **Sniper** — speed *and* accuracy. A miss resets the combo and costs 3 seconds.
  This is the mode that clears quests, because its score already folds accuracy in.
- **Blitz** — pure speed. A miss only resets the combo. For facts he already owns.
- **Warm-up** — untimed, 12 problems. Only offered for new content (multiply/divide)
  the first time, because accuracy has to exist before a clock is fair.

## Quests

Everything is a quest. Four regions (Add, Subtract, Multiply, Divide), each a
ladder of quests ending in a boss that opens the next region. A quest clears when
his Sniper score passes its target; the target is the quest's floor raised toward
80% of his best on the previous quest, so difficulty tracks him rather than a table.

Quest definitions, fact sets and targets are all data in `src/engine/quests.ts` —
retune them without touching logic. Regions can also be opened by hand from the
Grown-ups sheet.

## How it picks problems

`src/engine/selector.ts` is the part that decides whether he is actually learning:

- Roughly 78% of problems come from facts he owns, 22% from facts he does not
  (`HARD_SHARE`). Weighting every tier together buries him in his worst facts.
- A missed fact is forced back within 3–5 problems, so the *correct* answer is what
  gets rehearsed. At most two such retries are pending at once, so a bad patch
  cannot spiral into an all-hard run.
- New facts join one at a time, and only once nothing active is still being learned
  (incremental rehearsal). This applies to multiply/divide; add/subtract start with
  the whole set because he already knows those facts, just slowly.
- A fact never repeats back to back.

`engine.test.ts` asserts these as invariants, including a simulated player whose
hit rate must land between 85% and 98%.

## Mastery model

Each fact tracks attempts, accuracy and an EWMA of *correct*-answer latency
(a wrong answer's timing means nothing). Tiers: **new**, **learning**,
**known** (≤3s), **automatic** (<1.5s). Those drive the fact grids on the map and
the selector's weighting.

## Architecture

```
src/engine/   pure TypeScript — facts, quests, mastery, selector, scoring, run reducer
src/store/    zustand + IndexedDB persistence
src/ui/       React components; art.tsx is all SVG
src/audio/    Web Audio, fully synthesised (no audio files)
```

The run loop is a pure reducer `(state, event) => state` over `TICK / DIGIT /
BACKSPACE / RESOLVE / QUIT`, so a whole run is replayable from its event log and
testable without React. The engine imports nothing from React or the DOM.

## Grown-ups sheet

Title screen → Grown-ups. Per-quest mastery counts and median recall time, his
slowest facts right now, manual region unlocks, and export/import of the save
blob for moving between devices.

## Art

Everything is drawn in code right now: the Goober, ink splats, clouds, starbursts
(`src/ui/art.tsx`) and the PWA icons (`scripts/make-icons.mjs`). All of it is
swappable — see the "Asset slots" note in the plan doc if you want to replace any
of it with real artwork.

## Not built yet

Pad skins and sound packs unlock as cosmetics but only the goober variants change
anything visible. Daily-ring streaks are tracked in the save but not surfaced.
No rhythm mechanic — hit sounds follow a pentatonic ladder and the music lifts
with the combo, but nothing requires answering on the beat.
