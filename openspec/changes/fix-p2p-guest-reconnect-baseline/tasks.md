## Evidence before implementation

- [x] Characterize repeated GameCreated and compare prefix-plus-full replay with fresh replay field by field.
- [x] Reproduce 12-held/12-stored plus 20-streamed events as a failing regression before production edits.

## Implementation and acceptance

- [ ] Persist, hydrate and adopt full baselines rather than appending them.
- [ ] Enforce identical-id idempotence and named identity/sequence failures at appendEvent.
- [ ] Audit every production appendEvent caller and the listed delta-shaped reducers; stop on incompatible legitimate callers.
- [ ] Pass focused Jest, typecheck, changed-file formatting/lint and strict change validation without changing committed digests or fixtures.
- [ ] Record commands, counts, decisions, branch and local commit SHAs in the requested IMPLEMENTATION.md; do not push.
