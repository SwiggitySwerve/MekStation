# Lane A review: U35j
reviewedHead: 2b93cce976de479f91593b318a1c9dae32badda6
baseline: 890313d59e917f0115a87ca3dbc10dea9cc6ad30
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

Fetched `origin` (`git -C E:/Projects/MekStation fetch origin`), created a detached worktree at
`E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u35j-review` at
`2b93cce976de479f91593b318a1c9dae32badda6`, junctioned `node_modules` from the root checkout via PowerShell
`New-Item -ItemType Junction`, set `npm_config_dry_run=true`, and used Node 22
(`/c/Users/wroll/AppData/Local/nvm/v22.22.0`, confirmed `node --version` = v22.22.0). Never ran `npm install`,
`build`, or Playwright; never touched the root checkout or `worktrees/u35j`. Ran `node scripts/qc/machine-idle.mjs
--wait --timeout-ms 1800000` before the first full-directory jest run (returned `MACHINE_IDLE`). Jest suites were
run one at a time. Deleted the review's own scratch test
(`src/lib/events/replay/__tests__/U35jLaneAScratchProbe.test.ts`) before finishing; `git status --porcelain` on
the review worktree is empty as of this writing. Deleted the `node_modules` junction with
`[System.IO.Directory]::Delete(...)` and removed the worktree with `git worktree remove --force` after writing
this file.

**Receipts not found on the head.** The charter asked me to read `evidence/u35j-{admission,red,local}-20260925.json`
on the reviewed head. None exist: `git ls-tree -r 2b93cce97 --name-only | grep -i u35j` returns nothing, the
branch (`roadmap-u35j-schema-pack-sourceversion-20260925`) has exactly one commit past baseline
(`git log --oneline 890313d59..2b93cce97`), and no commit anywhere in `git log --all` touches a `u35j-*` evidence
file. This is not a defect in the diff: the PR body's own "Ledger" section says "The receipts fold on main in a
docs PR that follows." I substituted the PR description (`gh pr view 1947 --json body`) for the admission's
design rationale — its "Why", "What changed", and "The fingerprint choice, for the owner's ruling" sections cover
the same ground the charter calls admission answers (1)-(4). I found no "appended correction about recoveredUnit"
anywhere (PR body, commit message, or units.json) — this element of the charter's brief does not exist on the
head or in the PR description; I treat it as not applicable rather than a gap in my search.

## Files on the range

`git diff --stat 890313d59..2b93cce97`: 3 files, 386 insertions(+), 5 deletions(-), all inside U35j's three
ownership paths:
- `src/lib/events/replay/CampaignBaselineSchemaPack.ts` (+34/-4, product)
- `src/lib/events/replay/__fixtures__/CampaignBaselineSchemaPack.fixture.ts` (+23/-1, fixture)
- `src/lib/events/replay/__tests__/CampaignBaselineSchemaPack.test.ts` (+333/-0, test)

`units.json` is untouched by this diff (the unit's `stageReceipts` are still `null` on `main` as of baseline
`890313d59`; that is consistent with the "receipts fold in a docs PR that follows" note above, not a scope
violation — the diff never claims to update the ledger).

## Findings

### Finding 1 (informational, no edit required) — every production minting path for `sourceVersion` yields a positive integer

The only two call sites that mint a fresh `sourceVersion` value (as opposed to copying one already on a
projection) both route through `pinSourceVersion`:
- `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.hooks.ts:106` —
  `sourceVersion: pinSourceVersion(sourceVersion)`
- `src/components/gameplay/pages/campaigns/create/CreateCampaignPage.submit.ts:163` —
  `sourceVersion: pinSourceVersion(unit.sourceVersion)`

