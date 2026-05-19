# Tasks: Add Shared Campaign State

## 1. Campaign Event & Intent Types

- [x] 1.1 Add `ICampaignEvent`, `CampaignEventType`, and the per-type payload shapes to `src/types/campaign/` (`CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, `CampaignSnapshotPublished`)
- [x] 1.2 Add `ICampaignIntent`, the `kind` union (`HirePilot`, `AcceptContract`, `SpendFunds`, `AllocateSalvage`, `AdvanceDay`), and `CampaignIntentResult` to `src/types/campaign/`
- [x] 1.3 Add a zod schema (or equivalent runtime validator) for `ICampaignIntent` so malformed intents are rejected at the boundary
- [x] 1.4 Unit tests for the type set and a serialization round-trip preserving every campaign event payload

## 2. Campaign Event Log

- [x] 2.1 Implement the campaign event log over the `add-campaign-persistence` store — ordered append, ascending gap-free `sequence`, transactional append (exactly one of two same-sequence appends succeeds)
- [x] 2.2 Implement `getCampaignEvents(campaignId, fromSeq)` returning events ordered by ascending sequence
- [x] 2.3 Implement campaign state reconstruction by replaying the event log from sequence 0
- [x] 2.4 Tests: append ordering, sequence-collision rejection, replay reconstructs identical campaign state

## 3. CampaignMatchHost — Validate / Commit / Broadcast

- [x] 3.1 Implement `CampaignMatchHost` modeled on `ServerMatchHost` — owns one campaign's authoritative state, accepts campaign intents, exposes a close path
- [x] 3.2 Implement the campaign intent handler modeled on `ServerMatchHostIntent.handleIntent` — closed-check, malformed-check, validate-against-authoritative-state, commit, broadcast
- [x] 3.3 Implement per-intent validation: `HirePilot` / `SpendFunds` / `AcceptContract` check the authoritative C-bill balance and faction standing; `AllocateSalvage` checks the post-battle salvage pool; reject with `Error {code: 'INVALID_CAMPAIGN_INTENT', reason}` on failure
- [x] 3.4 On a valid intent, apply the mutation to authoritative state, produce the resulting `ICampaignEvent`(s), append to the log, and broadcast
- [x] 3.5 Tests: a valid intent commits an event and broadcasts it; an over-balance spend is rejected and mutates nothing; a rejected intent leaves the connection open for retry

## 4. Campaign Mirror Store (Guest)

- [x] 4.1 Implement `applyCampaignEvent(state, event)` — the single reducer that advances the guest's campaign mirror from a host-broadcast event
- [x] 4.2 Wire the guest `useCampaignStore` to mirror mode — advanced only by `applyCampaignEvent`, never by local mutation
- [x] 4.3 Implement the mirror append guard modeled on `mirrorSession` (`describeMirrorAppendRejection` / `assertMirrorAppendForbidden`) so a local campaign mutation on the guest fails loudly
- [x] 4.4 Implement mirror identification (local peer is the guest, a host peer exists, they differ) modeled on `isMirrorSession`
- [x] 4.5 Tests: a host-broadcast event advances the mirror; a guest-side local campaign mutation is rejected; a solo campaign is never treated as a mirror

## 5. Campaign Sync Session Lifecycle

- [x] 5.1 Implement host-side "open shared campaign" — register the campaign with the server, issue a 6-char room code (same alphabet as `multiplayer-server`, excluding I/O/0/1)
- [x] 5.2 Implement guest join — connect with the room code, receive a `CampaignSnapshotPublished` baseline, then the campaign event log from sequence 0, then live events
- [x] 5.3 Implement guest resync — reconnect and request events from the last received sequence; on a too-large gap, send a fresh `CampaignSnapshotPublished` and resume live streaming
- [x] 5.4 Implement host-disconnect handling — the campaign session pauses; the guest mirror is frozen and read-only
- [x] 5.5 Tests: join receives snapshot + full log; resync streams only the missing tail; large-gap resync receives a fresh snapshot; host disconnect pauses the session

## 6. Yjs Vault Boundary

- [x] 6.1 Add a documented boundary in `p2p-sync-system` consumers / `useSyncedVaultStore` confirming campaign state is NOT a `SyncableItemType` and SHALL NOT enter the Yjs document
- [x] 6.2 Test: `SyncableItemType` remains `unit | pilot | force`; no campaign type is added to the Yjs vault map

## 7. Verification

- [x] 7.1 Integration test: a host opens a shared campaign, a guest joins, the host advances the day and the guest mirror reflects it
- [x] 7.2 Integration test: a guest sends a `SpendFunds` intent within balance — the host commits a `FundsChanged` event and both the host and guest mirror converge to the new balance
- [x] 7.3 Integration test: a guest sends a `SpendFunds` intent over balance — the host rejects it, no event is committed, and both stores keep the prior balance
- [x] 7.4 Integration test: a guest disconnects and reconnects — the mirror resyncs from the campaign event log with no missing or duplicated events
- [x] 7.5 `npx openspec validate add-shared-campaign-state --strict` is clean; build, lint, and typecheck pass
