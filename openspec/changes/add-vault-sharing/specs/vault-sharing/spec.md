# Vault Sharing Specification

## ADDED Requirements

### Requirement: Cryptographic Identity

The system SHALL provide each instance with a unique cryptographic identity.

#### Scenario: Identity generation
- **GIVEN** MekStation launches for the first time
- **WHEN** identity initialization runs
- **THEN** an Ed25519 keypair SHALL be generated
- **AND** the private key SHALL be encrypted and stored securely
- **AND** a friend code SHALL be derived from the public key

#### Scenario: Friend code format
- **GIVEN** a public key
- **WHEN** generating friend code
- **THEN** format SHALL be `MEKS-XXXX-XXXX-XXXX`
- **AND** code SHALL include a checksum for validation
- **AND** code SHALL be case-insensitive

#### Scenario: Identity persistence
- **GIVEN** an existing identity
- **WHEN** MekStation relaunches
- **THEN** the same identity SHALL be loaded
- **AND** friend code SHALL remain unchanged

### Requirement: Shareable Bundle Format

The system SHALL define a standard format for shareable content.

#### Scenario: Bundle structure
- **GIVEN** content to be shared
- **WHEN** creating a bundle
- **THEN** bundle SHALL include: version, type, author, created timestamp
- **AND** bundle SHALL include the content payload
- **AND** bundle SHALL include a digital signature

#### Scenario: Bundle signing
- **GIVEN** a bundle to be exported
- **WHEN** signing the bundle
- **THEN** signature SHALL be generated using author's private key
- **AND** signature SHALL cover all bundle fields except itself
- **AND** signature SHALL be Ed25519 format

#### Scenario: Bundle verification
- **GIVEN** an imported bundle with signature
- **WHEN** verifying authenticity
- **THEN** signature SHALL be verified against author's public key
- **AND** invalid signatures SHALL be rejected with error
- **AND** valid bundles SHALL display verified author info

### Requirement: Content Export

The system SHALL support exporting content as shareable bundles.

#### Scenario: Export single unit
- **GIVEN** a custom unit
- **WHEN** exporting the unit
- **THEN** a signed bundle containing the unit SHALL be created
- **AND** bundle SHALL be downloadable as a file

#### Scenario: Export pilot
- **GIVEN** a pilot entity
- **WHEN** exporting the pilot
- **THEN** a signed bundle containing the pilot SHALL be created
- **AND** career history SHALL be included

#### Scenario: Export force
- **GIVEN** a force with pilot-mech assignments
- **WHEN** exporting the force
- **THEN** bundle SHALL include the force structure
- **AND** bundle SHALL include all assigned pilots (or references)
- **AND** bundle SHALL include all assigned units (or references)

#### Scenario: Batch export
- **GIVEN** multiple items selected
- **WHEN** exporting as batch
- **THEN** a single bundle containing all items SHALL be created
- **AND** internal references SHALL be preserved

### Requirement: Content Import

The system SHALL support importing content from bundles.

#### Scenario: Import with verification
- **GIVEN** a bundle file
- **WHEN** importing the bundle
- **THEN** signature SHALL be verified first
- **AND** if invalid, import SHALL be rejected
- **AND** if valid, content preview SHALL be shown

#### Scenario: Conflict handling on import
- **GIVEN** a bundle containing an item with existing ID
- **WHEN** importing the bundle
- **THEN** conflict SHALL be detected
- **AND** user SHALL choose: skip, overwrite, or import as copy

#### Scenario: Import as copy
- **GIVEN** an imported item
- **WHEN** importing as copy
- **THEN** new unique ID SHALL be assigned
- **AND** item SHALL be marked as "Imported from [author]"
- **AND** original author attribution SHALL be preserved

### Requirement: Permission Model

The system SHALL enforce granular access permissions.

#### Scenario: Permission levels
- **GIVEN** a permission grant
- **WHEN** defining permission level
- **THEN** "read" allows viewing and copying
- **AND** "write" allows viewing, copying, and editing
- **AND** "admin" allows all above plus re-sharing

#### Scenario: Permission scopes
- **GIVEN** a permission grant
- **WHEN** defining scope
- **THEN** scope MAY be a specific item
- **AND** scope MAY be a folder
- **AND** scope MAY be a category (all units, all pilots, etc.)
- **AND** scope MAY be entire vault

#### Scenario: Permission inheritance
- **GIVEN** an item in a folder with permissions
- **WHEN** checking access
- **THEN** explicit item permission takes precedence
- **AND** if no explicit permission, inherit from folder
- **AND** if no folder permission, inherit from category/vault

#### Scenario: Permission expiry
- **GIVEN** a permission with expiry time
- **WHEN** expiry time passes
- **THEN** permission SHALL be automatically revoked
- **AND** access SHALL be denied after expiry

### Requirement: Share Link Generation

The system SHALL generate shareable links for content.

