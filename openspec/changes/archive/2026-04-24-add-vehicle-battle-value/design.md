# Design — add-vehicle-battle-value

## Decisions discovered during execution

### Decision: Vehicle BV adapter layer (store → calculator)

**Choice**: Introduce `vehicleBVAdapter.ts` that converts `VehicleBVStateSubset` (raw Zustand store slice) to the pure `VehicleBVInput` shape consumed by `calculateVehicleBV`.

**Rationale**: The calculator stays pure and testable (accepts a plain input object), while the adapter owns the mapping from store state: turret-type → VehicleTurretKind, equipment partitioning (ammo vs weapon vs defensive vs offensive), armor totals, motion-type normalization. Mirrors the aerospace adapter pattern.

**Discovered during**: Tasks 1.2, 1.3, 9.1, 9.2, 10.1

### Decision: BAR scaling applied via `effectiveBAR` input field

**Choice**: The calculator accepts an optional `effectiveBAR: number | null`. When `null`, no scaling is applied (combat vehicle default). When `< 10`, armor BV is multiplied by `BAR / 10`. When `>= 10`, no scaling.

**Rationale**: Keeps BAR logic on the caller side (the adapter decides if the unit is a support vehicle and passes the effective value), letting the calculator remain generic across combat and support vehicles. Avoids branching on `unitType` inside the BV math.

**Discovered during**: Tasks 6.1, 6.2, 6.3

### Decision: Turret modifier as a single display scalar on the breakdown

**Choice**: `turretModifier` on `IVehicleBVBreakdown` represents the display-level primary turret multiplier (1.05 for single/dual/chin, 1.025 for sponson, 1.0 for none). Per-weapon sponson vs rotating-turret routing is applied internally when summing weapon BV.

**Rationale**: Users auditing the breakdown dialog only need one scalar to understand the turret bonus. Internal accounting still applies the correct multiplier per weapon, but the UI surface is simpler.

**Discovered during**: Tasks 4.4, 9.1, 9.2

### Decision: Parity harness emits `mulBV: null` when no reference exists

**Choice**: `scripts/validate-vehicle-bv.ts` writes `mulBV: null`, `delta: null`, `deltaPct: null` when no MUL/MegaMek reference is available in the cache. The report's `notes[]` array carries an explanation. Parity metrics (`within1pct`, `within5pct`) are computed only over entries with a reference.

**Rationale**: Separates "calculator works" (all 1403 units produced a BV without crashing) from "BV matches reference" (requires seeding a vehicle MUL cache — currently empty). Keeps the harness runnable even when the reference cache is the blocker.

**Discovered during**: Tasks 10.2, 10.3, 10.4 (deferred blocker)

### Decision: Windows filename sanitization is a data-layer issue, not BV

**Choice**: 2 of 1405 units (Ibex RV variants) fail to load from disk due to `:` or `\` in the canonical filename. Tracked as data-layer defects in the harness `errors[]` array, NOT as BV calculator regressions.

**Rationale**: The BV calculator processes any `IVehicleUnit` that loads successfully. Filename collisions are an artifact of the BLK→JSON converter pipeline and belong to that workstream.

**Discovered during**: Task 10.3 (harness error reporting)
