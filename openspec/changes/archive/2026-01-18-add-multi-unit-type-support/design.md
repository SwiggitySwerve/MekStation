# Multi-Unit Type Support - Design Document

## Context

MekStation is a BattleTech unit construction application currently limited to BattleMech support. The mm-data repository provides comprehensive unit data for all BattleTech unit types:

| Unit Type | File Count | Format | Complexity |
|-----------|------------|--------|------------|
| Meks (BattleMechs) | 4,219 | MTF/BLK | High - Current focus |
| Vehicles | 1,447 | BLK | Medium |
| Battle Armor | 1,188 | BLK | Medium |
| Infantry | 1,393 | BLK | Low |
| Gun Emplacements | 1,035 | BLK | Low |
| Fighters (Aerospace) | 503 | BLK | High |
| Dropships | 209 | BLK | Very High |
| Warships | 122 | BLK | Very High |
| ProtoMechs | 86 | BLK | Medium |
| Conventional Fighters | 69 | BLK | Medium |
| Small Craft | 39 | BLK | High |
| Space Stations | 33 | BLK | Very High |
| JumpShips | 30 | BLK | Very High |
| Handheld Weapons | 24 | BLK | Low |

**Total: ~10,397 unit files**

## Goals

1. Support import/validation of ALL mm-data unit types
2. Provide customizer UI for each unit type with appropriate diagrams
3. Maintain abstraction to minimize code duplication
4. Follow MegaMekLab patterns where applicable
5. Enable future extensibility

## Non-Goals

1. 100% MegaMekLab feature parity in Phase 1
2. Custom unit creation for all types (import/edit only initially)
3. Multi-unit force management (separate feature)
4. Combat simulation

## Architecture Decisions

### Decision 1: Polymorphic Unit Type Hierarchy

**What**: Create an abstract base interface with unit-type-specific extensions.

**Why**: Enables type-safe handling while sharing common properties.

**Alternatives Considered**:
- Single mega-interface with optional fields (rejected: type safety)
- Completely separate interfaces (rejected: code duplication)

