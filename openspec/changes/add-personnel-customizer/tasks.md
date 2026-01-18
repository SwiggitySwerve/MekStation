# Tasks: Personnel Unit Customizer UI

## 1. Battle Armor Customizer

### 1.1 State Management
- [ ] 1.1.1 Create `BattleArmorState` interface
- [ ] 1.1.2 Implement BA state <-> serialization mapping

### 1.2 Battle Armor Tabs
- [ ] 1.2.1 Create `BattleArmorStructureTab`
  - [ ] Chassis type selection
  - [ ] Weight class
  - [ ] Manipulator selection
  - [ ] Enhancement toggles (stealth, harjel, etc.)
- [ ] 1.2.2 Create `BattleArmorSquadTab`
  - [ ] Squad size configuration
  - [ ] Per-trooper equipment

### 1.3 Battle Armor Diagram
- [ ] 1.3.1 Create `BattleArmorDiagram`
- [ ] 1.3.2 Squad trooper visualization
- [ ] 1.3.3 Equipment locations

### 1.4 Battle Armor Validation
- [ ] 1.4.1 Create `BattleArmorValidationRules`
- [ ] 1.4.2 Validate weight class limits
- [ ] 1.4.3 Validate manipulator compatibility

## 2. Infantry Customizer

### 2.1 State Management
- [ ] 2.1.1 Create `InfantryState` interface
- [ ] 2.1.2 Implement infantry state <-> serialization mapping

### 2.2 Infantry Build Tab
- [ ] 2.2.1 Create `InfantryBuildTab` (simplified)
  - [ ] Platoon configuration
  - [ ] Primary/secondary weapons
  - [ ] Armor kit selection
  - [ ] Motion type
  - [ ] Specializations

### 2.3 Infantry Diagram
- [ ] 2.3.1 Create minimal infantry diagram

### 2.4 Infantry Validation
- [ ] 2.4.1 Create `InfantryValidationRules`
- [ ] 2.4.2 Validate platoon configuration
- [ ] 2.4.3 Validate weapon compatibility

## 3. ProtoMech Customizer

### 3.1 State Management
- [ ] 3.1.1 Create `ProtoMechState` interface
- [ ] 3.1.2 Implement protomech state <-> serialization mapping

### 3.2 ProtoMech Tabs
- [ ] 3.2.1 Adapt mech-style tabs for protomech constraints
- [ ] 3.2.2 Handle simplified location structure
- [ ] 3.2.3 Handle Main Gun equipment slot

### 3.3 ProtoMech Diagram
- [ ] 3.3.1 Create ProtoMech-specific diagram

### 3.4 ProtoMech Validation
- [ ] 3.4.1 Create `ProtoMechValidationRules`
- [ ] 3.4.2 Validate tonnage limits (2-9 tons)
- [ ] 3.4.3 Validate equipment compatibility

## 4. Integration
- [ ] 4.1 Add personnel units to unit type selector
- [ ] 4.2 Route to appropriate customizer based on unit type
