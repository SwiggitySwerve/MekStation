# Tasks: Repair System

## 1. Data Model

- [ ] 1.1 Define `IRepairJob` interface (unitId, repairs, cost, time)
- [ ] 1.2 Define `IRepairItem` interface (type, location, amount, cost)
- [ ] 1.3 Define `IRepairBay` interface (capacity, queue, efficiency)
- [ ] 1.4 Define repair cost formulas (per armor point, per structure, etc.)
- [ ] 1.5 Add repair state fields to campaign unit tracking

## 2. Damage Assessment

- [ ] 2.1 Create damage assessment service
- [ ] 2.2 Calculate armor damage per location
- [ ] 2.3 Calculate structure damage per location
- [ ] 2.4 Identify destroyed components
- [ ] 2.5 Generate repair cost estimate
- [ ] 2.6 Generate repair time estimate

## 3. Repair Service

- [ ] 3.1 Create `RepairService` class
- [ ] 3.2 Implement armor repair logic
- [ ] 3.3 Implement structure repair logic
- [ ] 3.4 Implement component repair logic
- [ ] 3.5 Implement component replacement logic
- [ ] 3.6 Handle resource deduction from campaign

## 4. Repair Queue

- [ ] 4.1 Implement repair queue management
- [ ] 4.2 Add priority ordering
- [ ] 4.3 Implement partial repair (do what you can afford)
- [ ] 4.4 Add time simulation (repairs complete over missions)
- [ ] 4.5 Handle queue persistence

## 5. Field Repairs

- [ ] 5.1 Define field repair rules (limited scope, reduced cost)
- [ ] 5.2 Implement between-mission field repair
- [ ] 5.3 Add field repair option in mission debrief
- [ ] 5.4 Track field repair limitations

## 6. UI - Repair Bay

- [ ] 6.1 Create `RepairBayPage` main view
- [ ] 6.2 Create `DamageAssessmentPanel` for unit
- [ ] 6.3 Create `RepairQueue` component
- [ ] 6.4 Create `RepairCostBreakdown` component
- [ ] 6.5 Add repair/skip controls

## 7. UI - Campaign Integration

- [ ] 7.1 Add repair status to campaign roster view
- [ ] 7.2 Show units needing repair between missions
- [ ] 7.3 Add "Repair All" quick action
- [ ] 7.4 Show resource impact of repairs

## 8. Salvage Integration

- [ ] 8.1 Define salvage rules (recover from destroyed enemies)
- [ ] 8.2 Implement salvage roll/selection
- [ ] 8.3 Add salvaged parts to inventory
- [ ] 8.4 Use salvage for component replacement

## 9. Testing

- [ ] 9.1 Unit tests for damage assessment
- [ ] 9.2 Unit tests for repair cost calculation
- [ ] 9.3 Unit tests for repair application
- [ ] 9.4 Integration tests with campaign flow
