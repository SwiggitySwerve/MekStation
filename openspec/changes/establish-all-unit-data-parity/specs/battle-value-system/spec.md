## ADDED Requirements

### Requirement: Contract vehicle BV location coverage

The contract BV adapter SHALL preserve the existing vehicle, SuperHeavy tank
and VTOL location vocabulary in armor and equipment inputs without changing
points or deriving a BV rule.

#### Scenario: Convert six-side armor and rotor equipment

- **GIVEN** converter output carrying FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT or ROTOR
- **WHEN** the contract BV adapter maps armor and equipment
- **THEN** it SHALL preserve the corresponding domain location and armor points


### Requirement: Runtime parity term validation

The comparator SHALL reject malformed runtime terms with a structured failed
result. Null and undefined entries SHALL be missing terms; other non-objects,
absent or blank field identifiers, and unknown comparison kinds SHALL be invalid
terms. An unknown comparison kind SHALL NOT silently select exact comparison.

#### Scenario: Reject JSON null and unknown comparison kinds

- **GIVEN** a term list containing JSON null or an unknown comparison kind
- **WHEN** parity is evaluated
- **THEN** the result SHALL fail and retain the entry's index in its diagnostic
- **AND** the comparator SHALL NOT throw on null or accept matching unknown-kind values

### Requirement: Strict all-family numerical parity

Every applicable numerical construction/BV result and available component term SHALL differ strictly less than 1% from its matched loaded-entity reference: `abs(actual - reference) / abs(reference) < 0.01`. Numeric acceptance SHALL compare the exact JSON decimal values so binary rounding cannot change the strict boundary; approximate ratios MAY be reported separately. Zero references SHALL require exact zero. Missing or nonfinite results SHALL fail. Discrete design facts SHALL match exactly. Existing mech BV regression gates SHALL remain enforced, but their broader aggregate thresholds SHALL NOT establish this stricter readiness.

#### Scenario: Reject the tolerance boundary

- **GIVEN** reference BV 1000
- **WHEN** local BV is 1010 or 990
- **THEN** the comparison SHALL fail without pre-rounding the relative error
- **WHEN** local BV is 1009 or 991
- **THEN** that numerical comparison SHALL pass

#### Scenario: Reject decimal boundary and missing comparison entries

- **GIVEN** reference weight 10 and actual weight 10.1 or 9.9
- **WHEN** numerical comparison runs
- **THEN** it SHALL fail at the exact decimal 1% boundary
- **AND** an array with missing comparison entries SHALL fail rather than skip them

#### Scenario: Reject missing and compensating errors

- **GIVEN** matching total weight but a failing engine or controls term
- **WHEN** numerical readiness is evaluated
- **THEN** the unit SHALL fail component parity
- **AND** zero, missing and nonfinite reference/result cases SHALL be handled explicitly

#### Scenario: Separate unsupported metrics from missing implementation

- **GIVEN** a metric unsupported by the upstream entity's rules
- **WHEN** a report marks that metric inapplicable
- **THEN** it SHALL include the upstream-supported reason
- **AND** local unimplemented calculations SHALL remain failures rather than inapplicable results

### Requirement: ProtoMech Gunnery Adjustment

ProtoMech BV SHALL use the existing shared skill table with the requested
Gunnery and fixed Piloting 5, matching pinned MegaMek's ProtoMech rule.
The optional piloting input SHALL remain accepted for API compatibility but
SHALL NOT affect ProtoMech BV. Omitted Gunnery SHALL mean 4.

#### Scenario: Gunnery-only skill and rounding

- **GIVEN** a ProtoMech with any Piloting from 0 through 8
- **WHEN** Gunnery is 0, 2, 4 or 8
- **THEN** its pilot factor SHALL be 1.75, 1.4, 1 or 0.75 respectively
- **AND** final BV SHALL round the sum of defense and offense before applying the skill factor, then round the adjusted value
- **AND** a zero base SHALL remain exactly zero
- **AND** point aggregation SHALL apply this same rule to every member

#### Scenario: Preserve saved caches until recomputation

- **GIVEN** saved movement and a cached BV using previous weight, chassis or skill adjustments
- **WHEN** hydration or identity edits occur
- **THEN** cached values and movement SHALL remain unchanged
- **WHEN** a BV-affecting edit or explicit recomputation occurs
- **THEN** the new breakdown SHALL use zero weight contribution and neutral chassis adjustment through the existing persistence contract

