# Design: Vault Sharing System

## Context

MekStation users need to share custom content (units, pilots, forces) with each other. Requirements:
- Decentralized: no mandatory central server
- Each instance acts as its own "file server"
- Granular permissions: read/write per person per item
- Works for GM→player sharing, campaign collaboration, community sharing

## Goals

- **Self-sovereign**: Users own their data, control who sees it
- **Offline-capable**: Core features work without internet
- **Progressive**: Start simple (files), add real-time later
- **Interoperable**: Standard formats, self-hostable relay

## Non-Goals

- Blockchain/cryptocurrency integration
- Guaranteed delivery (best-effort sync is acceptable)
- Real-time collaborative editing (not Google Docs)

## Architecture Decisions

### Decision 1: Cryptographic Identity

**What**: Each MekStation instance generates an Ed25519 keypair on first launch. This keypair is the user's identity.

**Why**:
- No central authority needed to issue identities
- Signatures prove authorship/authenticity
- Friend codes derived from public key are verifiable

**Format**:
```
Public Key: 32 bytes (Ed25519)
Friend Code: MEKS-XXXX-XXXX-XXXX (base32 encoded, checksum)
```

**Key Storage**:
- Desktop: Encrypted file in app data directory
- Web: IndexedDB with Web Crypto API
- Optional: Hardware key support (future)

### Decision 2: Shareable Bundle Format

**What**: Shared content is packaged as signed JSON bundles.

**Format**:
```json
{
  "version": "1.0",
  "type": "unit" | "pilot" | "force" | "bundle",
  "author": {
    "friendCode": "MEKS-ABCD-1234-WXYZ",
    "alias": "Optional Display Name"
  },
  "created": "2026-01-17T12:00:00Z",
  "content": { /* actual data */ },
  "signature": "base64-encoded-ed25519-signature"
}
```

**Why**:
- JSON is human-readable, debuggable
- Signature proves authenticity and prevents tampering
- Self-contained: no external dependencies to import
- Versionable: format can evolve

### Decision 3: Permission Model

**What**: Tree-structured permissions with inheritance.

```
Vault (root)
├── /units/
│   ├── custom-atlas (Alice: read)
│   └── campaign-enemy (Bob: write)
├── /pilots/
│   └── * (Gaming Group: read)
└── /forces/
    └── friday-campaign/ (Gaming Group: write)
        ├── player-lance
        └── gm-opfor
```

**Permission inheritance**:
- Item inherits from parent folder if no explicit permission
- Explicit permission overrides inherited
- "Deny" overrides "Allow" at same level

**Why**:
- Familiar model (file system permissions)
- Scales from single-item to whole-vault sharing
- Flexible enough for all use cases

### Decision 4: Sync Protocol

**What**: Log-based sync with vector clocks.

**How it works**:
1. Each vault maintains a change log (append-only)
2. Each change has a vector clock (per-device timestamps)
3. On connect, peers exchange log summaries
4. Missing changes are transferred
5. Conflicts detected via vector clock comparison

**Conflict resolution**:
- Concurrent edits to same item → conflict
- Resolution options: keep mine, keep theirs, keep both (fork)
- User can manually merge if needed

**Why**:
- Works offline (changes queue locally)
- Efficient sync (only transfer deltas)
- Deterministic conflict detection
- No central coordinator needed

### Decision 5: Transport Layers

**What**: Multiple transport options, selected based on availability.

| Transport | When Used | Characteristics |
|-----------|-----------|-----------------|
| Direct P2P (WebRTC) | Both peers online, NAT permits | Lowest latency, no relay |
| Relay-assisted P2P | NAT traversal needed | Uses TURN relay for media |
| Relay store-forward | Peer offline | Relay queues messages |
| Manual file | No connectivity | Export/import files |

**Connection flow**:
```
1. Try direct WebRTC connection
2. If fails, use relay for signaling
3. If still fails, use relay for data
4. If relay unavailable, fall back to manual
```

**Why**:
- Graceful degradation
- Works in restrictive networks
- Self-hostable relay for privacy

## Data Model

### Identity Tables

```sql
-- Local identity (one row)
CREATE TABLE local_identity (
  id INTEGER PRIMARY KEY,
  public_key BLOB NOT NULL,
  private_key_encrypted BLOB NOT NULL,
  friend_code TEXT NOT NULL,
  alias TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Known contacts
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,  -- friend code
  public_key BLOB NOT NULL,
  alias TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP,
  trust_level TEXT DEFAULT 'normal'  -- normal, trusted, blocked
);
```

