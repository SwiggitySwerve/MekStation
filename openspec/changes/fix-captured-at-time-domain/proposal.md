## Why

Company morale counts the battle outcomes applied recently. The window compared each outcome's `capturedAt` with the campaign date. `capturedAt` is a wall-clock instant (production never overrides it), while a campaign's date is an in-game date: a fresh campaign starts at the wall clock and advances one day per day processed, and a campaign set in an era is centuries from it. Measured on `main` with the real `deriveCombatOutcome`, store and day pipeline, an applied battle did not move morale for an era campaign, for the first day of a new campaign, for a campaign whose date lags the wall clock by two days or more, or for one more than 31 days ahead; it counted only when the campaign date was a few days ahead of the wall clock. In every miss the morale processor also removed the outcome from `recentlyAppliedOutcomes`, so it could never count later. Defeats were lost the same way.

## What Changes

`capturedAt` is documented as wall-clock provenance and campaign code no longer reads it (a guard test lists the five files that may name it). `applyPostBattle`, which every application path goes through (the day pipeline, the review page, the store retry), stamps an in-game `appliedOn` from `campaign.currentDate` on the entry it records. The 31-day retention in `recentlyAppliedOutcomes` is counted in calendar days from `appliedOn`. `ICombatOutcome` (the wire, journal and replay shape) is unchanged; the campaign-side entry type is `IAppliedCombatOutcome`.

Old saves: entries without a valid `appliedOn` are stamped with the loaded campaign's date at both deserializers (and by the morale pass for state written elsewhere). Nothing is dropped, `capturedAt` is not read, and battles already lost stay lost.

Counting is unchanged: once per outcome id, as before. An applied outcome now stays 31 in-game days, so the repair-ticket dedupe that reads the same list protects a match's terminal tickets for the full window instead of being cut short.

## Impact

Affected capability: campaign-refit-and-prestige. The field is additive and optional on read: the server PUT checks only `campaignId`, `schemaVersion` and that the body is an object; the co-op checkpoint reads balance, forces, standings and the roster; storage keeps the JSON; no strict schema covers these entries; a reader built before this change loads and processes a save that carries it. No schema version change.

Behaviour change by design: battles that used to be silently dropped now move company morale, so `moraleState` and `moraleTransitions` differ in runs that fought such battles. The only `moraleState` consumers found are the prestige/morale panel and the processor.
