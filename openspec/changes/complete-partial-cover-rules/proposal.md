# Complete Partial-Cover Rules

## Why

Partial cover (Total Warfare p. 53) is **half-implemented**. The `add-combat-fidelity-suite`
change built and wired the to-hit half — `calculatePartialCoverModifier(true)`
returns a `+1` modifier and `calculateGATORToHit` applies it when
`target.partialCover` is true. The `to-hit-resolution` spec records this as the
**Partial Cover Modifier** requirement.

Two load-bearing pieces were explicitly deferred and remain unbuilt — documented
in `scenario-partial-cover-los.test.ts`:

1. **The simulation runner never sets `partialCover` true.**
   `src/simulation/runner/phases/weaponAttack.ts:219` hardcodes
   `partialCover: false` in the `ITargetState` it builds. No code path derives
   partial cover from the board, so the `+1` modifier is unreachable in a real
   simulated battle.

2. **The leg-hit → miss rule is not implemented.** Per Total Warfare p. 53, when
   a target is in partial cover a hit that rolls a leg location is converted to
   a miss (the cover absorbs it) — damage is not applied. No code converts a
   leg-location roll into a miss. `scenario-partial-cover-los.test.ts` carries an
   `it.skip` placeholder for this rule.

Until both land, partial cover is a dead rule in the simulation engine: the
modifier function works in isolation but is never exercised, and the
damage-side consequence is missing entirely.

## What Changes

- **Derive partial cover in the runner.** The weapon-attack phase determines
  whether the target is in partial cover from the encounter board — the target
  occupying a hex whose terrain (level-1 hill, building, depth-1 water, rubble)
  provides cover relative to the attacker — and passes the real value into the
  `ITargetState.partialCover` field instead of the hardcoded `false`.
- **Implement the leg-hit → miss conversion.** When a target is in partial
  cover and the hit-location roll yields a leg location (`left_leg` /
  `right_leg`), the attack resolves as a miss: `AttackResolved` reports
  `hit: false` and no `DamageApplied` event is emitted for that weapon.
- **Enable the deferred scenario test.** Flip the `it.skip` in
  `scenario-partial-cover-los.test.ts` to an active assertion.

## Non-Goals

- **Full line-of-sight cover geometry** (intervening-terrain cover, level
  differences along the LoS path) is out of scope. This change derives partial
  cover from the **target hex's own terrain** only — the common case. Richer
  LoS cover is a follow-up.
- **No change to the `+1` to-hit modifier itself.** `calculatePartialCoverModifier`
  and its wiring through `calculateGATORToHit` are correct and untouched.
- **No change to the hull-down rule.** Hull-down already mutexes with partial
  cover in `calculateHullDownModifier`; that interaction is unchanged.
- **The interactive tactical-map LoS overlay is not in scope** — this change is
  the simulation-engine combat rule, not the UI overlay.

## Affected Specs

- `to-hit-resolution` — MODIFIED: the **Partial Cover Modifier** requirement is
  extended to state the simulation runner SHALL supply a real `partialCover`
  value derived from the target hex's terrain. ADDED: a **Partial Cover Leg-Hit
  Conversion** requirement for the leg-location → miss rule.

## Test Strategy

- Infrastructure: exists — Jest + `@swc/jest`; the simulation runner has a
  deterministic `SeededRandom` / `D6Roller` path.
- Tests: tests-after — runner-level scenario tests with a scripted roller that
  forces a leg-location hit-location roll, asserting `hit: false` and no
  `DamageApplied`; plus a terrain-derivation unit test. Enable the existing
  `scenario-partial-cover-los.test.ts` skipped case.
- Agent QA: run a seeded Atlas-vs-Atlas encounter on a board with a level-1
  hill and confirm partial-cover modifiers and leg-miss conversions appear in
  the event log.
