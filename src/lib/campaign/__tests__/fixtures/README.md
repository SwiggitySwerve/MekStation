# Campaign test fixtures

## `legacySessionKeyedCampaign.json`

A campaign saved by **main `3dcb06123`** (before the T1 launch manifest), used
by `migrateSessionKeyedCombatStates.test.ts` and
`stores/campaign/__tests__/campaignCombatStateMigration.test.ts`.

How it was made (2026-11-18):

- Detached worktree of `origin/main` at `3dcb06123`.
- A temporary, uncommitted Jest test ran the scenario of
  `src/__tests__/integration/campaignBattleDamageRosterId.test.ts`:
  `buildFastForwardFixture({ useRoleBasedSalaries: false, combatTeamCount: 1 })`,
  `unitMaxStates` from `prepareCampaignUnitMaxStates`, then
  `fastForwardCampaign(campaign, { days: 2 })` with the real
  `runFastForwardBattle` (catalog `adaptUnit` mocked with
  `makeAdaptedUnit`, as in that test).
- The final campaign was serialized with the production envelope builder
  `buildSerializedCampaign` (body from `serializeCampaign`), with the roster
  projection from `buildFastForwardRosterProjectionSnapshot`, and written as
  compact JSON. Nothing was committed in that worktree; it was removed.

Seeds: campaign `rngSeed` 1592594996; one battle, match
`d7cb8b6d-c30f-46d8-9f6a-5d71f6720ac3`, battle seed 2770127833, scenario
`scn-fast-forward-fixture-contract-3025-06-13-ff-team-force-1`. The `capture`
block in the file records the same.

What it holds: `unitCombatStates` keyed `player-1-atlas-as7-d` and
`opponent-1-marauder-mad-3r` (the defect), with `null` armor/structure values
where main wrote `NaN`, and the one retained outcome in
`recentlyAppliedOutcomes`. Do not regenerate it from a newer main; its value
is that it was written by the old code.
