# Notepad: implement-physical-attack-phase

Cross-task wisdom for the apply wave. Add new entries with date headings as the
work proceeds.

## [2026-04-25 apply] Existing infrastructure inventory

Before starting fresh implementation, the apply phase took stock of what
already shipped in prior tier waves:

- `src/utils/gameplay/physicalAttacks/restrictions.ts` — covers tasks 3.1 / 3.2
  / 3.3 / 3.4 / 3.5 / 3.6 / 3.7 already (canPunch / canKick / canCharge /
  canDFA / canMeleeWeapon).
- `src/utils/gameplay/physicalAttacks/toHit.ts` — covers tasks 4.1 / 4.2 / 4.3
  / 4.4 / 5.1 / 5.2 / 5.3 / 6.1 / 8.1 / 9.x to-hit modifiers.
- `src/utils/gameplay/physicalAttacks/damage.ts` — covers tasks 4.5 / 5.4 / 6.2
  / 6.3 / 7.2 / 7.3 / 8.2 / 9.1 / 9.2 / 9.3 / 9.5 (lance damage too) and the
  cluster splitter `splitPhysicalDamageIntoClusters` for 6.4 / 7.4.
- `src/utils/gameplay/physicalAttacks/resolution.ts` — drives the to-hit roll,
  hit-location pick, and bundles results.
- `src/utils/gameplay/gameSessionPhysical.ts` — the session-level wrapper that
  emits `PhysicalAttackDeclared`, `PhysicalAttackResolved`, `DamageApplied`,
  `PSRTriggered`. Handles task 12.3 event ordering.
- `src/simulation/ai/BotPlayer.ts:335` — `playPhysicalAttackPhase` already
  exists from `wire-bot-ai-helpers-and-capstone`.
- `src/engine/InteractiveSession.ts:325-339, 454-490` — physical phase wiring
  for both human and AI sessions.

What's NOT yet done (focus of this apply wave):

- **6.4 / 7.4 cluster fan-out** — splitter exists (`splitPhysicalDamageIntoClusters`)
  but `resolveAllPhysicalAttacks` only routes a single damage chunk through
  `resolveDamagePipeline`. Need to iterate clusters and roll hit-location per
  cluster.
- **6.5 / 7.5 hit-location per cluster** — same loop, calls
  `determinePhysicalHitLocation` per cluster.
- **6.6 / 7.5 dual PSR queueing for charge/DFA hit** — currently the
  `result.attackerPSR` flag is true for charge/DFA hit but
  `resolveAllPhysicalAttacks` only queues attacker PSR on miss.
- **6.7 — Charge miss displacement** — needs a NEW helper per Resolved Q1,
  since no `translateHex`/`isValidDisplacement` ships in the worktree;
  use `hexNeighbor(coord, facing)` from hexMath.ts as the equivalent of
  MegaMek's `Coords.translated`. Validate via `isInBounds(grid, coord)`
  + occupant check.
- **7.6 — DFA miss attacker fall** — already covered by `MissedDFA` PSR
  trigger queue, but the spec mentions calling `fallMechanics` on miss.
  We rely on the PSR system to fall the attacker on PSR failure (per the
  resolved design) — the spec's "via fall-mechanics" wording is satisfied
  by the queued `MissedDFA` PSR which the PSR resolver translates to a fall.
- **8.3 / 8.5 — Push displacement + invalid-hex fallthrough** — currently
  `targetDisplaced` is set true on hit but no actual position update.
  We extend the resolver result with a displacement target; the SESSION
  layer applies the move via the unit-state reducer (or a new event).