#### Scenario: Bounded adjustment evidence

- **WHEN** this slice is compared with pinned Java
- **THEN** actual weight/type/skill/summary methods SHALL provide the component reference and unarmed loaded synthetic units SHALL provide final-BV checks
- **AND** all 86 sources SHALL retain source fields, serialization, export bytes and unrelated component terms
- **AND** unresolved full-source BV, equipment, damage/options, implants, drones, force bonuses and production browser workflows SHALL remain explicit failures or unverified coverage

### Requirement: Offensive ammunition cap ownership

The shared, ProtoMech and aerospace offensive ammunition calculations SHALL use
one owning module for grouped accumulation and cap arithmetic. Consolidation
SHALL preserve each adapter's existing key policy, guards, operation order and
numeric output before native identity, quantity or grouping corrections.

#### Scenario: Preserving existing cap policies

- **WHEN** offensive ammunition cap mechanics are consolidated
- **THEN** shared calculations SHALL retain normalized exact/alias/Clan matching and omit zero matches
- **AND** ProtoMech SHALL retain its exact-key policy, undefined-cap guard and outer nonempty guards
- **AND** aerospace SHALL retain lowercase-only matching and omission of missing or zero caps
- **AND** duplicates, empty inputs, signed zero, negative values and nonfinite values SHALL retain their prior results
- **AND** defensive AMS and screen caps SHALL remain separate rules

#### Scenario: Preservation evidence before native changes

- **WHEN** the extracted owner replaces the three offensive implementations
- **THEN** representative output captures and all 86 pinned ProtoMech source calculations SHALL remain unchanged
- **AND** source fields, serialization and equipment identities SHALL remain unchanged
- **AND** preservation SHALL NOT establish native ammunition quantity, mount topology or full BV parity

## MODIFIED Requirements

### Requirement: ProtoMech Offensive BV and Main Gun

Proto offensive BV SHALL include arm weapons and a MainGun location weapon
with the same BV as a mech-mounted instance. Its offensive movement factor
SHALL use explicit Run plus rounded half of nonnegative Jump, using the shared
speed-factor owner and the pinned MegaMek calculator's UMU-zero context.
The offensive pool SHALL NOT add tonnage or a generic physical-attack bonus.

#### Scenario: No weight-only offense

- **GIVEN** a ProtoMech without offensive equipment
- **WHEN** its BV is calculated for any supported chassis or tonnage
- **THEN** physicalWeaponBV and offensiveBV SHALL both be exactly zero
- **AND** changing tonnage alone SHALL NOT change its offensive pool

#### Scenario: Main gun BV at full value

- **GIVEN** a proto with a main-gun PPC (catalog BV 176)
- **WHEN** offensive BV is computed
- **THEN** the main gun contribution SHALL equal 176 BV (no proto-specific modifier)

#### Scenario: Proto speed factor

- **GIVEN** a proto with Walk 6, Run 9 and Jump 4
- **WHEN** offensive speed factor is computed
- **THEN** effective MP SHALL be `9 + round(4 / 2) = 11` and the factor SHALL equal 1.76
- **AND** the calculator SHALL consume explicit Run without changing or reconstructing movement from Walk or a booster flag
- **AND** negative Jump SHALL contribute zero, matching the shared movement owner

#### Scenario: Reactive and saved movement

- **WHEN** a new store or a BV-affecting edit computes a breakdown
- **THEN** its offensive factor SHALL use the current stored Run and Jump
- **GIVEN** saved movement and a cached breakdown from an earlier version
- **WHEN** the store hydrates or only identity fields change
- **THEN** neither saved movement nor cached BV SHALL be silently migrated
- **WHEN** recomputation is explicitly requested
- **THEN** the factor SHALL be refreshed from the preserved movement values

#### Scenario: Component evidence and exclusions

- **WHEN** the movement factor is compared to pinned Java
- **THEN** the 86 loaded sources and bounded synthetic components/entities SHALL compare matching Run and Jump under undamaged BV settings
- **AND** source fields, export bytes and unrelated BV components SHALL be checked separately from changed speed, offensive subtotal and total values
- **AND** equipment pools, damage/options, complete BV and production editor/save flows SHALL remain unverified until independently proven


