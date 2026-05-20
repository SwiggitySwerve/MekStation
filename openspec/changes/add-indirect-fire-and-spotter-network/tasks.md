# Tasks: Add Indirect Fire and Spotter Network

## 1. Engine integration contract (indirect-fire-system delta)

- [ ] 1.1 Add `IIndirectFireResolution` type to `src/types/gameplay/CombatInterfaces.ts` with fields `{ permitted, isIndirect, spotterId | null, basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag', toHitPenalty, reason? }`
- [ ] 1.2 Implement `InteractiveSession.computeIndirectFireContext(attackerId, weaponId, targetHex)` in `src/engine/InteractiveSession.ts`; enumerates `ISpotterCandidate[]` from current `gameState`, calls existing `evaluateIndirectFire` helper, returns `IIndirectFireResolution`
- [ ] 1.3 Add unit tests for `computeIndirectFireContext` covering: no-LOS-no-spotter (rejected), no-LOS-with-spotter (permitted, basis='los'), LOS-on-attacker (direct, isIndirect=false), spotter-walked penalty math, multi-spotter election tiebreak (move-pen → range → id)

## 2. Forward Observer SPA

- [ ] 2.1 Register `FORWARD_OBSERVER` SPA in `src/lib/spa/catalog/gunnerySPAs.ts` with metadata `{ category: 'gunnery', cost: 200, prerequisites: [] }` (cost from existing SPA-catalog normalization)
- [ ] 2.2 Wire `IIndirectFireResolution` to consult `spotterPilot.spas.includes('FORWARD_OBSERVER')`; cancel the +1 spotter-walked add when true (base +1 still applies)
- [ ] 2.3 Add unit test: spotter pilot with FO SPA + walking spotter → toHitPenalty === 1 (not 2)

## 3. NARC / iNarc spotter override

- [ ] 3.1 Extend `IIndirectFireRequest` (existing in `src/utils/gameplay/indirectFire.ts`) with `targetNarcMarkedByTeam: boolean`, `targetINarcMarkedByTeam: boolean` flags read from target combat state
- [ ] 3.2 In `computeIndirectFireContext`, when no friendly unit has LOS but target is NARC/iNarc-marked by the attacker's team, set basis to `'narc'` / `'inarc'` and treat the target itself as the implicit spotter (spotterId=null, no spotter-walked penalty)
- [ ] 3.3 Add unit test: no-LOS + NARC-marked-target → permitted, basis='narc', spotterId=null, toHitPenalty=1 (base only)

## 4. Indirect-eligible weapon catalog + mode toggle

- [ ] 4.1 Define `INDIRECT_ELIGIBLE_WEAPON_FAMILIES = ['LRM', 'LRM_IMP', 'MML_LRM', 'MEK_MORTAR', 'NLRM']` constant in `src/utils/gameplay/indirectFire.ts`; `MML_LRM` denotes MML loaded with LRM ammo (not SRM); the constant SHALL be the single source of truth for eligibility checks
- [ ] 4.2 Reject attempts to toggle mode on non-eligible weapons at the UI layer (return validation error) and ignore at the resolver (treat as `'Direct'`)
- [ ] 4.3 Add `weapon.mode: 'Direct' | 'Indirect'` to per-weapon combat state slice in `CombatInterfaces.ts`; default `'Direct'`
- [ ] 4.4 Persist mode in event-log replay round-trip (extend the per-attack event payload)
- [ ] 4.5 Add unit test: toggle on LRM-10 succeeds; toggle on AC/20 throws; toggle on MML loaded with SRM ammo throws

## 5. Combat-resolution dispatch + event log

- [ ] 5.1 In `src/lib/combat/combatResolution.ts` resolver: when `weapon.mode === 'Indirect'` OR `attacker.losToTarget === false`, invoke `computeIndirectFireContext` before `computeToHit`
- [ ] 5.2 Add typed event variants to `src/types/gameplay/CombatInterfaces.ts`:
  - `IndirectFireSpotterSelected` (basis='los')
  - `IndirectFireSpotterLost` (auto-miss outcome, basis at time of selection)
  - `IndirectFireForwardObserver` (FO cancelled spotter-walked)
  - `IndirectFireNarcOverride` (basis='narc' | 'inarc')
- [ ] 5.3 Emit the appropriate event when `computeIndirectFireContext` resolves; consumed by event-log formatter
- [ ] 5.4 Extend `src/services/combat/replays/eventLogFormatter.ts` (or equivalent columnar formatter from `project_event_log_line_format_suite`) to render the 4 new event types
- [ ] 5.5 Add scenario test: full LRM-15 indirect attack with valid spotter — assert event sequence `[IndirectFireSpotterSelected, AttackResolved(hit), WeaponDamageApplied]`

## 6. Spotter liveness re-check

- [ ] 6.1 Between hit-roll and damage-application in `combatResolution.ts`, if the elected spotter's `entityState.destroyed === true`, short-circuit: emit `IndirectFireSpotterLost` with reason `'Spotter destroyed before resolution'`, mark attack as miss, still consume ammo + heat
- [ ] 6.2 Add scenario test: spotter elected at to-hit, then a higher-initiative attack kills the spotter, then LRM attack resolves → auto-miss, IndirectFireSpotterLost event present, ammo decremented

## 7. Spec deltas

- [ ] 7.1 Author `openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md` covering ADDED + MODIFIED requirements per the proposal's capability section
- [ ] 7.2 Author `openspec/changes/add-indirect-fire-and-spotter-network/specs/combat-resolution/spec.md` adding indirect-fire dispatch + event-log requirements
- [ ] 7.3 Author `openspec/changes/add-indirect-fire-and-spotter-network/specs/weapon-system/spec.md` adding weapon mode toggle + persistence
- [ ] 7.4 `npx openspec validate add-indirect-fire-and-spotter-network --strict` passes clean
- [ ] 7.5 `npm run build`, lint, typecheck, jest, scenario tests pass on CI (Apply wave gate)
- [ ] 7.6 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-indirect-fire-and-spotter-network/` after PR merge; sync the 3 deltas into source-of-truth specs (NEVER `--skip-specs`)

## 8. Documentation + follow-up notes

- [ ] 8.1 Add a `playtest/wave-7/INDIRECT_FIRE_NOTES.md` section noting (a) which LRM/MML/Mortar scenarios should be added to `playtest-scenarios.spec.ts`, (b) the parity ratio between MegaMek's spotter election and ours on a 5-scenario regression set
- [ ] 8.2 Spec the future Arrow IV follow-up — leave a `_followups.md` placeholder in the archive folder noting that artillery deviation tables / scatter / counter-battery / Aerospace artillery bays are the next layer
