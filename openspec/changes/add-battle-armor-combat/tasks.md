# Tasks: Add Battle Armor Combat

> Current PR scope: BA combat spec authority plus the foundation code and map
> projection affordances already landed on this branch. Full BA anti-mech combat
> resolution is intentionally deferred into follow-up apply waves.

## 1. Current-branch foundation

- [x] 1.1 Define `IBASquadCombatState` in `src/types/gameplay/CombatInterfaces.ts` with per-trooper state, swarming/mounted pointers, and stealth/mimetic turn flags.
- [x] 1.2 Provide `getNumberActiveTroopers(state)`.
- [x] 1.3 Provide `isDmgLight(state)` and `isDmgModerate(state)` using the existing MegaMek-inspired squad-size thresholds.
- [x] 1.4 Unit-test initial state population, dead-trooper retention, and damage-threshold helpers.
- [x] 1.5 Implement `allocateSquadDamage(...)` in `src/lib/combat/baCombat.ts` with per-damage-point d6 allocation, dead trooper rerolls, optional TacOps critical-slot handling, and `BATrooperKilled` events.
- [x] 1.6 Unit-test full-squad distribution and distribution with a dead trooper.
- [x] 1.7 Resolve the mounted battle-armor token TODO with a `passengerBadge` render hint and host-owned token rendering.
- [x] 1.8 Unit-test and browser-test mounted BA passenger badge behavior in top-down and isometric tactical-map projections.
- [x] 1.9 Keep the current foundation slice scoped: BA event payload scaffolding exists, but GameEventType dispatch and full handler registration remain follow-up work.

## 2. Spec deltas

- [x] 2.1 Author `openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md` as the capability authority for BA squad state, squad damage, swarm, leg, vibroclaw, brush-off, dislodge, dead-trooper, and mounted-token behavior.
- [x] 2.2 Author `openspec/changes/add-battle-armor-combat/specs/combat-resolution/spec.md` for BA dispatch and event-log expectations.
- [x] 2.3 `npx.cmd openspec validate add-battle-armor-combat --strict` passes.

## 3. Deferred apply-wave backlog

These are retained as explicit future work boundaries, not as incomplete tasks for
this PR.

- Swarm attack: add action eligibility, Anti-Mek to-hit source, terrain/dead-trooper modifiers, success/failure state transitions, and `BASwarmAttached` events.
- Swarm fire: calculate attached-squad damage from squad weapons, vibroclaws, and myomer booster; apply host damage without a to-hit roll.
- Mounted-trooper hit routing: implement MegaMek `getTrooperAtLocation` mapping so torso hits against a swarmed host can strike attached troopers.
- Leg attack: add action handler, Anti-Mek to-hit, leg-location fallback, hardened armor critical modifier, HUMAN_TRO_MEK modifier, and `BALegAttackResolved` events.
- Vibroclaw attack: gate the action by vibroclaw count, calculate `missilesHit(shootingStrength) * vibroClaws`, and emit `BAVibroclawAttackResolved`.
- Brush-off and drop-prone dislodge: add detachment attempts, brush-off damage, PSR consequences, squad-destroyed auto-detach, and `BASwarmDetached` events.
- Combat dispatch and event log: route BA attacks through BA-specific handlers, route non-BA attacks against BA through squad allocation, and format the seven BA event variants.
- Scenario proof: cover the full swarm-attach, attached-fire, enemy-fire, squad-destroyed auto-detach sequence.
- Playtest notes: add BA swarm-vs-Locust, leg-vs-Atlas, and anti-personnel-vs-damaged-squad scenarios.
- Follow-up specs: split BA transport rules and BA stealth/mimetic modifiers into dedicated changes.

## 4. Archive

- [x] 4.1 Leave this change unarchived while PR #682 is under review; archive after merge with source-of-truth spec sync and without `--skip-specs`.
