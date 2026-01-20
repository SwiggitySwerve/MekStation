# Tasks: Repair System

## 1. Data Model

- [x] 1.1 Define `IRepairJob` interface (unitId, repairs, cost, time)
- [x] 1.2 Define `IRepairItem` interface (type, location, amount, cost)
- [x] 1.3 Define `IRepairBay` interface (capacity, queue, efficiency)
- [x] 1.4 Define repair cost formulas (per armor point, per structure, etc.)
- [x] 1.5 Add repair state fields to campaign unit tracking

## 2. Damage Assessment

- [x] 2.1 Create damage assessment service
- [x] 2.2 Calculate armor damage per location
- [x] 2.3 Calculate structure damage per location
- [x] 2.4 Identify destroyed components
- [x] 2.5 Generate repair cost estimate
- [x] 2.6 Generate repair time estimate

## 3. Repair Service

- [x] 3.1 Create `RepairService` class (implemented as Zustand store)
- [x] 3.2 Implement armor repair logic
- [x] 3.3 Implement structure repair logic
- [x] 3.4 Implement component repair logic
- [x] 3.5 Implement component replacement logic
- [x] 3.6 Handle resource deduction from campaign

## 4. Repair Queue

- [x] 4.1 Implement repair queue management
- [x] 4.2 Add priority ordering
- [x] 4.3 Implement partial repair (do what you can afford)
- [x] 4.4 Add time simulation (repairs complete over missions)
- [x] 4.5 Handle queue persistence

## 5. Field Repairs

- [x] 5.1 Define field repair rules (limited scope, reduced cost)
- [x] 5.2 Implement between-mission field repair
- [x] 5.3 Add field repair option in mission debrief (store action available)
- [x] 5.4 Track field repair limitations

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

- [x] 8.1 Define salvage rules (recover from destroyed enemies)
- [x] 8.2 Implement salvage roll/selection (salvage inventory management)
- [x] 8.3 Add salvaged parts to inventory
- [x] 8.4 Use salvage for component replacement

## 9. Testing

- [x] 9.1 Unit tests for damage assessment
- [x] 9.2 Unit tests for repair cost calculation
- [x] 9.3 Unit tests for repair application
- [ ] 9.4 Integration tests with campaign flow
