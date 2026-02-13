# api-layer Specification

## Purpose

Defines the complete REST API layer for MekStation, covering all 58 HTTP endpoints across 10 resource domains. Provides standardized request/response patterns, error handling, validation rules, and authentication mechanisms for client-server communication.

## Requirements

### Requirement: Health Check Endpoint

The system SHALL provide a health check endpoint for monitoring and load balancing.

**Rationale**: Docker health checks and load balancers need to verify application availability.

**Priority**: Critical

#### Scenario: Health check returns healthy status

- **GIVEN** the application is running normally
- **WHEN** GET /api/health is called
- **THEN** return 200 OK
- **AND** response contains `{ status: "healthy", timestamp, uptime, version, environment, checks: { server: "ok", memory: "ok" } }`

#### Scenario: Health check detects memory pressure

- **GIVEN** heap memory usage exceeds 900MB threshold
- **WHEN** GET /api/health is called
- **THEN** return 503 Service Unavailable
- **AND** response contains `{ status: "unhealthy", checks: { memory: "error" } }`

---

### Requirement: Catalog Browsing

The system SHALL provide endpoints for browsing the canonical unit catalog.

**Rationale**: Users need to search and filter 4,200+ canonical units efficiently.

**Priority**: Critical

#### Scenario: Get full unit catalog

- **GIVEN** the application has loaded the unit index
- **WHEN** GET /api/catalog is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: UnitIndexEntry[], count: number }`

#### Scenario: Search catalog by name

- **GIVEN** the catalog contains units matching "Atlas"
- **WHEN** GET /api/catalog?search=Atlas is called
- **THEN** return 200 OK
- **AND** response contains only units with "Atlas" in name, chassis, or variant
- **AND** count reflects filtered results

---

### Requirement: Unit Querying

The system SHALL provide endpoints for querying canonical units by criteria.

**Rationale**: Users need to filter units by tech base, era, weight class, and tonnage.

**Priority**: High

#### Scenario: Get single unit by ID

- **GIVEN** a valid unit ID exists
- **WHEN** GET /api/units?id={id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: IBattleMech }`

#### Scenario: Query units by tech base and weight class

- **GIVEN** the catalog contains Clan heavy mechs
- **WHEN** GET /api/units?techBase=CLAN&weightClass=HEAVY is called
- **THEN** return 200 OK
- **AND** response contains only Clan heavy mechs
- **AND** count reflects filtered results

#### Scenario: Unit not found

- **GIVEN** an invalid unit ID
- **WHEN** GET /api/units?id=invalid is called
- **THEN** return 404 Not Found
- **AND** response contains `{ success: false, error: "Unit not found: invalid" }`

---

### Requirement: Custom Unit Management

The system SHALL provide CRUD operations for custom user-created units.

**Rationale**: Users need to save, update, and manage their custom mech builds.

**Priority**: Critical

#### Scenario: List all custom units

- **GIVEN** the user has created custom units
- **WHEN** GET /api/units/custom is called
- **THEN** return 200 OK
- **AND** response contains `{ units: ICustomUnitIndexEntry[], count: number }`

#### Scenario: Create custom unit

- **GIVEN** valid unit data with chassis, variant, and data fields
- **WHEN** POST /api/units/custom with `{ chassis, variant, data, notes }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, data: { id } }`
- **AND** unit is saved to database

#### Scenario: Create duplicate unit name

- **GIVEN** a unit with chassis "Atlas" variant "AS7-D" already exists
- **WHEN** POST /api/units/custom with same chassis and variant is called
- **THEN** return 409 Conflict
- **AND** response contains `{ success: false, error: { message, suggestedName } }`

#### Scenario: Get custom unit by ID

- **GIVEN** a custom unit exists with ID "abc123"
- **WHEN** GET /api/units/custom/abc123 is called
- **THEN** return 200 OK
- **AND** response contains `{ id, chassis, variant, data, parsedData, createdAt, updatedAt }`

#### Scenario: Update custom unit

- **GIVEN** a custom unit exists
- **WHEN** PUT /api/units/custom/{id} with `{ data, notes }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: { version } }`
- **AND** new version is saved to database

#### Scenario: Delete custom unit

- **GIVEN** a custom unit exists
- **WHEN** DELETE /api/units/custom/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** unit is removed from database

---

### Requirement: Unit Import

The system SHALL support importing units from JSON files.

**Rationale**: Users need to import units from external sources or backups.

**Priority**: High

#### Scenario: Import unit from envelope format

- **GIVEN** a valid unit envelope with formatVersion "1.0.0" and unit data
- **WHEN** POST /api/units/import with envelope is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, data: { unitId } }`

#### Scenario: Import unit from raw format

- **GIVEN** raw unit data with chassis and variant fields
- **WHEN** POST /api/units/import with raw data is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, data: { unitId } }`

#### Scenario: Import with unsupported format version

- **GIVEN** an envelope with formatVersion "2.0.0"
- **WHEN** POST /api/units/import is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ success: false, error: { message: "Unsupported format version" } }`

---

### Requirement: Unit Name Suggestions

The system SHALL suggest unique names for unit clones.

**Rationale**: Users need help generating unique variant names when cloning units.

**Priority**: Medium

#### Scenario: Suggest name for clone

- **GIVEN** a unit "Atlas AS7-D" exists
- **WHEN** POST /api/units/custom/suggest-name with `{ chassis: "Atlas", variant: "AS7-D" }` is called
- **THEN** return 200 OK
- **AND** response contains `{ chassis: "Atlas", suggestedVariant: "AS7-D-2", isOriginalAvailable: false }`

---

### Requirement: Equipment Querying

The system SHALL provide endpoints for querying equipment by criteria.

**Rationale**: Users need to search weapons, electronics, and ammunition by category, tech base, and availability.

**Priority**: High

#### Scenario: Get single equipment by ID

- **GIVEN** a valid equipment ID exists
- **WHEN** GET /api/equipment?id={id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: IEquipment }`