`pinSourceVersion` (`src/lib/kernelPlugin/mekstation/mapRosterInstanceProvenance.ts:17-22`):
```
if (version !== undefined && Number.isInteger(version) && version > 0) return version;
return CANONICAL_LIBRARY_SOURCE_VERSION;
```
`CANONICAL_LIBRARY_SOURCE_VERSION = 1` (`src/lib/kernelPlugin/mekstation/mekstationGamePlugin.ts:20`). Every
other production site that touches a roster unit's `sourceVersion` (`campaignSourceGenesis.ts:120-121`,
`campaignAuthoritativeState.ts:65-66`, `CampaignMatchHostOutcomeInbox.ts:204-216`'s `{ ...current, status:
change.status }`, `campaignAdoptedUnitReference.ts:279-281`) copies an already-pinned value through a
conditional spread; none of them mint a new one. `grep -rn "sourceVersion" src --include="*.ts" | grep -v
__tests__` finds no other writer of a roster-unit `sourceVersion`; the ~140 other hits are an unrelated
`CombatFeatureSourceReference`/`sourceRefs` naming coincidence (rulebook citation versions, e.g.
`MEGAMEK_TO_HIT_SOURCE_VERSION`) and `src/kernel/repositories/enrollInstance.ts:50` (`sourceVersion: item.version`),
which is a different type (`IInstanceProvenance`, the kernel save-ledger's own provenance record, never
serialized into a `CampaignEventType` payload). I found no writer of `sourceVersion: 0` or a non-integer
anywhere. `z.number().int().positive().optional()` refuses nothing real data writes.

### Finding 2 (informational, no edit required) — the fingerprint law and checkpoint wiring

Measured via `npx jest -t "changes the pipeline fingerprint"` (passes on the head — see Gates) that the
composed campaign registry's `fingerprintPipeline` changes for a history holding `RosterUnitChanged`,
`SalvageAllocated`, or `CampaignSnapshotPublished` alone, and is unchanged for a history of the other five
types, exactly matching the event-store spec's "Upcast pipeline changes without a projector change" scenario
(`openspec/specs/event-store/spec.md:398-401`) and `ReplayPipelineFingerprint.ts`'s hash-the-schema-id (not the
shape) behavior (confirmed by reading `fingerprintReplayPipeline`: `targetSchema.schemaId` is the only thing
that goes into the hashed material for each event type).

Writers/readers of `schemaPipelineFingerprint` (`grep -rn "schemaPipelineFingerprint" src --include="*.ts" | grep
-v __tests__`):
- **Combat side, real and wired:** `BranchCheckpointCache.ts:187,202,250,414`,
  `SQLiteReplayCheckpointRepository.ts:133,177,240` (a `schema_pipeline_fingerprint` DB column), and
  `ReplayCheckpointCompatibility.ts:141-143` (`checkpoint.schemaPipelineFingerprint !==
  expected.schemaPipelineFingerprint`) genuinely write and compare a fingerprint, sourced from
  `REPLAY_SURFACE_REGISTRY` (`ReplaySurfaceGate.ts:55`, `createReplayBaselineDomainRegistry()` — the superset that
  *does* include the campaign pack). But every real caller of `gateReplaySurfaceHistory`/
  `buildReplaySurfaceReport` I found (`InteractiveSession.persistence.ts`, `useMultiplayerSession.ts`,
  `ReplayLibraryLoadPipeline.ts`, `mirrorMatchSession.ts`, `rewindCommitDeps.ts`) only ever hands it combat/game
  session histories, gated by `isGameEvent` (`GameSessionInterfaces.ts:22-35`, which requires `gameId`/`turn`/
  `phase` — fields a `ICampaignEvent` does not have). `fingerprintPipeline` only hashes event types actually
  present in the given `historicalVersions` list, so a combat-only history never includes the three changed
  campaign schema ids and its stored fingerprint is unaffected by this PR. Separately,
  `MatchSessionProjector.ts:114-124`'s `MATCH_SESSION_SCHEMA_REGISTRY` is built from `MATCH_EVENT_TYPES` with its
  own `match.event.*.v1` ids — it never references `CAMPAIGN_BASELINE_SCHEMA_PACK` at all, so it cannot be
  affected.
- **Campaign side:** `campaignAuthorityMigration.ts:142`'s `baseMarker()` writes
  `campaignSchemaPipelineFingerprint()` (line 116, computed over **all eight** canonical campaign types, not just
  the ones in a given history — so this one fixed value changes for every campaign the moment any of the eight
  ids changes) into every `ICampaignCutoverMarker`. That marker IS durably persisted, via
  `CampaignMigrationMarkerStore` (SQLite migration 9), from `campaignRecordJournalSave.ts:124-127`
  (`if (genesis) writeCampaignMigrationMarker(...)`, itself gated on `isCampaignJournalAuthorityEnabled()`) and
  from the `/api/campaigns/[id]/adopt` route (also flag-threaded: `adopt.ts:148` passes
  `enabled: isCampaignJournalAuthorityEnabled()`). `campaignJournalAuthorityEnabled.ts`'s own header states
  "Production stays on `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` (hardcoded false)" — confirmed by reading the
  constant. The **only** comparator of a marker's `schemaPipelineFingerprint` anywhere in `src` is
  `isMaterializedSnapshotCompatible` (`campaignAuthorityMigration.ts:366-378`), and it has zero callers outside
  its own file (`grep -rn "isMaterializedSnapshotCompatible" src` returns only its declaration) — dead code. So:
  a marker written under the old fingerprint (there should be effectively none in production today, since
  writes are flag-gated off) sits in storage unread; nothing compares it to anything, today. If a future unit
  wires `isMaterializedSnapshotCompatible` (or an equivalent) into a read path, that stale marker would then
  compare unequal to the live (post-PR) fingerprint and be treated as an incompatible materialization per D10
  (discarded, rebuilt from an earlier base or full replay) — exactly what the spec's scenario intends, and
  exactly what the PR body says ("a future reader will treat them as an older pipeline").
- **The implementer's claim "no campaign replay checkpoint exists; recovery always replays in full" is true.**
  `resolveCampaignAuthorityFromStores.ts` and `JournalCampaignEventStore` (used directly by
  `resolveCampaignAuthorityFromStores.ts` and by the test file's own producers) never consult
  `BranchCheckpointCache` or any other checkpoint cache for a campaign; that cache is wired only into
  `MatchRecovery.ts`/`MatchSessionProjector.ts` (combat match recovery). `grep -rn "BranchCheckpointCache" src`
  confirms no campaign-side caller.

### Finding 3 (measured; confirms and elevates Finding F1 from the PR body — no edit required in this unit) — the co-op match-creation body is refused for any roster unit carrying `sourceVersion`

The PR body's own Finding F1 says this is "inferred, not run." I ran it. A scratch test built the exact
production client path: `buildCampaignAuthoritativeState` (the same producer function reviewed above) over a
roster with `sourceVersion: 3`, wrapped exactly as `CampaignCoopEntryPanel.tsx:217-234` wraps it (`{ config,
layout, hostSeatKind, displayName, coopCampaign: { campaignId, state: coopState, arbitrationMode } }`), parsed
against the real `CreateMultiplayerMatchBodySchema` (`src/lib/api/securitySchemas.ts:132-152`, the schema
`src/pages/api/multiplayer/matches/index.ts:284`'s `parseBody(CreateMultiplayerMatchBodySchema, req, res)`
actually validates the request body with). Result:
```
[{"code":"unrecognized_keys","path":["coopCampaign","state","rosterUnits","unit-0"]},
 {"code":"unrecognized_keys","path":["coopCampaign","state","rosterUnits","unit-1"]}]
