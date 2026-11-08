## 1. PR #3026: schema widening (commit 1, no behaviour change)

- [x] Record the replay, digest and fixture baseline before product edits.
- [x] Record failing schema, fingerprint and reason-category tests.
- [x] Add `PSRTrigger.SwampUnstuck` and its recovery category.
- [x] Add optional `canUnstickByJumping` to the `UnitStuck` payload and schema.
- [x] Revise the four PSR-coded physical schema ids; prove a pre-widening
      checkpoint is incompatible and untouched histories keep their fingerprint.
- [x] Kill the unrevised-schema-id and loosened-field mutants.
- [x] Pass the replay set after, with no committed fixture or digest change.

## 2. PR #3026: runner and reducer lifecycle

- [x] List every seeded test whose RNG could shift, from an uncommitted
      `UnitStuck` emission probe.
- [x] Record failing reducer and runner lifecycle tests.
- [x] Grant jump eligibility only for a failed ground-movement bog-down.
- [x] Roll movement-start recovery in the runner; success clears stuck and
      eligibility, failure changes nothing.
- [x] Clear stuck on an eligible jump in the runner and the reducer.
- [x] Never write a false key into state.
- [x] Promote the runner catalog row to integrated; keep every out-of-scope
      and gap baseline at its main value.
- [x] Re-anchor shifted catalog citations by content.
- [x] Kill the lifecycle mutants.

## 3. PR3: interactive consistency

- [x] Record failing commit, projection, P2P and GM reload tests.
- [x] Gate commit readiness and the reachability projection on stuck state.
- [x] Pass jump eligibility through every validator caller.
- [x] Preserve jump eligibility across GM unit reload.
- [x] Kill the readiness, projection, P2P and GM reload mutants.

## 4. Verification

- [ ] Root verifies hosted CI for each PR; the lane never merges.
