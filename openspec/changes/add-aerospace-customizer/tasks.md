# Tasks: Aerospace Customizer UI

## 1. Aerospace State Management
- [ ] 1.1 Create `AerospaceState` interface
- [ ] 1.2 Add aerospace-specific fields (thrust, fuel, SI)
- [ ] 1.3 Implement aerospace state <-> serialization mapping

## 2. Aerospace Customizer Tabs
- [ ] 2.1 Create `AerospaceStructureTab` component
  - [ ] Tonnage and engine selection
  - [ ] Heat sink configuration
  - [ ] Fuel capacity
  - [ ] Structural integrity
- [ ] 2.2 Create `AerospaceArmorTab` component
  - [ ] Nose/Wings/Aft allocation
  - [ ] Capital armor for large aero
- [ ] 2.3 Create `AerospaceEquipmentTab` component
  - [ ] Arc-based weapon mounting
  - [ ] Bomb bay equipment (if applicable)

## 3. Aerospace Diagram
- [ ] 3.1 Create `AerospaceDiagram` component
- [ ] 3.2 Implement weapon arc visualization
- [ ] 3.3 Show nose/wing/aft locations
- [ ] 3.4 Display armor and equipment

## 4. Aerospace Status Bar
- [ ] 4.1 Create `AerospaceStatusBar` extending base
- [ ] 4.2 Show thrust ratings
- [ ] 4.3 Show fuel consumption
- [ ] 4.4 Show heat tracking

## 5. Aerospace Validation Rules
- [ ] 5.1 Create `AerospaceValidationRules` extending validation framework
- [ ] 5.2 Validate thrust/weight ratio
- [ ] 5.3 Validate fuel capacity
- [ ] 5.4 Validate weapon arc assignments
- [ ] 5.5 Register rules with validation orchestrator

## 6. Integration
- [ ] 6.1 Add aerospace to unit type selector
- [ ] 6.2 Route aerospace units to AerospaceCustomizer
- [ ] 6.3 Handle conventional fighter variant
