# Lane A review: U88
reviewedHead: 2f701bdb37a5189051d207556edd2210607adc47
baseline: 5a3e87f8ca4876ed36a3b186e56ba1211137cb12
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- Fetched `origin`, created a detached worktree at the exact reviewed head:
  `git worktree add --detach .../worktrees/u88-review 2f701bdb37a5189051d207556edd2210607adc47`.
- Junctioned `node_modules` from the root checkout (PowerShell `New-Item -ItemType Junction`); ran everything with `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` (node v22.22.0 confirmed) and `npm_config_dry_run=true`; never ran `npm install/ci/prune`, never built, never ran Playwright, never committed or pushed.
- Confirmed the review worktree's `src/lib/api/securitySchemas.ts` sha256 is `c53d238e2e1138b933a93dac5511eeba07691b9870652a9069457f223905d93f`, equal to the local receipt's `finalSha256`, and the baseline blob's sha256 (`git show <baseline>:src/lib/api/securitySchemas.ts | sha256sum`) is `36b226d61b9c37b098260a50e32a9b074f773df0acb21d42aaf68f520ffdc592`, equal to the receipt's `baselineSha256`.
- Ran `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` before each full-directory jest run, per the charter; every run printed `MACHINE_IDLE`.
- Read `openspec/planning/2026-09-12-roadmap-completion/GOAL.md`, `DELIVERY.md` (the numbered list containing the Lane A/Lane B definitions), the `U88`/`U35j` entries in `units.json`, findings `FN-u35j-coop-match-body-refuses-sourceversion` and `FN-u88-salvage-request-schema-drops-unit-provenance`, and the three U88 evidence receipts. Those receipts (`evidence/u88-{admission,red,local}-20260925.json`) are **not present at the reviewed head** — they were folded into `origin/main` afterward as a separate docs commit (`d160837e8`), which `git merge-base --is-ancestor 2f701bdb3 d160837e8` confirms is not an ancestor relationship (not an ancestor either way; 2f701bdb3 is a single commit on the baseline). I read them from the main checkout at `E:/Projects/MekStation` as read-only planning context, exactly as the charter's reading list directs.
- Deleted the node_modules junction and removed the worktree at the end (below).

## Files on the range

`git diff 5a3e87f8ca4876ed36a3b186e56ba1211137cb12..2f701bdb37a5189051d207556edd2210607adc47 --stat`:

```
 .../__tests__/coopMatchRosterSourceVersion.test.ts | 406 +++++++++++++++++++++
 src/lib/api/securitySchemas.ts                     |   5 +
 2 files changed, 411 insertions(+)
```

Both files are under `src/lib/api` (in-cap). Product diff (`src/lib/api/securitySchemas.ts`, +5/-0):

```diff
@@ -87,6 +87,11 @@ const CampaignRosterUnitSchema = z
     status: z.enum(['operational', 'damaged', 'destroyed']),
     unitRef: z.string().trim().min(1).max(ID_MAX_LENGTH).optional(),
     unitSource: z.enum(['canonical', 'custom']).optional(),
+    // The library version pinned at enroll, which the co-op builder copies
+    // onto each unit that has one: optional, and a positive integer when
+    // present, the same type the campaign baseline schema pack gives it.
+    // Any other unknown key still fails the strict object.
+    sourceVersion: z.number().int().positive().optional(),
   })
   .strict();
```

## Findings