#### Scenario: Query equipment by category and tech base

- **GIVEN** the equipment database contains Clan energy weapons
- **WHEN** GET /api/equipment?category=ENERGY_WEAPON&techBase=CLAN is called
- **THEN** return 200 OK
- **AND** response contains only Clan energy weapons
- **AND** count reflects filtered results

#### Scenario: Search equipment by name

- **GIVEN** the equipment database contains items matching "PPC"
- **WHEN** GET /api/equipment?search=PPC is called
- **THEN** return 200 OK
- **AND** response contains equipment with "PPC" in name

---

### Requirement: Equipment Catalog

The system SHALL provide organized equipment catalog endpoints.

**Rationale**: Users need to browse all equipment organized by category.

**Priority**: High

#### Scenario: Get all equipment

- **GIVEN** the equipment database is loaded
- **WHEN** GET /api/equipment/catalog is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: IEquipment[], count, dataSource: "json" | "fallback" }`

#### Scenario: Get weapons only

- **GIVEN** the equipment database is loaded
- **WHEN** GET /api/equipment/catalog?type=weapons is called
- **THEN** return 200 OK
- **AND** response contains only weapon equipment

#### Scenario: Get ammunition only

- **GIVEN** the equipment database is loaded
- **WHEN** GET /api/equipment/catalog?type=ammunition is called
- **THEN** return 200 OK
- **AND** response contains only ammunition equipment

---

### Requirement: Equipment Filter Options

The system SHALL provide available filter options for equipment browsing.

**Rationale**: UI needs to know valid filter values for dropdowns.

**Priority**: Medium

#### Scenario: Get filter options

- **GIVEN** the application is running
- **WHEN** GET /api/equipment/filters is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, data: { categories, techBases, rulesLevels } }`
- **AND** each filter option has value and label

---

### Requirement: Force Management

The system SHALL provide CRUD operations for combat forces.

**Rationale**: Users need to organize units into forces for encounters.

**Priority**: Critical

#### Scenario: List all forces

- **GIVEN** the user has created forces
- **WHEN** GET /api/forces is called
- **THEN** return 200 OK
- **AND** response contains `{ forces: IForce[], count: number }`

#### Scenario: Create force

- **GIVEN** valid force data with name and forceType
- **WHEN** POST /api/forces with `{ name, forceType, description }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, force: IForce }`

#### Scenario: Get force by ID

- **GIVEN** a force exists with ID "force123"
- **WHEN** GET /api/forces/force123 is called
- **THEN** return 200 OK
- **AND** response contains `{ force: IForce }`

#### Scenario: Update force

- **GIVEN** a force exists
- **WHEN** PATCH /api/forces/{id} with `{ name, description }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, force: IForce }`

#### Scenario: Delete force

- **GIVEN** a force exists
- **WHEN** DELETE /api/forces/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

---

### Requirement: Force Assignment Management

The system SHALL provide operations for managing pilot and unit assignments within forces.

**Rationale**: Users need to assign pilots to units within force rosters.

**Priority**: High

#### Scenario: Assign pilot to assignment

- **GIVEN** a force assignment exists
- **WHEN** PUT /api/forces/assignments/{id} with `{ pilotId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** pilot is assigned to the assignment

#### Scenario: Assign unit to assignment

- **GIVEN** a force assignment exists
- **WHEN** PUT /api/forces/assignments/{id} with `{ unitId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** unit is assigned to the assignment

#### Scenario: Assign both pilot and unit

- **GIVEN** a force assignment exists
- **WHEN** PUT /api/forces/assignments/{id} with `{ pilotId, unitId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** both pilot and unit are assigned

#### Scenario: Clear assignment

- **GIVEN** a force assignment has pilot and unit assigned
- **WHEN** DELETE /api/forces/assignments/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** assignment is cleared

#### Scenario: Swap two assignments

- **GIVEN** two force assignments exist
- **WHEN** POST /api/forces/assignments/swap with `{ assignmentId1, assignmentId2 }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** assignments are swapped

---

### Requirement: Encounter Management

The system SHALL provide CRUD operations for battle encounters.

**Rationale**: Users need to set up and manage battle scenarios.

**Priority**: Critical

#### Scenario: List all encounters

- **GIVEN** the user has created encounters
- **WHEN** GET /api/encounters is called
- **THEN** return 200 OK
- **AND** response contains `{ encounters: IEncounter[], count: number }`

#### Scenario: Create encounter

- **GIVEN** valid encounter data with name
- **WHEN** POST /api/encounters with `{ name, description, scenarioType }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, encounter: IEncounter }`

#### Scenario: Get encounter by ID

- **GIVEN** an encounter exists
- **WHEN** GET /api/encounters/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ encounter: IEncounter }`

#### Scenario: Update encounter

- **GIVEN** an encounter exists
- **WHEN** PATCH /api/encounters/{id} with update data is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`

#### Scenario: Delete encounter

