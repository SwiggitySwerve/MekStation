# force-management Specification

## Purpose

TBD - created by archiving change add-force-management. Update Purpose after archive.

## Requirements

### Requirement: Force Entity Model

The system SHALL define force entities with hierarchical organization.

#### Scenario: Force properties

- **GIVEN** a force entity
- **WHEN** accessing properties
- **THEN** force MUST have: id, name
- **AND** force MAY have: affiliation, parent force, icon

#### Scenario: Force hierarchy

- **GIVEN** a force with sub-forces
- **WHEN** traversing hierarchy
- **THEN** parent-child relationships SHALL be maintained
- **AND** typical hierarchy: Battalion → Company → Lance

#### Scenario: Calculated properties

- **GIVEN** a force with assignments
- **WHEN** calculating totals
- **THEN** totalBV SHALL sum all assigned unit BVs
- **AND** totalTonnage SHALL sum all assigned unit tonnages
- **AND** unitCount SHALL count all assignments

### Requirement: Pilot-Mech Assignment

The system SHALL manage pilot-to-mech assignments within forces.

#### Scenario: Create assignment

- **GIVEN** a force, a pilot, and a mech
- **WHEN** creating assignment
- **THEN** pilot SHALL be linked to mech within force
- **AND** pilot cannot be assigned to multiple mechs in same force
- **AND** mech cannot have multiple pilots in same force

#### Scenario: Assignment with statblock pilot

- **GIVEN** a force needing quick NPC
- **WHEN** creating assignment with statblock pilot
- **THEN** statblock pilot definition stored inline
- **AND** no database reference created for pilot

#### Scenario: Remove assignment

- **GIVEN** an existing assignment
- **WHEN** removing assignment
- **THEN** pilot and mech are unlinked
- **AND** both remain available for other assignments

### Requirement: Force CRUD Operations

The system SHALL provide complete force management operations.

#### Scenario: Create force

- **GIVEN** force configuration (name, optional parent)
- **WHEN** creating force
- **THEN** unique ID SHALL be assigned
- **AND** force SHALL be persisted to database

#### Scenario: Update force

- **GIVEN** an existing force
- **WHEN** modifying properties or assignments
- **THEN** changes SHALL be persisted
- **AND** calculated properties SHALL update

#### Scenario: Delete force

- **GIVEN** an existing force
- **WHEN** deleting force
- **THEN** force SHALL be removed from database
- **AND** child forces SHALL be orphaned or deleted (configurable)
- **AND** assignments SHALL be removed

#### Scenario: Clone force

- **GIVEN** an existing force
- **WHEN** cloning force
- **THEN** new force created with same structure
- **AND** assignments reference same pilots/mechs
- **AND** new force has unique ID and modified name

### Requirement: Force Validation

The system SHALL validate force composition.

#### Scenario: Lance composition warning

- **GIVEN** a force designated as lance
- **WHEN** validating composition
- **THEN** warn if unit count != 4 (standard lance)
- **AND** allow override (non-standard lances exist)

#### Scenario: Mixed tech base warning

- **GIVEN** a force with mixed Inner Sphere and Clan units
- **WHEN** validating composition
- **THEN** warn about mixed tech base
- **AND** allow (Mixed Tech is valid configuration)

#### Scenario: BV imbalance warning

- **GIVEN** two opposing forces for encounter
- **WHEN** comparing BV totals
- **THEN** warn if imbalance exceeds threshold (e.g., 20%)
- **AND** show imbalance percentage

### Requirement: Force Persistence

Forces SHALL be stored and retrieved from database.

#### Scenario: Save force

- **GIVEN** a configured force
- **WHEN** saving to database
- **THEN** force properties SHALL be stored
- **AND** assignments SHALL be stored
- **AND** hierarchy relationships SHALL be stored

#### Scenario: Load force

- **GIVEN** a force ID
- **WHEN** loading from database
- **THEN** all force properties SHALL be restored
- **AND** assignments SHALL include resolved pilot/mech data
- **AND** child forces SHALL be loadable

#### Scenario: Force list query

- **GIVEN** user viewing force roster
- **WHEN** querying forces
- **THEN** all user's forces SHALL be returned
- **AND** summary info (name, unit count, BV) included
- **AND** pagination supported for large rosters

