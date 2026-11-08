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