- **GIVEN** an encounter exists
- **WHEN** DELETE /api/encounters/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

---

### Requirement: Encounter Validation

The system SHALL validate encounter configuration before launch.

**Rationale**: Users need to know if encounter setup is valid before starting.

**Priority**: High

#### Scenario: Validate encounter

- **GIVEN** an encounter exists
- **WHEN** GET /api/encounters/{id}/validate is called
- **THEN** return 200 OK
- **AND** response contains `{ validation: IEncounterValidationResult }`
- **AND** validation includes isValid, errors, and warnings

---

### Requirement: Encounter Template Application

The system SHALL apply scenario templates to encounters.

**Rationale**: Users need quick setup for common scenario types.

**Priority**: Medium

#### Scenario: Apply template to encounter

- **GIVEN** an encounter exists
- **WHEN** PUT /api/encounters/{id}/template with `{ template: "DEATHMATCH" }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`
- **AND** encounter is configured with template settings

---

### Requirement: Encounter Force Assignment

The system SHALL manage player and opponent force assignments for encounters.

**Rationale**: Users need to assign forces to each side of the battle.

**Priority**: High

#### Scenario: Set player force

- **GIVEN** an encounter and force exist
- **WHEN** PUT /api/encounters/{id}/player-force with `{ forceId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`
- **AND** player force is assigned

#### Scenario: Clear player force

- **GIVEN** an encounter has a player force assigned
- **WHEN** DELETE /api/encounters/{id}/player-force is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`
- **AND** player force is cleared

#### Scenario: Set opponent force

- **GIVEN** an encounter and force exist
- **WHEN** PUT /api/encounters/{id}/opponent-force with `{ forceId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`
- **AND** opponent force is assigned

#### Scenario: Clear opponent force

- **GIVEN** an encounter has an opponent force assigned
- **WHEN** DELETE /api/encounters/{id}/opponent-force is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter }`
- **AND** opponent force is cleared

---

### Requirement: Encounter Launch

The system SHALL launch encounters to create game sessions.

**Rationale**: Users need to start battles from configured encounters.

**Priority**: Critical

#### Scenario: Launch encounter

- **GIVEN** a valid encounter with player and opponent forces
- **WHEN** POST /api/encounters/{id}/launch is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, encounter: IEncounter, gameSessionId }`
- **AND** game session is created

---

### Requirement: Encounter Cloning

The system SHALL support cloning encounters.

**Rationale**: Users need to duplicate encounters for variations.

**Priority**: Medium

#### Scenario: Clone encounter

- **GIVEN** an encounter exists
- **WHEN** POST /api/encounters/{id}/clone with `{ newName }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, encounter: IEncounter }`
- **AND** new encounter is created with copied settings

---

### Requirement: Pilot Management

The system SHALL provide CRUD operations for pilots.

**Rationale**: Users need to create and manage pilot characters with skills and abilities.

**Priority**: Critical

#### Scenario: List all pilots

- **GIVEN** the user has created pilots
- **WHEN** GET /api/pilots is called
- **THEN** return 200 OK
- **AND** response contains `{ pilots: IPilot[], count: number }`

#### Scenario: List active pilots only

- **GIVEN** the user has active and inactive pilots
- **WHEN** GET /api/pilots?status=active is called
- **THEN** return 200 OK
- **AND** response contains only active pilots

#### Scenario: Create pilot from full options

- **GIVEN** complete pilot options with skills, abilities, and identity
- **WHEN** POST /api/pilots with `{ mode: "full", options }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, pilot: IPilot }`

#### Scenario: Create pilot from template

- **GIVEN** a template level and identity
- **WHEN** POST /api/pilots with `{ mode: "template", template: "VETERAN", identity }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, pilot: IPilot }`
- **AND** pilot has template-appropriate skills

#### Scenario: Create random pilot

- **GIVEN** pilot identity data
- **WHEN** POST /api/pilots with `{ mode: "random", identity }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, id, pilot: IPilot }`
- **AND** pilot has randomly generated skills

#### Scenario: Get pilot by ID

- **GIVEN** a pilot exists
- **WHEN** GET /api/pilots/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ pilot: IPilot }`

#### Scenario: Update pilot

- **GIVEN** a pilot exists
- **WHEN** PUT /api/pilots/{id} with update data is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, pilot: IPilot }`

#### Scenario: Delete pilot

- **GIVEN** a pilot exists
- **WHEN** DELETE /api/pilots/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

---

### Requirement: Pilot Skill Improvement

The system SHALL support spending XP to improve pilot skills.

**Rationale**: Users need to advance pilot skills using earned experience points.

**Priority**: High

#### Scenario: Improve gunnery skill

- **GIVEN** a pilot has sufficient XP
- **WHEN** POST /api/pilots/{id}/improve-gunnery is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, newGunnery, xpSpent, xpRemaining }`
- **AND** gunnery skill is improved by 1
- **AND** XP is deducted

#### Scenario: Improve gunnery with insufficient XP

- **GIVEN** a pilot has insufficient XP
- **WHEN** POST /api/pilots/{id}/improve-gunnery is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ success: false, error: "Insufficient XP" }`

#### Scenario: Improve piloting skill

- **GIVEN** a pilot has sufficient XP
- **WHEN** POST /api/pilots/{id}/improve-piloting is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, newPiloting, xpSpent, xpRemaining }`
- **AND** piloting skill is improved by 1
- **AND** XP is deducted

