## PR2: token-guarded control-plane state (K11)

- [x] 1. Record failing regressions: generate and approve locked while an approve is in flight, a double approve applies once, manual takeover disables once recorded, persisted rows survive the first action and merge with their session row, a throwing apply is shown as failed with no unhandled rejection, the co-op intent carries the approval's intervention id.
- [x] 2. Add the reducer: one union, one transition map, a token per preview, a synchronous dispatch.
- [x] 3. Drive the control plane from the reducer; derive status and controls from the phase.
- [x] 4. Merge persisted and session rows by intervention id.
- [x] 5. Carry the approval's intervention id on the co-op intent; pin retry-after-refusal at the host (exactly one FundsChanged).
- [x] 6. Kill the token, transition, manual, rows, throw, failed-terminal, co-op id and guard mutants; run the affected directories and gates.
