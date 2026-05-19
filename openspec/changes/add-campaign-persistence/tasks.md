# Tasks: Add Campaign Persistence

## 1. Serialization Types and Functions

- [x] 1.1 Add `SerializedCampaign`, `SerializedCampaignBody`, `ICampaignSummary`, and `ICampaignSaveMetadata` to `src/types/campaign/`
- [x] 1.2 Add the `CAMPAIGN_MAP_FIELDS` and `CAMPAIGN_DATE_FIELDS` constants enumerating every `Map`/`Date` field of `ICampaign`
- [x] 1.3 Implement `serializeCampaign(c)` and `deserializeCampaignBody(b)` in `src/lib/campaign/persistence/` — pure, total, sharing the field-map constants
- [x] 1.4 Add a type-level test asserting every `Map`/`Date` field of `ICampaign` appears in the field-map constants
- [x] 1.5 Round-trip test: `deserializeCampaignBody(serializeCampaign(c))` deep-equals `c` for a fully-populated campaign

## 2. Schema Version and Migration

- [x] 2.1 Define `CURRENT_CAMPAIGN_SCHEMA_VERSION = 1` and the `migrateSerializedCampaign(s)` migration-ladder function
- [x] 2.2 Ship the `v1` identity migration step and the ladder runner that applies steps until the body is current
- [x] 2.3 Tests: a `v1` snapshot passes through unchanged; the ladder is ordered and idempotent on an already-current snapshot

## 3. Server-Side Campaign API Routes

- [x] 3.1 Implement `GET /api/campaigns/[id]` — returns the stored `SerializedCampaign`, `404` if absent
- [x] 3.2 Implement `PUT /api/campaigns/[id]` — validates `baseVersion`, stores `version = baseVersion + 1`, returns the new record
- [x] 3.3 Implement the `409 Conflict` path — `baseVersion` mismatch returns the current stored record
- [x] 3.4 Implement `DELETE /api/campaigns/[id]` — removes the server record (local IndexedDB unaffected)
- [x] 3.5 Implement `GET /api/campaigns` — returns `ICampaignSummary[]` without bodies
- [x] 3.6 Route the persistence through the `auto-save-persistence` server-store backend under a `campaigns:` keyspace
- [x] 3.7 Tests: each route's success and error paths, including the stale-write `409`

## 4. Campaign Persistence Store

- [x] 4.1 Create `useCampaignPersistenceStore` with `loadCampaign(id)`, `saveCampaign()`, `dirty`, `lastSaved`, and `saveState`
- [x] 4.2 Implement debounced auto-save (2 s after last mutation) that serializes an immutable campaign snapshot
- [x] 4.3 Implement `loadCampaign` — fetch, migrate, deserialize, and write the live `ICampaign` into the campaign store
- [x] 4.4 Implement conflict handling — a `409` sets `saveState = conflict` and exposes both versions
- [x] 4.5 Wire `dirty` to campaign-store mutations so day advancement and edits re-arm the debounce
- [x] 4.6 Tests: dirty tracking, debounce coalescing, load-rehydrate, conflict surfacing, offline error is non-fatal

## 5. Save Metadata Surface

- [x] 5.1 Expose `ICampaignSaveMetadata` (last-saved time, schema version, origin device) from the persistence store
- [x] 5.2 Render last-saved time and a manual "Save now" action on the campaign dashboard
- [x] 5.3 Tests: metadata updates after a save; manual save forces an immediate write

## 6. Verification

- [x] 6.1 Integration test: create a campaign, save to server, clear local storage, reload from server, campaign is identical
- [x] 6.2 Integration test: two clients editing the same campaign — the second `PUT` gets a `409` and can recover via keep-local or take-server
- [x] 6.3 `openspec validate add-campaign-persistence --strict` clean
- [x] 6.4 Build, lint, and typecheck pass
