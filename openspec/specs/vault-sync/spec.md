# vault-sync Specification

## Purpose

Defines the vault synchronization and sharing system for MekStation, including peer-to-peer real-time sync, bundle export/import, and selective content sharing. This specification covers both live P2P synchronization via WebRTC and asynchronous bundle-based sharing via signed files.

## Requirements

### Requirement: Peer Connection Management

The system SHALL provide peer-to-peer connection capabilities for real-time vault synchronization.

#### Scenario: Create sync room

- **GIVEN** a user wants to share their vault
- **WHEN** they click "Create Sync Room"
- **THEN** a unique room code is generated
- **AND** the room code is displayed for sharing
- **AND** the user becomes the room host

#### Scenario: Join sync room

- **GIVEN** a user has a room code from another player
- **WHEN** they enter the room code and click "Join"
- **THEN** a WebRTC connection is established
- **AND** they appear in the host's peer list
- **AND** sync begins automatically

#### Scenario: Connection failure

- **GIVEN** a user attempts to join a room
- **WHEN** the connection fails (timeout, invalid code, etc.)
- **THEN** an error message is displayed
- **AND** the user can retry or enter a different code

### Requirement: Real-Time Sync

The system SHALL synchronize vault items between connected peers in real-time using CRDTs.

#### Scenario: Unit sync

- **GIVEN** two peers are connected
- **WHEN** peer A modifies a synced unit
- **THEN** the change appears on peer B within 2 seconds
- **AND** no data is lost

#### Scenario: Concurrent edits

- **GIVEN** two peers edit the same unit simultaneously
- **WHEN** the edits are synced
- **THEN** changes are merged using CRDT rules
- **AND** both peers see the same final state

#### Scenario: Offline changes

- **GIVEN** a peer goes offline
- **WHEN** they make changes while offline
- **AND** they reconnect
- **THEN** offline changes sync to other peers
- **AND** conflicts are resolved automatically

### Requirement: Selective Sync

The system SHALL allow users to choose which vault items to sync.

#### Scenario: Enable sync for item

- **GIVEN** a user has a unit in their vault
- **WHEN** they enable sync for that unit
- **THEN** the unit is marked for synchronization
- **AND** it syncs to connected peers

#### Scenario: Disable sync

- **GIVEN** a synced unit
- **WHEN** the user disables sync
- **THEN** the unit stops syncing
- **AND** peers retain their last-synced copy

### Requirement: Sync Status Display

The system SHALL display sync status for vault items and connections.

#### Scenario: Show sync indicator

- **GIVEN** a synced vault item
- **WHEN** viewing the vault
- **THEN** a sync badge shows the item's sync state
- **AND** states include: synced, pending, syncing, conflict

#### Scenario: Show connection status

- **GIVEN** the user is in a sync room
- **WHEN** viewing the sync panel
- **THEN** connection quality is displayed
- **AND** connected peer count is shown

### Requirement: Bundle Export

The system SHALL provide export functionality for units, pilots, and forces via the `useVaultExport` hook.

**Source**: `src/hooks/useVaultExport.ts:94-246`

#### Scenario: Export units successfully

- **GIVEN** a user has unlocked their vault identity
- **AND** they have selected one or more units to export
- **WHEN** they call `exportUnits()` with a password
- **THEN** the hook sends a POST request to `/api/vault/sign`
- **AND** the server signs the bundle with the user's private key
- **AND** the hook returns an `IExportResult` with `success: true`
- **AND** the result contains a signed `IShareableBundle`
- **AND** the result includes a suggested filename

#### Scenario: Export without unlocked identity

- **GIVEN** a user has not unlocked their vault identity
- **WHEN** they attempt to export content
- **THEN** the hook returns an error: "Identity not unlocked. Please unlock your vault first."
- **AND** the `exporting` state remains `false`
- **AND** no API request is made

#### Scenario: Export empty selection

- **GIVEN** a user has unlocked their vault
- **WHEN** they call `exportUnits()` with an empty array
- **THEN** the hook returns an error: "No units to export"
- **AND** no API request is made

#### Scenario: Server-side signing failure

- **GIVEN** a user attempts to export content
- **WHEN** the `/api/vault/sign` endpoint returns an error
- **THEN** the hook returns an `IExportResult` with `success: false`
- **AND** the error message is extracted from the response
- **AND** the `error` state is set to the error message

