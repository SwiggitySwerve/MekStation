# Repair System Specification

**Status**: Active
**Version**: 1.1
**Last Updated**: 2026-02-13
**Dependencies**: campaign-management, unit-entity-model, equipment-database
**Affects**: campaign-ui, after-combat-report

---

## Overview

### Purpose

The Repair System manages post-battle damage assessment, repair job creation, repair bay operations, and salvage inventory for campaign units. It provides a Zustand store for repair state management with localStorage persistence, calculation functions for repair costs and time, and utilities for field repairs and salvage matching.

### Scope

**In Scope:**

- Damage assessment from battle results
- Repair job lifecycle (create → validate → execute → complete)
- Repair bay capacity and efficiency management
- Repair cost and time calculations
- Field repair mechanics (limited armor restoration)
- Salvage inventory and part matching
- Repair job validation and prioritization

**Out of Scope:**

- Battle damage application (handled by combat-resolution)
- Tech personnel skill system (handled by personnel-management)
- Part quality system (handled by campaign-finances)
- Repair UI components (handled by campaign-ui)
- Database persistence (uses localStorage via Zustand)

### Key Concepts

- **Damage Assessment**: Complete damage report for a unit including armor, structure, and component damage by location
- **Repair Job**: A collection of repair items (armor, structure, component repairs) for a single unit
- **Repair Bay**: Campaign facility with capacity and efficiency that processes repair jobs
- **Field Repair**: Limited armor restoration between missions using supplies instead of C-Bills
- **Salvage**: Recovered components from destroyed units that can offset repair costs

---

## Purpose

TBD - created by archiving change add-repair-system. Update Purpose after archive.

## Requirements

### Requirement: Damage Assessment

The system SHALL assess damage to units after battles.

#### Scenario: View damage report

- **GIVEN** a unit took damage in a mission
- **WHEN** viewing the repair bay
- **THEN** a damage report shows all damage by location
- **AND** armor, structure, and component damage are itemized
- **AND** estimated repair costs are displayed

#### Scenario: Destroyed components listed

- **GIVEN** a unit has destroyed components
- **WHEN** viewing the damage assessment
- **THEN** destroyed components are highlighted
- **AND** replacement cost is shown separately
- **AND** availability is indicated

### Requirement: Repair Execution

The system SHALL allow players to repair damaged units.

#### Scenario: Full repair

- **GIVEN** a damaged unit and sufficient resources
- **WHEN** the player selects "Full Repair"
- **THEN** all damage is repaired
- **AND** resources are deducted
- **AND** the unit returns to full operational status

#### Scenario: Partial repair

- **GIVEN** a damaged unit and limited resources
- **WHEN** the player selects specific repairs
- **THEN** only selected repairs are performed
- **AND** remaining damage persists
- **AND** only the partial cost is deducted

#### Scenario: Insufficient resources

- **GIVEN** repair cost exceeds available resources
- **WHEN** attempting full repair
- **THEN** the repair is blocked
- **AND** a message shows resource shortage
- **AND** partial repair is suggested

### Requirement: Repair Costs

The system SHALL calculate repair costs based on damage.

#### Scenario: Armor repair cost

- **GIVEN** armor damage
- **WHEN** calculating repair cost
- **THEN** cost is based on armor points × per-point rate
- **AND** rate varies by armor type

#### Scenario: Structure repair cost

- **GIVEN** internal structure damage
- **WHEN** calculating repair cost
- **THEN** cost is higher than armor (structure is more expensive)
- **AND** severe damage costs more per point

#### Scenario: Component replacement cost

- **GIVEN** a destroyed component
- **WHEN** calculating replacement cost
- **THEN** cost equals component value
- **AND** rare components cost more
- **AND** salvage can reduce cost

### Requirement: Repair Queue

The system SHALL manage a queue of pending repairs.

#### Scenario: Add to queue

- **GIVEN** multiple damaged units
- **WHEN** the player queues repairs
- **THEN** repairs are added to the queue
- **AND** queue order determines priority

