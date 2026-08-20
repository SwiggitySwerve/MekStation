> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01A wave (product PR #1230); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Source and catalog contracts

- [x] 1.1 Add `RosterUnitSource` plus the valid/legacy/invalid persistence parser and focused tests proving absent-only canonical normalization and downgrade rejection.
- [x] 1.2 Add validated browser and Node canonical catalog adapters with explicit `loading`, `ready`, and retryable `unavailable` snapshots; never convert failure to empty-ready.

## 2. Admission boundary

- [x] 2.1 Add one exact-reference guard and reuse it in mission readiness and as the first operation in `materializeCampaignMissionEncounter`.
- [x] 2.2 Prove custom, invalid, forged, stale, loading, and unavailable inputs retain visible blockers and cause zero encounter lookup, reuse result, route call, or mutation.

## 3. Verification and delivery

- [x] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/types/campaign/__tests__/RosterUnitSource.test.ts src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts --runInBand`, Node 22 typecheck/lint/format, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After every frozen child spec, CAMP-PROOF, PROOF-02 disposition/repair, and CAMP-00 exact-main cleanup gate passes, use `qc:camp01-authority-receipt:controller register-pr-target` before editing, then `controller proof --mode=reviewed-head` for design D4's sole `WAVE_CONTRACTS['camp-01a']` row with exact spec/product tuples; direct low-level write/validate is non-authoritative. Pass sequential independent review and the 10-file/400-line cap.
- [x] 3.3 SHA-guard merge, run `controller proof --mode=exact-main` with a new row-resolved run root and the exact merge tuple, then `controller cleanup` with the exact receipt identity; audit and prune before CAMP-01B implementation.
