# Design: Add Campaign Persistence

## Context

`auto-save-persistence` already establishes the pattern for durable server-side
state: a `Server-Side Persistence Contract` requirement, a route under
`/api/...`, a store backend keyed by id, and a save-metadata record. That
contract is scoped to *game sessions* — the in-progress tactical match. A
*campaign* is a different object: a long-lived mercenary-company record holding
roster, forces, missions, finances, and options, mutated one day at a time by
the day pipeline. It is persisted only to IndexedDB today.

This change copies the `auto-save-persistence` server-store pattern for
campaigns. The hard part is not the route — it is making the `ICampaign`
JSON-safe (it carries `Map` fields and `Date` objects) and giving the snapshot a
schema version so Wave 5 and later format changes have a migration seam.

## Goals / Non-Goals

**Goals:**

- A campaign survives a browser-storage wipe and opens on a second device.
- The server holds an authoritative `SerializedCampaign` that Wave 5 co-op can
  mirror.
- Save is debounced and non-blocking; the player never waits on a network round
  trip mid-campaign.
- A stale write (two devices editing the same campaign) is detected, not
  silently merged.

**Non-Goals:**

- Real-time multi-writer sync (Wave 5).
- Ownership / sharing ACLs (Wave 5).
- Portable file export.

## Decisions

### D1. New capability `campaign-persistence`, not an addition to `campaign-management`

`campaign-management` owns campaign *creation and lifecycle*. Persistence is a
separable concern with its own API surface, store, conflict model, and
migration seam — and Wave 5 will extend persistence, not management. A dedicated
capability keeps the Wave 5 delta clean (it ADDs to `campaign-persistence`).

### D2. `SerializedCampaign` envelope

The wire and storage format is an envelope around a JSON-safe campaign body:

```typescript
interface SerializedCampaign {
  readonly schemaVersion: number;        // 1 for this change
  readonly campaignId: string;
  readonly savedAt: string;              // ISO 8601
  readonly originDeviceId: string;       // which device wrote this
  readonly version: number;              // monotonic write counter (D5)
  readonly body: SerializedCampaignBody; // JSON-safe ICampaign
}
```

`SerializedCampaignBody` is `ICampaign` with every `Map` field replaced by an
array of `[key, value]` pairs and every `Date` replaced by an ISO string.
`ICampaign` already carries `currentDate: Date` and `missions`, `personnel`,
`forces` as `Map`s — the serializer walks a fixed field list, so adding a new
`Map`/`Date` field to `ICampaign` requires a one-line serializer update (called
out in tasks).

### D3. Serialization is a pair of pure functions with a fixed field map

`serializeCampaign(c: ICampaign): SerializedCampaignBody` and
`deserializeCampaignBody(b: SerializedCampaignBody): ICampaign` are pure and
total. They share one `CAMPAIGN_MAP_FIELDS` / `CAMPAIGN_DATE_FIELDS` constant so
the two directions cannot drift. A round-trip test
(`deserialize(serialize(c))` deep-equals `c`) is the contract.

### D4. Schema version + migration ladder

`schemaVersion` starts at `1`. `migrateSerializedCampaign(s)` runs on every read
and applies an ordered ladder of `vN → vN+1` steps until the body matches the
current version. This change ships only `v1` (identity migration), but the
ladder exists from day one so Wave 5's format change is an added step, not a
breaking read.

### D5. Optimistic-concurrency stale-write guard

The stored record carries a monotonic `version` integer. `PUT` includes
`baseVersion` (the version the client last read). The route compares: if
`baseVersion !== stored.version` it returns `409 Conflict` with the current
record so the client can surface "this campaign was changed elsewhere". On a
clean write the route stores `version = baseVersion + 1`. This catches the
two-device race without a full merge engine — exactly the overdraft-class bug
DP2 of the council decision warns about, contained at the persistence layer.

### D6. Store responsibilities — `useCampaignPersistenceStore`

The store owns: `loadCampaign(id)`, `saveCampaign()` (manual), debounced
auto-save on dirty, `dirty` flag, `lastSaved` metadata, `saveState`
(`idle | saving | saved | error | conflict`). It does **not** own campaign
*content* — the live `ICampaign` stays in the existing campaign store; the
persistence store reads from it on save and writes into it on load. Auto-save
debounce is 2 s after the last mutation, matching `auto-save-persistence`'s
batched-write cadence.

### D7. List endpoint returns summaries, not bodies

`GET /api/campaigns` returns `ICampaignSummary[]` — `{ id, name, factionId,
currentDate, balance, updatedAt }`. The full body is fetched only by
`GET /api/campaigns/[id]`. This keeps the campaign-list page cheap even with
many saved campaigns.

### D8. Server store backend reuse

The route persists through the same storage backend `auto-save-persistence`
uses for sessions (its `Server-Side Persistence Contract`), under a separate
`campaigns:` keyspace. No new database engine, no migration of session storage.

## Risks / Trade-offs

- **[Risk] `ICampaign` gains a `Map`/`Date` field and the serializer misses it**
  → Mitigation: the field map is a single exported constant; a type-level test
  asserts every `Map`/`Date` field of `ICampaign` appears in it, failing the
  build on drift.
- **[Risk] Auto-save races a day-advancement mutation** → Mitigation: save reads
  an immutable `ICampaign` snapshot at debounce-fire time; day advancement
  produces a new campaign object, so the in-flight save serializes a consistent
  prior state and the next mutation re-arms the debounce.
- **[Risk] A `409 Conflict` leaves the player stuck** → Mitigation: the conflict
  state exposes both versions; the player chooses keep-local (re-PUT with the
  server's version as `baseVersion`) or take-server (reload). No silent merge.
- **[Risk] Server unreachable offline** → Mitigation: IndexedDB remains the
  offline source of truth; `saveState = error` is non-fatal and the next online
  save retries. Offline play is unaffected.

## Migration Plan

Purely additive. Existing campaigns live only in IndexedDB; on first load with
this change they are read locally as today, then serialized at `schemaVersion 1`
and pushed to the server on the first save — a lazy one-time upload. No
destructive migration. The new API routes and store are new files. Rollback =
revert the change-set; campaigns fall back to IndexedDB-only with no data loss.

## Open Questions

- Whether to auto-save on *every* dirty transition or only on day-advancement
  boundaries — proposed: debounced on every dirty transition (D6), revisit if
  server write volume is high.
- Device-id source — proposed: reuse the existing `player-identity` device/user
  id rather than minting a new one. Confirmed if `player-identity` exposes a
  stable id; otherwise mint a persisted UUID.
