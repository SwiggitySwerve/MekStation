# Change: Add Shared Campaign State

## Why

Co-op campaign — two friends advancing one MekHQ-style campaign together — has no state-sharing layer today. The P2P sync surface (`SyncableItemType = 'unit' | 'pilot' | 'force'`) covers the content vault only; campaign state (money, roster, contracts, day-counter) sits entirely outside any sync boundary.

The roadmap's original plan was to extend the Yjs `useSyncedVaultStore` to campaign state. The OMO Council's decision DP2 overrides that: campaign state is a **transactional ledger** — C-bill balance, hiring costs, contract acceptance, salvage allocation. Yjs `Y.Map` is last-writer-wins; it guarantees convergence, not correctness. Two players spending the same C-bills concurrently would silently merge into one debit with no overdraft check. CRDTs cannot enforce a balance invariant.

This change supplies the missing layer the *right* way: it extends the already-mature **server-authoritative `intent → validate → commit → broadcast` loop** (the `ServerMatchHostIntent` pattern that arbitrates combat) to campaign state. The host owns the campaign and is the single writer; the guest runs a **read-only mirror** of the campaign store — the exact contract `mirrorSession` already established for combat. A typed campaign event log carries every committed mutation, so the guest's mirror is reconstructed by replaying events, never by merging.

This change is the foundation. It builds the transport, the event log, and the mirror. `add-coop-campaign-play` (CO2) builds the co-op gameplay on top of it.

## What Changes

- ADDED a campaign event log: an ordered, typed, replayable record of every committed campaign mutation, persisted alongside the campaign save and streamed to the guest — the campaign-tier analogue of the combat `IMatchStore` event log
- ADDED typed campaign event payloads (`CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, `CampaignSnapshotPublished`) covering the ledger-mutating campaign decisions
- ADDED a `CampaignMatchHost`: the campaign-tier server host that accepts campaign intents, validates each against authoritative campaign state, commits the resulting event(s), and broadcasts them — reusing the `ServerMatchHostIntent` validate-commit-broadcast structure
- ADDED a campaign mirror store: the guest's `useCampaignStore` runs read-only, advanced solely by host-broadcast campaign events, guarded by the same `mirrorSession` "no local append" contract
- ADDED a campaign sync session lifecycle: a host opens a shared campaign over the server WebSocket; a guest joins with a room code, receives a `CampaignSnapshotPublished` baseline plus the event log, then live events
- ADDED an explicit boundary statement: the Yjs `useSyncedVaultStore` stays for the content library (unit/pilot designs) only and SHALL NOT be extended to campaign state

## Dependencies

- **Requires**: `add-campaign-persistence` (Wave 4 CP0) — the server-side campaign save/load store the event log is appended to and the snapshot is read from
- **Requires**: `add-campaign-combat-loop` (Wave 4 CP1) — the campaign mutations (post-battle salvage, repair, finance flow) the event log must capture
- **Requires**: `harden-multiplayer-transport` (Wave 3 M2) — the durable match store and hardened WebSocket transport the campaign sync session rides on
- **Required By**: `add-coop-campaign-play` (CO2) — co-op mission launch and the host-as-GM intent model build directly on this event-broadcast loop

## Impact

- Affected specs: `coop-campaign-sync` (new capability) — a clean home for the campaign-tier sync loop, distinct from `multiplayer-server` (per-match combat) and `p2p-sync-system` (Yjs vault content). The new capability documents its reuse of the `multiplayer-server` host pattern.
- Affected code: `src/lib/multiplayer/server/` (new `CampaignMatchHost` + campaign intent handler, modeled on `ServerMatchHost` / `ServerMatchHostIntent`), `src/lib/p2p/` (new `campaignMirrorStore` modeled on `mirrorSession`), `src/types/campaign/` (new campaign event + intent types), `src/lib/campaign/` (campaign store wired to emit/consume campaign events)
- New event types: `CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, `CampaignSnapshotPublished`
- No new database technology — the campaign event log persists through the same `add-campaign-persistence` store; no Yjs document is introduced for campaign state
- Determinism preserved: the guest mirror is a pure replay of the host event log; the host is the single source of truth and of randomness

## Non-Goals

- Co-op mission launch (both players' forces in one encounter) — that is `add-coop-campaign-play` (CO2)
- The host-as-GM intent UX for guest "hire pilot" / "accept contract" actions — CO2 builds the guest-facing intent surface; CO1 only defines the campaign intent transport and validation contract it rides on
- Replacing or migrating the Yjs `useSyncedVaultStore` — it stays as-is for content sharing; this change explicitly fences it off from campaign state
- Three-or-more-player shared campaigns — the host/guest pair is the scope; multi-guest fan-out is a later change
- Offline divergence and merge — the guest mirror is online-only and read-only; there is no offline campaign editing to reconcile
- Host migration for a campaign session — if the host disconnects the campaign session pauses; campaign-tier host migration is deferred