---

### Requirement: Pilot Ability Purchase

The system SHALL support purchasing special pilot abilities with XP.

**Rationale**: Users need to unlock special abilities for pilots using experience points.

**Priority**: High

#### Scenario: Purchase ability

- **GIVEN** a pilot has sufficient XP and meets prerequisites
- **WHEN** POST /api/pilots/{id}/purchase-ability with `{ abilityId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, abilityId, xpSpent, xpRemaining }`
- **AND** ability is added to pilot
- **AND** XP is deducted

#### Scenario: Purchase ability with insufficient XP

- **GIVEN** a pilot has insufficient XP
- **WHEN** POST /api/pilots/{id}/purchase-ability with `{ abilityId }` is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ success: false, error: "Insufficient XP" }`

#### Scenario: Purchase ability without prerequisites

- **GIVEN** a pilot does not meet ability prerequisites
- **WHEN** POST /api/pilots/{id}/purchase-ability with `{ abilityId }` is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ success: false, error: "Prerequisites not met" }`

#### Scenario: Purchase already owned ability

- **GIVEN** a pilot already has the ability
- **WHEN** POST /api/pilots/{id}/purchase-ability with `{ abilityId }` is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ success: false, error: "Pilot already has ability" }`

---

### Requirement: Vault Identity Management

The system SHALL manage user cryptographic identities for sharing.

**Rationale**: Users need identities to sign and share content securely.

**Priority**: Critical

#### Scenario: Check if identity exists

- **GIVEN** no identity has been created
- **WHEN** GET /api/vault/identity is called
- **THEN** return 200 OK
- **AND** response contains `{ hasIdentity: false, publicIdentity: null }`

#### Scenario: Get existing identity

- **GIVEN** an identity exists
- **WHEN** GET /api/vault/identity is called
- **THEN** return 200 OK
- **AND** response contains `{ hasIdentity: true, publicIdentity: { displayName, publicKey, friendCode, avatar } }`

#### Scenario: Create new identity

- **GIVEN** no identity exists
- **WHEN** POST /api/vault/identity with `{ displayName, password }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, publicIdentity }`
- **AND** identity is saved with encrypted private key

#### Scenario: Create identity when one exists

- **GIVEN** an identity already exists
- **WHEN** POST /api/vault/identity is called
- **THEN** return 409 Conflict
- **AND** response contains `{ error: "Identity already exists" }`

#### Scenario: Update identity

- **GIVEN** an identity exists
- **WHEN** PATCH /api/vault/identity with `{ displayName, avatar }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** identity is updated

---

### Requirement: Vault Identity Unlock

The system SHALL unlock identities with password verification.

**Rationale**: Users need to unlock their identity to sign content.

**Priority**: Critical

#### Scenario: Unlock identity with correct password

- **GIVEN** an identity exists
- **WHEN** POST /api/vault/identity/unlock with `{ password }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, publicIdentity }`

#### Scenario: Unlock identity with wrong password

- **GIVEN** an identity exists
- **WHEN** POST /api/vault/identity/unlock with wrong password is called
- **THEN** return 401 Unauthorized
- **AND** response contains `{ error: "Invalid password" }`

---

### Requirement: Vault Folder Management

The system SHALL provide CRUD operations for organizing content in folders.

**Rationale**: Users need to organize shared content hierarchically.

**Priority**: High

#### Scenario: List all folders

- **GIVEN** the user has created folders
- **WHEN** GET /api/vault/folders is called
- **THEN** return 200 OK
- **AND** response contains `{ folders: IVaultFolder[], total: number }`

#### Scenario: List root folders only

- **GIVEN** the user has folders with and without parents
- **WHEN** GET /api/vault/folders?parentId=null is called
- **THEN** return 200 OK
- **AND** response contains only root-level folders

#### Scenario: List child folders

- **GIVEN** a folder has child folders
- **WHEN** GET /api/vault/folders?parentId={id} is called
- **THEN** return 200 OK
- **AND** response contains only child folders

#### Scenario: List shared folders

- **GIVEN** the user has shared folders
- **WHEN** GET /api/vault/folders?shared=true is called
- **THEN** return 200 OK
- **AND** response contains only shared folders

#### Scenario: Create folder

- **GIVEN** valid folder data with name
- **WHEN** POST /api/vault/folders with `{ name, description, parentId }` is called
- **THEN** return 201 Created
- **AND** response contains `{ folder: IVaultFolder }`

#### Scenario: Get folder by ID

- **GIVEN** a folder exists
- **WHEN** GET /api/vault/folders/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ folder: IVaultFolder }`

#### Scenario: Get folder with permissions

- **GIVEN** a folder exists
- **WHEN** GET /api/vault/folders/{id}?includePermissions=true is called
- **THEN** return 200 OK
- **AND** response contains `{ folder: IFolderWithPermissions }`
- **AND** folder includes sharedWith array

#### Scenario: Update folder

- **GIVEN** a folder exists
- **WHEN** PATCH /api/vault/folders/{id} with `{ name, description, parentId }` is called
- **THEN** return 200 OK
- **AND** response contains `{ folder: IVaultFolder }`

#### Scenario: Delete folder

- **GIVEN** a folder exists
- **WHEN** DELETE /api/vault/folders/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

---

### Requirement: Vault Folder Items

The system SHALL manage items within folders.

**Rationale**: Users need to add and remove content from folders.

**Priority**: High

#### Scenario: List folder items

- **GIVEN** a folder contains items
- **WHEN** GET /api/vault/folders/{id}/items is called
- **THEN** return 200 OK
- **AND** response contains `{ items: IFolderItem[], total: number }`

#### Scenario: Add item to folder

- **GIVEN** a folder and item exist
- **WHEN** POST /api/vault/folders/{id}/items with `{ itemId, itemType }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** item is added to folder

