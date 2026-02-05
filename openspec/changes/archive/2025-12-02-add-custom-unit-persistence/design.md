## Context

The BattleTech editor needs persistent storage for custom units that works across deployment scenarios:

1. **Electron desktop**: Single user, local storage
2. **Self-hosted web**: Multi-user, server storage

Current IndexedDB approach only works in browsers and doesn't support multi-user or Electron file system access.

## Goals / Non-Goals

**Goals:**

- Unified storage API that works in all deployment modes
- Version history with ability to revert
- Canonical unit protection (immutable)
- JSON export for sharing
- Simple, performant, robust solution

**Non-Goals:**

- Cloud sync or remote backup
- Real-time collaboration
- Complex branching/merging of unit versions
- Supporting non-SQLite databases (can be added later if needed)

## Decisions

### Decision 1: SQLite as storage backend

**Why**: Single-file database, no server process, ACID transactions, works in Node.js (Electron and server).

**Alternatives considered**:

- PostgreSQL: Overkill for single-user, requires separate server process
- JSON files: No transactions, poor multi-user support, slower queries
- IndexedDB: Browser-only, no Electron support without workarounds

### Decision 2: Server-side API for all storage operations

**Why**: Consistent interface regardless of deployment mode. Frontend always calls API; backend handles SQLite.

**For Electron**: API runs in main process, renderer calls it via IPC or localhost.
**For Web**: Standard REST API calls.

### Decision 3: Full snapshot versioning (not deltas)

**Why**: Simpler implementation, easier revert, storage is cheap for unit data (~10-50KB per unit).

**Alternatives considered**:

- Delta/diff storage: More complex, harder to debug, marginal storage savings

### Decision 4: Clone naming convention

Format: `{Chassis} {Variant}-Custom-{n}`

Example: "Atlas AS7-D" → "Atlas AS7-D-Custom-1"

If that name exists, increment: "Atlas AS7-D-Custom-2"

## Database Schema

```sql
-- Custom units (current version)
CREATE TABLE custom_units (
  id TEXT PRIMARY KEY,              -- UUID
  chassis TEXT NOT NULL,
  variant TEXT NOT NULL,
  tonnage INTEGER NOT NULL,
  tech_base TEXT NOT NULL,
  era TEXT NOT NULL,
  rules_level TEXT NOT NULL,
  data JSON NOT NULL,               -- Full ISerializedUnit
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(chassis, variant)          -- Prevent duplicate names
);

-- Version history
CREATE TABLE unit_versions (
  id TEXT PRIMARY KEY,              -- UUID
  unit_id TEXT NOT NULL REFERENCES custom_units(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSON NOT NULL,               -- Full snapshot at this version
  saved_at TEXT NOT NULL,
  notes TEXT,                       -- Optional save note
  UNIQUE(unit_id, version)
);

-- Indexes for common queries
CREATE INDEX idx_custom_units_chassis ON custom_units(chassis);
CREATE INDEX idx_custom_units_tech_base ON custom_units(tech_base);
CREATE INDEX idx_unit_versions_unit_id ON unit_versions(unit_id);
```

## API Endpoints

| Method | Endpoint                                  | Description                           |
| ------ | ----------------------------------------- | ------------------------------------- |
| GET    | `/api/units/custom`                       | List all custom units (index only)    |
| GET    | `/api/units/custom/:id`                   | Get full unit data                    |
| POST   | `/api/units/custom`                       | Create new custom unit                |
| PUT    | `/api/units/custom/:id`                   | Save/update unit (increments version) |
| DELETE | `/api/units/custom/:id`                   | Delete unit and all versions          |
| GET    | `/api/units/custom/:id/versions`          | List version history                  |
| GET    | `/api/units/custom/:id/versions/:version` | Get specific version                  |
| POST   | `/api/units/custom/:id/revert/:version`   | Revert to specific version            |
| GET    | `/api/units/custom/:id/export`            | Export unit as JSON file              |
| POST   | `/api/units/import`                       | Import unit from JSON file            |

## Risks / Trade-offs

| Risk                      | Mitigation                                                                |
| ------------------------- | ------------------------------------------------------------------------- |
| SQLite concurrency limits | WAL mode supports many readers + one writer; sufficient for expected load |
| Database corruption       | Regular backups, SQLite is very robust                                    |
| Migration complexity      | Start fresh; existing IndexedDB data can be exported/imported             |

## Migration Plan

1. Implement SQLite backend alongside existing IndexedDB
2. Add API endpoints
3. Update frontend services to use API
4. Provide one-time migration tool for IndexedDB → SQLite
5. Remove IndexedDB code after migration period

## Open Questions

- Should we support user accounts/authentication for multi-user? (Deferred - can add later)
- Should version history have a maximum limit? (Suggest: keep last 50 versions)
