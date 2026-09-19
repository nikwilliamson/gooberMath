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

## Deploying

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml`.
One-time setup in the repo: **Settings → Pages → Source: GitHub Actions**.

The Vite `base` defaults to `/gooberMath/` and CI overrides it with the real repo
name, so renaming the repo needs no code change. For a custom domain or a
`<user>.github.io` repo, build with `BASE_PATH=/`.

```bash
pnpm deploy:check   # what CI runs: typecheck + tests + build
```

## Modes

- **Sniper** — speed *and* accuracy. A miss resets the combo and costs 3 seconds.
  This is the mode that clears quests, because its score already folds accuracy in.
- **Blitz** — pure speed. A miss only resets the combo. For facts he already owns.
- **Warm-up** — untimed, 12 problems. Only offered for new content (multiply/divide)
  the first time, because accuracy has to exist before a clock is fair.

## Quests

Everything is a quest. Four regions (Add, Subtract, Multiply, Divide), each a
ladder of quests ending in a boss. Quests within a region unlock in sequence; all
four regions are open from the start. A quest clears when a Sniper run reaches a
fixed score (`UNLOCK_SCORE`); mastery of its facts is tracked separately and gates
nothing.

The ladder is ordered by strategy, the way fluency curricula sequence facts, and
Subtract mirrors Add quest for quest (count on / count back, doubles / halves,
make ten / break ten, near doubles, plus nine / nine back, boss). Two rules shape
what a quest contains:

- Zero and one never appear in a multiply or divide quest, and no quest opens on a
  zero fact. They are rules, not facts, and the first problem a region shows him
  should be one worth having. The Peaks boss is exactly the six products no
  strategy covers (6×7, 6×8, 6×9, 7×8, 7×9, 8×9), wrapped in review.
- A subtraction or division quest can take just the side of a fact family its
  strategy teaches (`derive: 'value'`): "take away 2" is 7 − 2, not 7 − 5, and
  "share into fives" is 30 ÷ 5, not 30 ÷ 6.

Quest definitions, fact sets and targets are all data in `src/engine/quests.ts` —
retune them without touching logic. Facts come out of a spec in teaching order
(2×2, 2×3, … then the fives), and on a gated quest that is the order they are
introduced.

## How it picks problems

`src/engine/selector.ts` is the part that decides whether he is actually learning:

- Roughly 78% of problems come from facts he owns, 22% from facts he does not
  (`HARD_SHARE`). Weighting every tier together buries him in his worst facts.
- A missed fact is forced back within 3–5 problems, so the *correct* answer is what
  gets rehearsed. At most two such retries are pending at once, so a bad patch
  cannot spiral into an all-hard run.
- On gated quests (multiply/divide) new facts join one at a time, in teaching
  order, at most one per `INTRO_GAP` problems and never while `MAX_LEARNING`
  active facts are still being learned. A new fact is rehearsed on an expanding
  schedule (`INTRO_SCHEDULE`: shown, again after one problem, again after two
  more) before it fades into the weighted pool — incremental rehearsal as taught,
  rather than the new fact being the rarest thing on screen. A gated quest always
  seeds at least `MIN_FRESH` never-seen facts, so a boss whose review facts fill
  the pool still leads with its own. Add/subtract start with the whole set because
  he already knows those facts, just slowly.
- A fact never repeats back to back.

`engine.test.ts` asserts these as invariants: the flow band for a simulated player
(85–98% hit rate), the introduction pace, the rehearsal schedule, and that the
Peaks boss puts 6×7 on screen first.

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

## Art direction

Dark and cinematic: near-black surfaces, amber as the single brand accent, paint
splatter, and brush-textured display type. Per-operation accents (amber, white,
violet, cyan) mark the four worlds.

Everything is drawn in code in `src/ui/art.tsx`:

- **Brush lettering** (`RoughText`) is heavy italic text run through an SVG
  turbulence + displacement filter. No brush webfont is reachable from the build
  environment, so this stands in for real lettering art. Swap the component.
- **Splatter** (`SplatBurst`) is procedural: irregular lobes plus flecks stretched
  along their throw direction, which is what makes it read as thrown paint rather
  than bubbles.
- **The Goober** is a dark vinyl-toy mascot — capped, crowned, white oval eyes.
  Rim lighting is doing the work that keeps a near-black character from reading
  flat on a near-black background.
- **PWA icons** are generated by `scripts/make-icons.mjs` (raw RGBA → zlib → PNG,
  no image dependencies).

All of it is swappable per piece; see the plan doc's asset-slot table.

## Not built yet

Pad skins and sound packs unlock as cosmetics but only the goober variants change
anything visible. Daily-ring streaks are tracked in the save but not surfaced.
No rhythm mechanic — hit sounds follow a pentatonic ladder and the music lifts
with the combo, but nothing requires answering on the beat.

## Art pipeline

Source PNGs live in `art-src/` and are **not** served. `public/img/*.webp` is
generated from them and is what ships:

```bash
python3 scripts/optimize-art.py     # art-src/*.png -> public/img/*.webp
```

The sources are ~22MB, which is unusable on a phone; the WebP output is ~2.9MB.
Outputs are committed, so CI never runs this.

Two notes on the source art:

- Most sheets carry real alpha, including a soft coloured glow at partial alpha.
  That glow is wanted — it is what makes the splats sit in the scene — so the
  pipeline never keys it out.
- A sheet exported *without* an alpha channel is assumed to have the
  transparency checkerboard baked in, and `dechecker()` recovers alpha by
  flooding inward from the border through near-neutral pixels. It relies on
  artwork having a solid dark outline. Exporting with real alpha is better;
  this is a rescue, not a preference.

Sheets and their grids are declared in `src/ui/sprites.tsx`.