#### Scenario: Add multiple items to folder

- **GIVEN** a folder exists
- **WHEN** POST /api/vault/folders/{id}/items with `{ items: [{ itemId, itemType }, ...] }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, added, failed }`

#### Scenario: Remove item from folder

- **GIVEN** a folder contains an item
- **WHEN** DELETE /api/vault/folders/{id}/items with `{ itemId, itemType }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** item is removed from folder

---

### Requirement: Vault Folder Sharing

The system SHALL support sharing folders with contacts.

**Rationale**: Users need to grant access to folders for collaboration.

**Priority**: High

#### Scenario: List folder shares

- **GIVEN** a folder is shared with contacts
- **WHEN** GET /api/vault/folders/{id}/share is called
- **THEN** return 200 OK
- **AND** response contains `{ shares: [{ contactId, contactName, level }] }`

#### Scenario: Share folder with contact

- **GIVEN** a folder and contact exist
- **WHEN** POST /api/vault/folders/{id}/share with `{ contactFriendCode, level }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** folder is shared with contact

#### Scenario: Share folder with multiple contacts

- **GIVEN** a folder exists
- **WHEN** POST /api/vault/folders/{id}/share with `{ contacts: [{ friendCode, level }, ...] }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, shared, failed }`

#### Scenario: Unshare folder from contact

- **GIVEN** a folder is shared with a contact
- **WHEN** DELETE /api/vault/folders/{id}/share with `{ contactFriendCode }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** folder is unshared from contact

---

### Requirement: Vault Share Links

The system SHALL support creating and managing share links.

**Rationale**: Users need to share content via URLs without requiring accounts.

**Priority**: High

#### Scenario: List all share links

- **GIVEN** the user has created share links
- **WHEN** GET /api/vault/share is called
- **THEN** return 200 OK
- **AND** response contains `{ links: IShareLink[], count: number }`

#### Scenario: List active share links only

- **GIVEN** the user has active and expired links
- **WHEN** GET /api/vault/share?active=true is called
- **THEN** return 200 OK
- **AND** response contains only active links

#### Scenario: Create share link for item

- **GIVEN** an item exists
- **WHEN** POST /api/vault/share with `{ scopeType: "item", scopeId, level, expiresAt, maxUses, label }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, link: IShareLink, url }`

#### Scenario: Create share link for folder

- **GIVEN** a folder exists
- **WHEN** POST /api/vault/share with `{ scopeType: "folder", scopeId, level }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, link: IShareLink, url }`

#### Scenario: Create share link for category

- **GIVEN** a content category exists
- **WHEN** POST /api/vault/share with `{ scopeType: "category", scopeCategory, level }` is called
- **THEN** return 201 Created
- **AND** response contains `{ success: true, link: IShareLink, url }`

#### Scenario: Get share link by ID

- **GIVEN** a share link exists
- **WHEN** GET /api/vault/share/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ link: IShareLink, url, webUrl, isValid, remainingUses }`

#### Scenario: Update share link

- **GIVEN** a share link exists
- **WHEN** PATCH /api/vault/share/{id} with `{ label, expiresAt, maxUses, isActive }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, link: IShareLink }`

#### Scenario: Delete share link

- **GIVEN** a share link exists
- **WHEN** DELETE /api/vault/share/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

---

### Requirement: Vault Share Link Redemption

The system SHALL support redeeming share links by token or URL.

**Rationale**: Users need to access shared content via links.

**Priority**: Critical

#### Scenario: Redeem share link by token

- **GIVEN** a valid active share link exists
- **WHEN** POST /api/vault/share/redeem with `{ token }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, link: IShareLink }`
- **AND** use count is incremented

#### Scenario: Redeem share link by URL

- **GIVEN** a valid active share link exists
- **WHEN** POST /api/vault/share/redeem with `{ url }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, link: IShareLink }`

#### Scenario: Redeem expired link

- **GIVEN** a share link has expired
- **WHEN** POST /api/vault/share/redeem is called
- **THEN** return 410 Gone
- **AND** response contains `{ success: false, error: "Link expired", errorCode: "EXPIRED" }`

#### Scenario: Redeem link at max uses

- **GIVEN** a share link has reached max uses
- **WHEN** POST /api/vault/share/redeem is called
- **THEN** return 410 Gone
- **AND** response contains `{ success: false, error: "Max uses reached", errorCode: "MAX_USES" }`

#### Scenario: Redeem inactive link

- **GIVEN** a share link is inactive
- **WHEN** POST /api/vault/share/redeem is called
- **THEN** return 410 Gone
- **AND** response contains `{ success: false, error: "Link inactive", errorCode: "INACTIVE" }`

---

### Requirement: Vault Bundle Signing

The system SHALL sign content bundles with user identity.

**Rationale**: Users need to cryptographically sign shared content for authenticity.

**Priority**: Critical

#### Scenario: Sign bundle

- **GIVEN** an unlocked identity and content items
- **WHEN** POST /api/vault/sign with `{ password, contentType, items, description, tags }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, bundle: IShareableBundle, suggestedFilename }`
- **AND** bundle includes metadata, payload, and signature