### Requirement: Force Store State Management

The system SHALL provide a Zustand store for force state management in the UI.

**Source**: `src/stores/useForceStore.ts:61-74`

#### Scenario: Store initialization

- **GIVEN** application startup
- **WHEN** force store is created
- **THEN** store SHALL initialize with empty forces array
- **AND** selectedForceId SHALL be null
- **AND** isLoading SHALL be false
- **AND** error SHALL be null
- **AND** searchQuery SHALL be empty string
- **AND** validations cache SHALL be empty Map

#### Scenario: Load forces from API

- **GIVEN** force store
- **WHEN** loadForces() is called
- **THEN** store SHALL set isLoading to true
- **AND** store SHALL fetch from `/api/forces` endpoint
- **AND** store SHALL update forces array with response
- **AND** store SHALL set isLoading to false
- **AND** on error, store SHALL set error message

**Source**: `src/stores/useForceStore.ts:145-158`

#### Scenario: Get force by ID

- **GIVEN** forces loaded in store
- **WHEN** getForce(id) is called
- **THEN** store SHALL return force matching ID
- **AND** return undefined if not found

**Source**: `src/stores/useForceStore.ts:161-163`

#### Scenario: Select force

- **GIVEN** force store with loaded forces
- **WHEN** selectForce(id) is called
- **THEN** selectedForceId SHALL be set to id
- **AND** getSelectedForce() SHALL return the selected force
- **AND** selectForce(null) SHALL clear selection

**Source**: `src/stores/useForceStore.ts:247-256`

#### Scenario: Search forces

- **GIVEN** forces loaded in store
- **WHEN** setSearchQuery(query) is called
- **THEN** searchQuery SHALL be updated
- **AND** getFilteredForces() SHALL return forces matching query
- **AND** search SHALL match against name, affiliation, description (case-insensitive)

**Source**: `src/stores/useForceStore.ts:482-498`

#### Scenario: Get force summaries

- **GIVEN** forces with hierarchy
- **WHEN** getForceSummaries() is called
- **THEN** store SHALL return flattened IForceSummary array
- **AND** summaries SHALL include depth for indentation
- **AND** summaries SHALL be ordered with children after parents
- **AND** root forces (no parentId) SHALL have depth 0

**Source**: `src/stores/useForceStore.ts:501-531`

### Requirement: Force CRUD via API Routes

The system SHALL provide force CRUD operations via API routes using fetch.

**Source**: `src/stores/useForceStore.ts:25-46`

#### Scenario: Create force via store

- **GIVEN** ICreateForceRequest with name and forceType
- **WHEN** createForce(request) is called
- **THEN** store SHALL POST to `/api/forces` with request body
- **AND** store SHALL set isLoading during operation
- **AND** on success, store SHALL reload forces
- **AND** store SHALL return new force ID
- **AND** on failure, store SHALL set error and return null

**Source**: `src/stores/useForceStore.ts:166-190`

#### Scenario: Update force via store

- **GIVEN** existing force ID and IUpdateForceRequest
- **WHEN** updateForce(id, request) is called
- **THEN** store SHALL PATCH to `/api/forces/{id}` with request body
- **AND** store SHALL set isLoading during operation
- **AND** on success, store SHALL reload forces and return true
- **AND** on failure, store SHALL set error and return false

**Source**: `src/stores/useForceStore.ts:193-216`

#### Scenario: Delete force via store

- **GIVEN** existing force ID
- **WHEN** deleteForce(id) is called
- **THEN** store SHALL DELETE to `/api/forces/{id}`
- **AND** store SHALL set isLoading during operation
- **AND** if deleted force is selected, store SHALL clear selection
- **AND** on success, store SHALL reload forces and return true
- **AND** on failure, store SHALL set error and return false

**Source**: `src/stores/useForceStore.ts:219-244`

#### Scenario: Clone force via store

- **GIVEN** existing force ID and new name
- **WHEN** cloneForce(id, newName) is called
- **THEN** store SHALL POST to `/api/forces/{id}/clone` with newName
- **AND** store SHALL set isLoading during operation
- **AND** on success, store SHALL reload forces and return new force ID
- **AND** on failure, store SHALL set error and return null