#### Scenario: Download exported bundle

- **GIVEN** a successful export result exists
- **WHEN** the user calls `downloadResult()`
- **THEN** the bundle is serialized to JSON
- **AND** a Blob is created with MIME type `application/json`
- **AND** a download is triggered with the suggested filename

#### Scenario: Copy bundle to clipboard

- **GIVEN** a successful export result exists
- **WHEN** the user calls `copyToClipboard()`
- **THEN** the bundle is serialized to JSON
- **AND** the JSON string is copied to the clipboard via `navigator.clipboard.writeText()`

### Requirement: Bundle Import

The system SHALL provide import functionality for bundles via the `useVaultImport` hook.

**Source**: `src/hooks/useVaultImport.ts:96-312`

#### Scenario: Select and preview bundle file

- **GIVEN** a user has a `.mekbundle` file
- **WHEN** they call `selectFile()` with the file
- **THEN** the file is validated (extension, size < 10MB)
- **AND** the file content is read as text
- **AND** the bundle is parsed and previewed
- **AND** the `preview` state contains metadata (contentType, itemCount, authorName, description, createdAt)
- **AND** the `step` state is set to `'preview'`

#### Scenario: Invalid file type

- **GIVEN** a user selects a file with an invalid extension
- **WHEN** they call `selectFile()`
- **THEN** the hook returns an error: "Invalid file type. Expected .mekbundle or .json file."
- **AND** the `step` state remains `'idle'`

#### Scenario: File too large

- **GIVEN** a user selects a file larger than 10MB
- **WHEN** they call `selectFile()`
- **THEN** the hook returns an error: "File too large. Maximum size is 10MB."
- **AND** the `step` state remains `'idle'`

#### Scenario: Import with no conflicts

- **GIVEN** a valid bundle file is selected
- **AND** no items in the bundle conflict with existing data
- **WHEN** the user calls `importFile()` with handlers
- **THEN** the hook calls `importFromString()` from ImportService
- **AND** all items are saved via the `handlers.save()` callback
- **AND** the `result` state contains `importedCount`, `skippedCount`, `replacedCount`
- **AND** the `step` state is set to `'complete'`

#### Scenario: Import with conflicts (ask mode)

- **GIVEN** a valid bundle file is selected
- **AND** some items conflict with existing data (same ID or name)
- **WHEN** the user calls `importFile()` with `conflictResolution: 'ask'`
- **THEN** the hook detects conflicts via `handlers.checkExists()` and `handlers.checkNameConflict()`
- **AND** the `conflicts` state is populated with `IImportConflict[]`
- **AND** the `step` state is set to `'conflicts'`
- **AND** the import pauses for user resolution

#### Scenario: Resolve conflicts and continue

- **GIVEN** conflicts have been detected
- **AND** the user has chosen resolutions (skip, replace, rename, keep_both)
- **WHEN** the user calls `resolveConflicts()` with resolved conflicts
- **THEN** the hook re-imports with `resolvedConflicts` option
- **AND** items are processed according to their resolution
- **AND** the `result` state reflects the final counts
- **AND** the `step` state is set to `'complete'`

#### Scenario: Import from string (no file)

- **GIVEN** a user has bundle JSON as a string (e.g., from clipboard)
- **WHEN** they call `importString()` with the JSON and handlers
- **THEN** the bundle is parsed and imported directly
- **AND** conflict detection and resolution work the same as file import
- **AND** the `step` state transitions from `'idle'` to `'importing'` to `'complete'`

#### Scenario: Invalid bundle format

- **GIVEN** a user selects a file with invalid JSON
- **WHEN** the file is read and parsed
- **THEN** the `preview` state shows `valid: false`
- **AND** the `error` state contains the parse error message
- **AND** the import cannot proceed

### Requirement: Export State Management

The `useVaultExport` hook SHALL manage export state including loading, result, and error states.

**Source**: `src/hooks/useVaultExport.ts:50-88`

#### Scenario: Export state lifecycle

- **GIVEN** a user initiates an export
- **WHEN** the export starts
- **THEN** `exporting` is set to `true`
- **AND** `error` is cleared to `null`
- **WHEN** the export completes (success or failure)
- **THEN** `exporting` is set to `false`
- **AND** `result` is set to the `IExportResult`
- **AND** `error` is set to the error message (if failed)

