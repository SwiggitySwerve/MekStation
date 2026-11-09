## Projection refactor

- [x] Capture old non-mech drafts and prove their existing hydration behavior.
- [x] Extract the five persistence projections without changing their fields.
- [x] Record unchanged old-draft output after the refactor and commit it separately.

## Receipt integration

- [x] Record failing adapter/persistence and custom-load receipt tests.
- [x] Add shared optional metadata, factory wrappers, fingerprints and receipt helpers.
- [x] Attach receipts through the existing custom-source/revision loader guard.
- [x] Kill a mutant that omits a receipt from browser persistence.

## Verification

- [ ] Run complete affected store, loader-service and integration directories; both tsc configs; root/unit lint and its Jest suite; formatting; strict OpenSpec; and the CI budget.
- [x] Preserve main's ProtoMech changes and re-run store suites if merged before publication.
- [ ] Open a draft PR and report the final head and evidence.
