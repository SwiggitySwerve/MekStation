# Change: Add P2P Vault Sync

## Why

Players want to share units, pilots, and forces with friends in real-time without relying on file exports. Current vault sharing (Phase 1) uses file-based export/import, which is cumbersome for frequent collaborators. P2P sync enables live collaboration on force building and seamless multiplayer setup.

## What Changes

- Add WebRTC-based peer-to-peer connection infrastructure
- Implement CRDT-based sync for vault items (units, pilots, forces)
- Add peer discovery via shareable room codes
- Add conflict resolution for concurrent edits
- Add connection status UI and sync indicators

## Dependencies

- `add-vault-sharing` (Phase 1) - File-based vault infrastructure
- Existing pilot and force management systems

## Impact

- Affected specs: `vault-sync` (new capability)
- Affected code: `src/services/vault/`, `src/stores/`, new `src/lib/p2p/`
- New pages: Sync settings, peer management
- Storage: IndexedDB for offline support, CRDT state

## Success Criteria

- [ ] Two users can connect via room code
- [ ] Changes to units/pilots sync within 2 seconds
- [ ] Offline changes sync when reconnected
- [ ] Conflicts are resolved automatically (last-writer-wins or merge)
- [ ] Connection failures show clear error messages

## Technical Approach

1. **Connection Layer**: WebRTC data channels via simple-peer or y-webrtc
2. **Sync Protocol**: Yjs CRDTs for conflict-free replication
3. **Discovery**: Room codes generate WebRTC signaling info
4. **Persistence**: IndexedDB adapter for Yjs documents
5. **UI**: Sync status indicator, peer list, room management