**Source**: `src/stores/useForceStore.ts:459-479`

### Requirement: Force Validation via Store

The system SHALL provide force validation through the store with caching.

**Source**: `src/stores/useForceStore.ts:54-55`

#### Scenario: Validate force composition

- **GIVEN** force ID
- **WHEN** validateForce(id) is called
- **THEN** store SHALL fetch from `/api/forces/{id}/validate`
- **AND** store SHALL return IForceValidation result
- **AND** store SHALL cache validation in validations Map
- **AND** on error, store SHALL return null

**Source**: `src/stores/useForceStore.ts:441-456`

#### Scenario: Cached validation retrieval

- **GIVEN** force previously validated
- **WHEN** accessing validations Map
- **THEN** cached IForceValidation SHALL be available by force ID
- **AND** cache SHALL persist until store reset

**Source**: `src/stores/useForceStore.ts:73`

### Requirement: Assignment Operations via Store

The system SHALL provide assignment operations through the store.

**Source**: `src/stores/useForceStore.ts:48-51`

#### Scenario: Assign pilot to slot

- **GIVEN** assignment ID and pilot ID
- **WHEN** assignPilot(assignmentId, pilotId) is called
- **THEN** store SHALL PUT to `/api/forces/assignments/{assignmentId}/pilot`
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:259-285`

#### Scenario: Assign unit to slot

- **GIVEN** assignment ID and unit ID
- **WHEN** assignUnit(assignmentId, unitId) is called
- **THEN** store SHALL PUT to `/api/forces/assignments/{assignmentId}/unit`
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:287-310`

#### Scenario: Assign both pilot and unit

- **GIVEN** assignment ID, pilot ID, and unit ID
- **WHEN** assignPilotAndUnit(assignmentId, pilotId, unitId) is called
- **THEN** store SHALL PUT to `/api/forces/assignments/{assignmentId}` with both IDs
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:312-336`

#### Scenario: Clear assignment

- **GIVEN** assignment ID
- **WHEN** clearAssignment(assignmentId) is called
- **THEN** store SHALL DELETE to `/api/forces/assignments/{assignmentId}`
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:338-359`

#### Scenario: Swap two assignments

- **GIVEN** two assignment IDs
- **WHEN** swapAssignments(assignmentId1, assignmentId2) is called
- **THEN** store SHALL POST to `/api/forces/assignments/swap` with both IDs
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:361-384`

#### Scenario: Set assignment position

- **GIVEN** assignment ID and ForcePosition
- **WHEN** setAssignmentPosition(assignmentId, position) is called
- **THEN** store SHALL PUT to `/api/forces/assignments/{assignmentId}/position`
- **AND** position SHALL be one of: Commander, Executive, Lead, Member, Scout, FireSupport
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:386-415`

#### Scenario: Promote assignment to lead

- **GIVEN** assignment ID
- **WHEN** promoteToLead(assignmentId) is called
- **THEN** store SHALL POST to `/api/forces/assignments/{assignmentId}/promote`
- **AND** store SHALL reload forces on success
- **AND** store SHALL return true on success, false on failure

**Source**: `src/stores/useForceStore.ts:417-438`

## Data Model Requirements

### IForce

**Source**: `src/types/force/ForceInterfaces.ts:138-161`

```typescript
interface IForce extends IEntity {
  readonly name: string;
  readonly forceType: ForceType;
  readonly status: ForceStatus;
  readonly affiliation?: string;
  readonly parentId?: string;
  readonly childIds: readonly string[];
  readonly assignments: readonly IAssignment[];
  readonly stats: IForceStats;
  readonly description?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### IForceSummary

**Source**: `src/types/force/ForceInterfaces.ts:201-210`

```typescript
interface IForceSummary {
  readonly id: string;
  readonly name: string;
  readonly forceType: ForceType;
  readonly status: ForceStatus;
  readonly affiliation?: string;
  readonly stats: IForceStats;
  readonly depth: number; // Hierarchy depth for indentation
  readonly parentId?: string;
}
```

### IForceValidation

**Source**: `src/types/force/ForceInterfaces.ts:219-237`

```typescript
interface IForceValidation {
  readonly isValid: boolean;
  readonly errors: readonly IForceValidationError[];
  readonly warnings: readonly IForceValidationWarning[];
}

