## 1. Shared foundation

- [x] 1.1 Add pinned marker vocabulary and stable recogniser contract; preserve existing recovery.
- [x] 1.2 Record red/green foundation tests and first local commit for o3b.

## 2. Marker recovery

- [x] 2.1 Record failing grid, free-capacity, over-fill and cold-reopen tests.
- [x] 2.2 Recover and rehydrate typed marker allocations through the owner.
- [x] 2.3 Catch four approved mutants and retain receipts.
- [x] 2.4 Update notice/crew pinned lists and audit affected E2E slot expectations.

## 3. Verification and acceptance

- [x] 3.1 Run authorized light gates.
- [ ] 3.2 C3 heavy-slot round-trip census: 42,814 marker cells kept; other sets unchanged; confirm or correct 3,522 warned units.
- [ ] 3.3 C3 production E2E proof, trial, hosted checks and exact post-merge after freeze release.

Local evidence: parity-3.2-o2-o3/o3/build under the approved scratch reports.
Foundation commit: 8ed00795dae74961151ef19a8d843f5de5ed1a62. Full acceptance
remains pending C3's slot; targeted tests do not prove the 42,814-cell census.
