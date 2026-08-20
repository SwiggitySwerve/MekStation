> Completed 2026-08-20 (reconciliation): implemented and delivered by the CAMP-01D wave (product PR #1236); attested by the durable reviewed-head + exact-main + cleanup receipts (full durable index readmitted 23/23 through validator plus all four anchors after CAMP-R1, 2026-08-12) and the council review at `openspec/council-decisions/2026-08-12-camp01-wave-execution-review.md`.

## 1. Launch guard

- [x] 1.1 Require one shared guard plus explicit ready canonical snapshot and exact source/reference validation at mission launch, Mech Bay readiness, fast-forward, dashboard readiness, `launchCoopMission`, and every materializer caller.
- [x] 1.2 Preserve visible blockers for custom, invalid, stale, loading, and unavailable sources.

## 2. Side-effect boundary

- [x] 2.1 Prove canonical mixed-roster launch succeeds once with the exact selected refs.
- [x] 2.2 Run the caller-by-snapshot matrix and prove every blocked path performs zero lookup, reuse, create, route, session, launch, and mutation operations.

## 3. Verification and delivery

- [x] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx src/lib/campaign/coop/__tests__/launchCoopMission.test.ts --runInBand`, `npm.cmd run qc:command:readiness-stable:quick`, `npm.cmd run verify:qc:coop-campaign-journey`, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [x] 3.2 After CAMP-01C exact-main cleanup, use the row-resolved CAMP-01D controller register/proof gates and pass the 12-file/450-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01E.
