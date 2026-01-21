# Tasks: P2P Vault Sync

## 1. Infrastructure

- [x] 1.1 Research and select P2P library (y-webrtc selected)
- [x] 1.2 Create `src/lib/p2p/` module structure
- [x] 1.3 Implement WebRTC connection manager (`SyncProvider.ts`)
- [x] 1.4 Add signaling server integration (y-webrtc public servers)
- [x] 1.5 Implement room code generation and parsing (`roomCodes.ts`)
- [x] 1.6 Add connection state machine (ConnectionState enum)

**Implementation:** `src/lib/p2p/`
- `SyncProvider.ts` - WebRTC provider, room management
- `roomCodes.ts` - Room code generation/validation
- `types.ts` - Type definitions, enums
- `useSyncRoom.ts` - React hook for room management
- `useSyncRoomStore.ts` - Zustand store for room state

## 2. CRDT Sync Layer

- [x] 2.1 Integrate Yjs for CRDT support
- [x] 2.2 Create Yjs document schema for units (via `ISyncableVaultItem`)
- [x] 2.3 Create Yjs document schema for pilots (via `ISyncableVaultItem`)
- [x] 2.4 Create Yjs document schema for forces (via `ISyncableVaultItem`)
- [x] 2.5 Implement bidirectional sync between Zustand stores and Yjs docs
- [x] 2.6 Add IndexedDB persistence provider for offline support

**Implementation:** 
- `src/lib/p2p/useSyncedVaultStore.ts` - Bidirectional Yjs <-> Zustand sync
- `src/lib/p2p/SyncProvider.ts` - IndexeddbPersistence integration

## 3. Vault Integration

- [x] 3.1 Add sync toggle to vault items (opt-in per item) - `syncEnabled` field
- [x] 3.2 Implement sync state tracking (synced, pending, conflict) - `SyncState` enum
- [x] 3.3 Add last-synced timestamp to vault items - `lastSyncedAt` field
- [x] 3.4 Implement selective sync (sync only marked items) - `syncItemToYjs` checks `syncEnabled`
- [x] 3.5 Add import from peer feature (one-time copy)

**Implementation:** `src/lib/p2p/types.ts` (ISyncableVaultItem), `src/lib/p2p/useSyncedVaultStore.ts`
- `src/components/sync/PeerItemList.tsx` - UI for viewing and importing peer items

## 4. UI Components

- [x] 4.1 Create `SyncStatusIndicator` component
- [x] 4.2 Create `PeerList` component showing connected peers
- [x] 4.3 Create `RoomCodeDialog` for creating/joining rooms
- [x] 4.4 Create `SyncSettings` page
- [x] 4.5 Add sync badges to vault item cards (`SyncBadge`)
- [x] 4.6 Add connection quality indicator

**Implementation:** `src/components/sync/`
- `SyncStatusIndicator.tsx` - Connection status display
- `PeerList.tsx` - Connected peer list
- `RoomCodeDialog.tsx` - Room create/join dialog
- `SyncBadge.tsx` - Sync state badge for items
- `ConnectionQualityIndicator.tsx` - Signal quality indicator with details popup

## 5. Error Handling

- [x] 5.1 Implement connection retry logic with exponential backoff
- [x] 5.2 Add offline detection and queuing (IndexedDB persistence)
- [x] 5.3 Implement conflict resolution UI (when auto-merge fails)
- [x] 5.4 Add error toasts for sync failures
- [x] 5.5 Implement graceful degradation when P2P unavailable

**Implementation:** 
- `SyncProvider.ts` - Event emitter for errors
- `src/components/ui/Toast.tsx` - Toast notification system
- `src/hooks/useSyncToasts.ts` - Hook connecting sync events to toasts

## 6. Testing

- [x] 6.1 Unit tests for connection manager
- [x] 6.2 Unit tests for CRDT sync logic
- [x] 6.3 Integration tests for store-to-Yjs sync
- [x] 6.4 E2E tests for peer connection flow
- [x] 6.5 Test offline/reconnect scenarios

**Implementation:**
- `src/lib/p2p/__tests__/roomCodes.test.ts` (165 lines)
- `src/lib/p2p/__tests__/types.test.ts` (68 lines)
- `src/lib/p2p/__tests__/useSyncedVaultStore.test.ts` - Store integration tests
- `e2e/p2p-sync.spec.ts` - Full E2E tests with dual browser contexts
- `src/pages/e2e/sync-test.tsx` - Test harness page for E2E

## 7. Documentation

- [x] 7.1 Add sync feature documentation
- [x] 7.2 Document room code format
- [x] 7.3 Add troubleshooting guide for connection issues

**Implementation:**
- `docs/features/p2p-vault-sync.md` - Main feature documentation
- `docs/features/room-codes.md` - Room code format specification
- `docs/features/sync-troubleshooting.md` - Troubleshooting guide

---

## Summary

All 36 tasks complete. P2P vault sync fully implemented with:
- WebRTC infrastructure with y-webrtc
- CRDT sync layer with Yjs + IndexedDB persistence
- Full vault integration (toggle, state tracking, selective sync)
- UI components (status indicator, peer list, room dialog, badges)
- Error handling with retry logic, toasts, and conflict resolution
- Unit, integration, and E2E tests
- Complete documentation
