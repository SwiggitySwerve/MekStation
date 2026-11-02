## ADDED Requirements

### Requirement: Combat Vehicle Turret Source Normalization

Combat vehicle turret consumers SHALL use the existing BLK vehicle armor/location owners and SHALL preserve the source document. They SHALL NOT introduce another threshold table or infer installation from an Omni allowance. Owner ruling 5 SHALL remain enforced: no generic tonnage-based turret capacity is synthesized.

#### Scenario: Existing supported geometry

- **GIVEN** ordinary or superheavy combat Tank geometry, or VTOL rotor/chin geometry accepted by the shared layout owner
- **WHEN** source facts are consumed
- **THEN** the current four-side, six-side, turret, secondary-turret and rotor identities are retained
- **AND** supported superheavy or six-side geometry is not rejected as an ordinary-only limitation

#### Scenario: Empty installed turrets and facing

- **GIVEN** source layout that installs an empty primary, secondary or chin turret
- **WHEN** the installed layout reaches its handler integration
- **THEN** zero armor or empty equipment does not uninstall that turret
- **AND** Rear Turret remains primary and Front Turret remains secondary, while a normalized Rear body mount remains rear-facing

#### Scenario: Existing refused-layout inspection

- **GIVEN** armor length or source legality which the current loaders retain for inspection with diagnostics
- **WHEN** allowance context is projected
- **THEN** the existing inspection and validation behavior remains with its current owner
- **AND** allowance projection does not substitute a new geometry classifier or numeric legality policy

### Requirement: Independent Combat Omni Turret Source Context

The combat source adapter SHALL read Omni by case-insensitive tag presence and SHALL preserve independent finite decimal primary and secondary base-chassis allowances. The store context SHALL keep absent allowances undefined, explicit zero distinct from absence, and raw-source negative sentinels intact. The normalized unit-contract boundary retains its existing constraints. Legacy compatibility fields SHALL NOT supply allowance values.

#### Scenario: Zero allowance does not install a turret

- **GIVEN** a source without installed turrets and a primary or secondary allowance of zero
- **WHEN** context is projected and supplied to a store
- **THEN** zero remains explicit and neither turret is installed by that fact

#### Scenario: Presence, casing and first numeric line

- **GIVEN** an Omni tag with empty or false payload and mixed-case allowance tags containing finite decimal lines
- **WHEN** source context is projected
- **THEN** Omni is true and the first primary/secondary value is retained exactly, including a negative raw-source sentinel
- **AND** every supplied numeric line is checked before accepting the first value

#### Scenario: Explicit malformed or ambiguous allowance failure

- **GIVEN** an empty, malformed or nonfinite allowance line, or duplicate case variants of a consumed scalar allowance tag
- **WHEN** source context is projected
- **THEN** projection fails explicitly and returns the original document unchanged
- **AND** diagnostics name the strict finite-decimal boundary and its difference from permissive Java numeric loading

#### Scenario: VTOL secondary allowance is ignored

- **GIVEN** a VTOL source with a secondary allowance tag, including an unusable payload
- **WHEN** source context is projected
- **THEN** the raw tag remains in the original document and an ignored-tag warning is emitted
- **AND** no secondary allowance or turret is materialized from it

#### Scenario: Construction, persistence, duplication and definition mapping

- **GIVEN** explicit Omni context with finite primary and secondary allowances
- **WHEN** a store is constructed, persisted, reopened or duplicated, or a normalized definition is mapped into it
- **THEN** Omni identity, absent/zero distinctions and applicable allowances remain independent of installed turret configuration
- **AND** normalized `baseChassisTurret2Weight` is mapped to the store's `baseChassisSecondaryTurretWeight` without changing either contract's name

### Requirement: Unknown Support Equipment Blocks Fail Explicitly

Support handlers SHALL preserve every currently supported normalized location, including second turrets, rotors and six-side locations. A nonempty block unknown after existing normalization SHALL produce an explicit parse error instead of assigning its equipment to Body. Empty unknown blocks SHALL remain harmless and the caller's source document SHALL remain unchanged.

#### Scenario: Unknown nonempty block

- **GIVEN** a support source with equipment in a block outside the current support location map
- **WHEN** the support handler materializes equipment
- **THEN** parsing fails with a diagnostic naming the original block
- **AND** that equipment is not reassigned to Body

#### Scenario: Supported and empty blocks retain current behavior

- **GIVEN** supported rotor, second-turret or six-side locations, or an empty unknown block
- **WHEN** the support source is parsed
- **THEN** supported identities retain current behavior and the empty unknown block does not produce an error