### Requirement: ProtoMech Defensive BV

The proto defensive BV SHALL combine armor, structure, defensive equipment,
explosive penalty and the pinned MegaMek default-construction defensive movement
factor. Explosive equipment SHALL NOT subtract a ProtoMech-specific penalty;
the compatibility explosivePenalty field SHALL remain exactly zero. A Glider
SHALL add one to running TMM before comparison with jumping
TMM, including zero Run. Every ProtoMech SHALL add 0.1 to the inherited factor.

#### Scenario: Armor BV baseline

- **GIVEN** a Medium proto with 20 armor points
- **WHEN** armorBV is computed
- **THEN** armorBV SHALL equal `20 × 2.5 × 1.0 = 50`

#### Scenario: Structure BV baseline

- **GIVEN** a Medium proto with 12 structure points
- **WHEN** structureBV is computed
- **THEN** structureBV SHALL equal `12 × 1.5 × 1.0 = 18`

#### Scenario: Native defensive movement factors

- **GIVEN** nonnegative integer Run and Jump, UMU zero and standard movement modifiers
- **WHEN** the defensive factor is computed
- **THEN** it SHALL equal `(1 + max(running TMM, jumping TMM) / 10) + 0.1` in that operation order
- **AND** Glider running TMM SHALL include its one-point bonus before the maximum is taken
- **AND** Biped, Quad and the local Ultraheavy enum SHALL receive no Glider bonus
- **AND** jumping TMM SHALL be zero at Jump zero and otherwise include the standard one-point jump bonus
- **AND** the existing defensive pool SHALL be multiplied by that factor without changing source movement or inferring Run from Walk or equipment

#### Scenario: Reactive and saved defensive BV

- **WHEN** new state or a BV-affecting edit computes a breakdown
- **THEN** the defensive factor SHALL use current chassis and explicit stored movement
- **GIVEN** a saved cached breakdown and movement from an earlier version
- **WHEN** hydration or unrelated identity edits occur
- **THEN** saved movement and cached BV SHALL remain unchanged
- **WHEN** explicit recomputation or a BV-affecting edit occurs
- **THEN** the factor SHALL be refreshed and persisted through the existing store contract

#### Scenario: Independent component verification

- **WHEN** defensive movement is checked against pinned Java
- **THEN** component TMMs, the factor and its application SHALL be checked across boundaries, loaded synthetic entities and all 86 sources
- **AND** unrelated family outputs, source fields, serialization and export bytes SHALL be preserved
- **AND** fractional/nonfinite/negative movement, MaxTech options, full equipment pools, complete BV and production browser flows SHALL remain outside this component proof

#### Scenario: Native ProtoMech explosive stage

- **GIVEN** a ProtoMech carrying Gauss or other explosive equipment
- **WHEN** defensive BV is calculated
- **THEN** explosivePenalty SHALL be exactly zero, matching the inherited empty native stage
- **AND** equipment identities, other BV terms and source/export data SHALL be preserved
- **AND** a zero defensive pool SHALL remain exactly zero
- **AND** saved cached BV SHALL remain unchanged until an existing BV-affecting action or explicit recomputation
- **AND** native explosive-stage agreement SHALL NOT establish ammunition, equipment-pool or complete BV parity

#### Scenario: Shared thresholds preserve legacy validation

- **WHEN** standard TMM thresholds are consolidated
- **THEN** the validation BV helper SHALL use the shared upper-bound lookup on the greater of raw Run and Jump, without adding the construction jump bonus
- **AND** Run zero with Jump three SHALL remain TMM one and defensive speed factor 1.1
- **AND** either input being NaN SHALL retain TMM six and defensive speed factor 1.6
- **AND** negative, fractional, infinite and signed-zero inputs SHALL retain their prior results
- **AND** construction and gameplay SHALL preserve their distinct guards and interval conventions


#### Scenario: Shared thresholds preserve the BV validation adapter
- **GIVEN** the active `validate:bv` adapter selecting defensive calculator inputs
- **WHEN** standard TMM thresholds and their inverse bracket minima are consolidated
- **THEN** it SHALL consume the movement owner for both lookups
- **AND** it SHALL preserve the greater of Jump and UMU with a bonus only when that maximum is positive, then compare against running TMM
- **AND** its returned TMM and representative Run SHALL remain unchanged for boundaries, fractional, negative, signed-zero and nonfinite inputs, including TMM seven mapping to the final standard bracket minimum