1. **[info, not a defect] Value type is identical to U35j's pack and to every minting path.**
   `src/lib/api/securitySchemas.ts:94`: `z.number().int().positive().optional()`, byte-identical to `src/lib/events/replay/CampaignBaselineSchemaPack.ts:36`. Traced every non-test writer of a roster-unit `sourceVersion:` in `src` (`grep -rn "sourceVersion:" src`, filtered to the campaign-roster concept — the `simulation/runner/Combat*SourceRefs.ts` hits are an unrelated string-typed rules-citation field, not `ICampaignRosterUnit.sourceVersion`): the two sites that *mint* a new value (`src/components/gameplay/pages/campaigns/create/CreateCampaignPage.hooks.ts:106`, `CreateCampaignPage.submit.ts:163`) and `src/lib/kernelPlugin/mekstation/mapRosterInstanceProvenance.ts:34` all call `pinSourceVersion` (`mapRosterInstanceProvenance.ts:17-22`), which returns the input only when `Number.isInteger(version) && version > 0`, else the constant `CANONICAL_LIBRARY_SOURCE_VERSION = 1` (`mekstationGamePlugin.ts:20`) — always a positive integer. The three sites that *relay* an existing value (`campaignAuthoritativeState.ts:65-67`, `campaignSourceGenesis.ts:120-122`, `campaignAdoptedUnitReference.ts:279-281`) all copy `unit.sourceVersion`/`projection.sourceVersion` from `IRosterUnitProjection`, which is only ever populated at those two minting call sites. No production writer of a non-positive or non-integer `sourceVersion` onto a campaign roster unit was found. (`src/kernel/repositories/enrollInstance.ts:50` writes `sourceVersion: item.version` onto a separate type, `IInstanceProvenance`/kernel save-envelope provenance — not `ICampaignRosterUnit` — and was not traced further; out of this unit's path.)

2. **[verified, no defect] Red reproduced independently.** Restored the baseline blob over the head's `securitySchemas.ts` in the review worktree and ran the new suite: `Tests: 6 failed, 4 passed, 10 total` — exact match to the red receipt's attempt 2. Restored the head's file with `git checkout --`; sha256 back to `c53d238e...` (the head blob), `git status --porcelain` empty.

3. **[verified, no defect] Route end-to-end: host state and durable-store path.** `src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts:337-360` posts the panel body with `sourceVersion` 3 through the real route handler (`POST /api/multiplayer/matches`) and asserts `entry.host.getState()` and the response `meta.coopCampaign.state` both keep `sourceVersion: 3` on every unit — ran green (10/10). The store exercised there is `InMemoryMatchStore` (`getDefaultMatchStore.ts:56-66`: `shouldUseDurableStore()` is true only under `NODE_ENV=production` or `MULTIPLAYER_STORE=durable`, neither set in this jest run) — the local receipt discloses this as a non-claim rather than hiding it. I independently probed the durable path: a scratch test (`src/lib/multiplayer/server/__tests__/zzU88ReviewDurableProbe.test.ts`, deleted after the run) constructed a `DurableMatchStore({ path: ':memory:' })`, wrote a meta whose `coopCampaign.state.rosterUnits['unit-0']` carried `sourceVersion: 3`, and read it back — `sourceVersion` round-tripped unchanged (`PROBE_RESULT {"unitId":"unit-0",...,"sourceVersion":3}`, test passed). Reading `DurableMatchStore.ts:709-738` (`createMatch`: `JSON.stringify(meta)`) and `:1328-1332` (`getMatchMeta`: `JSON.parse(row.meta_json) as IMatchMeta`) confirms why: the durable store never re-parses `meta` through any zod schema, so nothing downstream of `parseBody` can re-refuse or strip a value `parseBody` already accepted.

4. **[verified, no defect] Strictness preserved; other body schemas untouched.** The full diff (`git diff <baseline>..<head>`) touches exactly one schema field plus its comment; `TokenIssueBodySchema`, `UnlockIdentityBodySchema`, `MatchUnitBootstrapEntrySchema` and every other exported schema in `securitySchemas.ts` are byte-identical to baseline. `.strict()` is unchanged at `securitySchemas.ts:96`. Ran the full new suite green (10/10): unknown extra roster field still refused (schema issue + route 400 + zero hosts registered), and `sourceVersion` of `'3'`, `0`, `-1`, `1.5` are each refused with an issue at `coopCampaign.state.rosterUnits.unit-0.sourceVersion`.

5. **[verified, no defect] Independent mutant (not M1-M4).** Applied `sourceVersion: z.number().int().optional()` (dropping only `.positive()`, keeping `.int()` — distinct from the implementer's M3, which drops both). Suite result: `Tests: 2 failed, 8 passed, 10 total` (caught by `refuses sourceVersion 0` and `refuses sourceVersion -1`; `refuses sourceVersion 1.5` still passed, as expected since `.int()` was kept, giving this mutant a different discrimination profile than M3). Restored the file from a pre-mutant copy; sha256 back to `c53d238e...`, `git status --porcelain` empty.

6. **[info, out of unit scope, already recorded] Findings FN-u88-salvage-request-schema-drops-unit-provenance and the local receipt's F2/F3 are accurate and correctly scoped as deferred, not fixed here.** Confirmed `src/types/campaign/campaignSyncSchemas.ts:33-37` `rosterUnitSchema` keeps only `unitId`, `designation`, `status` (a plain `z.object`, not `.strict()`, so it silently drops `unitRef`/`unitSource`/`sourceVersion`) — outside `src/lib/api`, untouched by this diff. Confirmed F2 (`grep -n "CampaignSync\|ICampaignRosterUnit" src/lib/api/securitySchemas.ts` → no match: nothing ties the zod schema to the TS interface) and F3 (`CampaignCoopEntryPanel.test.tsx:56-58` mocks `buildCampaignAuthoritativeState` to return `{}`). None of these require a change inside U88's ownership path (`src/lib/api`) and none contradict the unit's behavior sentence.

No findings rise to REQUIRED-EDIT.

## Gates (reviewed head, all re-run independently in the review worktree)

| Gate | Command | Last line / counts | Exit |
|---|---|---|---|
| Focused suite (baseline, red repro) | `npx jest src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` (baseline file restored) | `Tests: 6 failed, 4 passed, 10 total` | 1 |
| Focused suite (head) | `npx jest src/lib/api/__tests__/coopMatchRosterSourceVersion.test.ts` | `Tests: 10 passed, 10 total` | 0 |
| `npx jest src/lib/api` | | `Test Suites: 1 passed, 1 total`, `Tests: 10 passed, 10 total` | 0 |
| `npx jest src/__tests__/api` | | `Test Suites: 57 passed, 57 total`, `Tests: 772 passed, 772 total` | 0 |
| `npx jest src/__tests__/unit/api` | | `Test Suites: 6 passed, 6 total`, `Tests: 35 passed, 35 total` | 0 |
| `npx jest src/pages-modules/gameplay/campaigns` | | `Test Suites: 7 passed, 7 total`, `Tests: 30 passed, 30 total` | 0 |
| `npx jest src/lib/multiplayer/server` | | `Test Suites: 160 passed, 160 total`, `Tests: 1178 passed, 1178 total` | 0 |
| `npx tsc --noEmit` | | (no output) | 0 |
| `npx oxlint` | | `Found 84 warnings and 0 errors.` (0 in `src/lib/api`, equal to the charter's 84) | 0 |
| `npx oxfmt --check` (changed files) | | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | | `...errors=0` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` (unchanged from admission) | 0 |

Every count matches the implementer's local receipt exactly, except `src/lib/multiplayer/server`, which the receipt did not run but the charter's gate list requires — it is green (160/1178) at the reviewed head.

## Cap

- Files changed: 2, both under `src/lib/api` (owned path). Cap: 15 files — well within.
- Product lines: 5 added, 0 removed (`securitySchemas.ts`). Cap: 500 non-generated product lines — well within. Test lines (406) do not count per OD-line-cap-product-lines.
- No AI attribution in the commit message (`git log -1 --format=%B 2f701bdb3`).
- No absolute machine paths in the diff (`git diff <baseline>..<head> | grep -n -i -E 'E:[\\/]|C:[\\/]|/Users/|/home/'` — no match).
- Every added/changed comment verified against the code beneath it: the product comment's four claims (copied by the co-op builder; optional positive integer; same type as the baseline pack; unknown keys still refused) each independently confirmed in Findings 1 and 4; the test file's header docblock claims (panel-shaped body, real route handler, temp SQLite, journal authority off checked in `beforeEach`) confirmed by reading the file (`beforeEach` at line ~294 asserts `isCampaignJournalAuthorityEnabled()` is `false` before any row runs).

## Verdict rationale

The change is the minimal, correctly-typed fix the unit's behavior sentence describes: one field, matching U35j's established value type exactly, added to the one roster-unit schema in `src/lib/api`, with `.strict()` preserved. Red was independently reproduced at the baseline and matches the recorded receipt; green is independently reproduced at the head, including a real route-handler run whose in-memory host state and (via an independent scratch probe, deleted after use) the durable SQLite store both keep the value unchanged with no re-validation anywhere downstream. Strictness holds under both the implementer's four recorded mutants (not independently re-run — the file's mutation/restoration history was read, not repeated) and an independent fifth mutant with a distinct discrimination profile, which was caught by two of the four value-type rows. Every gate the charter names is green, including one (`src/lib/multiplayer/server`) the implementer's local receipt did not cover. Scope, caps, attribution and comment-accuracy checks all pass. The two related findings (a sibling schema outside this path drops provenance fields; nothing type-ties this schema to the TS interface) are correctly identified as out of this unit's ownership and deferred rather than smuggled in. No basis for REQUIRED-EDITS or REJECT.
