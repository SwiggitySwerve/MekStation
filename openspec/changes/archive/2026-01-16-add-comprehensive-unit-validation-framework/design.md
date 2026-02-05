# Design: Comprehensive Unit Validation Framework

## Context

MekStation currently supports 16 unit types defined in the `UnitType` enum:

**Mech Category:**

- BATTLEMECH - Standard bipedal combat mechs (20-100 tons)
- OMNIMECH - Modular mechs with configurable equipment pods
- INDUSTRIALMECH - Non-combat industrial mechs
- PROTOMECH - Small experimental mechs (10-15 tons)

**Vehicle Category:**

- VEHICLE - Ground vehicles
- VTOL - Vertical takeoff and landing vehicles
- SUPPORT_VEHICLE - Supply and support vehicles

**Aerospace Category:**

- AEROSPACE - Standard aerospace fighters
- CONVENTIONAL_FIGHTER - Non-fusion aerospace
- SMALL_CRAFT - Small atmospheric/space craft
- DROPSHIP - Troop transport spacecraft
- JUMPSHIP - Interstellar jump-capable ships
- WARSHIP - Military capital ships
- SPACE_STATION - Stationary orbital installations

**Personnel Category:**

- INFANTRY - Ground troops
- BATTLE_ARMOR - Powered armor suits

The existing `validation-rules-master` spec defines 89 validation rules, but these are entirely BattleMech-specific. There is no framework for validating other unit types, and adding support requires duplicating validation infrastructure.

## Goals / Non-Goals

### Goals

- Create a hierarchical validation framework applicable to all unit types
- Define universal validation rules that apply to every unit
- Enable unit-type-specific rules to extend or override base rules
- Support future unit type additions without framework changes
- Maintain backward compatibility with existing BattleMech validation

### Non-Goals

- Implementing complete validation rules for all 16 unit types immediately
- Changing the existing ValidationService API signature
- Modifying UI validation display logic
- Performance optimization (defer to future iteration)

## Decisions

### Decision 1: Four-Level Validation Hierarchy

**Structure:**

```
Level 0: Universal Rules (ALL units)
    │
    ├── Level 1: Category Rules
    │       ├── Mech Category (BattleMech, OmniMech, IndustrialMech, ProtoMech)
    │       ├── Vehicle Category (Vehicle, VTOL, SupportVehicle)
    │       ├── Aerospace Category (Aerospace, ConventionalFighter, SmallCraft, DropShip, JumpShip, WarShip, SpaceStation)
    │       └── Personnel Category (Infantry, BattleArmor)
    │
    └── Level 2: Unit-Type-Specific Rules
            ├── BattleMech-specific
            ├── OmniMech-specific
            ├── Vehicle-specific
            └── ... (per unit type)
```

**Rationale:** This hierarchy minimizes rule duplication while allowing fine-grained customization. Universal rules are defined once and inherited by all. Category rules capture commonalities (e.g., all mechs have internal structure, all vehicles have turrets). Unit-type rules handle unique constraints.

### Decision 2: Rule Inheritance Model

```typescript
interface IValidationRuleDefinition {
  id: string; // Unique ID (e.g., "VAL-BASE-001")
  name: string; // Display name
  description: string; // What it validates
  category: ValidationCategory; // WEIGHT, SLOTS, TECH_BASE, etc.
  priority: number; // Execution order (lower = earlier)
  applicableUnitTypes: UnitType[] | 'ALL'; // Which units this applies to
  overrides?: string; // ID of rule this overrides
  extends?: string; // ID of rule this extends
  validate: (context: IValidationContext) => IValidationRuleResult;
}
```

**Inheritance Modes:**

- **Inherit**: Rule applies as-is to child types
- **Override**: Rule completely replaces parent rule (same ID)
- **Extend**: Rule runs after parent rule, can add/modify results

### Decision 3: Validation Context Interface

```typescript
interface IValidationContext {
  unit: IUnit; // The unit being validated
  unitType: UnitType; // Cached unit type
  techBase: TechBase; // Unit's tech base
  campaignYear?: number; // For era validation
  rulesLevelFilter?: RulesLevel; // Maximum allowed rules level
  options: IValidationOptions; // Skip rules, max errors, etc.
}

interface IUnit {
  // Base fields (all units)
  id: string;
  name: string;
  unitType: UnitType;
  techBase: TechBase;
  rulesLevel: RulesLevel;
  introductionYear: number;
  extinctionYear?: number;
  weight: number;
  cost: number;
  battleValue: number;

  // Type-specific fields accessed via type narrowing
  [key: string]: unknown;
}
```

### Decision 4: Universal Validation Rules

These rules apply to ALL 16 unit types:

| Rule ID      | Name                      | Description                         |
| ------------ | ------------------------- | ----------------------------------- |
| VAL-UNIV-001 | Entity ID Required        | All units must have non-empty id    |
| VAL-UNIV-002 | Entity Name Required      | All units must have non-empty name  |
| VAL-UNIV-003 | Valid Unit Type           | Unit type must be valid enum value  |
| VAL-UNIV-004 | Tech Base Required        | All units must declare tech base    |
| VAL-UNIV-005 | Rules Level Required      | All units must have rules level     |
| VAL-UNIV-006 | Introduction Year Valid   | Must be within timeline (2005-3250) |
| VAL-UNIV-007 | Temporal Consistency      | Extinction year > introduction year |
| VAL-UNIV-008 | Weight Non-Negative       | Weight must be >= 0                 |
| VAL-UNIV-009 | Cost Non-Negative         | Cost must be >= 0                   |
| VAL-UNIV-010 | Battle Value Non-Negative | BV must be >= 0                     |
| VAL-UNIV-011 | Era Availability          | Unit available in campaign year     |
| VAL-UNIV-012 | Rules Level Compliance    | Unit meets rules level filter       |

