## 1. Launch guard

- [ ] 1.1 Require one shared guard plus explicit ready canonical snapshot and exact source/reference validation at mission launch, Mech Bay readiness, fast-forward, dashboard readiness, `launchCoopMission`, and every materializer caller.
- [ ] 1.2 Preserve visible blockers for custom, invalid, stale, loading, and unavailable sources.

## 2. Side-effect boundary

- [ ] 2.1 Prove canonical mixed-roster launch succeeds once with the exact selected refs.
- [ ] 2.2 Run the caller-by-snapshot matrix and prove every blocked path performs zero lookup, reuse, create, route, session, launch, and mutation operations.

## 3. Verification and delivery

- [ ] 3.1 Run `npm.cmd test -- --watchAll=false --runTestsByPath src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx src/lib/campaign/coop/__tests__/launchCoopMission.test.ts --runInBand`, `npm.cmd run qc:command:readiness-stable:quick`, `npm.cmd run verify:qc:coop-campaign-journey`, Node 22 gates, strict OpenSpec validation, and OpenSpec CI QC.
- [ ] 3.2 After CAMP-01C exact-main cleanup, use the row-resolved CAMP-01D controller register/proof gates and pass the 12-file/450-line cap; then SHA-guard merge, exact-main proof, cleanup, and prune before CAMP-01E.
