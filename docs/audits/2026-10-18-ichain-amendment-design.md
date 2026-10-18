# I-chain parent literal-path amendment design

Requested artifact date: 2026-10-18. Checks actually ran on 2026-10-17T23:15:28.332Z.

## Result and boundary

Register exactly two shared test harnesses for P2CG1I2. Keep P2CG1I1, I3 and I4 registration unchanged. Three candidate/unit combinations remain **NOT registered yet**, with explicit predecessor-dependent conditions below. This is a parent registration amendment, not source admission, independent review, merge approval or runtime certification.

- Baseline: `a64c6f1c9e77ecf2d6be38f2dd00316241557a85` (local origin/main, #2226); no fetch was performed.
- Worktree: `E:/Projects/Personal/MekStation-wt/ichain-amendment-20261018`.
- Branch: `codex/ichain-amendment-20261018`.
- Local commit: `46641f60dc600f44c483ba04afa9e0e0fbac308b`. No push or PR.
- Committed scope: roadmap.json, units.json, and `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cg1i-literal-path-amendment-20261018.json` only.
- Requested design output is the sole intentional root-checkout write; no root source, dependencies, Git index or existing audit was edited.

## Evidence and necessity standard

The user allowed either a minimal interface/signature TS7 failure or a precise reading of the registered proof. These helpers need fixture lifecycle/behavior changes, not new mandatory product interface fields. The chosen proof is an assertion-backed reading of the exact baseline call path. No product/test mutation was made and no TS2741 or runtime RED is claimed. The TS7 checks below establish only current type correctness.

The need is scoped to migrating the existing shared proof fixture. Rebuilding/discarding the fixture in each caller or monkey-patching sockets would be alternative implementations; the receipt expressly records that limitation. The original scope itself said reconstruction was possible. Unlike D, this is not an unavoidable type-level consumer break. The minimal shared-fixture migration is concretely established below.

The probe script checks that each quoted source anchor exists and hashes each inspected file. Results are embedded in the committed receipt, including exact line numbers and Git blobs. `E:/Projects/Personal/MekStation-wt/ichain-amendment-evidence-20261018/probes.json` contains the full reading and `E:/Projects/Personal/MekStation-wt/ichain-amendment-evidence-20261018/probe.mjs` reproduces it against the baseline worktree. The saved baseline results should not be confused with later I2/E source proof.

### I2-CREATE-SETUP — register

`src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts` for `P2CG1I2`.

The existing reconnect beforeEach obtains its entry through both helpers. Installing before openRouteFixture is erased by its reset; installing after it resolves is rejected because the vessel entry already exists. The existing proof fixture therefore needs an opt-in installation seam between database initialization and vessel creation in this file. Its current zero-argument implementation has no such seam.

Minimal implementation seam: Add an optional/defaulted receipt setup option and install the real port after reset/database initialization, before the vessel POST. Preserve default legacy behavior and existing returned fields for non-I2 consumers.

Checked anchors:

- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:101`: `fixture = await openAnnouncementFixture();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:54`: `const fixture = await openRouteFixture();`
- `src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts:122`: `export async function openRouteFixture(): Promise<`
- `src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts:141`: `_resetCampaignHostRegistry(); _resetMatchHostRegistry();`
- `src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts:144`: `getSQLiteService({ path: campaignPath }).initialize();`
- `src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts:184`: `const vessel = await post(vesselRequest(state), host);`
- `src/lib/multiplayer/server/__tests__/coopMissionCreate.harness.ts:187`: `const entry = getCampaignHostRegistry().get(matchId); assert.ok(entry);`
- `src/lib/multiplayer/server/CampaignHostRegistry.ts:301`: `if (this.entries.size > 0) { throw new Error( 'Campaign application receipt port needs an empty registry',`
- `src/lib/multiplayer/server/CampaignHostRegistry.ts:508`: `delete global[CAMPAIGN_HOST_REGISTRY_SLOT_KEY];`

### I2-ANNOUNCEMENT-CONFIRM — register

`src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts` for `P2CG1I2`.

Forwarding the opt-in setup requires this intermediate helper. Its existing join constructs ObservedSocket internally: that send ignores the broadcaster callback, and join only waits for frame arrival. The receipt connection cannot establish the offer or accept its real applied ACK on that path. The registered reconnect migration needs callback-aware writes and explicit apply/confirmation readiness here, not numeric credit or treating snapshot arrival as convergence.

Minimal implementation seam: Thread the optional setup option into openRouteFixture; let ObservedSocket invoke an optional completion callback and let receipt-mode joins/creation await real durable ACK confirmation. Keep ReceiptSocket hold/fail controls: it calls super.send(data) WITHOUT its callback and must remain the sole owner of its callback.

Checked anchors:

- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:54`: `const fixture = await openRouteFixture();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:24`: `override send(data: string): void { super.send(data);`
- `src/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers.ts:50`: `send(data: string): void { this.sent.push(JSON.parse(data) as IServerMessage);`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:60`: `const socket = new ObservedSocket();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:70`: `const ready = nextFrame(socket, 'CampaignSnapshot');`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:79`: `await ready; return socket;`
- `src/lib/multiplayer/server/ServerMatchBroadcaster.ts:256`: `socket.send(payload, (error) => {`
- `src/lib/multiplayer/server/campaignApplicationConnection.ts:390`: `const result = await this.deps.broadcaster.sendConfirmed(`
- `src/lib/multiplayer/server/campaignApplicationConnection.ts:415`: `view.latest = candidate; view.inFlight = null; await this.processAck(view);`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:306`: `const gm = await fixture.join(getCampaignHostRegistry(), fixture.host);`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:332`: `const live = await fixture.join();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:468`: `const ack = source.syncSession.noteParticipantAcknowledged(`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:764`: `super.send(data); if (!onSent) return;`

### I1-ROUTE-CONDITIONAL — NOT registered yet

`src/pages-modules/api/campaignLaunchAuthorityRoute.ts` for `P2CG1I1`.

At this baseline the route delegates to the I1-owned helper and serializes its refusal. E is planned, so no mandatory route edit is proven.

**Condition:** Recheck after E exact-main proof. Register only if E inlines no-port success or otherwise prevents the already-owned campaignLaunchProgressionGate helper from refusing a session-bearing no-port request while preserving the route API and session-less answer.

Checked anchors:

- `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:258`: `const gate = evaluateCampaignLaunchProgression({`
- `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:266`: `if (!gate.ok) { res.status(409).json(`

### I4-ANNOUNCEMENT-CONDITIONAL — NOT registered yet

`src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts` for `P2CG1I4`.

The current helper has the confirmed-write defect proved for I2, which this amendment assigns there. No second independent I4 edit is proven before that migration exists.

**Condition:** Recheck after I2 exact-main proof. Register only if its reusable setup/socket/join helpers cannot support I4 receipt-ready default creation through the already-owned create harness without changing this file.

Checked anchors:

- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:54`: `const fixture = await openRouteFixture();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.harness.ts:105`: `assert.equal(response.status, 201, JSON.stringify(response.body));`

### I4-RECONNECT-CONDITIONAL — NOT registered yet

`src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts` for `P2CG1I4`.

Real hazards exist in the current test, but I2 is explicitly responsible for this migration. An I4 change cannot yet be proven necessary.

**Condition:** Recheck after I2 exact-main proof. Register only if reconnect still creates missions after resetting without reinstalling the port, or its receipts:false negative control assumes that omitting the binder override disables an installed registry port. I2 already owns this test and should separate no-port delivery controls from receipt-ready mission creation.

Checked anchors:

- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:190`: `_resetCampaignHostRegistry(); const registry = getCampaignHostRegistry();`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:193`: `const entry = await registry.getOrCreate(fixture.entry.matchId);`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:1158`: `['durable membership alone', { receipts: false }],`
- `src/lib/multiplayer/server/bindCampaignSyncConnection.ts:320`: `const receipts = applicationReceipts ?? registry.applicationReceipts;`
- `src/lib/multiplayer/server/__tests__/coopMissionAnnouncement.reconnect.test.ts:170`: `const matchId = await fixture.create(missionRequest(entry, missionId));`

## Census and exact JSON delta

| Unit    | Source/test leaves | Known subtotal including units.json | Source stage including five ancillary files | Spare |
| ------- | -----------------: | ----------------------------------: | ------------------------------------------: | ----: |
| P2CG1I1 |                  5 |                                   6 |                                       10/15 |     5 |
| P2CG1I2 |                  9 |                                  10 |                                       14/15 |     1 |
| P2CG1I3 |                  4 |                                   5 |                                        9/15 |     6 |
| P2CG1I4 |                  7 |                                   8 |                                       12/15 |     3 |

Five reserved files per unit: units.json, admission/red/local receipts, one independent admission-review slot. Includes unchanged restricted leaves conservatively; later G-OWN outputs require separate actual-name/byte/hash census.

I1 route, if later proved: 11/15. I4 announcement helper only: 13/15; reconnect only: 13/15; both: 14/15. No current or listed conditional combination exceeds 15. Extra files must be counted; split rather than inflate caps if a measured manifest exceeds 15.

Test harness changes are line-exempt but file-counted. This amendment measures no future implementation; the 500-added-line admission limit and existing estimates remain unchanged.

The exact recursive JSON diff has four changed leaves: restriction I2[7] adds coopMissionCreate.harness.ts; I2[8] adds coopMissionAnnouncement.harness.ts; subtotal I2 changes 8 -> 10; I2.behavior changes Planned leaves (7) -> (9), names the helpers and appends the labelled parent amendment. Every other field is equal to baseline. Existing restriction order is preserved. All four states remain blocked; caps stay 15/500. No lifecycle/receipt slot, dependency, ownership exception or other-unit change.

## Validation

| Check                  | Result                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| validate-roadmap-plain | exit 0; ROADMAP VALIDATION PASSED: 80 nodes, 13 packages, 381 tasks, 40 triage rows                                                                                                                    |
| validate-roadmap-git   | exit 0; ROADMAP VALIDATION PASSED: 80 nodes, 13 packages, 381 tasks, 40 triage rows                                                                                                                    |
| validator-tests        | exit 0; ✔ (1) expectedReds and runtime.failedRows that name different E2E ids fail (87.511ms); ℹ tests 86; ℹ pass 86; ℹ fail 0                                                                         |
| openspec-strict        | exit 0; Totals: 230 passed, 0 failed (230 items)                                                                                                                                                       |
| qc-openspec-ci         | exit 0; [qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=20/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0 |
| git-diff-check         | exit 0; clean                                                                                                                                                                                          |
| ts7-app-baseline       | TS7 7.0.2, exit 0, no diagnostics                                                                                                                                                                      |

Requested node_modules junction points to the root checkout, which lacks typescript7. Used an existing TS7 compiler from b4-fog-history-20261017; module resolution remains through the requested root dependency junction. No root dependency or lockfile changes; not a clean npm-ci dependency proof.

Machine-idle checks precede compiler invocations. App preflight: CPU 7%, 20.82 GiB free, no Jest/compiler/build process. NOT RUN: optional scripts-project check was withheld after three idle preflights exceeded the 15% CPU threshold (32%, 25%, 22%). No scripts changed. No process was killed. No Jest, application test, build, browser or server run was performed.

Log directory: `E:/Projects/Personal/MekStation-wt/ichain-amendment-evidence-20261018`. The committed receipt records validator command arrays, exit codes and SHA-256 hashes. The idle observations and TS7 output are retained there too. The required validator tests are Node-native and passed 86/86; the no-Jest restriction was preserved.

## Inputs and review handoff

- `E:/Projects/Personal/MekStation-wt/p2cg1i-scope-20261017/SCOPE.md`: SHA-256 `c8855aae7748fcc049dfda36dfdb8171f754b41ee0afe7cc809c82d2fb8cff17`.
- `E:/Projects/Personal/MekStation/docs/audits/2026-10-17-p2cg1d-admission-stop-report.md`: SHA-256 `d7a8fb9ae88d5c4e0f6ab66ff2c93fd3afc6614ffb1a66a8e6bb4f75e42c63e6`.
- `E:/Projects/Personal/MekStation/docs/audits/2026-10-17-pr2220-review.md`: SHA-256 `7b4a6f4db4f4c74bdd06f932818a8b0273155bb8aa22854620c931c966aed547`.

Precedent: #2220 receipt and its independent review. The same registration-only spine is retained: pre/post ledger hashes, exact field diff, no source admission, unchanged caps/states, actual validation logs. The proof modality differs honestly: D had a required field compiler break; I2 has the existing shared fixture lifecycle/callback obstruction.

Before I1 admission, inspect E final no-port route delegation. Before I4 admission, inspect I2 final reusable helper behavior, reset/reopen installation and receipts:false isolation. A deferred condition becoming true requires a separate reviewed literal-path amendment; this document grants no placeholder permission. I3 has no predicted extra leaf; its existing deletion obligations and I4 successor remain intact. Re-run actual runtime/RED proof and finite cap measurement at each admitted implementation.

The local commit has not been independently reviewed, pushed or registered as a PR. Source permission remains held under the normal roadmap process.
