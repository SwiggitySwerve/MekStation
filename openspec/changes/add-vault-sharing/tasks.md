# Tasks: Vault Sharing System

## Phase 1: File-Based Sharing

### 1.1 Identity Foundation
- [x] 1.1.1 Implement Ed25519 keypair generation
- [x] 1.1.2 Implement secure key storage (encrypted at rest)
- [x] 1.1.3 Implement friend code encoding/decoding
- [x] 1.1.4 Create identity initialization flow (first launch)
- [x] 1.1.5 Write tests for identity system

### 1.2 Export System
- [x] 1.2.1 Define shareable bundle format (JSON + signature)
- [x] 1.2.2 Implement unit export (single and batch)
- [x] 1.2.3 Implement pilot export
- [x] 1.2.4 Implement force export (with nested pilots/units)
- [x] 1.2.5 Implement digital signature generation
- [x] 1.2.6 Add metadata (author, timestamp, version)
- [x] 1.2.7 Write tests for export

### 1.3 Import System
- [x] 1.3.1 Implement bundle parsing and validation
- [x] 1.3.2 Implement signature verification
- [x] 1.3.3 Implement conflict detection (duplicate IDs)
- [x] 1.3.4 Implement import with ID remapping
- [x] 1.3.5 Add "Imported" source tracking
- [x] 1.3.6 Write tests for import

### 1.4 Export/Import UI
- [x] 1.4.1 Add "Export" option to unit/pilot/force context menus
- [x] 1.4.2 Create export dialog (select items, options)
- [x] 1.4.3 Create import dialog (file picker, preview, confirm)
- [x] 1.4.4 Show import results (success, conflicts, errors)
- [x] 1.4.5 Add "Imported Items" filter to lists

## Phase 2: Link-Based Sharing

### 2.1 Permission Model
- [ ] 2.1.1 Define IPermissionGrant interface
- [ ] 2.1.2 Implement permission levels (read/write/admin)
- [ ] 2.1.3 Implement permission scopes (item/category/all)
- [ ] 2.1.4 Implement permission expiry
- [ ] 2.1.5 Create permissions database table
- [ ] 2.1.6 Write tests for permissions

### 2.2 Share Link Generation
- [ ] 2.2.1 Define share link format (encoded payload or reference)
- [ ] 2.2.2 Implement link generation with embedded permissions
- [ ] 2.2.3 Implement link expiry options
- [ ] 2.2.4 Implement link revocation
- [ ] 2.2.5 Create share links database table
- [ ] 2.2.6 Write tests for link generation

### 2.3 Relay Server (Optional)
- [ ] 2.3.1 Design relay server API
- [ ] 2.3.2 Implement link resolution endpoint
- [ ] 2.3.3 Implement content fetch endpoint
- [ ] 2.3.4 Implement rate limiting and abuse prevention
- [ ] 2.3.5 Create self-hostable relay package
- [ ] 2.3.6 Document relay deployment

### 2.4 Link Sharing UI
- [ ] 2.4.1 Create "Share" dialog with link generation
- [ ] 2.4.2 Add permission configuration to share dialog
- [ ] 2.4.3 Add copy-to-clipboard for generated links
- [ ] 2.4.4 Create "Manage Shared Links" page
- [ ] 2.4.5 Implement link click handler (import flow)

## Phase 3: P2P Sync

### 3.1 Contact Management
- [ ] 3.1.1 Define IContact interface
- [ ] 3.1.2 Create contacts database table
- [ ] 3.1.3 Implement "Add Contact" by friend code
- [ ] 3.1.4 Implement contact nicknames
- [ ] 3.1.5 Implement contact removal
- [ ] 3.1.6 Write tests for contacts

### 3.2 Vault Service
- [ ] 3.2.1 Define IVault interface
- [ ] 3.2.2 Implement vault content listing
- [ ] 3.2.3 Implement shared folder creation
- [ ] 3.2.4 Implement item-to-folder assignment
- [ ] 3.2.5 Implement permission assignment to contacts
- [ ] 3.2.6 Write tests for vault service

### 3.3 Sync Engine
- [ ] 3.3.1 Implement change log (track local modifications)
- [ ] 3.3.2 Implement change log exchange protocol
- [ ] 3.3.3 Implement state reconciliation
- [ ] 3.3.4 Implement conflict detection
- [ ] 3.3.5 Implement conflict resolution (fork or merge)
- [ ] 3.3.6 Write tests for sync engine

### 3.4 P2P Transport
- [ ] 3.4.1 Implement WebRTC connection setup
- [ ] 3.4.2 Implement signaling (via relay or manual)
- [ ] 3.4.3 Implement NAT traversal (STUN/TURN)
- [ ] 3.4.4 Implement message framing protocol
- [ ] 3.4.5 Implement connection state management
- [ ] 3.4.6 Write tests for P2P transport

### 3.5 Sync UI
- [ ] 3.5.1 Create "Contacts" page
- [ ] 3.5.2 Create "Shared with Me" view
- [ ] 3.5.3 Create "My Shared Items" management
- [ ] 3.5.4 Add sync status indicator (connected, syncing, error)
- [ ] 3.5.5 Create conflict resolution UI
- [ ] 3.5.6 Add notifications for incoming shares

## Phase 4: Polish & Advanced Features

### 4.1 Shared Folders
- [ ] 4.1.1 Implement folder creation and management
- [ ] 4.1.2 Implement bulk permission assignment
- [ ] 4.1.3 Implement folder-level sync
- [ ] 4.1.4 Create folder management UI

### 4.2 Version History
- [ ] 4.2.1 Track version history for shared items
- [ ] 4.2.2 Implement version diff view
- [ ] 4.2.3 Implement rollback to previous version
- [ ] 4.2.4 Create version history UI

### 4.3 Offline Queue
- [ ] 4.3.1 Queue changes when peer offline
- [ ] 4.3.2 Implement relay-based store-and-forward
- [ ] 4.3.3 Implement queue expiry policy
- [ ] 4.3.4 Show pending sync status in UI

### 4.4 Public Sharing
- [ ] 4.4.1 Implement "Public" permission level
- [ ] 4.4.2 Optional: public vault browsing on relay
- [ ] 4.4.3 Implement public link generation (no auth required)