```
`parseBody` (`src/lib/api/security.ts:57-77`) turns a `safeParse` failure into `res.status(400).json(...)`. So:
any campaign whose roster carries a library-enrolled unit (i.e. almost every real campaign, since
`pinSourceVersion` always sets the field) cannot open a co-op match today, on `main`, unaffected by this PR
either way — `CampaignRosterUnitSchema` (`src/lib/api/securitySchemas.ts:83-91`, `.strict()`) has no
`sourceVersion` field and this diff does not touch that file. This is correctly outside U35j's ownership paths
and not a required edit here.

**Citation error in the PR body:** Finding F1 cites `src/lib/multiplayer/server/securitySchemas.ts:83-91`. That
path does not exist (`ls` confirms). The schema is at `src/lib/api/securitySchemas.ts:83-91` — the line numbers
are correct, the directory is not. Minor, does not affect the finding's substance.

### Finding 4 (no edit required — pre-existing, untouched by this diff) — F3's two stale comments are real and unaffected

Confirmed both: `openspec/changes/add-replay-schema-and-checkpoint-safety` does not exist
(`openspec/changes/archive/2026-08-22-add-replay-schema-and-checkpoint-safety/` does), so the pack's `@spec`
header line and the domain-registry test's identical header line both point at an archived path; and
`ReplayBaselineDomainRegistry.test.ts`'s docstring says "7 campaign + 81 combat" while `CAMPAIGN_COUNT = 8` in
the same file. Neither line is touched by this diff (`git diff` confirms the pack's header comment block and the
domain-registry test file are both outside the 3-file diff), so there is nothing for this unit to correct.

## Question 4 — the fixture's new cases and the domain-registry suite

`ReplayBaselineDomainRegistry.fixture.ts` imports `VALID_CAMPAIGN_EVENT_PAYLOADS` directly from
`CampaignBaselineSchemaPack.fixture.ts`, so the new valid case (the pinned `rosterUnit` with `sourceVersion: 3`
plus `legacyRosterUnit` with none, both now inside `CampaignSnapshotPublished`'s `rosterUnits`) is picked up
automatically by `ReplayBaselineDomainRegistry.test.ts`'s per-discriminant round-trip test (`'%s reaches its
single current target from baseline v1'`) — confirmed green (see Gates). The new **invalid** cases
(`INVALID_ROSTER_UNIT_SOURCE_VERSIONS`) are not picked up by that suite at all: nothing in
`ReplayBaselineDomainRegistry.fixture.ts` or `.test.ts` imports or references that export, and that test file has
no per-discriminant "fails on an invalid payload" test to begin with (only "fails on an unsupported version" and
"fails on an unknown type"). This is a pre-existing gap in that suite's design, not something introduced or
required to be fixed by U35j (`ReplayBaselineDomainRegistry.test.ts` is outside U35j's ownership paths).

## Question 6 — independent mutant (not M1-M5)

Mutated `src/lib/events/replay/CampaignBaselineSchemaPack.ts:114` by deleting the `'SalvageAllocated',` line
from `ROSTER_UNIT_EVENT_TYPES` (`sed -i "114d"`), so `SalvageAllocated` alone reverts to schema id
`campaign.SalvageAllocated.v1` while the other two keep `.v1-r2` — a partial id-reversion distinct from M4 (all
three reverted). Ran `npx jest src/lib/events/replay/__tests__/CampaignBaselineSchemaPack.test.ts
src/lib/events/replay/__tests__/ReplayBaselineDomainRegistry.test.ts`: 1 failed, 222 passed. Caught by
`'changes the pipeline fingerprint for, and only for, histories holding a roster unit'` (the `SalvageAllocated`
arm: `expect(...).not.toBe(...)` received the now-equal old fingerprint). Nothing else caught it, because
`SalvageAllocated`'s payload *shape* (via the shared `campaignRosterUnit`) is unaffected by which id it
registers under — only the fingerprint-scope test inspects ids. Restored via `git checkout 2b93cce97 --
src/lib/events/replay/CampaignBaselineSchemaPack.ts`; sha256 after restore
(`5012874b53a74cd09b0a7dbe0fa82b858c7f1f157b12738759cd9939b7e195a2`) matches the sha256 recorded before the
mutant.

## Gates

All run in the review worktree at the reviewed head, one at a time, after `MACHINE_IDLE`.

| Gate | Result | Matches PR body |
|---|---|---|
| `npx jest src/lib/events/replay/__tests__/CampaignBaselineSchemaPack.test.ts` | 39 passed, 39 total, exit 0 | yes (39 tests) |
| `npx jest src/lib/events/replay` | 22 suites, 644 tests passed, exit 0 | yes |
| `npx jest src/lib/events` | 51 suites, 947 tests passed, exit 0 | yes |
| `npx jest src/lib/campaign/authority` | 24 suites, 175 tests passed, exit 0 | not in PR body; charter-added; passed |
| `npx jest src/lib/campaign/sync` | 14 suites, 97 tests passed, exit 0 | not in PR body; charter-added; passed |
| `npx jest src/lib/multiplayer/server` | 160 suites, 1178 tests passed, exit 0 | yes (160/1178) |
| `npx tsc --noEmit` | no output, exit 0 | yes |
| `npx oxlint` | "Found 84 warnings and 0 errors.", exit 0 | yes (84 warnings, unchanged) |
| `npx oxfmt --check` on the 3 changed files | "All matched files use the correct format.", exit 0 | yes |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100`, exit 0 | yes |
| `npm run qc:openspec-ci:validate` | `...errors=0`, exit 0 | yes |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows`, exit 0 | yes |

`git status --porcelain` in the review worktree was empty before and after every gate run.

## Cap

3 files (cap 15). Product lines: 34 in `CampaignBaselineSchemaPack.ts` (cap 500), confirmed by
`git diff --stat` on exactly the 3 changed files (34/24/333 insertions matching the PR body's own count; fixture
+ test = 357 lines, correctly excluded from the product-line cap per OD-line-cap-product-lines). No AI
attribution in the commit message or PR body (`git show -s --format=%B` and `gh pr view --json body`, checked
for `Co-Authored-By`/"Generated with" trailers — none). No absolute machine paths in the diff (`git diff | grep
-iE "E:[\\/]Projects|C:\\Users|/home/|/Users/"` — no hits). Every added/changed comment checked against the code
beneath it:
- `campaignRosterUnit`'s `sourceVersion` comment ("every path that mints it... yields a positive integer") —
  verified true (Finding 1).
- `campaignSchemaId`'s doc comment (ids, fingerprint law, spec scenario name) — verified true (Finding 2); the
  quoted scenario title "Upcast pipeline changes without a projector change" is an exact match to
  `openspec/specs/event-store/spec.md:398`.
- `CAMPAIGN_BASELINE_SCHEMA_PACK`'s updated doc comment ("no transitions") — verified true (`transitions: []` in
  the map literal).
