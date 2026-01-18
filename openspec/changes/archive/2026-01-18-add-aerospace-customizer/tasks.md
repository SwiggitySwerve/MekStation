# Tasks: Aerospace Customizer UI

## 1. Aerospace State Management
- [x] 1.1 Create `AerospaceState` interface
- [x] 1.2 Add aerospace-specific fields (thrust, fuel, SI)
- [x] 1.3 Implement aerospace state <-> serialization mapping

## 2. Aerospace Customizer Tabs
- [x] 2.1 Create `AerospaceStructureTab` component
  - [x] Tonnage and engine selection
  - [x] Heat sink configuration
  - [x] Fuel capacity
  - [x] Structural integrity
- [x] 2.2 Create `AerospaceArmorTab` component
  - [x] Nose/Wings/Aft allocation
  - [ ] Capital armor for large aero (future enhancement)
- [x] 2.3 Create `AerospaceEquipmentTab` component
  - [x] Arc-based weapon mounting
  - [x] Bomb bay equipment (if applicable)

## 3. Aerospace Diagram
- [x] 3.1 Create `AerospaceDiagram` component
- [x] 3.2 Implement weapon arc visualization
- [x] 3.3 Show nose/wing/aft locations
- [x] 3.4 Display armor and equipment

## 4. Aerospace Status Bar
- [x] 4.1 Create `AerospaceStatusBar` extending base
- [x] 4.2 Show thrust ratings
- [x] 4.3 Show fuel consumption
- [x] 4.4 Show heat tracking

## 5. Aerospace Validation Rules
- [ ] 5.1 Create `AerospaceValidationRules` extending validation framework
- [ ] 5.2 Validate thrust/weight ratio
- [ ] 5.3 Validate fuel capacity
- [ ] 5.4 Validate weapon arc assignments
- [ ] 5.5 Register rules with validation orchestrator

## 6. Integration
- [x] 6.1 Add aerospace to unit type selector (NewTabModal)
- [x] 6.2 Route aerospace units to AerospaceCustomizer (UnitTypeRouter)
- [x] 6.3 Handle conventional fighter variant
- [x] 6.4 Create aerospaceStoreRegistry.ts for store management
- [x] 6.5 Update MultiUnitTabs to handle aerospace unit creation