#### Scenario: Queue progression

- **GIVEN** a repair queue with items
- **WHEN** time passes (missions complete)
- **THEN** queued repairs progress
- **AND** completed repairs restore units

#### Scenario: Prioritize repairs

- **GIVEN** multiple units in queue
- **WHEN** the player reorders the queue
- **THEN** priority changes
- **AND** higher priority units repair first

### Requirement: Field Repairs

The system SHALL allow limited field repairs between missions.

#### Scenario: Apply field repair

- **GIVEN** a damaged unit after a mission
- **WHEN** the player applies field repair
- **THEN** partial armor is restored
- **AND** no C-Bills are spent
- **AND** structural damage remains

#### Scenario: Field repair limitations

- **GIVEN** severe damage (destroyed components)
- **WHEN** attempting field repair
- **THEN** only armor can be partially restored
- **AND** structure and components require the repair bay

### Requirement: Salvage for Repairs

The system SHALL allow salvage to offset repair costs.

#### Scenario: Use salvaged parts

- **GIVEN** salvaged components in inventory
- **WHEN** a matching component needs replacement
- **THEN** salvage can be used instead of purchase
- **AND** no C-Bill cost for that component

#### Scenario: Salvage availability

- **GIVEN** a destroyed component
- **WHEN** viewing replacement options
- **THEN** salvage inventory is checked
- **AND** matching parts are offered as options

---

## Repair Store Architecture

### Requirement: Repair Store State Management

The system SHALL provide a Zustand store (`useRepairStore`) for managing repair state across campaigns with localStorage persistence.

**Source**: `src/stores/useRepairStore.ts:37-163`

**Rationale**: Centralized state management for repair jobs, repair bays, and salvage inventory with automatic persistence ensures data survives page refreshes and provides a single source of truth for repair operations.

**Priority**: Critical

#### Scenario: Initialize campaign repair data

**GIVEN** a new campaign is created
**WHEN** the first repair operation is attempted
**THEN** the store initializes empty repair data for that campaign
**AND** a default repair bay is created with capacity 2 and efficiency 1.0
**AND** an empty salvage inventory is created

#### Scenario: Persist repair state to localStorage

**GIVEN** repair jobs, bay config, and salvage inventory exist
**WHEN** the store state changes
**THEN** the state is automatically persisted to localStorage under key 'mekstation-repairs'
**AND** only jobsByCampaign, baysByCampaign, and salvageByCampaign are persisted
**AND** UI state (selectedJobId, isLoading, error) is excluded from persistence

#### Scenario: Restore repair state on load

**GIVEN** persisted repair state exists in localStorage
**WHEN** the application loads
**THEN** the store hydrates from localStorage
**AND** all repair jobs, bay configs, and salvage inventories are restored
**AND** UI state is reset to defaults

### Requirement: Repair Job Lifecycle Management

The system SHALL manage the complete lifecycle of repair jobs from creation through completion.

**Source**: `src/stores/useRepairStore.ts:220-422`

**Rationale**: Repair jobs progress through distinct states (Pending → InProgress → Completed) with validation at each transition to ensure resource availability and bay capacity constraints.

**Priority**: Critical

#### Scenario: Create repair job from damage assessment

**GIVEN** a unit with damage assessment and available armor/structure types
**WHEN** `createRepairJob(campaignId, assessment, armorType, structureType)` is called
**THEN** repair items are generated for all armor, structure, and component damage
**AND** a new repair job is created with status Pending
**AND** total cost and time are calculated from selected items
**AND** priority is set to max existing priority + 1
**AND** the job ID is returned

#### Scenario: Start repair job

**GIVEN** a repair job with status Pending and repair bay with available capacity
**WHEN** `startJob(campaignId, jobId)` is called
**THEN** the job status changes to InProgress
**AND** startedAt timestamp is set
**AND** the job is added to bay.activeJobs
**AND** the job is removed from bay.queuedJobs
**AND** true is returned

