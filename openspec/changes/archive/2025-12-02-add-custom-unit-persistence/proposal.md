# Change: Add Custom Unit Persistence with SQLite and Versioning

## Why

The current IndexedDB-based storage is browser-specific and unsuitable for multi-platform deployment. Users need robust save/load functionality with version history that works across:

- Electron desktop application (single-user)
- Self-hosted multi-user web application

Additionally, canonical (official) units must remain immutable while allowing users to create editable copies.

## What Changes

- **BREAKING**: Replace IndexedDB persistence with SQLite database backend
- Add server-side API endpoints for unit CRUD operations
- Add version history tracking with save-increment and revert capability
- Add canonical unit protection (force rename on save attempts)
- Add clone naming convention (`{Chassis} {Variant}-Custom-{n}`)
- Add JSON export for unit sharing and portability
- Update frontend services to use API instead of direct IndexedDB access

## Impact

- **Affected specs**:
  - `persistence-services` - Major rewrite from IndexedDB to SQLite
  - `unit-services` - CustomUnitService API changes
  - NEW: `unit-versioning` - Version history capability

- **Affected code**:
  - `src/services/persistence/` - New SQLite service
  - `src/services/units/CustomUnitService.ts` - API-based implementation
  - `src/pages/api/` - New API routes
  - Database schema and migrations
  - Frontend save/load dialogs

- **Dependencies**:
  - `better-sqlite3` - SQLite driver for Node.js
  - Prisma ORM (optional, for type-safe queries)
