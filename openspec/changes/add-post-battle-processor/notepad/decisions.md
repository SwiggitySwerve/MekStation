# Decisions — add-post-battle-processor

Running log of decisions and rationale for tasks that could not be closed
with real code in Wave 2. Each entry is dated with an ISO-8601 date and a
phase tag.

---

[2026-04-25 apply] **Task 2.1 / 2.2 / 2.3 — unit repository combat-state API
deferred.** Wave 2 intentionally stores per-unit combat state on the
campaign aggregate (`campaign.unitCombatStates: Record<unitId,
IUnitCombatState>`) rather than on a dedicated `UnitCombatStateRepository`.
This is already called out in the blockquote under section 2 of `tasks.md`.
The current `postBattleProcessor.applyUnitDelta()` seeds state via
`createInitialCombatState` on first encounter, so the "backfill" behavior
exercised by spec scenario *Combat state distinct from construction state*
is implemented in effect — just on the campaign aggregate rather than a
repository layer. Extraction to a proper `UnitCombatStateRepository` is
scheduled for Wave 4/5 when the after-action UI surface requires it.
Evidence: `src/lib/campaign/processors/postBattleProcessor.ts:206-213`
(seeding via `createInitialCombatState`), `repairQueueBuilderProcessor.ts`
(already consumes `campaign.unitCombatStates` map directly).

[2026-04-25 apply] **Task 4.3 — `awardTaskXP` invocation deferred.** The
task text on `tasks.md:44-45` documents the blocker: `ICombatOutcome` does
not carry a `tasksCompleted` field. `grep -r "tasksCompleted" src` returns
zero results, confirming the field is still unmodeled. Will land alongside
`add-combat-outcome-model` Wave-5 enrichment when the tactical layer starts
emitting per-pilot task tallies.

[2026-04-25 apply] **Task 4.4 — `awardMissionXP` invocation deferred to
Wave 3.** `tasks.md:46-47` explicitly defers this pending the Wave 3
contract-payment / mission-result derivation work
(`add-contract-payment-processor` / `add-salvage-rules-engine`). Until
mission result is derived centrally, the processor would either have to
re-implement SUCCESS/FAILURE/PARTIAL classification locally or accept
an ambiguous input — both undesirable. `awardMissionXP` itself exists in
`xpAwards.ts:163` and will be hooked up from the new Wave 3 derivation
site.

[2026-04-25 apply] **Task 5.5 — `PersonnelStatusChanged` campaign event
deferred to Wave 4.** `tasks.md:59-60` explicitly defers: the campaign
event bus lands in Wave 4 alongside the after-action UI surface. `grep -r
"PersonnelStatusChanged" src` returns zero results, and
`src/types/campaign/events/` contains only `randomEventTypes.ts` — no
generic status-change channel exists yet. The spec scenario *KIA pilot
removed from active roster* (which asserts the event fires) will be
satisfied when the event bus emerges. Until then, the processor already
emits a `post_battle_applied` day-pipeline event (see
`postBattleProcessor.ts:466-479`) carrying the updated pilot ids — a
superset of what a dedicated `PersonnelStatusChanged` would publish.

[2026-04-25 apply] **Task 7.2 — `contract.scenariosPlayed` increment
deferred.** `tasks.md:80-81` and `grep -r "scenariosPlayed" src` (zero
matches) confirm `IContract` does not yet model scenario count. Modeling
belongs to the Wave 3 contract-payment work that also lands
`missionsSuccessful` / `missionsFailed` / `lastMissionResult` /
`fulfilled`. The processor currently flips `mission.status` on terminal
end reasons (see `applyContractDelta` in `postBattleProcessor.ts:300-341`)
which is the Wave 2-shaped version of the same effect.

[2026-04-25 apply] **Task 7.5 — `ContractProgressChanged` campaign event
deferred to Wave 4.** Same rationale as Task 5.5: no event bus yet, and
the day-pipeline already surfaces the contract id on every
`post_battle_applied` event (`postBattleProcessor.ts:476`). Will be added
alongside the Wave 4 event-bus extraction.

[2026-04-25 apply] **Task 7.6 — Fulfilled-contract flagging deferred to
Wave 3.** Depends on `contract.scenariosPlayed` / `contract.fulfilled`
fields that Wave 3 (`add-salvage-rules-engine`, final-payment processor)
will introduce. Blocked on the same upstream contract-model enrichment
as Task 7.2.
