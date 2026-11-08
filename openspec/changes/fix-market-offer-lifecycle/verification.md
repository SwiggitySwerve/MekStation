# K14a verification

Scope: local market lifecycle only. Root approved the co-op guard after review
identified that an asynchronous co-op save can restore the balance without
restoring the separately stored roster. Proposal controls and authority files
are unchanged. The branch incorporated main through `3e6f6cdc2` before final
validation. No persisted shapes, event payloads, replay fixtures or budgets were
changed.

## Evidence

- Initial red run: the action, unit purchase and page suites failed 18 assertions
  across three suites before implementation; 65 existing tests passed.
- Final touched directories: 81 suites / 1,077 tests passed. These cover markets,
  processors, persistence, campaign stores, command panels and campaign pages.
- Replay/digest/golden baseline before implementation: 68 suites / 1,030 tests
  passed. Post-change coverage is included in the final runtime gate below.
- Final runtime gate: 271 suites / 3,172 tests passed, 32 skipped. This includes
  the full `src/__tests__/integration` and `src/simulation/runner/__tests__`
  directories, every replay/digest/golden suite and the lint-units Jest suite.
- `npm run validate:combat` passed exactly as configured by CI.
- `npm run format:check` passed (9,135 files); `git diff --check` passed.
- `npx openspec validate --all --strict` and
  `npm run qc:openspec-ci:validate` passed with no accounting errors.
- Root lint: 63 warnings, zero errors. The ceiling remains 63.
- Both TypeScript configs passed through `npm run typecheck`.
- `npm run lint:units` passed without raising any ceiling.
- `node scripts/ci/budget-check.mjs`: 57 unkeyable tests; budget unchanged.
  Page coverage extends the existing day-admission suite rather than adding a
  second test import graph with environment reads.

The two final Jest groups are disjoint: 352 suites / 4,249 passing tests in total,
with 32 skipped. Local gate logs and JSON results are kept in the lane audit
scratch directory (`k14a-final-directories`, `k14a-final-runtime`, `k14a-mutants`
and corresponding gate logs). Hosted CI is pending when this draft is opened.
No merge or post-merge runtime probe was performed.

## Mutants

Each deliberate break was run separately and restored byte-for-byte afterward.
All were killed by failing behavioral assertions, not compilation errors.

| Deliberate break | Result |
| --- | --- |
| Remove the shared declined-offer refusal | Acceptance-after-decline assertion fails |
| Enroll the pilot before committing payment and consumption | Enrollment callback sees the old balance; ordering assertion fails |
| Remove the shared co-op admission guard | Eight action, purchase and page assertions fail across three suites |
| Bypass both loader normalizers and processor cleanup | Four loader/processor assertions fail across two suites |

## Entry paths

| Entry | Coverage |
| --- | --- |
| Contract and hiring pages, including seeding | Shared co-op/day-lock refusal; disabled controls and sentence-case explanation |
| Store hire/accept/decline | Current-offer validation; payment ordering; enrollment failure rollback; repeat and reentrant attempts |
| Unit purchase | Current pool takes precedence over a stale caller; transaction, enrollment and consumption returned together |
| Day pipeline and campaign fast-forward | Existing processors retain cadence; cleanup runs with disabled generation; existing co-op personnel expiry retained |
| Browser and server campaign loaders | Same idempotent normalizer; accepted/paid/enrolled evidence; no retroactive payments |
| Co-op host/guest | Local actions and seeding refuse both modes; proposals and durable authority remain unchanged for K14b |
| InteractiveSession, GameEngine phases/runToCompletion, QuickResolve, quick game, pre-battle auto-resolve, AI, standalone simulation | No market-action callers; runner, integration and replay gates cover regressions |
| P2P | No market translation callers; no authority added |

The existing `personnelMarket.removeExpiredOffers` remains the personnel expiry
owner and public compatibility helper. The new lifecycle owner calls it rather
than copying its rule. Contract end-date expiry and unit expiry retain separate
owning predicates because their schema facts differ. Finance arithmetic uses
`FinanceService.recordTransaction`; wrapping its result preserves loan metadata.

Personnel enrollment lives in a separately persisted roster. Recovery does not
guess it from another campaign's mounted store: both loaders use persisted
payment evidence, and hiring additionally checks the matching bound roster.
Force membership proves unit enrollment even if an old purchase has no payment.
Recovery only prunes; it never fabricates money or enrollment.

## K14b follow-up

References below are against main `3e6f6cdc2`; these files were not edited.

- `src/lib/campaign/authority/campaignAcceptContractCommand.ts:467` resolves
  source offers without consulting declined IDs. `:356` and `:561` retain them
  in the rewritten source market and private remaining-market payload.
- `src/components/campaign/coop/CampaignCoopRouteSurface.tsx:121` creates a
  synthetic pilot, `:122` names it Co-op Recruit, and `:124` fixes cost at 12,000.
  `:136` similarly invents a contract ID instead of selecting a source offer.
- `src/lib/multiplayer/server/CampaignMatchHostIntent.ts:168` takes caller pilot
  and price; it checks balance but does not bind them to a market offer or reject
  a previously hired pilot. It already emits FundsChanged before PilotHired.
- `src/pages-modules/gameplay/campaigns/campaignPageShell.tsx:358` mounts proposal
  controls alongside the ordinary page children at `:363`.
  `src/stores/campaign/useCampaignStore.actions.ts:320` asynchronously saves
  co-op updates and `:322` restores campaign state on refusal; this does not
  restore the separate personnel roster.
- There is no decline intent in `src/types/campaign/CampaignSync.ts:447`.
  K14a blocks local co-op market bypasses. K14b must make the existing proposals
  source-authoritative and price-safe, consume offers atomically and resolve
  authoritative decline without relying on a local-only mutation.