### Permission Tables

```sql
-- Permission grants
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  grantee_id TEXT NOT NULL,  -- friend code or 'public'
  scope_type TEXT NOT NULL,  -- 'item', 'folder', 'category', 'all'
  scope_id TEXT,  -- item/folder ID, or NULL for category/all
  scope_category TEXT,  -- 'units', 'pilots', 'forces', NULL
  level TEXT NOT NULL,  -- 'read', 'write', 'admin'
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grantee_id) REFERENCES contacts(id)
);

-- Share links
CREATE TABLE share_links (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id TEXT,
  level TEXT NOT NULL,
  expires_at TIMESTAMP,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sync Tables

```sql
-- Local change log
CREATE TABLE change_log (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,  -- 'unit', 'pilot', 'force'
  item_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- 'create', 'update', 'delete'
  vector_clock TEXT NOT NULL,  -- JSON: {"device1": 5, "device2": 3}
  payload TEXT,  -- JSON: change details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Peer sync state
CREATE TABLE peer_sync_state (
  peer_id TEXT PRIMARY KEY,
  last_sync_at TIMESTAMP,
  their_clock TEXT,  -- JSON: last known vector clock
  pending_changes TEXT  -- JSON: queued outbound changes
);
```

## API Design

### Vault Service

```typescript
interface IVaultService {
  // Identity
  getIdentity(): Promise<IIdentity>;
  
  // Content management
  listSharedItems(category?: string): Promise<ISharedItem[]>;
  createFolder(name: string, parent?: string): Promise<IFolder>;
  moveToFolder(itemId: string, folderId: string): Promise<void>;
  
  // Permissions
  grantPermission(grant: IPermissionGrant): Promise<void>;
  revokePermission(grantId: string): Promise<void>;
  getPermissions(itemId: string): Promise<IPermission[]>;
  checkPermission(peerId: string, itemId: string): Promise<PermissionLevel>;
  
  // Sharing
  generateShareLink(scope: IScope, options: ILinkOptions): Promise<string>;
  revokeShareLink(linkId: string): Promise<void>;
  
  // Export/Import
  exportBundle(items: string[]): Promise<IBundle>;
  importBundle(bundle: IBundle): Promise<IImportResult>;
}
```

### Sync Service

```typescript
interface ISyncService {
  // Connection
  connectToPeer(friendCode: string): Promise<IConnection>;
  disconnect(peerId: string): Promise<void>;
  getConnectionStatus(peerId: string): ConnectionStatus;
  
  // Sync operations
  syncWithPeer(peerId: string): Promise<ISyncResult>;
  getChangesSince(clock: VectorClock): Promise<IChange[]>;
  applyChanges(changes: IChange[]): Promise<IApplyResult>;
  
  // Conflict resolution
  getConflicts(): Promise<IConflict[]>;
  resolveConflict(conflictId: string, resolution: Resolution): Promise<void>;
}
```

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Impersonation | Verify signatures against known public keys |
| Tampering | All bundles are signed; reject invalid signatures |
| Replay attacks | Include timestamps; reject old bundles |
| Key theft | Encrypt private key at rest; optional passphrase |
| Malicious relay | Relay never sees decrypted content (E2E encryption) |
| Spam/abuse | Rate limiting; trust levels; blocking |

### Privacy

- Relay sees: friend codes, encrypted blobs, metadata
- Relay does NOT see: actual content, who is sharing what
- Optional: onion routing through multiple relays (future)

## Migration Plan

### Phase 1 → Phase 2
- Identity system from Phase 1 used for link signing
- Export format extended with link metadata
- No breaking changes

### Phase 2 → Phase 3
- Contacts build on identity system
- Permissions extend link permissions
- Sync uses same bundle format
- Relay API extended for signaling

## Open Questions

1. **Key recovery**: If user loses private key, what happens to their shares? (Answer: they lose authorship proof, but content persists with recipients)

2. **Relay economics**: Who runs public relays? Donation-based? (Answer: self-host or community relays; no mandatory central relay)

3. **Large files**: How to handle very large forces/campaigns? (Answer: chunked transfer, resume support)

4. **Encryption**: Should all P2P traffic be E2E encrypted even over WebRTC? (Answer: yes, using NaCl box)
