# Tasks: Add Indirect Fire and Spotter Network

## 1. Engine integration contract (indirect-fire-system delta)

- [x] 1.1 Add `IIndirectFireResolution` type to `src/types/gameplay/CombatInterfaces.ts`
- [x] 1.2 Implement `InteractiveSession.computeIndirectFireContext(...)` — delegates to thin `InteractiveSession.indirectFire.ts` collaborator that calls the existing `resolveIndirectFire` helper
- [x] 1.3 7 jest tests cover unknown-attacker / non-indirect-weapon / LOS-direct-pass-through / no-LOS-no-spotter / no-LOS-with-spotter / spotter-walked / destroyed-candidates-skipped

## 2. Forward Observer SPA

- [ ] 2.1 Register `FORWARD_OBSERVER` SPA in `src/lib/spa/catalog/gunnerySPAs.ts`
  > DEFERRED — follow-up PR-K2. Requires SPA catalog entry + cost normalization; non-blocking for the foundation contract.
- [ ] 2.2 Wire `IIndirectFireResolution` to consult `spotterPilot.spas.includes('FORWARD_OBSERVER')`; cancel +1 spotter-walked when true
  > DEFERRED — follow-up PR-K2 (paired with 2.1).
- [ ] 2.3 Add unit test: FO SPA + walking spotter → toHitPenalty === 1 (not 2)
  > DEFERRED — follow-up PR-K2.

## 3. NARC / iNarc spotter override

- [ ] 3.1 Extend `IIndirectFireRequest` with NARC/iNarc team-mark flags
  > DEFERRED — follow-up PR-K3. Requires extending the existing `IIndirectFireRequest` helper API + plumbing team-mark state from `IUnitGameState`.
- [ ] 3.2 In `computeIndirectFireContext`, treat NARC/iNarc-marked target as implicit spotter when no LOS
  > DEFERRED — follow-up PR-K3.
- [ ] 3.3 Add unit test: no-LOS + NARC-target → permitted, basis='narc', spotterId=null
  > DEFERRED — follow-up PR-K3.

## 4. Indirect-eligible weapon catalog + mode toggle

- [x] 4.1 `INDIRECT_ELIGIBLE_WEAPON_FAMILIES` constant exported from `src/utils/gameplay/indirectFire.ts` — 5 families (LRM / LRM_IMP / MML_LRM / MEK_MORTAR / NLRM). `isIndirectFireCapable` extended to match `mortar` substring alongside the existing `lrm` substring; Streak variants explicitly excluded.
- [ ] 4.2 Reject mode-toggle on non-eligible weapons at UI + resolver
  > DEFERRED — no UI consumer wired yet; the resolver-side check is the eligibility constant. UI mode toggle ships with PR-K4 (combat-resolution dispatch).
- [ ] 4.3 Add `weapon.mode: 'Direct' | 'Indirect'` to per-weapon combat state
  > DEFERRED — no consumer until §5 dispatch lands.
- [ ] 4.4 Persist mode in event-log replay round-trip
  > DEFERRED — paired with §5 dispatch.
- [x] 4.5 11 unit tests cover the eligibility surface: 5 families × variants accepted; Streak / direct-fire / MML-SRM rejected.

## 5. Combat-resolution dispatch + event log

- [ ] 5.1 Resolver invokes `computeIndirectFireContext` before `computeToHit`
  > DEFERRED — follow-up PR-K4. Requires extending the existing to-hit pipeline call sites; the method is in place (§1.2) and ready to be called.
- [ ] 5.2 Add 4 typed event variants — payloads already authored in CombatInterfaces (this PR); enum entries + `IGameEvent` discriminated-union variants land with the dispatch in PR-K4
  > PARTIAL — payload interfaces (`IIndirectFireSpotterSelectedPayload`, `IIndirectFireSpotterLostPayload`, `IIndirectFireForwardObserverPayload`, `IIndirectFireNarcOverridePayload`) shipped in this PR. The `GameEventType` enum extension + union variants follow with §5.1 dispatch.
- [ ] 5.3 Emit `IndirectFireSpotterSelected` when `computeIndirectFireContext` resolves
  > DEFERRED — paired with §5.1.
- [ ] 5.4 Extend `eventLogFormatter.ts` for the 4 new event types
  > DEFERRED — paired with §5.1.
- [ ] 5.5 Scenario test: full LRM-15 indirect attack with valid spotter
  > DEFERRED — paired with §5.1.

## 6. Spotter liveness re-check

- [ ] 6.1 Mid-resolution spotter death → auto-miss + `IndirectFireSpotterLost` emission
  > DEFERRED — paired with §5 dispatch (PR-K4).
- [ ] 6.2 Scenario test for spotter-killed-mid-resolution
  > DEFERRED — paired with 6.1.

## 7. Spec deltas

- [x] 7.1 Spec `indirect-fire-system/spec.md` — already authored by Codex (PR #654)
- [x] 7.2 Spec `combat-resolution/spec.md` — already authored by Codex (PR #654)
- [x] 7.3 Spec `weapon-system/spec.md` — already authored by Codex (PR #654)
- [x] 7.4 `npx openspec validate add-indirect-fire-and-spotter-network --strict` passes clean
- [x] 7.5 `npm run typecheck`, `npm run lint`, `npx jest` pass on CI
- [ ] 7.6 Archive the change after PR-K4 lands (full §5 dispatch + scenario test)

## 8. Documentation + follow-up notes

- [ ] 8.1 Playtest notes — DEFERRED until §5 dispatch + scenario test land
- [ ] 8.2 Arrow IV `_followups.md` — DEFERRED until archive

## Foundation slice summary (this PR)

Wires the previously-orphaned `src/utils/gameplay/indirectFire.ts` helper into the engine:
- `IIndirectFireResolution` typed contract (§1.1)
- `InteractiveSession.computeIndirectFireContext` method + thin `.indirectFire.ts` collaborator (§1.2)
- 7 engine integration tests (§1.3)
- SSoT `INDIRECT_ELIGIBLE_WEAPON_FAMILIES` constant + `isIndirectFireCapable` mortar-substring extension (§4.1, §4.5)
- 4 typed event payload interfaces (§5.2 partial)

**Follow-up PRs (queued for next session):**
- PR-K2: FO SPA registration + spotter-walked cancellation (§2)
- PR-K3: NARC/iNarc spotter override (§3)
- PR-K4: Combat-resolution dispatch + 4 event-type enum entries + scenario test (§5, §6)
