## MODIFIED Requirements

### Requirement: Unit Identity Display
The banner SHALL display unit name, tonnage, tech base mode, and validation status on the left.

#### Scenario: Identity rendering
- **WHEN** unit is loaded
- **THEN** chassis name appears as lg font bold heading
- **AND** subtitle row shows tonnage in "X tons" format
- **AND** tech base badge displays current TechBaseMode (IS/Clan/Mixed)
- **AND** validation badge shows Valid or error count

#### Scenario: Tech base badge colors
- **WHEN** tech base mode is INNER_SPHERE
- **THEN** badge displays "IS" with blue background (bg-blue-700)
- **WHEN** tech base mode is CLAN
- **THEN** badge displays "Clan" with green background (bg-green-700)
- **WHEN** tech base mode is MIXED
- **THEN** badge displays "Mixed" with purple background (bg-purple-700)

#### Scenario: Effective mixed detection
- **WHEN** computing tech base mode for display
- **THEN** if techBaseMode is explicitly MIXED, display "Mixed"
- **AND** if any component tech bases differ from each other, display "Mixed"
- **AND** otherwise display the declared tech base mode (IS or Clan)

## ADDED Requirements

### Requirement: Tech Base Mode Stats Integration
The UnitStats interface SHALL use TechBaseMode instead of binary TechBase for banner display.

#### Scenario: UnitStats techBaseMode field
- **WHEN** UnitStats object is constructed
- **THEN** `techBaseMode` field contains TechBaseMode enum value
- **AND** field type is TechBaseMode (not TechBase)
- **AND** value reflects effective mixed state detection

#### Scenario: Effective tech base mode computation
- **WHEN** computing effectiveTechBaseMode for UnitStats
- **THEN** check if techBaseMode from store is MIXED
- **AND** check if componentTechBases contains different tech bases using isEffectivelyMixed()
- **AND** return MIXED if either condition is true
- **AND** otherwise return the store's techBaseMode

#### Scenario: TechBaseBadge prop interface
- **WHEN** TechBaseBadge component renders
- **THEN** it accepts `techBaseMode: TechBaseMode` prop
- **AND** uses getTechBaseModeColors() for styling
- **AND** uses getTechBaseModeShortName() for display text