#### Scenario: Generate share link
- **GIVEN** an item or folder to share
- **WHEN** generating share link
- **THEN** link SHALL encode permission scope and level
- **AND** link SHALL be copyable to clipboard
- **AND** link MAY have optional expiry

#### Scenario: Link with usage limit
- **GIVEN** a share link with max uses
- **WHEN** usage limit reached
- **THEN** link SHALL become invalid
- **AND** subsequent access attempts SHALL be denied

#### Scenario: Link revocation
- **GIVEN** an active share link
- **WHEN** revoking the link
- **THEN** link SHALL become invalid immediately
- **AND** previously imported content SHALL remain with recipients

### Requirement: Contact Management

The system SHALL manage known contacts for P2P sharing.

#### Scenario: Add contact
- **GIVEN** a friend code from another user
- **WHEN** adding as contact
- **THEN** public key SHALL be derived/fetched
- **AND** contact SHALL be stored locally
- **AND** optional alias MAY be assigned

#### Scenario: Contact trust levels
- **GIVEN** an existing contact
- **WHEN** managing trust
- **THEN** contact MAY be marked as "trusted" (auto-accept shares)
- **AND** contact MAY be marked as "blocked" (reject all)
- **AND** default is "normal" (prompt for each share)

#### Scenario: Remove contact
- **GIVEN** a contact to remove
- **WHEN** removing contact
- **THEN** contact SHALL be deleted from local store
- **AND** existing permissions for that contact SHALL be revoked
- **AND** previously shared content SHALL remain

### Requirement: P2P Synchronization

The system SHALL synchronize shared content between connected peers.

#### Scenario: Establish connection
- **GIVEN** two MekStation instances with mutual permissions
- **WHEN** both are online
- **THEN** P2P connection MAY be established
- **AND** connection uses WebRTC or relay-assisted transport

#### Scenario: Sync on connect
- **GIVEN** an established P2P connection
- **WHEN** sync initiates
- **THEN** change logs SHALL be exchanged
- **AND** missing changes SHALL be transferred
- **AND** both peers SHALL reach consistent state

#### Scenario: Real-time updates
- **GIVEN** an active P2P connection with write permission
- **WHEN** one peer modifies shared content
- **THEN** change SHALL be propagated to other peer
- **AND** other peer's view SHALL update

#### Scenario: Conflict detection
- **GIVEN** both peers modify same item while disconnected
- **WHEN** reconnecting and syncing
- **THEN** conflict SHALL be detected
- **AND** user SHALL be notified
- **AND** resolution options SHALL be presented

### Requirement: Conflict Resolution

The system SHALL provide mechanisms to resolve sync conflicts.

#### Scenario: Keep mine resolution
- **GIVEN** a conflict between local and remote versions
- **WHEN** user chooses "keep mine"
- **THEN** local version SHALL be retained
- **AND** remote version SHALL be discarded
- **AND** local version propagates to peer

#### Scenario: Keep theirs resolution
- **GIVEN** a conflict between local and remote versions
- **WHEN** user chooses "keep theirs"
- **THEN** remote version SHALL replace local
- **AND** local version SHALL be discarded

#### Scenario: Keep both resolution
- **GIVEN** a conflict between local and remote versions
- **WHEN** user chooses "keep both"
- **THEN** both versions SHALL be preserved
- **AND** one SHALL be renamed to indicate fork
- **AND** user can manually merge later

### Requirement: Relay Server Support

The system SHALL support optional relay servers for connectivity assistance.

#### Scenario: Relay for NAT traversal
- **GIVEN** direct P2P connection fails due to NAT
- **WHEN** relay server is configured
- **THEN** connection SHALL be established through relay
- **AND** data remains end-to-end encrypted

#### Scenario: Relay for offline queuing
- **GIVEN** peer is offline
- **WHEN** sending shared content
- **THEN** content MAY be queued at relay
- **AND** content delivered when peer comes online
- **AND** queue has configurable expiry

#### Scenario: Self-hosted relay
- **GIVEN** user wants private relay
- **WHEN** deploying relay server
- **THEN** relay SHALL be configurable in MekStation
- **AND** relay software SHALL be self-hostable
- **AND** no dependency on central infrastructure

### Requirement: Shared Folders

The system SHALL support grouping shared content into folders.

#### Scenario: Create shared folder
- **GIVEN** a user with content to organize
- **WHEN** creating a shared folder
- **THEN** folder SHALL be created with unique ID
- **AND** folder SHALL support naming
- **AND** items MAY be added to folder

#### Scenario: Folder-level permissions
- **GIVEN** a folder with permissions granted
- **WHEN** adding items to folder
- **THEN** items SHALL inherit folder permissions
- **AND** explicit item permissions override inheritance

#### Scenario: Campaign folder use case
- **GIVEN** a GM running a campaign
- **WHEN** creating a campaign folder
- **THEN** all campaign content (units, pilots, forces, encounters) MAY be added
- **AND** entire folder shared with players with single permission grant
