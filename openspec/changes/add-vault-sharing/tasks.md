# Tasks: Vault Sharing System

## Phase 1: File-Based Sharing

### 1.1 Identity Foundation
- [ ] 1.1.1 Implement Ed25519 keypair generation
- [ ] 1.1.2 Implement secure key storage (encrypted at rest)
- [ ] 1.1.3 Implement friend code encoding/decoding
- [ ] 1.1.4 Create identity initialization flow (first launch)
- [ ] 1.1.5 Write tests for identity system

### 1.2 Export System
- [ ] 1.2.1 Define shareable bundle format (JSON + signature)
- [ ] 1.2.2 Implement unit export (single and batch)
- [ ] 1.2.3 Implement pilot export
- [ ] 1.2.4 Implement force export (with nested pilots/units)
- [ ] 1.2.5 Implement digital signature generation
- [ ] 1.2.6 Add metadata (author, timestamp, version)
- [ ] 1.2.7 Write tests for export

### 1.3 Import System
- [ ] 1.3.1 Implement bundle parsing and validation
- [ ] 1.3.2 Implement signature verification
- [ ] 1.3.3 Implement conflict detection (duplicate IDs)
- [ ] 1.3.4 Implement import with ID remapping
- [ ] 1.3.5 Add "Imported" source tracking
- [ ] 1.3.6 Write tests for import

### 1.4 Export/Import UI
- [ ] 1.4.1 Add "Export" option to unit/pilot/force context menus
- [ ] 1.4.2 Create export dialog (select items, options)
- [ ] 1.4.3 Create import dialog (file picker, preview, confirm)
- [ ] 1.4.4 Show import results (success, conflicts, errors)
- [ ] 1.4.5 Add "Imported Items" filter to lists

## Phase 2: Link-Based Sharing

### 2.1 Permission Model
- [x] 2.1.1 Define IPermissionGrant interface
- [x] 2.1.2 Implement permission levels (read/write/admin)
- [x] 2.1.3 Implement permission scopes (item/category/all)
- [x] 2.1.4 Implement permission expiry
- [x] 2.1.5 Create permissions database table
- [x] 2.1.6 Write tests for permissions

### 2.2 Share Link Generation
- [x] 2.2.1 Define share link format (encoded payload or reference)
- [x] 2.2.2 Implement link generation with embedded permissions
- [x] 2.2.3 Implement link expiry options
- [x] 2.2.4 Implement link revocation
- [x] 2.2.5 Create share links database table
- [x] 2.2.6 Write tests for link generation

### 2.3 Share Link API Endpoints
- [x] 2.3.1 GET/POST /api/vault/share (list/create links)
- [x] 2.3.2 GET/PATCH/DELETE /api/vault/share/[id] (manage link)
- [x] 2.3.3 POST /api/vault/share/redeem (redeem by token/URL)
- [x] 2.3.4 Write API integration tests

### 2.4 Link Sharing UI
- [x] 2.4.1 Create "Share" dialog with link generation
- [x] 2.4.2 Add permission configuration to share dialog
- [x] 2.4.3 Add copy-to-clipboard for generated links
- [x] 2.4.4 Create "Manage Shared Links" page
- [x] 2.4.5 Implement link click handler (import flow)

## Phase 3: P2P Sync

### 3.1 Contact Management
- [x] 3.1.1 Define IContact interface
- [x] 3.1.2 Create contacts database table
- [x] 3.1.3 Implement "Add Contact" by friend code
- [x] 3.1.4 Implement contact nicknames
- [x] 3.1.5 Implement contact removal
- [x] 3.1.6 Write tests for contacts

### 3.2 Vault Service
- [x] 3.2.1 Define IVault interface
- [x] 3.2.2 Implement vault content listing
- [x] 3.2.3 Implement shared folder creation
- [x] 3.2.4 Implement item-to-folder assignment
- [x] 3.2.5 Implement permission assignment to contacts
- [x] 3.2.6 Write tests for vault service

### 3.3 Sync Engine
- [x] 3.3.1 Implement change log (track local modifications)
- [x] 3.3.2 Implement change log exchange protocol
- [x] 3.3.3 Implement state reconciliation
- [x] 3.3.4 Implement conflict detection
- [x] 3.3.5 Implement conflict resolution (fork or merge)
- [x] 3.3.6 Write tests for sync engine

### 3.4 P2P Transport
- [x] 3.4.1 Implement WebRTC connection setup
- [x] 3.4.2 Implement signaling (via relay or manual)
- [x] 3.4.3 Implement NAT traversal (STUN/TURN)
- [x] 3.4.4 Implement message framing protocol
- [x] 3.4.5 Implement connection state management
- [x] 3.4.6 Write tests for P2P transport

### 3.5 Sync UI
- [x] 3.5.1 Create "Contacts" page
- [x] 3.5.2 Create "Shared with Me" view
- [x] 3.5.3 Create "My Shared Items" management
- [x] 3.5.4 Add sync status indicator (connected, syncing, error)
- [x] 3.5.5 Create conflict resolution UI
- [x] 3.5.6 Add notifications for incoming shares

## Phase 4: Polish & Advanced Features

### 4.1 Shared Folders
- [x] 4.1.1 Implement folder creation and management
- [x] 4.1.2 Implement bulk permission assignment
- [x] 4.1.3 Implement folder-level sync
- [x] 4.1.4 Create folder management UI

### 4.2 Version History
- [x] 4.2.1 Track version history for shared items
- [x] 4.2.2 Implement version diff view
- [x] 4.2.3 Implement rollback to previous version
- [x] 4.2.4 Create version history UI

### 4.3 Offline Queue
- [x] 4.3.1 Queue changes when peer offline
- [x] 4.3.2 Implement relay-based store-and-forward
- [x] 4.3.3 Implement queue expiry policy
- [x] 4.3.4 Show pending sync status in UI

### 4.4 Public Sharing
- [x] 4.4.1 Implement "Public" permission level
- [~] 4.4.2 Optional: public vault browsing on relay (skipped - optional)
- [x] 4.4.3 Implement public link generation (no auth required)
