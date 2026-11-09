# Campaign save lifecycle

`campaignSaveState.ts` owns the transient persistence snapshot and production
transitions. The Zustand store owns effects: HTTP, timers, write/load queues,
cache keys, campaign/roster installation, and notifications. Dispatch stays at
the original partial-update sites; moving an effect across a dispatch changes
the observable ordering.

## States and events

The existing public status labels remain `idle`, `saving`, `saved`, `error`,
and `conflict`. They describe the last persistence operation, not a mutually
exclusive lock: a load can finish during a save, and an edit can arrive in any
state. `dirty`, `editSeq`, and recovery evidence are owned by the same reducer.
A dirty edit may coexist with saved/error/conflict status under the existing
contract; normalization is held for K4 PR3.

| Event                                              | Status and payload rule                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| operation-started                                  | saving; clear error, and clear refusal only for a save                            |
| save-acknowledged                                  | idle if editSeq changed, otherwise saved; adopt returned row evidence             |
| older-save-acknowledged                            | settle idle/saved from current dirty; retain all newer row evidence               |
| save-conflicted                                    | conflict; keep the server record and typed conflict together                      |
| save-refused                                       | error with typed refusal; keep pending edits                                      |
| operation-failed                                   | error; reads/adoption clear refusal, ordinary saves retain the current value      |
| record-missing                                     | idle; offer legacy adoption or report campaign not found                          |
| record-loaded                                      | saved and clean; install row evidence and clear legacy-unadopted                  |
| conflict-record-taken                              | saved and clean; install row evidence without changing legacy eligibility         |
| coop-rollback-record-installed                     | replace row evidence only; retain the current status and campaign id              |
| coop-rollback-settled                              | clear dirty, retaining conflict/error evidence                                    |
| legacy-adopted                                     | clear legacy eligibility after the acknowledged record                            |
| flush-skipped                                      | keep status and pending edits; retain the measured diagnostic                     |
| flush-acknowledgement-owed                         | set dirty after proven flush row adoption; no ordinary save ACK yet               |
| edited                                             | advance editSeq and mark dirty; infer campaign id only when absent; retain status |
| error-cleared                                      | idle with cleared error/refusal, only from error                                  |
| launch-conflict-reported / launch-conflict-cleared | update launch evidence independently of row conflict evidence                     |
| created-campaign-initialized                       | bind the created id after the caller's separate reset; retain all other fields    |
| rollback-dirty-restored                            | clear dirty only after the action's original conditional guard permits dispatch   |
| creation-cleanup-restored                          | restore the captured persistence snapshot after campaign installation             |
| reset                                              | restore the initial transient snapshot                                            |

The exhaustive event switch is the transition guard. Operations can start or
finish from any public status because existing callers permit overlapping
loads, queued saves, explicit retries, and resets. Adding status eligibility
restrictions during extraction would reject valid existing interleavings.
An unknown event throws one domain error. No transition manufactures a server
version, journal revision, or replay fence.

## Explicitly supported stale events and no-ops

- **Older save payload after a newer same-campaign load:** `runSave` emits
  `older-save-acknowledged`. The obsolete record payload is ignored. This is
  a payload no-op, not a whole-transition no-op: the current dirty value still
  settles status to idle/saved and errorMessage is cleared.
- **Stale guarded refresh binding:** a false `context.isCurrent()`, a newer
  load generation, or reset prevents further installs, status/error writes,
  maxima writes, and timer rearming. Existing orchestration guards perform
  these no-ops before dispatch.
- **Irrelevant committed receipt:** another campaign id, a null current id,
  or an already-stale binding starts no refresh and leaves an armed save alone.
- **Repeated clearError outside error:** `error-cleared` changes no fields.
- **Rollback dirty restoration when already dirty before rollback, or still clean
  afterward:** `restoreDirtyAfterRollback` dispatches nothing. Unlike an ordinary
  reducer field no-op, this preserves state identity and notifies no subscribers.
- **Take-server without conflictServerRecord:** returns false without fetching
  or dispatching, including launch-only conflicts. Real launch resync is held
  for PR3; the UI's existing return check remains authoritative.
- **Unproven flush reconciliation:** a failed read, wrong version, or different
  envelope digest adopts no row evidence. The surviving document still rearms
  its ordinary save through the existing orchestration.

These cases are intentional preservation, not a general policy of ignoring
unexpected events. In particular a save started before reset can still answer
under the existing unguarded-save contract; PR1 adds no new generation fence.

## Production writers and held work

The campaign-id binding in useCampaignStore.actions, dirty restoration in
dayAdvanceSnapshot, and captured-state restoration in CampaignCoopEntryPanel
use named actions through this reducer. Raw Zustand setState remains available
for test seeding and browser harnesses; production callers use the actions.

Creation still resets before its separate id-binding notification. Failed co-op
creation still resets coordination, reinstalls the previous campaign, and then
restores its captured persistence state. That last action does not cancel a timer
the campaign install just armed. Folding reset into snapshot restoration would
change the behavior held for PR3. Snapshot fields and carried action references
are restored with the same shallow-merge semantics as the previous setState.

PR3 coordinates launch-only recovery, stale evidence cleanup, and suppression
of installation-triggered auto-save with D-11. PR1 preserves timer behavior,
legacy/guest creation exemptions, co-op rollback and typed refusal distinctions,
the keepalive cap, and flush diagnostic lifetime. All state here is transient;
persisted envelopes, wire messages, fixtures, and journals are unchanged.