- **9.4 — Lance damage** — RESTATED per Resolved Q2: lance damage is
  `floor(weight / 5)`; charge-doubling is removed (MegaMek doesn't do it).
  The `LANCE_CHARGE_DAMAGE_MULTIPLIER = 2` constant stays for backward
  compat but is unused unless a future tac-ops change re-enables it.
- **9.6 — Melee weapons feed through damage pipeline** — the resolver
  emits `PhysicalAttackResolved` but `resolveAllPhysicalAttacks` only
  applies damage when `targetDamage > 0 && hitLocation`. Hatchet/sword/mace/
  lance all set `hitTable: 'punch'` → location is computed → DamageApplied
  fires. This task is satisfied by the existing pipeline path; no new work.
- **11.5 / 11.6 — Bot integration + replay tests** — need to author tests
  asserting determinism end-to-end.
- **12.5 — Replay smoke** — same seed → identical events.
- **13.4 — DFA hit test** — no test yet for DFA leg damage to attacker +
  ×3 damage to target.

## [2026-04-25 apply] DEFERRED items planned

DEFERRED candidates (waves are estimates):

- **Charge / DFA bot declaration** — explicitly out of scope per design.md
  Decision 1 + tasks.md 11.3. DEFERRED to Lane C aggression spec.
- **Push displacement on session state** — applying the actual position
  change on push hit needs a new `UnitDisplaced` event + reducer hook.
  DEFERRED to Wave 4 displacement spec; for now, the resolver flags
  `targetDisplaced: true` so downstream consumers can react.
- **Same applies to charge miss displacement** — physically moving the
  attacker hex is queued via the same DEFERRED mechanism. The
  `PhysicalAttackResolved` event payload carries a `missDisplacement`
  field for replay determinism.
- **Lance charge-doubling** (Resolved Q2) — REWORDED, not deferred. The
  task body is updated to drop "doubled when charging".

## [2026-04-25 apply] Determinism convention

Per design.md Resolved Q4: phase-entry iteration over `Object.values(state.units)`
SHALL `.sort((a, b) => a.unitId.localeCompare(b.unitId))` to lock declaration
order. The existing call sites in `GameEngine.phases.ts:298-326` and
`InteractiveSession.ts:454-490` use `Object.keys()` already (which is
insertion-ordered for string keys in JS, NOT sorted). We add sort calls in
this apply wave to lock determinism end-to-end.

## [2026-04-25 apply] Final close-out — implementation + DEFERRED bookkeeping

Final apply agent (third in the chain) buttoned up the change. Implementation
landed:

1. **Displacement helpers** (commit b10e3cf9): `translateHex`,
   `isValidDisplacement`, `computeMissedChargeDisplacement`,
   `computePushDisplacement` in `src/utils/gameplay/physicalAttacks/displacement.ts:24-115`.
   Tests in `src/__tests__/unit/utils/gameplay/physicalAttacksDisplacement.test.ts:20-122`
   cover translateHex symmetry (with signed-zero-safe arithmetic comparison
   per the Phase 2 fix), isValidDisplacement bounds/occupancy, charge miss
   side-hex selection, both-off-map fallback, elevation preference, and push
   facing.

2. **Cluster fan-out + dual PSR queueing** (commit b014df4d) in
   `src/utils/gameplay/gameSessionPhysical.ts:329-490`:
   - Charge / DFA target damage splits via `splitPhysicalDamageIntoClusters`
     with per-cluster hit-location rolls (the first cluster reuses the
     resolver-computed hit-location; subsequent clusters re-roll).
   - Charge attacker damage applies as clusters with per-cluster hit-locations.
   - DFA attacker leg damage = `attackerLegDamagePerLeg * 2`, clustered,
     split across alternating left/right legs.
   - Hit + attackerPSR queues `charge_attacker_hit` / `dfa_attacker_hit` PSRs
     with the attack-specific trigger source (separate from the existing miss
     branches `kick_miss` / `charge_miss` / `dfa_miss`).

3. **DFA + charge cluster fan-out test** (commit 75bbc9b4):
   `src/__tests__/unit/utils/gameplay/physicalAttackChargeDFA.test.ts` covers
   task 13.4 + reinforces 6.4-6.6 / 7.4-7.5: DFA hit total damage = 18 +
   attacker leg damage 12; charge hit total damage = 20 + attacker damage 7;
   both PSRs queued via the typed trigger sources above.

### DEFERRED items (in tasks.md + spec.md blockquotes)

- **8.3 / 8.5 push displacement persistence → Wave 4** — the helper +
  resolver flag exist; only the `UnitDisplaced` event + reducer hook is
  pending.
- **Charge miss displacement persistence → Wave 4** — same reducer hook
  applies (Wave 4 displacement spec bundles both push + charge miss).
- **11.5 / 11.6 bot replay determinism scenarios → Wave 4** — the basic
  two-bot punch scenario lives in
  `wire-bot-ai-helpers-and-capstone.smoke.test.ts`; comprehensive
  seed-based replay coverage needs the Wave 4 SeededRandom-injected harness.
- **12.5 replay determinism smoke → Wave 4** — same harness as 11.5.

The 0.x prerequisites are marked DEFERRED with verification refs to the
already-archived dependency changes (fix-combat-rule-accuracy,
integrate-damage-pipeline, wire-firing-arc-resolution, wire-piloting-skill-rolls).