#### Scenario: Start job fails when bay at capacity

**GIVEN** a repair bay with activeJobs.length >= capacity
**WHEN** `startJob(campaignId, jobId)` is called
**THEN** the operation fails with error "Repair bay at capacity"
**AND** the job status remains Pending
**AND** false is returned

#### Scenario: Complete repair job

**GIVEN** a repair job with status InProgress
**WHEN** `completeJob(campaignId, jobId)` is called
**THEN** the job status changes to Completed
**AND** completedAt timestamp is set
**AND** timeRemainingHours is set to 0
**AND** the job is removed from bay.activeJobs
**AND** true is returned

#### Scenario: Cancel repair job

**GIVEN** a repair job with status Pending or InProgress
**WHEN** `cancelJob(campaignId, jobId)` is called
**THEN** the job status changes to Cancelled
**AND** the job is removed from bay.activeJobs and bay.queuedJobs
**AND** true is returned

### Requirement: Repair Bay Time Advancement

The system SHALL advance repair progress when time passes in the campaign.

**Source**: `src/stores/useRepairStore.ts:505-554`

**Rationale**: Repair jobs take time to complete. As campaign time advances (missions complete, days pass), active repair jobs progress toward completion based on bay efficiency.

**Priority**: High

#### Scenario: Advance repairs with time passage

**GIVEN** active repair jobs with timeRemainingHours > 0 and bay efficiency 1.0
**WHEN** `advanceRepairs(campaignId, hoursElapsed)` is called with hoursElapsed = 10
**THEN** each active job's timeRemainingHours is reduced by (hoursElapsed × efficiency)
**AND** jobs with timeRemainingHours reaching 0 are marked Completed
**AND** completed job IDs are returned
**AND** completed jobs are removed from bay.activeJobs

#### Scenario: Bay efficiency affects repair speed

**GIVEN** an active repair job with timeRemainingHours = 20 and bay efficiency 0.5
**WHEN** `advanceRepairs(campaignId, 10)` is called
**THEN** the job's timeRemainingHours is reduced by (10 × 0.5) = 5 hours
**AND** the job remains InProgress with timeRemainingHours = 15

### Requirement: Repair Item Selection

The system SHALL allow selective repair of individual items within a repair job.

**Source**: `src/stores/useRepairStore.ts:325-359`

**Rationale**: Players may not have resources to repair everything at once. Selective repair allows prioritizing critical repairs (structure, weapons) over cosmetic repairs (armor).

**Priority**: High

#### Scenario: Toggle repair item selection

**GIVEN** a repair job with an item where selected = true
**WHEN** `toggleRepairItem(campaignId, jobId, itemId)` is called
**THEN** the item's selected property is set to false
**AND** the job's totalCost and totalTimeHours are recalculated excluding the item
**AND** true is returned

#### Scenario: Select all repair items

**GIVEN** a repair job with some items where selected = false
**WHEN** `selectAllItems(campaignId, jobId)` is called
**THEN** all items have selected = true
**AND** totalCost and totalTimeHours include all items
**AND** true is returned

#### Scenario: Deselect all repair items

**GIVEN** a repair job with all items selected
**WHEN** `deselectAllItems(campaignId, jobId)` is called
**THEN** all items have selected = false
**AND** totalCost and totalTimeHours are 0
**AND** true is returned

### Requirement: Salvage Inventory Management

The system SHALL manage salvaged parts inventory and allow using salvage to offset repair costs.

**Source**: `src/stores/useRepairStore.ts:565-645`

**Rationale**: Salvaged components from destroyed enemy units can be used to replace destroyed components, reducing repair costs. Salvage has condition and quality ratings that affect usability.

**Priority**: Medium

#### Scenario: Add salvage to inventory

**GIVEN** salvaged parts from a completed mission
**WHEN** `addSalvage(campaignId, parts)` is called
**THEN** the parts are added to salvageByCampaign[campaignId].parts
**AND** totalValue is recalculated as sum of all part estimatedValues
**AND** true is returned

