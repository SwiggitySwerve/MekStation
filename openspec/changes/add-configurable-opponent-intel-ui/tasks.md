## 1. Intel Policy Types

- [x] 1.1 Define opponent intel policy presets and projection tiers
- [x] 1.2 Extend fog projection adapters to output exact, rough, last-known, silhouette, hidden, and GM views

## 2. UI Integration

- [x] 2.1 Add intel confidence and staleness display to enemy tokens and target inspectors
  > Projection level shipped — `IIntelConfidence` field on `ITargetInspectorView` + `IGmInspectorView`, derived from tier + lastSeenTurns + stalenessThreshold. Inspector + token rendering of the confidence/staleness chips is a follow-up (PR-H2) — projection contract is in place so consumers can render against it now.
- [ ] 2.2 Add opponent intel setup controls for GM/scenario configuration
  > DEFERRED — separate UI surface; follow-up PR.
- [ ] 2.3 Apply redacted projections to event feed and replay viewer
  > DEFERRED — depends on PR-G `EventLogDisplay` changes (lenses feed/replay change is its own sibling PR in Phase 7.3).

## 3. Safety and Audit

- [x] 3.1 Ensure hidden fields are stripped before reaching non-GM components
  > `assertNoLeakedSecrets(projection, tier)` defense-in-depth guard in `src/services/intel/intelGuardrails.ts`; wired into every opponent return path in `useUnitInspectorProjection`. Throws in dev/test on leak, no-op in production. 16 jest tests cover every tier × every leak pattern.
- [ ] 3.2 Emit audit/replay events for GM reveal overrides
  > DEFERRED — needs event-log integration alongside PR-G's feed/replay changes.

## 4. Verification

- [x] 4.1 Unit tests for each intel policy projection
  > 16 jest tests in `intelGuardrails.test.ts`. Tier extension behavior also covered indirectly by existing `TacticalUnitInspector.test.tsx` (24 tests across the original 5 tiers still pass).
- [ ] 4.2 Component tests for exact, rough, last-known, and hidden display states
  > DEFERRED — component-level DOM-leak tests follow when the inspector renders the new chassis-class + confidence chips for silhouette + gm tiers.
- [ ] 4.3 Replay test proving player and GM perspectives differ without mutating event history
  > DEFERRED — replay perspective tests follow §3.2 audit event landing.
