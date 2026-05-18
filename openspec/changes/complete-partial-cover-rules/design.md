# Design — Complete Partial-Cover Rules

## Context

The to-hit half of partial cover is built (`calculatePartialCoverModifier`,
wired through `calculateGATORToHit`). What is missing is (a) the runner deriving
`partialCover` from board state and (b) the damage-side leg-hit → miss rule.

Two design questions drive this change: **where does `partialCover` come from**
and **where does the leg-hit conversion live**.

## Decision 1 — Deriving `partialCover` from the board

### Options

- **A. Target-hex terrain only.** A target is in partial cover when its own hex
  carries cover-providing terrain (level-1 hill, building, depth-1 water,
  rubble). One hex lookup, no LoS geometry.
- **B. Full LoS cover geometry.** Walk the hex line attacker→target; cover from
  intervening terrain or level differences along the path.
- **C. Movement-declared flag.** Treat `partialCover` as a per-turn unit state
  field set when a unit ends movement in a cover hex.

### Decision: **A — target-hex terrain only**

Option A is the common tabletop case, is a single deterministic lookup against
the encounter board the runner already loads via `megamek-board-parser`, and
has no LoS-geometry risk. Option B is correct but large — it is named as the
explicit follow-up in the proposal Non-Goals. Option C duplicates board truth
into mutable unit state and drifts; the board is the source of truth.

The weapon-attack phase already holds the target unit (hence its hex) and the
board. It looks up the target hex's terrain and sets
`ITargetState.partialCover` accordingly. When the runner has no board (synthetic
unit tests), the lookup yields no cover and `partialCover` stays `false` — no
regression.

## Decision 2 — Where the leg-hit → miss conversion lives

### Options

- **A. In `weaponAttack.ts`, after the hit-location roll.** The phase already
  rolls hit location for a confirmed hit; branch there: if `partialCover` and
  the location is a leg, convert to a miss before `resolveDamage`.
- **B. Inside `resolveDamage` / the damage pipeline.** Pass `partialCover` down
  and discard leg damage there.

### Decision: **A — in `weaponAttack.ts`**

The conversion is a *to-hit outcome*, not a damage calculation: a covered leg
hit is a **miss**, so it must be decided before any `DamageApplied` event is
emitted and must flip the `AttackResolved.hit` field. That sequencing lives in
the weapon-attack phase. Pushing it into `resolveDamage` would emit a hit then
silently drop damage — wrong event stream. The phase already has the
`partialCover` value (Decision 1) and the rolled location in scope.

## Event-stream contract

- A leg hit converted to a miss emits `AttackResolved` with `hit: false` and no
  `hitLocation`, identical to a normal miss. No `DamageApplied` for that weapon.
- The `AttackDeclared` event is unaffected — declaration precedes the to-hit
  roll, and the `+1` partial-cover modifier already appears in its modifier
  breakdown.
- `AttackDeclared.length === AttackResolved.length` invariant is preserved (the
  conversion produces a resolved event, just a miss).

## Risk

- **Determinism.** The terrain lookup is pure board reads; the leg-hit branch
  consumes no extra dice. Same-seed runs stay byte-identical — the determinism
  audit (re-enabled by PR #592) gates this.
- **No board in unit tests.** Synthetic units with no encounter board get
  `partialCover: false` — existing simulation tests are unaffected.