#### Scenario: Use salvage for component replacement

**GIVEN** a repair job with a ComponentReplace item and matching salvage part
**WHEN** `useSalvageForRepair(campaignId, jobId, itemId, partId)` is called
**THEN** the repair item's cost is set to 0
**AND** the salvage part is removed from inventory
**AND** totalValue is recalculated
**AND** true is returned

#### Scenario: Salvage matching validation

**GIVEN** a repair item for "Medium Laser" and salvage part "ER Medium Laser"
**WHEN** `useSalvageForRepair(campaignId, jobId, itemId, partId)` is called
**THEN** the operation fails with error "Salvage part does not match repair item"
**AND** false is returned

### Requirement: Repair Job Validation

The system SHALL validate repair jobs against available resources before execution.

**Source**: `src/stores/useRepairStore.ts:647-666`

**Rationale**: Prevent starting repairs that cannot be completed due to insufficient C-Bills or supplies. Provide clear feedback on resource shortfalls.

**Priority**: High

#### Scenario: Validate affordable repair job

**GIVEN** a repair job with totalCost = 50000 and availableCBills = 100000
**WHEN** `validateJob(campaignId, jobId, 100000, 1000)` is called
**THEN** the result has valid = true
**AND** canAfford = true
**AND** shortfall = 0
**AND** errors array is empty

#### Scenario: Validate unaffordable repair job

**GIVEN** a repair job with totalCost = 50000 and availableCBills = 30000
**WHEN** `validateJob(campaignId, jobId, 30000, 1000)` is called
**THEN** the result has valid = false
**AND** canAfford = false
**AND** shortfall = 20000
**AND** errors includes "Insufficient C-Bills: need 50000, have 30000"

#### Scenario: Validate job with no selected items

**GIVEN** a repair job where all items have selected = false
**WHEN** `validateJob(campaignId, jobId, 100000, 1000)` is called
**THEN** the result has valid = false
**AND** errors includes "No repair items are selected"

### Requirement: Field Repair Execution

The system SHALL allow limited field repairs using supplies instead of C-Bills.

**Source**: `src/stores/useRepairStore.ts:556-563`

**Rationale**: Between missions, field repairs can restore up to 25% of armor per location using supplies. This provides emergency repairs without returning to base.

**Priority**: Medium

#### Scenario: Apply field repair with sufficient supplies

**GIVEN** a unit with 40 armor damage (max 100) and availableSupplies = 50
**WHEN** `applyFieldRepair(campaignId, assessment, 50)` is called
**THEN** up to 25 armor points are restored (25% of 100 max)
**AND** suppliesUsed = 25 × 0.5 = 12.5 (rounded to 13)
**AND** wasLimited = false

#### Scenario: Apply field repair with limited supplies

**GIVEN** a unit with 40 armor damage and availableSupplies = 5
**WHEN** `applyFieldRepair(campaignId, assessment, 5)` is called
**THEN** only 10 armor points are restored (5 supplies / 0.5 per point)
**AND** suppliesUsed = 5
**AND** wasLimited = true

---

## Calculation Functions

### Requirement: Repair Cost Calculation

The system SHALL calculate repair costs based on damage type, armor/structure type, and damage severity.

**Source**: `src/types/repair/RepairInterfaces.ts:318-345`

**Rationale**: Different damage types have different repair costs. Armor is cheaper than structure. Advanced armor/structure types cost more to repair. Critical damage (>50% location damage) costs 1.5× more.

**Priority**: Critical

#### Scenario: Calculate armor repair cost

**GIVEN** 10 armor points to restore and armorType = 'standard'
**WHEN** `calculateArmorRepairCost(10, 'standard')` is called
**THEN** the cost is 10 × 100 × 1.0 = 1000 C-Bills

#### Scenario: Calculate ferro-fibrous armor repair cost