#### Scenario: Clear export state

- **GIVEN** an export result exists
- **WHEN** the user calls `clear()`
- **THEN** `result` is set to `null`
- **AND** `error` is set to `null`

### Requirement: Import State Management

The `useVaultImport` hook SHALL manage import state including file selection, preview, conflicts, and result.

**Source**: `src/hooks/useVaultImport.ts:39-90`

#### Scenario: Import state lifecycle

- **GIVEN** a user selects a file
- **THEN** `step` transitions: `'idle'` → `'preview'`
- **WHEN** the user starts import
- **THEN** `step` transitions: `'preview'` → `'importing'`
- **WHEN** conflicts are detected
- **THEN** `step` transitions: `'importing'` → `'conflicts'`
- **WHEN** import completes
- **THEN** `step` transitions: `'conflicts'` → `'complete'` (or `'importing'` → `'complete'` if no conflicts)

#### Scenario: Reset import state

- **GIVEN** an import is in progress or complete
- **WHEN** the user calls `reset()`
- **THEN** all state is cleared: `file`, `fileContent`, `preview`, `conflicts`, `result`, `error`
- **AND** `step` is set to `'idle'`
- **AND** `importing` is set to `false`

## Data Model Requirements

### IShareableBundle

A signed, shareable bundle of content.

**Source**: `src/types/vault/VaultInterfaces.ts:111-120`

```typescript
interface IShareableBundle {
  /** Bundle metadata */
  readonly metadata: IBundleMetadata;

  /** The actual content (JSON stringified) */
  readonly payload: string;

  /** Ed25519 signature of (metadata + payload) */
  readonly signature: string;
}
```

### IBundleMetadata

Metadata about a shareable bundle.

**Source**: `src/types/vault/VaultInterfaces.ts:82-106`

```typescript
interface IBundleMetadata {
  /** Bundle format version for compatibility */
  readonly version: string;

  /** Type of content in this bundle */
  readonly contentType: ShareableContentType;

  /** Number of items in the bundle */
  readonly itemCount: number;

  /** Author's public identity */
  readonly author: IPublicIdentity;

  /** When the bundle was created */
  readonly createdAt: string;

  /** Optional description of the bundle contents */
  readonly description?: string;

  /** Optional tags for categorization */
  readonly tags?: string[];

  /** MekStation version that created this bundle */
  readonly appVersion: string;
}
```

### ShareableContentType

Content types that can be shared.

**Source**: `src/types/vault/VaultInterfaces.ts:77`

```typescript
type ShareableContentType = 'unit' | 'pilot' | 'force' | 'encounter';
```

### IExportableUnit

Exportable unit data (subset of full unit for sharing).

**Source**: `src/types/vault/VaultInterfaces.ts:269-287`

```typescript
interface IExportableUnit {
  /** Original unit ID (will be remapped on import) */
  readonly id: string;

  /** Unit name */
  readonly name: string;

  /** Unit chassis */
  readonly chassis: string;

  /** Unit model/variant */
  readonly model: string;

  /** Full serialized unit data */
  readonly data: unknown;

  /** Source of the unit (custom, imported, etc.) */
  readonly source?: string;
}
```

### IExportablePilot

Exportable pilot data.

**Source**: `src/types/vault/VaultInterfaces.ts:292-304`

```typescript
interface IExportablePilot {
  /** Original pilot ID */
  readonly id: string;

  /** Pilot name */
  readonly name: string;

  /** Pilot callsign */
  readonly callsign?: string;

  /** Full serialized pilot data */
  readonly data: unknown;
}
```

### IExportableForce

Exportable force data (with nested pilots and units).

**Source**: `src/types/vault/VaultInterfaces.ts:309-327`

```typescript
interface IExportableForce {
  /** Original force ID */
  readonly id: string;

  /** Force name */
  readonly name: string;

  /** Force description */
  readonly description?: string;

  /** Full serialized force data */
  readonly data: unknown;

  /** Nested pilots (if includeNested) */
  readonly pilots?: IExportablePilot[];

  /** Nested units (if includeNested) */
  readonly units?: IExportableUnit[];
}
```

### IExportResult