**Pattern** (following MegaMekLab's ITab approach):
```typescript
// Base unit interface - all units share these
interface IBaseUnit extends IEntity, ITechBaseEntity, ITemporalEntity {
  readonly unitType: UnitType;
  readonly tonnage: number;
  readonly rulesLevel: RulesLevel;
  readonly metadata: IUnitMetadata;
  readonly equipment: readonly IMountedEquipment[];
}

// Ground units share movement
interface IGroundUnit extends IBaseUnit {
  readonly cruiseMP: number;
  readonly flankMP: number;
}

// Mechs have critical slots
interface IMechUnit extends IGroundUnit {
  readonly criticalSlots: readonly ICriticalSlotAssignment[];
  readonly heatSinks: IHeatSinkConfiguration;
}

// Aerospace has fuel and thrust
interface IAerospaceUnit extends IBaseUnit {
  readonly safeThrust: number;
  readonly fuel: number;
  readonly structuralIntegrity: number;
}

// Squad-based units
interface ISquadUnit extends IBaseUnit {
  readonly squadSize: number;
  readonly troopers: number;
}
```

### Decision 2: Unit Type Registry Pattern

**What**: Central registry mapping UnitType to handlers.

**Why**: Enables dynamic routing and plugin-style extensibility.

```typescript
interface IUnitTypeHandler<T extends IBaseUnit> {
  readonly unitType: UnitType;
  parse(blk: BlkDocument): T;
  validate(unit: T): ValidationResult;
  serialize(unit: T): BlkDocument;
  getCustomizerTabs(): TabDefinition[];
  getDiagramComponent(): React.ComponentType;
}

class UnitTypeRegistry {
  private handlers = new Map<UnitType, IUnitTypeHandler<any>>();
  
  register<T extends IBaseUnit>(handler: IUnitTypeHandler<T>): void;
  getHandler(unitType: UnitType): IUnitTypeHandler<IBaseUnit>;
}
```

### Decision 3: BLK Parser Architecture

**What**: Streaming XML-style parser for BLK files.

**Why**: BLK is the dominant format for non-mech units (13,000+ files).

```typescript
interface IBlkDocument {
  readonly blockVersion: number;
  readonly version: string;
  readonly unitType: string;
  readonly properties: Map<string, string | string[]>;
  readonly equipment: Map<string, string[]>; // location -> equipment
}

interface IBlkParser {
  parse(content: string): IBlkDocument;
  getUnitType(doc: IBlkDocument): UnitType;
}
```

### Decision 4: Customizer Tab Strategy

**What**: Unit-type-specific tab sets following MegaMekLab patterns.

| Unit Type | Tabs |
|-----------|------|
| BattleMech | Overview, Structure, Armor, Equipment, CritSlots, Fluff, Preview |
| Vehicle | Overview, Structure, Armor, Equipment, Turret, Fluff, Preview |
| Aerospace | Overview, Structure, Armor, Equipment, Weapons, Fluff, Preview |
| Battle Armor | Overview, Structure, Squad, Equipment, Fluff, Preview |
| Infantry | Overview, Build, Fluff, Preview |
| DropShip | Overview, Structure, Armor, Equipment, Bays, Crew, Fluff, Preview |

### Decision 5: Diagram Component Architecture

**What**: Pluggable diagram components per unit type.

**Why**: Each unit type has unique location layouts and visual representations.

```typescript
interface IUnitDiagramProps<T extends IBaseUnit> {
  unit: T;
  mode: 'armor' | 'structure' | 'equipment';
  onLocationClick?: (location: string) => void;
}

// Unit-type-specific implementations
BipedMechDiagram: React.FC<IUnitDiagramProps<IBattleMech>>
QuadMechDiagram: React.FC<IUnitDiagramProps<IBattleMech>>
VehicleDiagram: React.FC<IUnitDiagramProps<IVehicle>>
AerospaceDiagram: React.FC<IUnitDiagramProps<IAerospace>>
BattleArmorDiagram: React.FC<IUnitDiagramProps<IBattleArmor>>
```

## Unit Type Specifics

### Vehicles

**Locations**: Front, Left, Right, Rear, Turret (optional), Rotor (VTOL)

**Special Properties**:
- `motionType`: Wheeled, Tracked, Hover, VTOL, Naval, etc.
- `turretType`: None, Single, Dual, Chin
- `engineType`: Fusion, ICE, Fuel Cell, etc.
- `barRating`: Battle Armor Rating for support vehicles

**Special Toggles** (from MegaMekLab):
- Superheavy toggle (>100 tons)
- Trailer hitch
- Environmental sealing
- Amphibious

### Aerospace Fighters

**Locations**: Nose, Left Wing, Right Wing, Aft, Fuselage

**Special Properties**:
- `safeThrust`: Safe thrust rating
- `maxThrust`: Maximum thrust
- `fuel`: Fuel points
- `structuralIntegrity`: SI rating
- `cockpitType`: Standard, Primitive, etc.

**Special Toggles**:
- Bomb bay
- Reinforced cockpit
- Ejection seat

### Battle Armor

**Special Properties**:
- `chassisType`: Biped, Quad, etc.
- `weightClass`: PA(L), Light, Medium, Heavy, Assault
- `squadSize`: 4, 5, or 6
- `manipulatorType`: None, Basic, Battle Claw, etc.

**Special Toggles**:
- Anti-personnel mount
- Turret mount
- Stealth system
- Jump jets vs mechanical jump boosters

### Infantry

**Special Properties**:
- `squadSize`: Size of each squad
- `squadCount`: Number of squads
- `primaryWeapon`: Main weapon type
- `secondaryWeapon`: Secondary weapon (if any)
- `armorKit`: Standard, Sneak, Environment, etc.
- `motionType`: Foot, Motorized, Jump, Mechanized, etc.

**Special Toggles**:
- Anti-mech training
- Specializations
- Augmentations

### ProtoMechs

**Locations**: Head, Torso, Main Gun, Left Arm, Right Arm, Legs

**Special Properties**:
- Same general structure as mechs but simplified
- No internal heat sinks (pilots feel heat)
- Limited equipment options

### DropShips/JumpShips/WarShips

**Locations**: Nose, FL/FR Arc, AL/AR Arc, Aft, Broadsides (WarShips)

**Special Properties**:
- `structuralIntegrity`: SI rating
- `kfDrive`: K-F drive presence (JumpShips)
- `gravDecks`: Gravity deck count (WarShips)
- `bays`: Transport bay configuration
- `crew`: Crew complement

**Special Toggles**:
- Lithium-fusion battery
- Compact K-F drive
- HPG

## Risks / Trade-offs

| Risk | Trade-off | Mitigation |
|------|-----------|------------|
| Large scope | Features vs. timeline | Phased approach |
| MegaMekLab divergence | Innovation vs. compatibility | Document deviations |
| UI complexity | Full features vs. simplicity | Progressive disclosure |
| Bundle size | All units vs. lazy loading | Code splitting |

## Migration Plan

### Phase 1: Foundation (Weeks 1-2)
1. Create base interfaces and unit type hierarchy
2. Implement BLK parser
3. Create unit type registry
4. No breaking changes to existing mech flow

### Phase 2: Import Pipeline (Weeks 3-4)
1. Extend UnitLoaderService
2. Add validation rules per type
3. Create component mappers
4. Import all mm-data units to verify

### Phase 3: Vehicle Customizer (Weeks 5-6)
1. Vehicle structure tab
2. Vehicle armor diagram
3. Vehicle equipment tab
4. Vehicle preview/export

### Phase 4: Aerospace Customizer (Weeks 7-8)
1. Aerospace structure tab
2. Aerospace diagram (arcs)
3. Aerospace equipment
4. Aerospace preview/export

### Phase 5: Personnel Units (Weeks 9-10)
1. Battle Armor customizer
2. Infantry customizer (simplified)
3. ProtoMech customizer

### Phase 6: Capital Ships (Optional, Weeks 11+)
1. DropShip customizer
2. JumpShip/WarShip (if demand)

## Rollback Strategy

Each phase is independently deployable. If issues arise:
1. Feature flag to disable new unit types
2. Existing mech functionality unaffected
3. Data stored separately per unit type

## Open Questions

1. Should we support custom unit creation or import-only initially?
2. Priority order for unit types beyond vehicles/aerospace?
3. How to handle mm-data units that fail validation?
4. Record sheet generation scope?

## References

- MegaMekLab source: `E:\Projects\megameklab`
- mm-data repository: `E:\Projects\mm-data`
- BLK format examples in mm-data/data/mekfiles/