**GIVEN** 10 armor points to restore and armorType = 'ferro-fibrous'
**WHEN** `calculateArmorRepairCost(10, 'ferro-fibrous')` is called
**THEN** the cost is 10 × 100 × 1.5 = 1500 C-Bills

#### Scenario: Calculate structure repair cost

**GIVEN** 5 structure points to restore, structureType = 'standard', isCritical = false
**WHEN** `calculateStructureRepairCost(5, 'standard', false)` is called
**THEN** the cost is 5 × 500 × 1.0 × 1.0 = 2500 C-Bills

#### Scenario: Calculate critical structure repair cost

**GIVEN** 5 structure points to restore, structureType = 'standard', isCritical = true
**WHEN** `calculateStructureRepairCost(5, 'standard', true)` is called
**THEN** the cost is 5 × 500 × 1.0 × 1.5 = 3750 C-Bills

### Requirement: Repair Time Calculation

The system SHALL calculate repair time based on damage type and quantity.

**Source**: `src/types/repair/RepairInterfaces.ts:349-359`

**Rationale**: Armor repairs are fast (1 hour per 10 points). Structure repairs are slow (2 hours per point). Component replacements take 4 hours each.

**Priority**: High

#### Scenario: Calculate armor repair time

**GIVEN** 25 armor points to restore
**WHEN** `calculateArmorRepairTime(25)` is called
**THEN** the time is ceil(25 / 10) × 1 = 3 hours

#### Scenario: Calculate structure repair time

**GIVEN** 5 structure points to restore
**WHEN** `calculateStructureRepairTime(5)` is called
**THEN** the time is 5 × 2 = 10 hours

### Requirement: Total Repair Job Calculations

The system SHALL calculate total cost and time for a repair job based on selected items.

**Source**: `src/types/repair/RepairInterfaces.ts:362-381`

**Rationale**: Only selected items contribute to total cost and time. This allows players to defer non-critical repairs.

**Priority**: High

#### Scenario: Calculate total cost with all items selected

**GIVEN** a repair job with 3 items (costs: 1000, 2500, 10000) all selected
**WHEN** `calculateTotalRepairCost(items)` is called
**THEN** the total is 1000 + 2500 + 10000 = 13500 C-Bills

#### Scenario: Calculate total cost with partial selection

**GIVEN** a repair job with 3 items (costs: 1000, 2500, 10000) where only first 2 are selected
**WHEN** `calculateTotalRepairCost(items)` is called
**THEN** the total is 1000 + 2500 = 3500 C-Bills

#### Scenario: Calculate total time

**GIVEN** a repair job with 3 items (times: 3, 10, 4 hours) all selected
**WHEN** `calculateTotalRepairTime(items)` is called
**THEN** the total is 3 + 10 + 4 = 17 hours

### Requirement: Field Repair Calculation

The system SHALL calculate field repair results based on damage assessment and available supplies.

**Source**: `src/types/repair/RepairInterfaces.ts:385-432`

**Rationale**: Field repairs restore up to 25% of max armor per location, limited by available supplies. Supplies are consumed at 0.5 per armor point.

**Priority**: Medium

#### Scenario: Field repair with sufficient supplies

**GIVEN** a location with armorDamage = 30, armorMax = 100, and availableSupplies = 50
**WHEN** `calculateFieldRepair(assessment, 50)` is called
**THEN** 25 armor points are restored (25% of 100 max)
**AND** suppliesUsed = 25 × 0.5 = 12.5 (rounded to 13)
**AND** wasLimited = false

#### Scenario: Field repair limited by supplies

**GIVEN** a location with armorDamage = 30, armorMax = 100, and availableSupplies = 5
**WHEN** `calculateFieldRepair(assessment, 5)` is called
**THEN** 10 armor points are restored (5 / 0.5)
**AND** suppliesUsed = 5
**AND** wasLimited = true

#### Scenario: Field repair respects 25% cap

**GIVEN** a location with armorDamage = 50, armorMax = 100, and availableSupplies = 100
**WHEN** `calculateFieldRepair(assessment, 100)` is called
**THEN** only 25 armor points are restored (25% cap)
**AND** suppliesUsed = 13
**AND** wasLimited = false