#### Scenario: Sign bundle with wrong password

- **GIVEN** an identity exists
- **WHEN** POST /api/vault/sign with wrong password is called
- **THEN** return 401 Unauthorized
- **AND** response contains `{ error: "Invalid password" }`

---

### Requirement: Vault Public Sharing

The system SHALL support making content publicly accessible.

**Rationale**: Users need to share content with everyone without authentication.

**Priority**: Medium

#### Scenario: List public items

- **GIVEN** the user has made items public
- **WHEN** GET /api/vault/public is called
- **THEN** return 200 OK
- **AND** response contains `{ items: IPermissionGrant[], total: number }`

#### Scenario: Make item public

- **GIVEN** an item exists
- **WHEN** POST /api/vault/public with `{ type: "item", itemId, itemType, level }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** item is publicly accessible

#### Scenario: Make folder public

- **GIVEN** a folder exists
- **WHEN** POST /api/vault/public with `{ type: "folder", folderId, level }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** folder is publicly accessible

#### Scenario: Remove public access from item

- **GIVEN** an item is public
- **WHEN** DELETE /api/vault/public with `{ type: "item", itemId, itemType }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`
- **AND** public access is removed

---

### Requirement: Vault Bulk Permissions

The system SHALL support bulk permission operations.

**Rationale**: Users need to efficiently manage permissions for multiple items or contacts.

**Priority**: Medium

#### Scenario: Share folder with multiple contacts

- **GIVEN** a folder and contacts exist
- **WHEN** POST /api/vault/permissions/bulk with `{ operation: "share_folder_with_contacts", folderId, contacts }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, operation, results: { success, failed } }`

#### Scenario: Share multiple items with contact

- **GIVEN** items and contact exist
- **WHEN** POST /api/vault/permissions/bulk with `{ operation: "share_items_with_contact", items, contactFriendCode, level }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, operation, results: { itemsShared } }`

#### Scenario: Revoke all permissions for contact

- **GIVEN** a contact has multiple permissions
- **WHEN** POST /api/vault/permissions/bulk with `{ operation: "revoke_all_for_contact", contactFriendCode }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, operation, results: { revoked } }`

---

### Requirement: Vault Version History

The system SHALL track version history for shared content.

**Rationale**: Users need to track changes and revert to previous versions.

**Priority**: High

#### Scenario: Get version history

- **GIVEN** an item has version history
- **WHEN** GET /api/vault/versions?itemId={id}&contentType={type} is called
- **THEN** return 200 OK
- **AND** response contains `{ versions: IVersionSnapshot[], summary: IVersionHistorySummary }`

#### Scenario: Create version snapshot

- **GIVEN** an item has changed
- **WHEN** POST /api/vault/versions with `{ contentType, itemId, content, createdBy, message }` is called
- **THEN** return 201 Created
- **AND** response contains `{ version: IVersionSnapshot }`

#### Scenario: Skip unchanged version

- **GIVEN** content has not changed since last version
- **WHEN** POST /api/vault/versions is called
- **THEN** return 200 OK
- **AND** response contains `{ version: null, skipped: true }`

#### Scenario: Get version by ID

- **GIVEN** a version exists
- **WHEN** GET /api/vault/versions/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ version: IVersionSnapshot }`

#### Scenario: Delete version

- **GIVEN** a non-current version exists
- **WHEN** DELETE /api/vault/versions/{id} is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true }`

#### Scenario: Delete current version

- **GIVEN** the latest version exists
- **WHEN** DELETE /api/vault/versions/{id} is called
- **THEN** return 400 Bad Request
- **AND** response contains `{ error: "Cannot delete the current version" }`

---

### Requirement: Vault Version Rollback

The system SHALL support rolling back to previous versions.

**Rationale**: Users need to restore previous versions when mistakes are made.

**Priority**: High

#### Scenario: Rollback to version by number

- **GIVEN** an item has version history
- **WHEN** POST /api/vault/versions/rollback with `{ itemId, contentType, version, createdBy }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, restoredVersion: IVersionSnapshot }`
- **AND** new version is created with restored content

#### Scenario: Rollback to version by ID

- **GIVEN** a version exists
- **WHEN** POST /api/vault/versions/rollback with `{ versionId, createdBy }` is called
- **THEN** return 200 OK
- **AND** response contains `{ success: true, restoredVersion: IVersionSnapshot }`

---

### Requirement: Vault Version Diff

The system SHALL compare versions to show changes.

**Rationale**: Users need to see what changed between versions.

**Priority**: Medium

#### Scenario: Compare two versions

- **GIVEN** two versions exist
- **WHEN** GET /api/vault/versions/diff?itemId={id}&contentType={type}&from=1&to=2 is called
- **THEN** return 200 OK
- **AND** response contains `{ diff: IVersionDiff }`
- **AND** diff includes changes between versions

---

### Requirement: Meta Enumerations

The system SHALL provide enumeration values for filtering and validation.

**Rationale**: UI needs to know valid values for dropdowns and filters.

**Priority**: Medium

#### Scenario: Get unit categories

- **GIVEN** the application is running
- **WHEN** GET /api/meta/categories is called
- **THEN** return 200 OK
- **AND** response contains array of unit category strings

---

### Requirement: Standard Error Responses

The system SHALL return consistent error responses across all endpoints.

**Rationale**: Clients need predictable error handling.

**Priority**: Critical

