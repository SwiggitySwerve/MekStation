# Acquisition identity and retry

## Decisions

`shoppingList.ts` owns request creation, identity normalization and retry
eligibility. UUID allocation happens only at the creation boundary, through the
existing UUID utility; processing and hydration never allocate random IDs.

The named seven-day constant cites pinned MekHQ `CampaignOption.java:224-225`:
https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/campaignOptions/CampaignOption.java#L224

MekHQ decrements the wait before shopping, retains unsuccessful work and resets
its waiting period on failure (`Campaign.java:2095-2108,2165-2174` and
`Part.java:1930-1937` at the same pin). MekStation uses that default without a new
persisted campaign option. Calendar arithmetic uses the existing campaign owner.
An unsuccessful attempt keeps `pending`, increments attempts once, and stamps the
processed date. The next attempt is eligible seven calendar days later. No limit
ends the request. Skipped work consumes no random values and emits no roll event.

## Save compatibility

Both local and server deserializers call the same `normalizeShoppingList` function.
The command and processor entry points also normalize directly supplied state.
All existing IDs and acquisition inventory IDs are reserved before repair. For
duplicate IDs, an already-delivered row keeps the original ID when present;
otherwise the first row keeps it. Other rows receive deterministic, collision-free
suffixes based on their stable array position. Existing inventory identities are
reserved when repairing undelivered rows. Row order, quantities and existing
inventory remain unchanged. No historical delivery is repeated or compensated.

Legacy `failed` becomes `pending`, keeping attempts and a valid last-attempt date.
A missing or invalid last-attempt date on previously attempted work is anchored
once to the saved campaign date. Repeated hydration preserves that date, IDs and
cooldown. The next ordinary save persists the repaired values without changing
the envelope version or shape. Historical logs retain their original IDs.

## Entry paths

| Entry | Acquisition reach |
| --- | --- |
| Acquisition page | Command action calls the acquisition owner; panel displays pending and attempt count. |
| Store day/advanceDays/travel | Registered daily pipeline calls the acquisition processor. |
| Campaign fast-forward | Loops the same store day action. |
| Co-op host | Host AdvanceDay acceptance, record refresh, local pipeline, persisted record. |
| Server dispatch/journal | CampaignDayAdvanced changes the ledger day; no acquisition payload exists. |
| Guest/P2P | Host broadcast fold and campaign save refresh; combat translators have no acquisition entry. |
| InteractiveSession/GameEngine phases/runToCompletion/AI | No acquisition call; campaign day progression remains the procurement boundary. |
| QuickResolve/quick game/pre-battle auto-resolve | Combat resolution does not directly procure parts. |
| Standalone simulation | No acquisition entry. |
| Legacy registry-free day helpers | Omit acquisition today; unchanged. |
| Auto-logistics | Scanner returns an empty list today. |
| Local/server hydration | Both call the same normalizer. |

## Verification and limits

Record red regressions before changing runtime behavior. Explicitly assert
normalizer determinism, second-load idempotence and server/local equality.
Exercise seven-day boundaries, unlimited failures, success, one-time delivery,
disabled processing, direct duplicate delivery, fast-forward and co-op saves.
Kill both terminal-failure and queue-length-ID mutants and record the tests.
Run the whole-directory and replay/combat gates required by LANE-BRIEF.

Pricing/debits and historical stock reconstruction remain separate follow-ups.
Unique IDs prevent future aliasing; the shared inventory merge rule remains intact.

## Deliberate regression checks

- Restoring terminal `failed` after a roll is killed by
  `acquisitionProcessor.test-helpers.ts`:
  `retains failed requests and retries on day seven without a retry limit`.
  The assertion receives `failed` instead of `pending` on the first attempt.
- Restoring queue-length IDs is killed by `campaignCommandActions.test.ts`:
  `does not reuse request IDs after removing and adding the same part` and
  `does not reuse the identity of a removed delivered request`. Both fail.
- Final review also preserved the processor's existing missing-`items` guard.
  Its new regression was recorded red before restoring that compatibility path.

Both deliberate mutants were removed after their failing runs; no mutation is
part of the implementation.

## Local verification records

The branch includes main through `39e10ab9cf7e05090f9cef49be1082cf98f6e975`,
including K16. The combined whole-directory run covers acquisition, processors,
persistence, campaign stores, integration, the full simulation runner, the
lint-units Jest suite, and every replay/digest/golden suite: 333 suites passed,
4,087 tests passed, 32 existing skips. The final run uses `TZ=America/Denver`.
The replay/digest/golden baseline before runtime changes passed 67 suites and
1,015 tests. No committed fixture or digest was changed.

The acquisition Chromium proof passes after the K16 merge: add, discover the
created request ID, reload, deliver, persist, reload and remove. The direct
legacy-loader tests prove server/local equality and repeated-load idempotence.
`npm run validate:combat` also passed. The broad Chromium exception below remains
open; these records do not claim that the full browser directory is green.

Both TypeScript configurations, root lint (63 warnings, zero errors),
`lint:units` and its Jest suite, formatting, strict OpenSpec validation and its
quality validator passed. The final CI budget check reports 57 unkeyable tests;
no ceiling was raised.

## Broader validation limits

The full Chromium directory was attempted on its required port 3600 with four
workers and fail-fast enabled. It stopped at the unchanged
`e2e/audit-capture.spec.ts:68` because the Windows screenshot baseline
`home-chromium-win32.png` is absent from main: 71 passed, one failed, three
interrupted, 924 unrun. The automatically emitted image was retained only as a
local diagnostic, outside the snapshot directory. No baseline was accepted or
committed. This gate needs a separate Root decision; fixture generation is outside
K9 and prohibited by the lane brief. The acquisition browser proof passes on its
own.

The additional strict terminology check reports 13 errors and one warning in six
untouched files, all identical to main. It reports no K9 finding. Pricing/debits
and historical quantity reconstruction remain the two acquisition follow-ups.