### Requirement: Repair Job Priority Sorting

The system SHALL sort repair jobs by priority and creation date.

**Source**: `src/types/repair/RepairInterfaces.ts:729-739`

**Rationale**: Lower priority numbers indicate higher priority. When priorities are equal, older jobs are processed first.

**Priority**: Medium

#### Scenario: Sort jobs by priority

**GIVEN** jobs with priorities [3, 1, 2]
**WHEN** `sortJobsByPriority(jobs)` is called
**THEN** the jobs are returned in order [1, 2, 3]

#### Scenario: Sort jobs by creation date when priorities equal

**GIVEN** jobs with priority 1 created at [2026-02-13T10:00, 2026-02-13T09:00, 2026-02-13T11:00]
**WHEN** `sortJobsByPriority(jobs)` is called
**THEN** the jobs are returned in order [09:00, 10:00, 11:00]

### Requirement: Salvage Matching

The system SHALL match salvage parts to repair items by component name and condition.

**Source**: `src/types/repair/RepairInterfaces.ts:711-725`

**Rationale**: Salvage can only be used for component replacements (not armor/structure). Component names must match exactly (case-insensitive). Salvage must be at least 50% condition.

**Priority**: Medium

#### Scenario: Find matching salvage

**GIVEN** a repair item for "Medium Laser" and salvage part "Medium Laser" with condition 0.8
**WHEN** `findMatchingSalvage(item, inventory)` is called
**THEN** the salvage part is returned

#### Scenario: Reject low-condition salvage

**GIVEN** a repair item for "Medium Laser" and salvage part "Medium Laser" with condition 0.4
**WHEN** `findMatchingSalvage(item, inventory)` is called
**THEN** undefined is returned (condition < 0.5)

#### Scenario: No salvage for armor repairs

**GIVEN** a repair item with type = RepairType.Armor
**WHEN** `findMatchingSalvage(item, inventory)` is called
**THEN** undefined is returned (salvage only for components)

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Repair job status enum.
 */
enum RepairJobStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Blocked = 'blocked',
}

/**
 * A complete repair job for a unit.
 * @source src/types/repair/RepairInterfaces.ts:195-228
 */
interface IRepairJob {
  readonly id: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly campaignId: string;
  readonly status: RepairJobStatus;
  readonly items: readonly IRepairItem[];
  readonly totalCost: number;
  readonly totalTimeHours: number;
  readonly timeRemainingHours: number;
  readonly priority: number;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly assignedTechId?: string;
  readonly unitQuality?: PartQuality;
}

/**
 * A single repair item (one type of repair for one location).
 * @source src/types/repair/RepairInterfaces.ts:173-192
 */
interface IRepairItem {
  readonly id: string;
  readonly type: RepairType;
  readonly location: UnitLocation;
  readonly pointsToRestore?: number;
  readonly componentName?: string;
  readonly cost: number;
  readonly timeHours: number;
  readonly selected: boolean;
}

/**
 * Repair bay configuration.
 * @source src/types/repair/RepairInterfaces.ts:234-246
 */
interface IRepairBay {
  readonly capacity: number;
  readonly efficiency: number;
  readonly activeJobs: readonly string[];
  readonly queuedJobs: readonly string[];
}

/**
 * Default repair bay for campaigns.
 * @source src/types/repair/RepairInterfaces.ts:251-256
 */
const DEFAULT_REPAIR_BAY: IRepairBay = {
  capacity: 2,
  efficiency: 1.0,
  activeJobs: [],
  queuedJobs: [],
};

/**
 * Complete damage assessment for a unit.
 * @source src/types/repair/RepairInterfaces.ts:141-166
 */