#### Scenario: Method not allowed

- **GIVEN** an endpoint only supports GET
- **WHEN** POST request is made
- **THEN** return 405 Method Not Allowed
- **AND** response includes Allow header with supported methods
- **AND** response contains `{ error: "Method POST Not Allowed" }`

#### Scenario: Resource not found

- **GIVEN** a resource does not exist
- **WHEN** GET request is made for the resource
- **THEN** return 404 Not Found
- **AND** response contains `{ error: "Resource not found" }`

#### Scenario: Validation error

- **GIVEN** request body is missing required fields
- **WHEN** POST request is made
- **THEN** return 400 Bad Request
- **AND** response contains `{ error: "Missing required field: fieldName" }`

#### Scenario: Internal server error

- **GIVEN** an unexpected error occurs
- **WHEN** any request is made
- **THEN** return 500 Internal Server Error
- **AND** response contains `{ error: "Internal server error" }`
- **AND** error is logged to console

---

### Requirement: Database Initialization

The system SHALL initialize the database before processing requests.

**Rationale**: Endpoints need database access to function.

**Priority**: Critical

#### Scenario: Initialize database on request

- **GIVEN** a request requires database access
- **WHEN** the endpoint handler is called
- **THEN** call `getSQLiteService().initialize()`
- **AND** handle initialization errors with 500 status

---

## Non-Goals

The following are explicitly OUT OF SCOPE for this specification:

- **Database schema and ORM implementation** - Covered by database-schema spec
- **Service layer business logic** - Covered by individual service specs
- **Authentication middleware** - Future enhancement
- **Rate limiting** - Future enhancement
- **API versioning** - Future enhancement
- **GraphQL endpoints** - Not planned
- **WebSocket endpoints** - Covered by separate real-time spec
- **File upload handling** - Covered by separate file-handling spec

---

## Data Model Requirements

### Common Response Types

```typescript
/**
 * Standard success response envelope
 */
interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  count?: number;
}

/**
 * Standard error response envelope
 */
interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  validationErrors?: string[];
}

/**
 * Operation result response
 */
interface OperationResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  id?: string;
}
```

### Health Check Types

```typescript
interface IHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    server: 'ok' | 'error';
    memory: 'ok' | 'warning' | 'error';
  };
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}
```

### Catalog Types

```typescript
interface UnitIndexEntry {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: Era;
  weightClass: WeightClass;
  unitType: UnitType;
  filePath: string;
}
```

### Custom Unit Types

```typescript
interface ICustomUnitIndexEntry {
  id: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  createdAt: string;
  updatedAt: string;
}

interface ICreateUnitRequest {
  chassis: string;
  variant: string;
  data: Record<string, unknown>;
  notes?: string;
}

interface IUpdateUnitRequest {
  data: Record<string, unknown>;
  notes?: string;
}

interface ICloneNameSuggestion {
  chassis: string;
  suggestedVariant: string;
}
```

### Equipment Types

```typescript
interface IEquipmentQueryCriteria {
  category?: EquipmentCategory;
  techBase?: TechBase;
  year?: number;
  nameQuery?: string;
  rulesLevel?: RulesLevel;
  maxWeight?: number;
  maxSlots?: number;
}
```

### Force Types

```typescript
interface ICreateForceRequest {
  name: string;
  forceType: ForceType;
  description?: string;
}

interface IUpdateForceRequest {
  name?: string;
  description?: string;
}
```

### Encounter Types

```typescript
interface ICreateEncounterInput {
  name: string;
  description?: string;
  scenarioType?: ScenarioTemplateType;
}

interface IUpdateEncounterInput {
  name?: string;
  description?: string;
  playerForceId?: string;
  opponentForceId?: string;
}
```

### Pilot Types

```typescript
interface ICreatePilotOptions {
  name: string;
  callsign?: string;
  affiliation?: string;
  portrait?: string;
  background?: string;
  skills: {
    gunnery: number;
    piloting: number;
  };
  abilities?: string[];
}
```

### Vault Types

```typescript
interface IVaultFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface IFolderItem {
  itemId: string;
  itemType: ShareableContentType;
  addedAt: string;
}

interface IShareLink {
  id: string;
  token: string;
  scopeType: PermissionScopeType;
  scopeId?: string;
  scopeCategory?: ContentCategory;
  level: PermissionLevel;
  expiresAt?: string;
  maxUses?: number;
  useCount: number;
  isActive: boolean;
  label?: string;
  createdAt: string;
}

interface IVersionSnapshot {
  id: string;
  itemId: string;
  contentType: ShareableContentType;
  version: number;
  content: string;
  contentHash: string;
  createdBy: string;
  createdAt: string;
  message?: string;
}

interface IShareableBundle {
  metadata: IBundleMetadata;
  payload: string;
  signature: string;
}

interface IBundleMetadata {
  version: string;
  contentType: ShareableContentType;
  itemCount: number;
  author: IPublicIdentity;
  createdAt: string;
  description?: string;
  tags?: string[];
  appVersion: string;
}
```

---

## Validation Rules

### Request Validation

1. **Required Fields**: All required fields MUST be present and non-empty
2. **Type Validation**: Fields MUST match expected types (string, number, boolean, array, object)
3. **Enum Validation**: Enum fields MUST use type guard functions to validate values
4. **ID Validation**: IDs MUST be non-empty strings
5. **Numeric Ranges**: Numeric fields MUST be validated for min/max constraints

