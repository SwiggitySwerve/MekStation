## REMOVED Requirements

### Requirement: Personnel Store CRUD Operations

**Reason:** `usePersonnelStore` is deleted as part of the substrate migration. Its CRUD operations were never seeded in production (the store starts empty in every campaign). The new substrate uses `useCampaignRosterStore`, which has its own CRUD wired through `initRoster`, `addPilot`, `updatePilot`, `removePilot`. The `IPerson` type is preserved (it remains the parameter signature for 72 helper functions) until the follow-up `refactor-helper-signatures-to-roster-entry` change migrates those helpers.

**Migration:** All call sites that previously read `usePersonnelStore.persons` are repointed to `useCampaignRosterStore.pilots`. For features that pass data to helpers expecting `IPerson`, the new `rosterEntryToPerson(rosterEntry, vaultPilot)` shim synthesizes the `IPerson` shape on-the-fly from the new substrate.

### Requirement: Personnel Query Operations

**Reason:** Same as Personnel Store CRUD Operations. Query helpers (`getPersonsByStatus`, `getPersonsByUnit`, etc.) on `usePersonnelStore` are replaced by `useCampaignRosterStore` selectors operating on `ICampaignRosterEntry`. Where queries return data to existing helpers, the shim bridges the type.

**Migration:** Query helpers map directly to the new substrate (e.g., `getRosterByStatus(status)` filters `pilots` by `status`).

### Requirement: Personnel Store Persistence

**Reason:** `usePersonnelStore` is deleted; its persistence layer is irrelevant. `useCampaignRosterStore` is already persisted via Zustand's `persist` middleware with `clientSafeStorage` — its persistence is documented in `useCampaignRosterStore`'s own spec context, not under personnel-management.

**Migration:** No new persistence work needed. Saved-campaign load drops the legacy `personnel: Map<string, IPerson>` field per design.md Decision 4 of this change; one-shot warn-log fires if non-empty (which would contradict the spike).

### Requirement: Backwards Compatibility with Pilot

**Reason:** This requirement specified the `pilotToPerson()` migration helper for converting `IPilot` → `IPerson`. The helper has zero callers in production (per the spike). The synthesis architecture replaces it with `rosterEntryToPerson(rosterEntry, vaultPilot)`, which has the same intent (synthesize `IPerson` shape from non-IPerson sources) but takes the new substrate's inputs.

**Migration:** `src/lib/campaign/utils/pilotToPerson.ts` is deleted. `src/lib/campaign/utils/rosterEntryToPerson.ts` is added with field-by-field test coverage. The new helper is the bridge between `useCampaignRosterStore` and the 72 helpers that still expect `IPerson`-typed inputs (those helpers will be migrated in a follow-up change).