### Requirement: ProtoMech Chassis Multiplier

ProtoMech final BV SHALL NOT receive a generic chassis multiplier. The public
chassis multiplier and breakdown field SHALL remain neutral compatibility
outputs of 1. Chassis-specific structure, armor and defensive movement SHALL
continue through their owning calculations.

#### Scenario: Glider and Ultraheavy summary

- **GIVEN** a Glider with rounded base BV 280 or a local Ultraheavy with rounded base BV 600
- **WHEN** baseline-skill final BV is calculated
- **THEN** final BV SHALL remain 280 or 600 respectively
- **AND** Biped and Quad SHALL also use the neutral summary multiplier

### Requirement: Vehicle Offensive BV

Vehicle offensive BV SHALL combine weapon BV, ammo BV, offensive equipment BV,
mount modifiers and half the unit's raw tonnage before applying the speed
factor. The mass contribution SHALL apply to Tank, SuperHeavyTank, VTOL and
support vehicles, including unarmed vehicles, without rounding the tonnage.
Single, Dual and Chin turret weapons SHALL
retain their listed BV before other applicable modifiers and SHALL NOT receive
a rotating-turret bonus. The consumed `turretModifier` breakdown field SHALL
remain available and equal 1 for these turret kinds.

#### Scenario: Ordinary turret weapons

- **GIVEN** a Single, Dual or Chin turret containing 100 BV of weapons
- **WHEN** offensive BV is computed without other weapon modifiers
- **THEN** the turret weapons SHALL contribute 100 BV before the speed factor

#### Scenario: Rear-arc weapon penalty

- **GIVEN** a combat vehicle with a rear-mounted AC/10 (no turret)
- **WHEN** offensive BV is computed
- **THEN** the rear-only weapon BV SHALL be multiplied by 0.5

#### Scenario: Turret weapons avoid the rear penalty

- **GIVEN** a turret-mounted weapon also carrying a rear-mounted flag
- **WHEN** offensive BV is computed
- **THEN** it SHALL receive neither the 0.5 rear penalty nor a turret bonus

#### Scenario: Preserve the separate sponson term

- **GIVEN** a sponson-mounted weapon containing 100 BV
- **WHEN** offensive BV is computed without other weapon modifiers
- **THEN** its existing 1.025 modifier SHALL remain unchanged in this slice

#### Scenario: Bound the parity claim

- **WHEN** this turret term is checked against pinned MegaMek 48fcb2f6
- **THEN** every Tank, SuperHeavyTank and VTOL oracle row SHALL be compared before and after
- **AND** units moving away SHALL be listed with their component differences
- **AND** correcting this term SHALL NOT establish complete vehicle BV parity

#### Scenario: Tamerlane offensive mass contribution

- **GIVEN** the 20-ton Tamerlane Strike Sled (Flamer) with weapon BV 98, no ammunition or offensive equipment BV and speed factor 2.72
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal `(98 + 20 / 2) × 2.72 = 293.76`, matching pinned MegaMek
- **AND** the existing defensive terms SHALL remain unchanged

#### Scenario: Unarmed VTOL and fractional support mass

- **GIVEN** the unarmed 5-ton Ferret Light Scout VTOL (Cargo) with speed factor 3.44
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal `5 / 2 × 3.44 = 8.6`
- **GIVEN** a 0.06-ton support vehicle without weapons and with speed factor 1
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal 0.03 regardless of its BAR rating

#### Scenario: Isolate mass parity evidence

- **WHEN** the mass contribution is checked against pinned MegaMek 48fcb2f6
- **THEN** every Tank, SuperHeavyTank, VTOL, SupportTank and SupportVTOL oracle row emitted by the converter SHALL be compared before and after
- **AND** defense, weapon BV, ammo BV, offensive equipment BV, mount modifiers, speed factor and pilot multiplier SHALL remain unchanged
- **AND** every unit moving away SHALL be explained with its component values
- **AND** the mass correction SHALL NOT establish complete vehicle BV parity
