# Change: Add Vault Sharing System

## Why

Users need to share custom units, pilots, and forces with other MekStation users — whether for GM-to-player distribution, campaign collaboration, or community sharing. The system should be decentralized, with each MekStation instance acting as its own "vault" that can selectively share content with granular permissions.

## What Changes

- Add Vault concept (user's personal data store with sharing capabilities)
- Add cryptographic identity system (keypairs, friend codes)
- Add permission model (read/write/admin per item/category)
- Add file-based sharing (export/import signed bundles)
- Add link-based sharing (shareable URLs with embedded permissions)
- Add peer-to-peer sync (real-time collaboration when online)
- Add optional relay server support (NAT traversal, offline queuing)

## Dependencies

- **Requires**: Existing unit persistence, `add-pilot-system`, `add-force-management`
- **Required By**: `add-multiplayer-support` (future)

## Shareable Content

| Content Type   | Source                   | Notes                             |
| -------------- | ------------------------ | --------------------------------- |
| Custom Units   | Unit construction system | Modified/custom mech builds       |
| Pilots         | `add-pilot-system`       | Persistent pilot characters       |
| Forces         | `add-force-management`   | Pilot+mech assignments, hierarchy |
| Encounters     | `add-encounter-system`   | Scenario configurations           |
| Shared Folders | New                      | Grouped content for bulk sharing  |

## Sharing Modes

| Mode               | Connectivity     | Use Case                       |
| ------------------ | ---------------- | ------------------------------ |
| File Export/Import | None (manual)    | Backup, forum sharing, offline |
| Link Sharing       | One-time fetch   | Quick share via Discord/email  |
| P2P Sync           | Both online      | Real-time collaboration        |
| Relay-Assisted     | Via relay server | NAT traversal, offline queuing |

## Permission Levels

| Level | View | Copy/Fork | Edit | Re-share |
| ----- | ---- | --------- | ---- | -------- |
| Read  | ✓    | ✓         | ✗    | ✗        |
| Write | ✓    | ✓         | ✓    | ✗        |
| Admin | ✓    | ✓         | ✓    | ✓        |

## Impact

- Affected specs: `persistence-services`, `database-schema`
- New specs: `vault-sharing`
- Affected code: New `src/sharing/` directory
- Database: New tables for identity, contacts, permissions, sync state
- New pages: Share dialogs, "Shared with Me" view, Contact manager
- Optional: Self-hostable relay server package

## Phased Implementation

| Phase | Scope                                    | Dependencies |
| ----- | ---------------------------------------- | ------------ |
| 1     | File-based export/import with signatures | None         |
| 2     | Link-based sharing with relay            | Phase 1      |
| 3     | P2P sync with identity/permissions       | Phase 2      |
