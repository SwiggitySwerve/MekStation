# Explicit restart path audit

Root ruling after hosted run 42479354495: the same encounter may be launched
twice from pre-battle with the same seed. A new explicit restart may replace a
Launched session, while Completed remains terminal. This is distinct from
idempotent same-session retry/resume. No persisted format changes are needed.

| Path | Policy after this change |
| --- | --- |
| `src/components/gameplay/pages/preBattle/usePreBattleSkirmish.ts:273` | Allows Launched; sends explicit restart intent after recovery persistence. Completed refusal is routed to the visible page alert. |
| `src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts:256` / `:268` | Sends explicit restart intent; links before publishing/navigating; refusal reaches the page alert and finally restores the loading state. |
| `src/components/gameplay/pages/preBattle/usePreBattleLaunch.ts:220` | Sends explicit restart intent, then completes the actual terminal game before publishing. Completed cannot restart. |
| `src/services/encounter/encounterLifecycleClient.ts:49` / `src/pages/api/encounters/[id]/session.ts:81` | Optional boolean restart intent, accepted only on POST. Invalid intent types are rejected. PATCH completion never grants restart authority. |
| `src/stores/useEncounterStore.apiActions.ts:382` | Does not opt in; default link calls continue refusing reassignment. |
| `src/services/encounter/EncounterService.ts:386` / `EncounterRepository.ts:215` | Optional explicit intent defaults off. The guarded read, replacement and write are one SQLite transaction. A failed write preserves the original link. |
| `src/services/encounter/EncounterService.ts:263` / `src/pages/api/encounters/[id]/launch.ts:81` | No restart opt-in; existing Launched/Completed guards remain. This path does not accidentally replace a recorded session. |
| `src/lib/campaign/encounter/launchCampaignEncounter.ts:105` on fetched main | Creates/configures a new repository encounter and invokes the ordinary service launch. No restart opt-in. |
| Merged co-op #3063 retry/resume | Merged main a9759dfec01e6bfd940284fc48e21cab94b71a4c (same audited source as e2f61155ca368a9ac4e34da63400ecf81b2e8a50): launchCampaignEncounter checks progress.encounterId, reads the recorded encounter and returns its existing linked session when Launched. It does not invoke launch or the session-link endpoint on that resume path. Keep its checkpoint/idempotency behavior; do not turn it into a restart. |
| Clone/template | Clones create fresh Draft/Ready rows without linkage. Template/configuration edits retain existing terminal guards; neither passes restart intent. |
| `src/services/encounter/EncounterRepository.ts:258` transition validation | The sole guarded persistence boundary; ordinary reassignment is refused, explicit Launched restart is allowed, and completion must match the current link. |
| `src/pages/api/replay-library/encounter.ts:333` transition validation | Never opts into restart. It rejects abandoned A before replay persistence or dedup completion once B is the stored link. |
| Interactive/AI/spectator end | Existing terminal replay endpoint completes only the current session; the restart flag never reaches completion. |
| QuickResolve, quick game, standalone simulation | No encounter link; no restart or encounter writes. |
| Fast-forward / multiplayer dispatch, journal and close | Still deferred to S1b; no opt-in or source changes in this revision. |

The request flag is an explicit local launch intent, not a new authentication
system. The shared same-host guard remains first in the endpoint. Only the
pre-battle hooks opt in among application callers; raw repository/service/store
operations remain conservative by default.

The existing deterministic E2E still materializes once and launches the same
encounter twice with seed 1337, then compares both marker sequences. Setup was
extracted for reuse by an additional negative test; neither encounter identity
nor equality semantics was changed. The new test refuses a session-link request
and asserts a visible inline alert, no navigation and an enabled manual button.

## Merged K15 checkpoints and authority

- `src/lib/campaign/coop/coopMissionLaunchAttempt.ts:57`:
  readRecordedCoopEncounter reads stored encounter links; it neither creates a
  session nor requests a replacement link.
- `src/lib/campaign/coop/launchCoopMission.ts:357`: the preparation path resolves
  an already recorded encounter before building another launch operation.
  Its launch progress at `:171` / `:288` / `:429` retains the remote match and
  local encounter checkpoint across retry.
- `src/lib/campaign/encounter/launchCampaignEncounter.ts:122`: progress.encounterId
  reads the existing Launched row and returns its linked session without calling
  launchEncounter again. This path deliberately never uses restart intent.
- `src/lib/multiplayer/server/coopMissionCreate.ts:242`: authenticated actor must
  match entry.hostPlayerId or creation fails with COOP_MISSION_HOST_REQUIRED.
  The relaunch fix does not change this authorization boundary.

The added real-SQLite row in coopMissionLaunchCheckpoint.test.ts loses the local
response only after the guarded session link commits. Retry, cold checkpoint
read and recorded-encounter resume retain session 1; the launch writer runs only
once. Each accidental second writer call would use a distinct session ID and
therefore meet the conservative reassignment guard. UI error history must not
contain Cannot reassign encounter session. Disabling K15's existing-session
resume makes this regression fail; the deliberate mutation was restored.
