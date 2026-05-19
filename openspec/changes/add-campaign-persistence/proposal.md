# Change: Add Campaign Persistence

## Why

Campaign state lives entirely client-side today. `campaign-management` declares
"persist campaign state to IndexedDB and restore it on reload", and
`auto-save-persistence` defines a `Server-Side Persistence Contract` for *game
sessions* — but there is no equivalent for *campaigns*. A campaign cannot be
opened on a second device, cannot be recovered if IndexedDB is cleared, and
cannot be shared with a co-op partner. Wave 5 co-op (`add-shared-campaign-state`)
needs an authoritative server-side campaign record to mirror; without it there
is nothing for a guest to subscribe to.

This change adds a server-side campaign save/load API and a persistence store so
a campaign is durably stored, versioned, and reloadable independent of browser
storage. It is the foundational Wave 4 change — every later campaign change
(combat loop, bay UI, command UI, refit) reads and writes through this store.

## What Changes

- ADDED a server-side campaign persistence contract: `GET`/`PUT`/`DELETE`
  `/api/campaigns/[id]` and `GET /api/campaigns` (list), persisting the full
  `ICampaign` snapshot keyed by campaign id
- ADDED a `campaignPersistenceStore` (client) that owns save/load lifecycle,
  dirty tracking, debounced auto-save, and a manual save action
- ADDED a `SerializedCampaign` envelope: schema version, save timestamp,
  device id, and the serialized `ICampaign` body (Map fields → array-of-pairs
  so the snapshot is JSON-safe)
- ADDED a campaign save-metadata record (last-saved time, schema version,
  origin device) surfaced to the dashboard
- ADDED a load/restore path that rehydrates a `SerializedCampaign` back into a
  live `ICampaign` and routes through schema-version migration on read
- ADDED a campaign list endpoint returning lightweight summaries (id, name,
  faction, currentDate, balance, updatedAt) without the full body
- ADDED conflict detection on save: a stale-write guard rejects a `PUT` whose
  `baseVersion` does not match the stored record's current version

## Dependencies

- **Requires**: `campaign-management` (`ICampaign` shape, `createCampaign`),
  `auto-save-persistence` (the server-store pattern this mirrors),
  `persistence-services` (the local persistence layer this layers onto)
- **Required By**: `add-campaign-combat-loop` (CP1 — reads/writes the campaign
  through this store), `add-campaign-command-ui` (CP2b), and Wave 5
  `add-shared-campaign-state` (CO1 — the authoritative record it mirrors)

## Impact

- Affected specs: `campaign-persistence` (new capability) — chosen over adding
  to `campaign-management` because persistence is a distinct concern (API
  surface, store lifecycle, conflict handling) and Wave 5 will extend *this*
  capability, not campaign management
- Affected code: `src/pages/api/campaigns/` (new route handlers),
  `src/stores/campaign/` (new `useCampaignPersistenceStore`),
  `src/lib/campaign/persistence/` (new serialization + migration module),
  `src/types/campaign/` (new `SerializedCampaign`, `ICampaignSummary`,
  `ICampaignSaveMetadata`)
- No new database engine — the server route persists to the same store backend
  `auto-save-persistence` uses for game sessions; campaigns get their own
  keyspace
- Reversible: the local IndexedDB path remains the source of truth for offline
  play; the server store is an additive durable mirror

## Non-Goals

- Real-time co-op campaign sync — that is Wave 5 `add-shared-campaign-state`;
  this change provides only the static save/load record it will build on
- Multi-user authorization / ownership ACLs — single-owner campaigns only;
  ownership model is deferred to Wave 5
- Campaign export to a portable file — file-level export/import is a separate
  concern and out of scope
- Migrating the existing IndexedDB campaign format — this change defines schema
  version 1 going forward; older local campaigns are upgraded lazily on first
  server save