interface IDamageAssessment {
  readonly unitId: string;
  readonly unitName: string;
  readonly locationDamage: readonly ILocationDamage[];
  readonly totalArmorDamage: number;
  readonly totalArmorMax: number;
  readonly totalStructureDamage: number;
  readonly totalStructureMax: number;
  readonly allDestroyedComponents: readonly string[];
  readonly allDamagedComponents: readonly string[];
  readonly operationalPercent: number;
  readonly isDestroyed: boolean;
}

/**
 * Campaign salvage inventory.
 * @source src/types/repair/RepairInterfaces.ts:303-310
 */
interface ISalvageInventory {
  readonly parts: readonly ISalvagedPart[];
  readonly totalValue: number;
}

/**
 * A salvaged part.
 * @source src/types/repair/RepairInterfaces.ts:283-300
 */
interface ISalvagedPart {
  readonly id: string;
  readonly componentName: string;
  readonly sourceUnitName: string;
  readonly missionId: string;
  readonly condition: number;
  readonly estimatedValue: number;
  readonly quality?: PartQuality;
}

/**
 * Field repair result.
 * @source src/types/repair/RepairInterfaces.ts:263-276
 */
interface IFieldRepairResult {
  readonly unitId: string;
  readonly armorRestored: Record<string, number>;
  readonly totalArmorRestored: number;
  readonly suppliesUsed: number;
  readonly wasLimited: boolean;
}

/**
 * Repair job validation result.
 * @source src/types/repair/RepairInterfaces.ts:591-599
 */
interface IRepairJobValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canAfford: boolean;
  readonly shortfall: number;
}
```

### Required Constants

| Constant                                       | Type   | Value | Description                              |
| ---------------------------------------------- | ------ | ----- | ---------------------------------------- |
| `REPAIR_COSTS.ARMOR_PER_POINT`                 | number | 100   | C-Bills per armor point                  |
| `REPAIR_COSTS.STRUCTURE_PER_POINT`             | number | 500   | C-Bills per structure point              |
| `REPAIR_COSTS.CRITICAL_DAMAGE_MULTIPLIER`      | number | 1.5   | Multiplier for >50% location damage      |
| `REPAIR_COSTS.ARMOR_TIME_PER_10`               | number | 1     | Hours per 10 armor points                |
| `REPAIR_COSTS.STRUCTURE_TIME_PER_POINT`        | number | 2     | Hours per structure point                |
| `REPAIR_COSTS.FIELD_REPAIR_ARMOR_PERCENT`      | number | 0.25  | Max armor restored by field repair (25%) |
| `REPAIR_COSTS.FIELD_REPAIR_SUPPLIES_PER_POINT` | number | 0.5   | Supplies per armor point                 |

### Required Functions

| Function                   | Parameters                              | Returns                    | Description                                  |
| -------------------------- | --------------------------------------- | -------------------------- | -------------------------------------------- |
| `generateRepairItems`      | assessment, armorType?, structureType?  | IRepairItem[]              | Generate repair items from damage assessment |
| `calculateTotalRepairCost` | items                                   | number                     | Sum cost of selected items                   |
| `calculateTotalRepairTime` | items                                   | number                     | Sum time of selected items                   |
| `calculateFieldRepair`     | assessment, availableSupplies           | IFieldRepairResult         | Calculate field repair results               |
| `validateRepairJob`        | job, availableCBills, availableSupplies | IRepairJobValidationResult | Validate job against resources               |
| `sortJobsByPriority`       | jobs                                    | IRepairJob[]               | Sort by priority then creation date          |
| `findMatchingSalvage`      | item, inventory                         | ISalvagedPart \| undefined | Find salvage matching repair item            |

---

## Non-Goals

This specification does NOT cover:

- **Battle damage application**: Handled by combat-resolution spec
- **Tech personnel skill system**: Handled by personnel-management spec
- **Part quality system**: Handled by campaign-finances spec
- **Repair UI components**: Handled by campaign-ui spec
- **Database persistence**: Uses localStorage via Zustand persist middleware
- **Repair animations**: Visual effects are UI concerns
- **Repair mini-games**: Gameplay mechanics beyond cost/time calculations

---
