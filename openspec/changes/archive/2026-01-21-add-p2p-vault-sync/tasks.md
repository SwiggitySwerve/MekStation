# Tasks: P2P Vault Sync

## 1. Infrastructure

- [x] 1.1 Research and select P2P library (y-webrtc selected)
- [x] 1.2 Create `src/lib/p2p/` module structure
- [x] 1.3 Implement WebRTC connection manager
- [x] 1.4 Add signaling server integration (uses y-webrtc public servers)
- [x] 1.5 Implement room code generation and parsing
- [x] 1.6 Add connection state machine (connecting, connected, disconnected, error)

## 2. CRDT Sync Layer

- [x] 2.1 Integrate Yjs for CRDT support
- [x] 2.2 Create Yjs document schema for units
- [x] 2.3 Create Yjs document schema for pilots
- [x] 2.4 Create Yjs document schema for forces
- [x] 2.5 Implement bidirectional sync between Zustand stores and Yjs docs
- [x] 2.6 Add IndexedDB persistence provider for offline support

## 3. Vault Integration

- [x] 3.1 Add sync toggle to vault items (opt-in per item)
- [x] 3.2 Implement sync state tracking (synced, pending, conflict)
- [x] 3.3 Add last-synced timestamp to vault items
- [x] 3.4 Implement selective sync (sync only marked items)
- [ ] 3.5 Add import from peer feature (one-time copy)

## 4. UI Components

- [x] 4.1 Create `SyncStatusIndicator` component
- [x] 4.2 Create `PeerList` component showing connected peers
- [x] 4.3 Create `RoomCodeDialog` for creating/joining rooms
- [ ] 4.4 Create `SyncSettings` page
- [x] 4.5 Add sync badges to vault item cards (SyncBadge)
- [ ] 4.6 Add connection quality indicator

## 5. Error Handling

- [x] 5.1 Implement connection retry logic with exponential backoff
- [x] 5.2 Add offline detection and queuing (via y-indexeddb)
- [ ] 5.3 Implement conflict resolution UI (when auto-merge fails)
- [x] 5.4 Add error toasts for sync failures
- [x] 5.5 Implement graceful degradation when P2P unavailable

## 6. Testing

- [x] 6.1 Unit tests for connection manager (room codes)
- [x] 6.2 Unit tests for CRDT sync logic (types)
- [ ] 6.3 Integration tests for store-to-Yjs sync
- [ ] 6.4 E2E tests for peer connection flow
- [ ] 6.5 Test offline/reconnect scenarios

## 7. Documentation

- [ ] 7.1 Add sync feature documentation
- [ ] 7.2 Document room code format
- [ ] 7.3 Add troubleshooting guide for connection issues
