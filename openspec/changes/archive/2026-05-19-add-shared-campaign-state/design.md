# Design: Add Shared Campaign State

## Context

MekStation has two mature, *separate* sync surfaces today:

1. **Per-match combat sync** — `ServerMatchHost` runs the authoritative `GameSession`; clients send intents, the host validates and resolves them in the engine, commits events to the `IMatchStore`, and broadcasts them. The guest runs a `mirrorSession` advanced only by host-broadcast events. This is server-authoritative and cheat-resistant.
2. **Content vault sync** — `useSyncedVaultStore` uses a Yjs `Y.Map` over y-webrtc to share unit/pilot/force *designs* between peers. Last-writer-wins is fine here: two players editing the same unit design just converge.

Co-op campaign needs a *third* surface, and it is **not** a variant of either. It is not per-match (it spans the whole campaign), and it is not vault content (it is a ledger). The roadmap initially slotted it under surface 2 — "extend the Yjs vault-sync". The Council's DP2 decision rejected that: a campaign is a transactional ledger and CRDT last-writer-wins silently corrupts ledgers. The correct model is surface 1's structure — `intent → validate → commit → broadcast` — lifted to the campaign tier.

This change builds that third surface: the transport, the event log, and the guest mirror. It deliberately does **not** build the co-op gameplay on top; that is CO2.

## Goals / Non-Goals

**Goals:**

- Give the campaign a server-authoritative event log: every ledger mutation is a typed, ordered, replayable event.
- Make the host the single writer of campaign state and the guest a strict read-only mirror.
- Reuse the `ServerMatchHostIntent` validate-commit-broadcast structure rather than inventing a new sync mechanism.
- Reuse the `mirrorSession` "guest cannot append" guard contract for the campaign store.
- Keep the financial invariant enforceable: every funds-affecting decision passes through one validation point that sees the authoritative balance.

**Non-Goals:**

- Co-op mission launch and the guest-facing GM intent UX (CO2).
- Migrating or retiring the Yjs vault sync.
- Multi-guest (3+ player) campaigns; campaign-tier host migration; offline campaign editing.

## Decisions

### D1. Campaign sync is server-authoritative, NOT CRDT — and this is load-bearing

Campaign state is a ledger: a C-bill balance, an owned roster, accepted contracts, faction standing, a day counter. The defining invariant is *balance never goes negative without an explicit loan*. A CRDT guarantees that concurrent writes converge to *a* value — it cannot guarantee that value satisfies an invariant. Two guests each spending 500,000 C-bills from a 600,000 balance, merged by last-writer-wins, yield a 100,000 balance instead of the overdraft the second spend should have been rejected as.

Therefore the campaign uses the same shape as `ServerMatchHost`: the host holds authoritative campaign state, a guest action is an **intent**, the host **validates** it against current state (balance check, standing check, roster check), and only on success **commits** a campaign event and **broadcasts** it. The guest never mutates campaign state directly. This decision is the whole reason CO1 exists as written; everything below follows from it.

### D2. The campaign event log is the campaign-tier analogue of `IMatchStore`