- The fixture's two new comments and `INVALID_ROSTER_UNIT_SOURCE_VERSIONS`'s doc comment — verified true against
  the actual array contents (`['3', 0, -1, 1.5, null]`: non-number, zero, negative, fraction, null).
- The test file's new header paragraph — verified true against what the suite actually runs; it correctly does
  not claim to cover the fourth producer (`AllocateSalvage`'s `recoveredUnit`), which is why I probed that one
  myself.

## Verdict rationale

Every claim in the PR body I could check, I checked, and none were false: the `sourceVersion` type is exactly
what every real minting path writes; the fingerprint law is implemented and tested correctly against the spec's
own scenario; all three shipped producers plus the fourth (`AllocateSalvage`'s `recoveredUnit`, which I probed
myself since the shipped suite does not exercise it end-to-end) parse on the head and are refused
(`unrecognized_keys sourceVersion`) on the restored baseline pack, restored file sha256-confirmed; strictness on
unknown fields and ill-typed/out-of-range `sourceVersion` holds; the domain-registry suite picks up the new valid
fixture case automatically (it has no invalid-payload test to pick up the new invalid cases, a pre-existing gap
outside this unit); a mutant I chose independently of M1-M5 is caught; every gate matches the PR body's reported
numbers exactly; and scope, caps, attribution, and comment accuracy all hold. The one live production gap
Finding 3 confirms (co-op match creation 400s on any roster unit with `sourceVersion`) is real and I measured
it directly, but it is in a file this unit does not own and this PR does not touch or worsen it — it is correctly
disclosed, not fixed, and does not block this unit. APPROVE.
