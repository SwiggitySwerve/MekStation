# Design

CampaignGmArbiter owns proposal ID uniqueness for its lifetime and rejects duplicates before validation or commit. The existing malformed-intent rejection shape avoids wire schema changes. Closing resolves queued proposals, cancels timers, and publishes closure to local subscribers, including runtime callers still awaiting admission or commit.

The local runtime installs its waiter before invoking the arbiter and never replaces an existing waiter for a duplicate. The arbiter still decides acceptance. Its closure subscription drains every remaining waiter with session-closed.

The campaign socket exposes an optional local onClose subscription, notifying once even on caller close and replaying the signal to late subscribers. Replacing an active transport settles old proposal waiters through the existing registry observer without closing foreign transport objects; delayed old socket callbacks cannot release the new transport. The proposal adapter reserves IDs per transport, registers listeners before sending, resolves errors/closure/send failures as terminal session-closed results, and removes listeners once.

Consumers continue submitting campaign intents to authoritative hosts and receiving server decisions. There is no new wire frame or persisted ID registry. A new arbiter/transport lifetime permits a new submission after reconnect. The canonical capability is openspec/specs/coop-campaign-sync/spec.md.

## Wire caller guard

Root approved adding bindCampaignSyncConnection.ts and its existing test suite after discovery that every terminal submission result was broadcast. Immediately before submission, the binder asks the arbiter whether the ID was already submitted, with no intervening await. It sends only that socket the existing Error frame (code INVALID_INTENT, reason malformed-intent, intentId carrying the proposal ID). No CampaignDecision is broadcast for the duplicate, so the original guest waiter and GM queue retain their pending proposal. The arbiter independently enforces ID uniqueness for direct callers.

The binder regression was recorded red before this guard: it received duplicate CampaignDecision frames instead of the sender-only Error. The additional files remain within the multiplayer server directory gate.

## Behavior-preserving extraction

Root approved extracting the existing review-context functions into campaignGmProposalContext.ts to keep CampaignGmArbiter under its 400-line lint bound. relevantStandingFor, describeProposalEffect, and its private formatCbills move unchanged; CampaignGmArbiter retains its public describeProposalEffect export. This extraction is verified and committed independently before the lifecycle fix.

## Local evidence (2026-11-08)

- Base: c44603b07, containing #3068. The host.intentContext market-reader seam and HireOffer handling are preserved. Node 22.22.0 was used for SQLite suites.
- Initial red run: 15 failed / 107 passed across four suites. Binder regression recorded separately red: sender received duplicate CampaignDecision frames. Focused final run: 5 suites / 205 tests passed.
- Seven deliberate mutants failed assertions: accepting duplicate IDs, dropping queued close results, stranding in-flight approval on arbiter close, registering waiters after admission, suppressing socket-close signals, leaking guest listeners, and broadcasting duplicate decisions. Original sources were restored after each mutant.
- Behavior-preserving extraction commit c0b6b7b48 passed all 27 existing arbiter tests, both TypeScript configs, and lint at 63 warnings before lifecycle changes were restored.
- Before the K14b PR3 merge, the whole-directory gate passed 282 suites; 3,163 tests passed and 35 skipped. Includes src/components/campaign/coop, src/lib/campaign/coop, all src/lib/multiplayer, src/__tests__/integration, and scripts/__tests__/lint-units.test.ts. The earlier run was stopped before the extraction and is not counted as proof.
- Final static gates: both TypeScript configs passed; root lint 63 warnings / 0 errors; lint:units 17,075 / 17,085; OpenSpec strict validation passed. Formatting uses oxfmt.
- Budget-check passed: 3,097 test files, 57 unkeyable, 92 repo-wide, no violations. campaignCoopSurfaceHelpers.test.ts is included in the census and is neither unkeyable nor repo-wide-keyed.
- Exact rejection reason: malformed-intent. Closure result reason: session-closed. The sender-only wire refusal uses existing INVALID_INTENT Error shape; no message schema, event payload, replay, or persisted-format change.
- Full red, green, mutant, gate, and keyability evidence: E:/Projects/Personal/_scratch/sm-audit-reports/m-m10-evidence/.

## Verification after merging K14b PR3

Merged origin/main 8932a3d11 (#3072) into the lane as 966e374cf without conflicts; no reset or rebase. The authoritative market context and live readCampaign callback in co-op runtime remain intact.

On that combined tree, the same whole-directory gate passed all 282 suites: 3,175 tests passed and 35 skipped. Both TypeScript configs, oxfmt, OpenSpec strict validation, lint (63 warnings / 0 errors), and lint:units (17,075 / 17,085) passed again. Budget-check remained 57 unkeyable / 92 repo-wide; the new helper test remained keyable and not repo-wide-keyed. The postmerge-* logs and postmerge-helper-keyability.json record this final proof.
