# K15 verification

## Scope and ownership

The host starts and checkpoints the mission; the guest keeps participation choices and joins the host-recorded encounter or remains in HQ. The server also refuses guest mission-create POSTs before any durable write, including retries. Existing membership, readiness, request fingerprint and match-id checks remain authoritative.

| Entry or owner | Change and proof |
| --- | --- |
| `CampaignCoopEntryPanel` | Onboarding and its campaign-creation checkpoint are unchanged. Its host-session checkpoint is represented in the durable integration fixture. |
| Mission launch page and surfaces | Pass pending/day-advance state; guests see “The host starts this mission.” and Join Mission. Buttons use Title Case. Page component tests cover the guest surface and disabled day-advance control. |
| `missionLaunchPage.launch.ts` | Thin launch/checkpoint coordinator. A co-op checkpoint installs both projections through the public store switch operation and awaits one store save. The old co-op update operation auto-saved too early. Single-player and the dashboard keep the existing facade. |
| `missionLaunchPage.coop.ts` | Co-op page adapter for preparation, guest refresh, identity checks and deploy/HQ navigation. Extracted within the same page module to keep root lint at 63 warnings. |
| `coopMissionLaunchAttempt.ts` | Owns synchronous mission exclusivity and retained stages; the page facade preserves existing policy exports. Different missions and stores remain independent. |
| `launchCoopMission.ts`, `launchCampaignEncounter.ts` | Capture the accepted request and retain shared-match and local-encounter ids. Local configuration/launch resumes on the first row. A linked recorded encounter is reused by a fresh attempt owner. |
| `matches/index.ts`, `coopMissionCreate.ts`, `coopMissionAdmission.ts` | The collection handler and readiness admission are unchanged. The create owner now requires the session host. Full server tests and real authenticated route calls cover creation, identical retries and refusal without writes. |
| Host journal checkpoint | Real authenticated PUT, host lock, compare-and-swap, journal append and saved campaign row. Integration injects a competing update and proves it survives resync/retry without relaunch. |
| Guest view and later opening | Refreshes the authoritative campaign and requires an actual stored session link, rather than treating a scenario placeholder as an encounter. Integration proves guest join adds no launch or checkpoint. |
| Failure/retry | Preparation failure can retry; uncertain remote create keeps the exact request; local failure retains the row; checkpoint failure retains the successful launch; rejected/cancelled navigation resumes without another launch/checkpoint. |
| Single-player, interactive, spectator and pre-battle auto-resolve | Single-player path remains separate. Neither pre-battle hook is edited. Encounter-to-session enforcement and completion remain S1a's responsibility. |
| `GameEngine` phases and `runToCompletion`, QuickResolve, quick game, campaign fast-forward, AI, P2P translation, standalone simulation | No new entry into this page coordinator and no K15 changes to those implementations. Integration, full runner, replay/digest/golden and combat validation provide regression evidence. |

S1a PR #3058 was still open at the final dependency check. K15 calls the existing encounter launch service and does not implement or copy S1a's link/complete operations. Main was merged normally, without rebasing or force-pushing; the latest incorporated main is `6f7772669`.

## Test-first evidence

Logs are retained locally under `E:/Projects/Personal/_scratch/sm-audit-reports/k15/`.

| Red run | Observed failure |
| --- | --- |
| `red-attempt.log` | The attempt owner did not yet exist; the existing encounter retry also returned no retained encounter id. |
| `red-page.log` | Four failing rows: same-tick guard/checkpoint, day-advance refusal, checkpoint retry without relaunch, guest refresh/join. |
| `red-ui.log` | Guest authority explanation and Title Case day-advance launch control were absent. |
| `red-integration.log` | Cold-read assertions found no encounter linkage in the durable mission; checkpoint conflict handling also failed. |
| `red-server-guest.log` | An authenticated guest create returned 201 instead of 403. |
| `red-removed-mission.log` | Checkpoint incorrectly allowed navigation when the mission disappeared during resync. |

The behavior-preserving configuration/launch refactor is commit `a67a3dad9`. Its full encounter directory passed 91 tests in 5 suites, including four error/id regression rows, and both TypeScript configurations passed before that commit.

## Durable integration and mutants

`src/__tests__/integration/coopMissionLaunchCheckpoint.test.ts` runs the real page coordinator, authenticated match-create route, durable match store, campaign PUT route and journal checkpoint on temporary SQLite files. A narrow local launcher uses the real encounter repository with an injected session handle; this is not a live browser/combat-session test.

Each of double click, response loss after remote commit, and checkpoint conflict ends with one local encounter row and its id exactly once in the durable mission, verified through an independent read-only SQLite connection. Lost-response retry sends a byte-identical request. The competing campaign name survives checkpoint retry. A fresh attempt owner reuses the stored link; guest joining adds neither a launch nor a campaign write.

| Deliberate mutant | Killing test | Result |
| --- | --- | --- |
| Remove the synchronous busy check | `takes the mission guard synchronously before preparation can yield` | FAIL: preparation ran twice instead of once; Jest exit 1 (`mutant-guard.log`). |
| Discard the successful launch on checkpoint failure | `retains the successful encounter across checkpoint failure` | FAIL: launch ran twice instead of once; Jest exit 1 (`mutant-checkpoint.log`). |

The original source was restored byte-for-byte after each mutation. The passing full-directory runs followed restoration.

## Local gates

Commands ran with Node 22, matching the installed SQLite native ABI. Counts below overlap; they are not a unique-test total.

| Gate | Result |
| --- | --- |
| Baseline launch directories | PASS: 33 suites, 503 tests. |
| Baseline replay/digest/golden | PASS: 68 suites, 1,030 tests. |
| All touched domain/page test directories, integration, full multiplayer server | PASS: 239 suites, 2,632 tests; 35 pre-existing skips. |
| Final campaign/co-op/encounter/page/integration and dashboard directories | PASS: 93 suites, 1,191 tests; 32 pre-existing skips. Includes the final missing-mission refusal and current main's dashboard mock correction. |
| Full simulation runner plus replay/digest/golden | PASS: 218 suites, 2,525 tests. |
| `npm run validate:combat` | PASS: 79 suites, 2,107 tests; gap/catalog inventories and OpenSpec stages exit 0. |
| `npm run typecheck` | PASS: root and scripts TypeScript configurations. |
| Root lint | PASS: 63 warnings, 0 errors. |
| `npm run lint:units` and its full Jest suite | PASS: below every unchanged ceiling; 33 tests. |
| `npx oxfmt` / formatting check | PASS: `npm run format:check` checked the full repository (9,144 files). |
| `npx openspec validate --all --strict` | PASS: 262 items, 0 failures. |
| `npm run qc:openspec-ci:validate` | PASS: 41/41 active changes accounted for; 0 errors. |
| `node scripts/ci/budget-check.mjs` | PASS: 57 unkeyable tests, 92 repo-wide keys; no ceiling changes. |
| Fixture/digest/schema diff | No K15 changes to committed replay fixtures, digests, event payloads, replay packs, generated data, schema formats or the legacy active ledger. No affected source-anchor citations were found for the K15 files. |

## Limits

The pending attempt is process-local. A crash before the campaign checkpoint can still lose the newly generated local encounter linkage. Old orphan encounters from previous double launches are deliberately left untouched. Both limits are documented in `src/lib/campaign/coop/RULES.md` and the PR body. No migration or automatic deletion is included.

Browser UAT and browser screenshots were not run. UI evidence is component/page testing, and persistence evidence is the real-route SQLite integration described above. Hosted CI and any independent review are reported separately on the draft PR; no merge is performed by this lane.