Combat sync persists an ordered, gap-free, typed event log via `IMatchStore` (`appendEvent` / `getEvents`, transactional append, ascending-sequence read). The campaign gets the same: an ordered, gap-free, typed `ICampaignEvent` log, appended on every committed mutation, persisted alongside the campaign save (through `add-campaign-persistence`'s store). Replaying the log from the start reconstructs campaign state exactly. The guest mirror is built by replay, never by merge.

The campaign event log is a *separate* log from the per-match combat event log. A combat encounter inside a co-op campaign still produces a combat event log via `ServerMatchHost`; when that encounter resolves, the *campaign-level consequences* (salvage allocated, funds changed, roster updated) are emitted as campaign events into the campaign log. The two logs are linked by id, not merged.

### D3. Campaign event payload set

The events cover the ledger-mutating campaign decisions. Each is a typed, serializable record carrying the committed result (never a request):

```typescript
type CampaignEventType =
  | 'CampaignDayAdvanced'        // day counter moved; carries the new day index
  | 'FundsChanged'               // C-bill balance delta; carries delta, reason, new balance
  | 'PilotHired'                 // a pilot joined the roster; carries pilot ref + cost
  | 'ContractAccepted'           // a contract was accepted; carries contract ref + terms
  | 'RosterUnitChanged'          // a unit was added/removed/repaired in the roster
  | 'SalvageAllocated'           // post-battle salvage assigned to the campaign inventory
  | 'CampaignSnapshotPublished'; // a full-state baseline for a joining or resyncing guest

interface ICampaignEvent {
  readonly type: CampaignEventType;
  readonly sequence: number;       // ascending, gap-free, host-assigned
  readonly campaignId: string;
  readonly ts: string;             // host wall-clock ISO
  readonly authorPlayerId: string; // who committed it (host id for host-driven events)
  readonly payload: unknown;       // narrowed per type
}
```

`FundsChanged` carries the resulting balance, not just the delta, so a guest that missed an event can detect a gap. `CampaignSnapshotPublished` is the only event whose payload is a whole-campaign state object; every other event is an incremental delta.

### D4. `CampaignMatchHost` reuses the `ServerMatchHostIntent` structure

A new `CampaignMatchHost` is the campaign-tier host. It mirrors `ServerMatchHost`'s role exactly: own one campaign's authoritative state, accept campaign intents, validate, commit, broadcast. The intent handler is structured identically to `ServerMatchHostIntent.handleIntent`:

1. reject if the session is closed,
2. reject if the intent is malformed,
3. **validate the intent against current authoritative campaign state** (this is where balance / standing / roster checks live — the campaign analogue of "unit ownership" validation),
4. on success, apply the mutation to authoritative state and produce the resulting `ICampaignEvent`(s),
5. append each event to the campaign event log,
6. broadcast each event to all connected clients.

A rejected intent mutates nothing and returns a typed `Error` envelope (`code: 'INVALID_CAMPAIGN_INTENT'`, `reason` such as `'insufficient-funds'`). The connection stays open so the guest can correct and retry — same as the combat intent error contract.

### D5. The guest runs a read-only campaign mirror, guarded like `mirrorSession`

The guest's `useCampaignStore` becomes a **mirror** when the campaign is a joined co-op campaign: it is advanced solely by host-broadcast `ICampaignEvent`s through one `applyCampaignEvent` reducer, and any local mutation path is hard-guarded — exactly the `mirrorSession` contract (`describeMirrorAppendRejection` / `assertMirrorAppendForbidden`). A guest "spend" button does not mutate the store; it sends an intent and waits for the resulting broadcast event. The mirror is identified the same way `isMirrorSession` works — the local peer is the guest, a host peer exists, and they differ.

### D6. Campaign sync session lifecycle

- **Host opens** a shared campaign: the host's `CampaignMatchHost` registers the campaign with the server, which issues a room code (the same 6-char alphabet as `multiplayer-server`, excluding I/O/0/1).
- **Guest joins** with the room code over the server WebSocket. The host immediately sends a `CampaignSnapshotPublished` baseline, then streams the campaign event log from sequence 0, then live events — the campaign-tier analogue of `ReplayStart` / `ReplayChunk` / `ReplayEnd` followed by live `Event`s.
- **Guest resyncs** after a brief disconnect by reconnecting and requesting events from its last sequence; if the gap is too large the host sends a fresh `CampaignSnapshotPublished` and resumes live streaming from there.
- **Host disconnects**: the campaign session pauses. The guest's mirror is frozen and read-only (it already cannot write); no campaign-tier host migration happens in this change.

### D7. The Yjs vault sync is fenced off, explicitly

`useSyncedVaultStore` and the `p2p-sync-system` Yjs `Y.Map` stay exactly as they are, for unit/pilot/force *design* sharing. This change adds a spec requirement stating campaign state SHALL NOT be added to that Yjs document. The two sync surfaces never share a transport: vault content over y-webrtc CRDT, campaign state over the server-authoritative WebSocket event log. The boundary is documented so a future contributor cannot "just add a campaign Y.Map" and reintroduce the ledger-corruption bug DP2 ruled out.

### D8. Type contracts

```typescript
// Campaign intent — what a guest sends; the host validates and may reject.
interface ICampaignIntent {
  readonly kind:
    | 'HirePilot'
    | 'AcceptContract'
    | 'SpendFunds'
    | 'AllocateSalvage'
    | 'AdvanceDay';
  readonly campaignId: string;
  readonly intentId: string;        // client-generated, for error correlation
  readonly payload: unknown;        // narrowed per kind
}

// The result of validating one intent against authoritative state.
type CampaignIntentResult =
  | { readonly ok: true; readonly events: readonly ICampaignEvent[] }
  | { readonly ok: false; readonly code: 'INVALID_CAMPAIGN_INTENT'; readonly reason: string };
```

## Risks / Trade-offs

- **[Risk] Wave 4 dependency artifacts (`add-campaign-persistence`, `add-campaign-combat-loop`) do not exist yet** → Mitigation: CO1 is authored *now* but is implementation-ordered after Wave 4 per the Council's PR sequence. The `## Dependencies` block names them explicitly; the apply phase blocks until they ship. The design depends only on their *contracts* (a campaign store with append/get; campaign mutations CP1 emits), which are stable enough to spec against.
- **[Risk] Two host-driven and guest-driven events interleave out of order** → Mitigation: the host is the single writer and assigns sequence numbers; all events — host-initiated and guest-intent-derived — go through one `appendEvent` path, so the log is always totally ordered with no gaps (the `IMatchStore` transactional-append guarantee, reused).
- **[Risk] A guest acts on a stale mirror (sends "hire" while the host already spent the funds)** → Mitigation: the host validates against *its* authoritative state at commit time, not the guest's view; a stale-mirror intent is simply rejected with `insufficient-funds` and the guest's next broadcast event corrects the mirror.
- **[Risk] Scope creep into CO2's GM UX** → Mitigation: CO1 defines the intent *transport and validation contract* only. The guest-facing "this button now sends an intent" UI and the host's GM approval surface are explicitly CO2. The `## Non-Goals` fences this.
- **[Trade-off] A server round-trip per campaign action is slower than a local Yjs write** → Accepted: campaign actions (hire, accept contract, advance day) are deliberate, low-frequency decisions, not per-frame mutations. Correctness of the ledger outweighs sub-second latency here.

## Migration Plan

Purely additive. A solo campaign creates no `CampaignMatchHost` and no campaign sync session — `useCampaignStore` behaves exactly as today, the campaign event log is unused, and there is no mirror. The shared-campaign path is entered only when a host explicitly opens a campaign for co-op. New event and intent types are additive; no existing campaign save format changes (the event log is appended *alongside* the save, not embedded in it). Rollback = revert the change-set; solo campaigns are untouched. No database migration — the campaign event log uses the `add-campaign-persistence` store.

## Open Questions

- Snapshot cadence — should the host emit a `CampaignSnapshotPublished` periodically (e.g., every N events) to bound guest resync cost, or only on join / large-gap reconnect? Proposed: on join and large-gap reconnect only; revisit if campaign event logs grow long enough that replay is slow.
- Whether `AdvanceDay` should be a host-only action or a guest-proposable intent — proposed: guest-proposable but host-validated (a guest can request "end the day", the host commits it), deferred to CO2's GM model for the final UX call.
- Whether a guest should see a pending-intent indicator while waiting for the host's broadcast — proposed yes, but the indicator UI is CO2 scope.
