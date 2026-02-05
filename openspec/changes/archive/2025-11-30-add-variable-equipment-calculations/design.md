# Design: Variable Equipment Calculations

## Context

BattleTech construction rules require certain equipment properties to be calculated dynamically based on mech configuration. Currently, equipment data stores static placeholder values, preventing accurate weight calculations during mech construction.

## Goals / Non-Goals

**Goals:**

- Provide accurate calculations for all variable equipment per TechManual rules
- Create a standardized pattern for marking and calculating variable properties
- Enable construction validation to account for variable equipment

**Non-Goals:**

- Changing the base equipment interface structure (maintain backwards compatibility)
- Implementing Battle Value calculations (complex, separate scope)
- UI changes for equipment selection

## Decisions

### Decision 1: Calculation Context Pattern

**What:** Pass a context object containing all possible calculation inputs rather than individual parameters.

**Why:** Equipment calculations need different inputs (tonnage, engine rating, weapon tonnage). A context object is extensible and avoids function signature changes.

```typescript
interface IVariableEquipmentContext {
  mechTonnage: number;
  engineRating: number;
  engineWeight: number;
  directFireWeaponTonnage: number;
}
```

### Decision 2: Calculation ID Pattern

**What:** Link equipment to calculations via a `calculationId` string rather than embedded functions.

**Why:** Keeps equipment data serializable (JSON-safe) while allowing complex calculation logic in separate modules.

### Decision 3: Formula Sources (TechManual)

All formulas derived from official BattleTech TechManual:

| Equipment                 | Weight Formula          | Slots Formula           | Source   |
| ------------------------- | ----------------------- | ----------------------- | -------- |
| Targeting Computer (IS)   | ceil(weaponTonnage / 4) | weight                  | TM p.149 |
| Targeting Computer (Clan) | ceil(weaponTonnage / 5) | weight                  | TM p.149 |
| MASC (IS)                 | ceil(engineRating / 20) | ceil(engineRating / 20) | TM p.230 |
| MASC (Clan)               | ceil(engineRating / 25) | ceil(engineRating / 25) | TM p.230 |
| Supercharger              | engineWeight / 10       | 1                       | TM p.232 |
| Partial Wing              | tonnage × 0.05          | 3 per torso             | TM p.234 |
| TSM                       | 0 (replaces myomer)     | 6 distributed           | TM p.218 |

## Risks / Trade-offs

**Risk:** Context object may grow large as more equipment types are added.
**Mitigation:** Use optional properties; calculations only access what they need.

**Risk:** Equipment definitions become more complex with variable metadata.
**Mitigation:** Only add metadata to items that actually vary; static equipment unchanged.

## Open Questions

- Should Battle Value calculations be included? (Deferred - complex scope)
- Should we support custom equipment with user-defined formulas? (Deferred - future feature)