Result of an export operation (discriminated union).

**Source**: `src/types/vault/VaultInterfaces.ts:179`

```typescript
type IExportResult = ResultType<IExportData, IExportError>;

// Success case
interface IExportData {
  /** The generated bundle */
  readonly bundle: IShareableBundle;

  /** Filename suggestion for saving */
  readonly suggestedFilename?: string;
}

// Error case
interface IExportError {
  /** Error message */
  readonly message: string;
}
```

### IImportResult

Result of an import operation (discriminated union).

**Source**: `src/types/vault/VaultInterfaces.ts:243`

```typescript
type IImportResult = ResultType<IImportData, IImportError>;

// Success case
interface IImportData {
  readonly importedCount: number;
  readonly skippedCount: number;
  readonly replacedCount: number;
  readonly conflicts?: IImportConflict[];
  readonly importedIds?: Record<string, string>;
  readonly signatureValid?: boolean;
}

// Error case
interface IImportError {
  readonly message: string;
}
```

### IImportConflict

Conflict detected during import.

**Source**: `src/types/vault/VaultInterfaces.ts:184-202`

```typescript
interface IImportConflict {
  /** Type of content that conflicts */
  readonly contentType: ShareableContentType;

  /** ID of the conflicting item in the bundle */
  readonly bundleItemId: string;

  /** Name of the conflicting item */
  readonly bundleItemName: string;

  /** ID of the existing item that conflicts */
  readonly existingItemId: string;

  /** Name of the existing item */
  readonly existingItemName: string;

  /** Resolution strategy */
  resolution: 'skip' | 'replace' | 'rename' | 'keep_both';
}
```

### IImportOptions

Options for importing content.

**Source**: `src/types/vault/VaultInterfaces.ts:207-219`

```typescript
interface IImportOptions {
  /** How to handle conflicts */
  readonly conflictResolution: 'skip' | 'replace' | 'rename' | 'ask';

  /** Pre-resolved conflicts (when resolution is 'ask') */
  readonly resolvedConflicts?: IImportConflict[];

  /** Whether to verify signatures (default: true) */
  readonly verifySignature?: boolean;

  /** Whether to track import source (default: true) */
  readonly trackSource?: boolean;
}
```

### IImportHandlers

Handler callbacks for import operations.

**Source**: `src/types/vault/VaultInterfaces.ts:341-345`

```typescript
interface IImportHandlers<T> {
  /** Check if an item ID already exists */
  readonly checkExists: ExistsChecker;

  /** Check if an item name conflicts with existing data */
  readonly checkNameConflict: NameChecker;

  /** Save an imported item and return its new ID */
  readonly save: ItemSaver<T>;
}

type ExistsChecker = (id: string) => Promise<boolean>;

type NameChecker = (
  name: string,
) => Promise<{ id: string; name: string } | null>;

type ItemSaver<T> = (item: T, source: IImportSource) => Promise<string>;
```

### BundlePreview

Bundle preview data (hook-specific type).

**Source**: `src/hooks/useVaultImport.ts:29-37`

```typescript
interface BundlePreview {
  readonly valid: boolean;
  readonly contentType?: string;
  readonly itemCount?: number;
  readonly authorName?: string;
  readonly description?: string;
  readonly createdAt?: string;
  readonly error?: string;
}
```

### SignBundleResponse

API response from `/api/vault/sign` endpoint.

**Source**: `src/hooks/useVaultExport.ts:28-33`

```typescript
interface SignBundleResponse {
  readonly success: boolean;
  readonly bundle?: IShareableBundle;
  readonly suggestedFilename?: string;
  readonly error?: string;
}
```

## Non-Goals

This specification does NOT cover:

- **Real-time P2P sync implementation details** - WebRTC connection management, CRDT merge logic, and data channel protocols are implementation concerns
- **Server-side signing implementation** - The `/api/vault/sign` endpoint implementation is covered by API specifications
- **Cryptographic key management** - Identity creation, key derivation, and encryption are covered by the identity system spec
- **Database schema for sync state** - Persistence layer details are implementation concerns
- **UI components for import/export** - Component specifications are separate from hook contracts
- **Conflict resolution UI** - User interface for resolving conflicts is a separate concern
- **Bundle file format versioning** - Version compatibility logic is handled by BundleService