### Response Validation

1. **Status Codes**: Responses MUST use appropriate HTTP status codes
2. **Error Format**: Error responses MUST include error message
3. **Success Format**: Success responses MUST include success flag
4. **Null Handling**: Nullable fields MUST be explicitly typed

### Database Validation

1. **Initialization**: Database MUST be initialized before queries
2. **Error Handling**: Database errors MUST be caught and returned as 500
3. **Transaction Safety**: Multi-step operations SHOULD use transactions

---

## Implementation Notes

### Performance Considerations

1. **Lazy Loading**: Unit data is lazy-loaded on demand, not preloaded
2. **Caching**: Unit index is cached after first load
3. **Parallel Queries**: Multiple unit loads use Promise.all for parallelism
4. **Database Pooling**: SQLite service manages connection pooling

### Security Considerations

1. **Password Handling**: Passwords are used for identity encryption, never stored
2. **Private Key Protection**: Private keys never leave the server in Phase 1
3. **Input Sanitization**: All user input is validated before processing
4. **SQL Injection**: Use parameterized queries via ORM

### Error Handling Patterns

```typescript
// Standard error handling pattern
try {
  // Operation
  return res.status(200).json({ success: true, data });
} catch (error) {
  console.error('Operation failed:', error);
  return res.status(500).json({
    error: error instanceof Error ? error.message : 'Internal server error',
  });
}
```

### Type Guard Pattern

```typescript
// Enum validation pattern
function isValidTechBase(value: string): value is TechBase {
  return Object.values(TechBase).includes(value as TechBase);
}

// Usage
if (typeof techBase === 'string' && isValidTechBase(techBase)) {
  criteria.techBase = techBase;
}
```

---

## Dependencies

### Internal Dependencies

- **database-schema**: Database tables and schema
- **unit-services**: Unit loading and querying services
- **equipment-services**: Equipment lookup services
- **force-management**: Force CRUD services
- **encounter-system**: Encounter management services
- **pilot-system**: Pilot management services
- **vault-sharing**: Vault and sharing services

### External Dependencies

- **Next.js**: API route framework
- **better-sqlite3**: SQLite database driver
- **TypeScript**: Type safety and interfaces

---

## Examples

### Example: Query Units by Criteria

```typescript
// Request
GET /api/units?techBase=CLAN&weightClass=HEAVY&era=CLAN_INVASION

// Response
{
  "success": true,
  "data": [
    {
      "id": "mad-cat-prime",
      "name": "Mad Cat Prime",
      "chassis": "Mad Cat",
      "variant": "Prime",
      "tonnage": 75,
      "techBase": "CLAN",
      "era": "CLAN_INVASION",
      "weightClass": "HEAVY",
      "unitType": "BattleMech"
    }
  ],
  "count": 1
}
```

### Example: Create Custom Unit

```typescript
// Request
POST /api/units/custom
{
  "chassis": "Atlas",
  "variant": "AS7-D-DC",
  "data": {
    "tonnage": 100,
    "techBase": "INNER_SPHERE",
    "engine": { "type": "STANDARD_FUSION", "rating": 300 }
  },
  "notes": "Custom variant with double heat sinks"
}

// Response
{
  "success": true,
  "data": {
    "id": "custom-abc123"
  }
}
```

### Example: Create Pilot from Template

```typescript
// Request
POST /api/pilots
{
  "mode": "template",
  "template": "VETERAN",
  "identity": {
    "name": "Natasha Kerensky",
    "callsign": "Black Widow",
    "affiliation": "Wolf's Dragoons"
  }
}

// Response
{
  "success": true,
  "id": "pilot-xyz789",
  "pilot": {
    "id": "pilot-xyz789",
    "name": "Natasha Kerensky",
    "callsign": "Black Widow",
    "skills": {
      "gunnery": 2,
      "piloting": 3
    },
    "abilities": [],
    "career": {
      "xp": 0,
      "missionsCompleted": 0
    }
  }
}
```

### Example: Share Folder with Contact

```typescript
// Request
POST /api/vault/folders/folder123/share
{
  "contactFriendCode": "ABCD-1234-EFGH",
  "level": "read"
}

// Response
{
  "success": true
}
```

### Example: Create Share Link

```typescript
// Request
POST /api/vault/share
{
  "scopeType": "item",
  "scopeId": "unit-abc123",
  "level": "read",
  "expiresAt": "2026-12-31T23:59:59Z",
  "maxUses": 10,
  "label": "Atlas AS7-D Share"
}

// Response
{
  "success": true,
  "link": {
    "id": "link-xyz789",
    "token": "abc123def456",
    "scopeType": "item",
    "scopeId": "unit-abc123",
    "level": "read",
    "expiresAt": "2026-12-31T23:59:59Z",
    "maxUses": 10,
    "useCount": 0,
    "isActive": true,
    "label": "Atlas AS7-D Share",
    "createdAt": "2026-02-13T12:00:00Z"
  },
  "url": "mekstation://share/abc123def456"
}
```

---

## References

- **Next.js API Routes**: https://nextjs.org/docs/api-routes/introduction
- **REST API Design**: https://restfulapi.net/
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **TypeScript Type Guards**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

---

## Changelog

### Version 1.0.0 (2026-02-13)

- Initial specification
- Documented all 58 REST API endpoints across 10 domains
- Defined standard request/response patterns
- Specified error handling and validation rules
- Documented authentication and database initialization patterns
