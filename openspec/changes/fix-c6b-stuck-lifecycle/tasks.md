## 1. PR1: schema widening (no behaviour change)

- [x] Record the replay, digest and fixture baseline before product edits.
- [x] Record failing schema, fingerprint and reason-category tests.
- [x] Add `PSRTrigger.SwampUnstuck` and its recovery category.
- [x] Add optional `canUnstickByJumping` to the `UnitStuck` payload and schema.
- [x] Revise the four PSR-coded physical schema ids; prove a pre-widening
      checkpoint is incompatible and untouched histories keep their fingerprint.
- [x] Register the trigger as a schema-only runner catalog row.
- [x] Kill the unrevised-schema-id and loosened-field mutants.
- [x] Pass the replay set after, with no committed fixture or digest change.

## 2. PR2: runner and reducer lifecycle

- [ ] List every seeded test whose RNG could shift, from an uncommitted
      `UnitStuck` emission probe.
- [ ] Grant jump eligibility only for a failed ground-movement bog-down.
- [ ] Roll movement-start recovery in the runner; success clears stuck and
      eligibility, failure changes nothing.
- [ ] Clear stuck on an eligible jump in the runner and the reducer.
- [ ] Never write a false key into state.
- [ ] Promote the runner catalog row to integrated.

## 3. PR3: interactive consistency

- [ ] Gate commit readiness and the reachability projection on stuck state.
- [ ] Pass jump eligibility through every validator caller.
- [ ] Preserve jump eligibility across GM unit reload.

## 4. Verification

- [ ] Root verifies hosted CI for each PR; the lane never merges.
