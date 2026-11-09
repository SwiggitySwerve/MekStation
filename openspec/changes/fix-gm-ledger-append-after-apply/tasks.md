## PR1: record after a successful apply (S14)

- [x] 1. Record failing regressions: a refused control-plane approval leaves no row, a refused time approval leaves the roster unpatched, an engine throw records nothing, one tactical preview applies once, prepare appends nothing, duplicate ids are refused.
- [x] 2. Split the pipeline into prepare and record; keep `approveGmCascadePreview` as both.
- [x] 3. Refuse an intervention id the ledger already holds, in prepare, in record and in the ledger.
- [x] 4. Control plane: apply, then roster patches, then record; one manual record per preview.
- [x] 5. Tactical surface: engine apply inside a `try`, then record.
- [x] 6. Update the GM campaign ledger QC source tokens; kill the ordering and duplicate mutants; run the affected directories and gates.

## Follow-up (K11, separate change)

- [ ] Token-guarded control-plane state, persisted rows kept after the first action, and a throwing apply shown instead of an unhandled rejection.