### Decision 5: Category-Specific Rules

**Mech Category Rules (BattleMech, OmniMech, IndustrialMech, ProtoMech):**
| Rule ID | Name | Applies To |
|---------|------|------------|
| VAL-MECH-001 | Engine Required | All mechs |
| VAL-MECH-002 | Gyro Required | BattleMech, OmniMech, IndustrialMech |
| VAL-MECH-003 | Cockpit Required | All mechs |
| VAL-MECH-004 | Internal Structure Required | All mechs |
| VAL-MECH-005 | Minimum Heat Sinks | BattleMech, OmniMech (10 required) |
| VAL-MECH-006 | Exact Weight Match | All mechs |
| VAL-MECH-007 | Critical Slot Limits | All mechs |

**Vehicle Category Rules (Vehicle, VTOL, SupportVehicle):**
| Rule ID | Name | Applies To |
|---------|------|------------|
| VAL-VEH-001 | Engine Required | All vehicles |
| VAL-VEH-002 | Motive System Required | All vehicles |
| VAL-VEH-003 | Turret Capacity Limits | Vehicles with turrets |
| VAL-VEH-004 | VTOL Rotor Required | VTOL only |
| VAL-VEH-005 | Vehicle Tonnage Range | Varies by type |

**Aerospace Category Rules:**
| Rule ID | Name | Applies To |
|---------|------|------------|
| VAL-AERO-001 | Engine Required | All aerospace |
| VAL-AERO-002 | Thrust Rating Valid | Aerospace, ConventionalFighter |
| VAL-AERO-003 | Structural Integrity Required | All aerospace |
| VAL-AERO-004 | Fuel Capacity Valid | All aerospace |

**Personnel Category Rules (Infantry, BattleArmor):**
| Rule ID | Name | Applies To |
|---------|------|------------|
| VAL-PERS-001 | Squad/Platoon Size Valid | All personnel |
| VAL-PERS-002 | Battle Armor Weight Range | Battle Armor (0.4-2 tons) |
| VAL-PERS-003 | Infantry Equipment Limits | Infantry |

### Decision 6: Rule Registry Architecture

```typescript
class UnitValidationRegistry {
  private universalRules: Map<string, IValidationRuleDefinition>;
  private categoryRules: Map<
    UnitCategory,
    Map<string, IValidationRuleDefinition>
  >;
  private unitTypeRules: Map<UnitType, Map<string, IValidationRuleDefinition>>;

  // Get all rules applicable to a unit type
  getRulesForUnitType(unitType: UnitType): IValidationRuleDefinition[] {
    const rules: IValidationRuleDefinition[] = [];

    // 1. Add universal rules
    rules.push(...this.universalRules.values());

    // 2. Add category rules
    const category = this.getCategoryForUnitType(unitType);
    const catRules = this.categoryRules.get(category);
    if (catRules) {
      rules.push(...catRules.values());
    }

    // 3. Add unit-type-specific rules
    const typeRules = this.unitTypeRules.get(unitType);
    if (typeRules) {
      rules.push(...typeRules.values());
    }

    // 4. Apply overrides and extensions
    return this.resolveInheritance(rules);
  }
}
```

## Risks / Trade-offs

### Risk 1: Complexity Increase

- **Risk**: Four-level hierarchy adds conceptual complexity
- **Mitigation**: Clear documentation, consistent naming conventions (VAL-UNIV, VAL-MECH, VAL-VEH, etc.)

### Risk 2: Rule Conflicts

- **Risk**: Category rules may conflict with unit-type rules
- **Mitigation**: Explicit override/extend model with clear precedence (unit-type > category > universal)

### Risk 3: Performance Impact

- **Risk**: Rule resolution may slow validation
- **Mitigation**: Cache resolved rule sets per unit type; rules rarely change at runtime

### Risk 4: Backward Compatibility

- **Risk**: Existing BattleMech validation may break
- **Mitigation**: Existing 89 rules become BattleMech-specific layer; no API changes

## Migration Plan

1. **Phase 1**: Implement framework infrastructure (registry, interfaces, orchestrator)
2. **Phase 2**: Extract universal rules from existing validation-rules-master
3. **Phase 3**: Refactor BattleMech rules as unit-type-specific layer
4. **Phase 4**: Add Vehicle category rules (placeholder implementation)
5. **Phase 5**: Add Aerospace category rules (placeholder implementation)
6. **Phase 6**: Add Personnel category rules (placeholder implementation)

Rollback: Revert to monolithic ValidationService if framework issues arise.

## Open Questions

1. Should IndustrialMech validation be significantly different from BattleMech?
   - Likely: different weapon restrictions, no minimum heat sinks

2. How do we handle ProtoMechs which have unique constraints (no standard actuators, different slot system)?
   - Approach: Heavy use of overrides in unit-type-specific layer

3. Should we validate DropShips/JumpShips/WarShips given their complexity?
   - Suggest: Placeholder rules only, full implementation deferred