interface IForceValidationError {
  readonly code: string;
  readonly message: string;
  readonly slot?: number;
  readonly assignmentId?: string;
}

interface IForceValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly slot?: number;
  readonly assignmentId?: string;
}
```

### ICreateForceRequest

**Source**: `src/types/force/ForceInterfaces.ts:166-172`

```typescript
interface ICreateForceRequest {
  readonly name: string;
  readonly forceType: ForceType;
  readonly affiliation?: string;
  readonly parentId?: string;
  readonly description?: string;
}
```

### IUpdateForceRequest

**Source**: `src/types/force/ForceInterfaces.ts:177-184`

```typescript
interface IUpdateForceRequest {
  readonly name?: string;
  readonly forceType?: ForceType;
  readonly status?: ForceStatus;
  readonly affiliation?: string;
  readonly parentId?: string | null;
  readonly description?: string;
}
```

### ForcePosition

**Source**: `src/types/force/ForceInterfaces.ts:41-54`

```typescript
enum ForcePosition {
  Commander = 'commander',
  Executive = 'executive',
  Lead = 'lead',
  Member = 'member',
  Scout = 'scout',
  FireSupport = 'fire_support',
}
```

### ListForcesResponse

**Source**: `src/stores/useForceStore.ts:25-28`

```typescript
interface ListForcesResponse {
  forces: IForce[];
  count: number;
}
```

### CreateForceResponse

**Source**: `src/stores/useForceStore.ts:30-35`

```typescript
interface CreateForceResponse {
  success: boolean;
  id?: string;
  force?: IForce;
  error?: string;
}
```

## API Route Patterns

The force store uses the following API route patterns:

| Operation               | Method | Endpoint                                          | Request Body                                       | Response Type         |
| ----------------------- | ------ | ------------------------------------------------- | -------------------------------------------------- | --------------------- |
| List forces             | GET    | `/api/forces`                                     | -                                                  | ListForcesResponse    |
| Create force            | POST   | `/api/forces`                                     | ICreateForceRequest                                | CreateForceResponse   |
| Update force            | PATCH  | `/api/forces/{id}`                                | IUpdateForceRequest                                | UpdateForceResponse   |
| Delete force            | DELETE | `/api/forces/{id}`                                | -                                                  | DeleteForceResponse   |
| Clone force             | POST   | `/api/forces/{id}/clone`                          | `{ newName: string }`                              | CreateForceResponse   |
| Validate force          | GET    | `/api/forces/{id}/validate`                       | -                                                  | ValidateForceResponse |
| Assign pilot            | PUT    | `/api/forces/assignments/{assignmentId}/pilot`    | `{ pilotId: string }`                              | AssignmentResponse    |
| Assign unit             | PUT    | `/api/forces/assignments/{assignmentId}/unit`     | `{ unitId: string }`                               | AssignmentResponse    |
| Assign pilot and unit   | PUT    | `/api/forces/assignments/{assignmentId}`          | `{ pilotId: string, unitId: string }`              | AssignmentResponse    |
| Clear assignment        | DELETE | `/api/forces/assignments/{assignmentId}`          | -                                                  | AssignmentResponse    |
| Swap assignments        | POST   | `/api/forces/assignments/swap`                    | `{ assignmentId1: string, assignmentId2: string }` | AssignmentResponse    |
| Set assignment position | PUT    | `/api/forces/assignments/{assignmentId}/position` | `{ position: ForcePosition }`                      | AssignmentResponse    |
| Promote to lead         | POST   | `/api/forces/assignments/{assignmentId}/promote`  | -                                                  | AssignmentResponse    |

**Source**: `src/stores/useForceStore.ts:145-438`

## Non-Goals

- Direct database access from the store (uses API routes to avoid bundling SQLite in browser)
- Real-time synchronization (uses explicit reload after mutations)
- Optimistic updates (waits for API confirmation before updating state)
- Assignment validation in store (delegated to API routes)
