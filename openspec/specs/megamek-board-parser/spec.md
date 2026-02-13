# MegaMek Board Parser Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: [terrain-system]
**Affects**: [scenario-generation, tactical-map-interface]

---

## Overview

### Purpose

Defines the parsing logic for MegaMek .board files, which encode hexagonal battlefield maps with terrain features, elevation, and building construction factors. This specification enables MekStation to import and use MegaMek-compatible map files for tactical gameplay.

### Scope

**In Scope:**

- .board file format structure and syntax
- Hex coordinate parsing and conversion (offset to axial)
- Elevation parsing and validation
- Terrain feature string parsing
- Terrain type mapping to MekStation TerrainType enum
- Building construction factor extraction
- Multi-terrain hex support
- Board dimension parsing

**Out of Scope:**

- Visual rendering of parsed boards (see tactical-map-interface)
- Board generation or creation tools
- Advanced terrain features not in TechManual (Tactical Operations terrain)
- Board validation beyond syntax checking
- Terrain transformation during gameplay

### Key Concepts

- **.board File**: MegaMek's text-based map format encoding hex terrain data
- **Offset Coordinates**: MegaMek's coordinate system (CCRRR format, 1-indexed)
- **Axial Coordinates**: MekStation's internal hex coordinate system (q, r)
- **Terrain String**: Semicolon-delimited terrain feature list (e.g., "woods:1;water:2")
- **Construction Factor**: Building structural integrity value (bldg_cf)
- **Terrain Level**: Numeric intensity/depth modifier for terrain features

---

## Requirements

### Requirement: Board Dimension Parsing

The parser SHALL extract board width and height from the size declaration line.

**Rationale**: Board dimensions define the valid coordinate space and are required before parsing hex data.

**Priority**: Critical

#### Scenario: Valid size declaration

**GIVEN** a .board file with line "size 16 17"
**WHEN** parsing the file
**THEN** the parser SHALL set width to 16
**AND** the parser SHALL set height to 17

#### Scenario: Missing size declaration

**GIVEN** a .board file without a "size" line
**WHEN** parsing the file
**THEN** the parser SHALL throw error "Missing size declaration"

#### Scenario: Invalid size format

**GIVEN** a .board file with line "size invalid"
**WHEN** parsing the file
**THEN** the parser SHALL throw error "Invalid size format"

#### Scenario: Size must precede hex data

**GIVEN** a .board file with hex lines before the size line
**WHEN** parsing the file
**THEN** the parser SHALL throw error "Missing size declaration"

---

### Requirement: Hex Coordinate Parsing

The parser SHALL parse hex coordinates in MegaMek's 4-digit offset format (CCRRR) and convert to axial coordinates.

**Rationale**: MegaMek uses 1-indexed offset coordinates (column, row), while MekStation uses 0-indexed axial coordinates (q, r) for hex grid calculations.

**Priority**: Critical

#### Scenario: Parse coordinate 0101 (origin)

**GIVEN** a hex line "hex 0101 0 "" """
**WHEN** parsing the coordinate
**THEN** the parser SHALL extract column 1, row 1
**AND** convert to axial coordinate q=0, r=0

#### Scenario: Parse coordinate 0201

**GIVEN** a hex line "hex 0201 0 "" """
**WHEN** parsing the coordinate
**THEN** the parser SHALL extract column 2, row 1
**AND** convert to axial coordinate q=1, r=0

#### Scenario: Parse coordinate 0102

**GIVEN** a hex line "hex 0102 0 "" """
**WHEN** parsing the coordinate
**THEN** the parser SHALL extract column 1, row 2
**AND** convert to axial coordinate q=0, r=1

#### Scenario: Parse coordinate 0303

**GIVEN** a hex line "hex 0303 0 "" """
**WHEN** parsing the coordinate
**THEN** the parser SHALL extract column 3, row 3
**AND** convert to axial coordinate q=2, r=1

#### Scenario: Invalid coordinate format

**GIVEN** a hex line "hex XXXX 0 "" """
**WHEN** parsing the coordinate
**THEN** the parser SHALL throw error "Invalid hex coordinate"

---

### Requirement: Elevation Parsing

The parser SHALL extract elevation values from hex data and validate numeric format.

**Rationale**: Elevation affects line-of-sight, movement costs, and fall damage calculations.

**Priority**: Critical

#### Scenario: Parse zero elevation

**GIVEN** a hex line "hex 0101 0 "" """
**WHEN** parsing the elevation
**THEN** the parser SHALL set elevation to 0

#### Scenario: Parse positive elevation

**GIVEN** a hex line "hex 0101 3 "" """
**WHEN** parsing the elevation
**THEN** the parser SHALL set elevation to 3

#### Scenario: Invalid elevation format

**GIVEN** a hex line "hex 0101 invalid "" """
**WHEN** parsing the elevation
**THEN** the parser SHALL throw error "Invalid elevation"

---

### Requirement: Terrain String Parsing

The parser SHALL parse semicolon-delimited terrain feature strings and extract terrain type and level.

**Rationale**: MegaMek encodes multiple terrain features per hex using semicolon-separated type:level pairs.

**Priority**: Critical

#### Scenario: Parse empty terrain

**GIVEN** a hex line with terrain string '""' or '""'
**WHEN** parsing terrain features
**THEN** the parser SHALL return empty features array

#### Scenario: Parse single terrain feature

**GIVEN** a hex line with terrain string '"woods:1"'
**WHEN** parsing terrain features
**THEN** the parser SHALL extract terrain type "woods" with level 1

#### Scenario: Parse multiple terrain features

**GIVEN** a hex line with terrain string '"woods:1;water:2"'
**WHEN** parsing terrain features
**THEN** the parser SHALL extract two features
**AND** first feature SHALL be type "woods" with level 1
**AND** second feature SHALL be type "water" with level 2

#### Scenario: Ignore unknown terrain types

**GIVEN** a hex line with terrain string '"unknown:1;woods:1"'
**WHEN** parsing terrain features
**THEN** the parser SHALL skip "unknown" terrain
**AND** extract only "woods:1" feature

#### Scenario: Handle invalid level format

**GIVEN** a hex line with terrain string '"woods:invalid"'
**WHEN** parsing terrain features
**THEN** the parser SHALL skip the feature with invalid level

---

### Requirement: Terrain Type Mapping

The parser SHALL map MegaMek terrain type strings to MekStation TerrainType enum values.

**Rationale**: MegaMek uses string identifiers while MekStation uses typed enums for type safety.

**Priority**: Critical

#### Scenario: Map woods terrain with level distinction

**GIVEN** terrain string "woods:1"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.LightWoods

**GIVEN** terrain string "woods:2"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.HeavyWoods

#### Scenario: Map water terrain

**GIVEN** terrain string "water:2"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Water
**AND** preserve level 2

#### Scenario: Map rough terrain

**GIVEN** terrain string "rough:1"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Rough

#### Scenario: Map rubble terrain

**GIVEN** terrain string "rubble:3"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Rubble
**AND** preserve level 3

#### Scenario: Map pavement terrain

**GIVEN** terrain string "pavement:1"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Pavement

#### Scenario: Map road terrain

**GIVEN** terrain string "road:1"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Road

#### Scenario: Map building terrain

**GIVEN** terrain string "building:2"
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map to TerrainType.Building
**AND** preserve level 2

#### Scenario: Map environmental terrain types

**GIVEN** terrain strings for environmental types
**WHEN** mapping to TerrainType
**THEN** the parser SHALL map:

- "mud:1" → TerrainType.Mud
- "sand:1" → TerrainType.Sand
- "snow:1" → TerrainType.Snow
- "ice:1" → TerrainType.Ice
- "swamp:2" → TerrainType.Swamp

---

### Requirement: Building Construction Factor Parsing

The parser SHALL extract building construction factor (CF) values and attach to building terrain features.

**Rationale**: Building CF determines structural integrity and damage resistance per TechManual rules.

**Priority**: High

#### Scenario: Parse building with construction factor

**GIVEN** terrain string '"building:2;bldg_cf:40"'
**WHEN** parsing terrain features
**THEN** the parser SHALL create building feature with level 2
**AND** attach constructionFactor property with value 40

#### Scenario: Parse building without construction factor

**GIVEN** terrain string '"building:1"'
**WHEN** parsing terrain features
**THEN** the parser SHALL create building feature with level 1
**AND** constructionFactor property SHALL be undefined

#### Scenario: Parse bldg_cf without building terrain

**GIVEN** terrain string '"bldg_cf:40"'
**WHEN** parsing terrain features
**THEN** the parser SHALL skip the bldg_cf entry
**AND** return empty features array

#### Scenario: Parse building with CF and other terrain

**GIVEN** terrain string '"building:2;bldg_cf:40;rubble:1"'
**WHEN** parsing terrain features
**THEN** the parser SHALL create two features
**AND** building feature SHALL have constructionFactor 40
**AND** rubble feature SHALL not have constructionFactor

---

### Requirement: Line Filtering and Parsing

The parser SHALL skip comment lines, option lines, and end markers while processing hex data.

**Rationale**: .board files contain metadata and configuration that should not be parsed as hex data.

**Priority**: Medium

#### Scenario: Skip option lines

**GIVEN** a .board file with line "option exit_roads_to_pavement false"
**WHEN** parsing the file
**THEN** the parser SHALL skip the option line
**AND** not create hex data from it

#### Scenario: Skip end marker

**GIVEN** a .board file with line "end"
**WHEN** parsing the file
**THEN** the parser SHALL skip the end line
**AND** not create hex data from it

#### Scenario: Skip empty lines

**GIVEN** a .board file with blank lines
**WHEN** parsing the file
**THEN** the parser SHALL skip empty lines
**AND** not create hex data from them

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Parsed board data structure containing dimensions and hex terrain
 */
interface ParsedBoard {
  /**
   * Board width in hexes
   * @example 16
   */
  readonly width: number;

  /**
   * Board height in hexes
   * @example 17
   */
  readonly height: number;

  /**
   * Array of hex terrain data
   */
  readonly hexes: IHexTerrain[];
}

/**
 * Hex terrain data with coordinate, elevation, and features
 */
interface IHexTerrain {
  /**
   * Axial coordinate (q, r)
   * @example { q: 0, r: 0 }
   */
  readonly coordinate: { q: number; r: number };

  /**
   * Elevation level (0 = ground level)
   * @example 3
   */
  readonly elevation: number;

  /**
   * Terrain features present in this hex
   */
  readonly features: ITerrainFeature[];
}

/**
 * Individual terrain feature with type and level
 */
interface ITerrainFeature {
  /**
   * Terrain type from TerrainType enum
   */
  readonly type: TerrainType;

  /**
   * Terrain level/intensity
   * @example 1
   */
  readonly level: number;

  /**
   * Building construction factor (buildings only)
   * @example 40
   */
  readonly constructionFactor?: number;
}
```

### Required Properties

| Property             | Type            | Required | Description                  | Valid Values      | Default   |
| -------------------- | --------------- | -------- | ---------------------------- | ----------------- | --------- |
| `width`              | `number`        | Yes      | Board width in hexes         | Integer > 0       | N/A       |
| `height`             | `number`        | Yes      | Board height in hexes        | Integer > 0       | N/A       |
| `hexes`              | `IHexTerrain[]` | Yes      | Array of hex terrain data    | Any array         | `[]`      |
| `coordinate`         | `object`        | Yes      | Axial coordinate             | `{ q, r }`        | N/A       |
| `elevation`          | `number`        | Yes      | Elevation level              | Integer           | N/A       |
| `features`           | `array`         | Yes      | Terrain features             | Any array         | `[]`      |
| `type`               | `TerrainType`   | Yes      | Terrain type enum            | Valid TerrainType | N/A       |
| `level`              | `number`        | Yes      | Terrain level                | Integer >= 0      | N/A       |
| `constructionFactor` | `number`        | No       | Building CF (buildings only) | Integer > 0       | undefined |

### Type Constraints

- `width` MUST be a positive integer
- `height` MUST be a positive integer
- `elevation` MUST be an integer (can be negative for depressions)
- `coordinate.q` MUST be an integer >= 0
- `coordinate.r` MUST be an integer >= 0
- `level` MUST be an integer >= 0
- `constructionFactor` MUST be a positive integer when present
- `features` array MAY be empty for clear terrain hexes

---

## Calculation Formulas

### Offset to Axial Coordinate Conversion

**Formula**:

```
q = col - 1
r = row - 1 - floor((col - 1) / 2)
```

**Where**:

- `col` = MegaMek column coordinate (1-indexed)
- `row` = MegaMek row coordinate (1-indexed)
- `q` = Axial q coordinate (0-indexed)
- `r` = Axial r coordinate (0-indexed)

**Example**:

```
Input: col = 3, row = 3 (coordinate "0303")
Calculation:
  q = 3 - 1 = 2
  r = 3 - 1 - floor(2 / 2) = 2 - 1 = 1
Output: { q: 2, r: 1 }
```

**Special Cases**:

- Column 1 (odd column): r = row - 1
- Column 2+ (even columns): r offset decreases by floor((col-1)/2)

---

## Validation Rules

### Validation: Board File Structure

**Rule**: The .board file MUST contain a "size" declaration before any "hex" lines.

**Error Message**: "Missing size declaration"

**Validation Logic**:

```typescript
if (!foundSize && line.startsWith('hex ')) {
  throw new Error('Missing size declaration');
}
```

---

### Validation: Size Format

**Rule**: The "size" line MUST contain exactly two positive integers.

**Error Message**: "Invalid size format"

**Validation Logic**:

```typescript
const parts = line.substring(5).trim().split(/\s+/);
if (parts.length !== 2) {
  throw new Error('Invalid size format');
}

const width = parseInt(parts[0], 10);
const height = parseInt(parts[1], 10);

if (isNaN(width) || isNaN(height)) {
  throw new Error('Invalid size format');
}
```

---

### Validation: Hex Coordinate Format

**Rule**: Hex coordinates MUST be exactly 4 digits (CCRRR format).

**Error Message**: "Invalid hex coordinate"

**Validation Logic**:

```typescript
if (!/^\d{4}$/.test(coordStr)) {
  throw new Error('Invalid hex coordinate');
}
```

---

### Validation: Elevation Format

**Rule**: Elevation MUST be a valid integer.

**Error Message**: "Invalid elevation"

**Validation Logic**:

```typescript
const elevation = parseInt(elevationStr, 10);
if (isNaN(elevation)) {
  throw new Error('Invalid elevation');
}
```

---

## Terrain Type Mapping

### MegaMek to TerrainType Mapping Table

| MegaMek String | Level | TerrainType  | Notes                        |
| -------------- | ----- | ------------ | ---------------------------- |
| `woods`        | 1     | `LightWoods` | Level determines light/heavy |
| `woods`        | 2+    | `HeavyWoods` | Level 2 or higher            |
| `water`        | any   | `Water`      | Level indicates depth        |
| `rough`        | any   | `Rough`      | Level preserved              |
| `rubble`       | any   | `Rubble`     | Level preserved              |
| `pavement`     | any   | `Pavement`   | Level preserved              |
| `road`         | any   | `Road`       | Level preserved              |
| `building`     | any   | `Building`   | Level preserved, CF optional |
| `mud`          | any   | `Mud`        | Level preserved              |
| `sand`         | any   | `Sand`       | Level preserved              |
| `snow`         | any   | `Snow`       | Level preserved              |
| `ice`          | any   | `Ice`        | Level preserved              |
| `swamp`        | any   | `Swamp`      | Level preserved              |
| `bldg_cf`      | N/A   | (metadata)   | Attached to building feature |

### Mapping Implementation

```typescript
const TERRAIN_MAP: Record<string, (level: number) => TerrainType | null> = {
  woods: (level) =>
    level === 1 ? TerrainType.LightWoods : TerrainType.HeavyWoods,
  water: () => TerrainType.Water,
  rough: () => TerrainType.Rough,
  rubble: () => TerrainType.Rubble,
  pavement: () => TerrainType.Pavement,
  road: () => TerrainType.Road,
  building: () => TerrainType.Building,
  mud: () => TerrainType.Mud,
  sand: () => TerrainType.Sand,
  snow: () => TerrainType.Snow,
  ice: () => TerrainType.Ice,
  swamp: () => TerrainType.Swamp,
};
```

---

## Implementation Notes

### Performance Considerations

- **Line-by-line parsing**: Process file line-by-line to minimize memory usage for large boards
- **Regex validation**: Use compiled regex patterns for coordinate validation
- **Early validation**: Validate size declaration before processing hex data
- **Lazy parsing**: Only parse terrain strings when hex data is needed

### Edge Cases

- **Empty terrain strings**: Handle both `""` and `""` as empty terrain
- **Trailing semicolons**: Ignore empty parts after splitting terrain string
- **Unknown terrain types**: Skip unknown terrain types silently (forward compatibility)
- **Missing end marker**: Parser should work even if "end" line is missing
- **Whitespace handling**: Trim lines and handle variable whitespace in size/hex lines

### Common Pitfalls

- **1-indexed vs 0-indexed**: MegaMek coordinates are 1-indexed, axial coordinates are 0-indexed
- **Coordinate format**: Must be exactly 4 digits (0101, not 11 or 1-1)
- **Woods level mapping**: Level 1 = LightWoods, level 2+ = HeavyWoods (not linear mapping)
- **Building CF attachment**: CF must be attached to building feature, not stored separately
- **Multi-terrain parsing**: Semicolon-delimited, order may vary

---

## Examples

### Example 1: Parse Simple Board

**Input (.board file)**:

```
size 2 2
hex 0101 0 "woods:1" ""
hex 0102 1 "water:2" ""
end
```

**Output (ParsedBoard)**:

```typescript
{
  width: 2,
  height: 2,
  hexes: [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [
        { type: TerrainType.LightWoods, level: 1 }
      ]
    },
    {
      coordinate: { q: 0, r: 1 },
      elevation: 1,
      features: [
        { type: TerrainType.Water, level: 2 }
      ]
    }
  ]
}
```

---

### Example 2: Parse Multi-Terrain Hex

**Input (.board file)**:

```
size 2 2
hex 0101 0 "woods:1;water:1" ""
end
```

**Output (ParsedBoard)**:

```typescript
{
  width: 2,
  height: 2,
  hexes: [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [
        { type: TerrainType.LightWoods, level: 1 },
        { type: TerrainType.Water, level: 1 }
      ]
    }
  ]
}
```

---

### Example 3: Parse Building with Construction Factor

**Input (.board file)**:

```
size 2 2
hex 0101 0 "building:2;bldg_cf:40" ""
end
```

**Output (ParsedBoard)**:

```typescript
{
  width: 2,
  height: 2,
  hexes: [
    {
      coordinate: { q: 0, r: 0 },
      elevation: 0,
      features: [
        {
          type: TerrainType.Building,
          level: 2,
          constructionFactor: 40
        }
      ]
    }
  ]
}
```

---

### Example 4: Complete Parser Implementation

```typescript
export function parseMegaMekBoard(content: string): ParsedBoard {
  const lines = content.split('\n').map((line) => line.trim());

  let width = 0;
  let height = 0;
  const hexes: IHexTerrain[] = [];
  let foundSize = false;

  for (const line of lines) {
    // Skip empty lines, options, and end marker
    if (!line || line.startsWith('option') || line === 'end') {
      continue;
    }

    // Parse size declaration
    if (line.startsWith('size ')) {
      const parts = line.substring(5).trim().split(/\s+/);
      if (parts.length !== 2) {
        throw new Error('Invalid size format');
      }

      width = parseInt(parts[0], 10);
      height = parseInt(parts[1], 10);

      if (isNaN(width) || isNaN(height)) {
        throw new Error('Invalid size format');
      }

      foundSize = true;
      continue;
    }

    // Parse hex data
    if (line.startsWith('hex ')) {
      if (!foundSize) {
        throw new Error('Missing size declaration');
      }

      const parts = line.substring(4).trim().split(/\s+/);
      if (parts.length < 3) {
        continue;
      }

      const coordStr = parts[0];
      const elevationStr = parts[1];
      const terrainStr = parts.slice(2).join(' ');

      // Validate coordinate format
      if (!/^\d{4}$/.test(coordStr)) {
        throw new Error('Invalid hex coordinate');
      }

      // Parse coordinate
      const col = parseInt(coordStr.substring(0, 2), 10);
      const row = parseInt(coordStr.substring(2, 4), 10);
      const elevation = parseInt(elevationStr, 10);

      if (isNaN(elevation)) {
        throw new Error('Invalid elevation');
      }

      // Convert to axial coordinates
      const coordinate = convertOffsetToAxial(col, row);

      // Parse terrain features
      const { features, buildingCF } = parseTerrainString(terrainStr);

      // Attach building CF if present
      if (buildingCF !== undefined) {
        const buildingFeature = features.find(
          (f) => f.type === TerrainType.Building,
        );
        if (buildingFeature) {
          const index = features.indexOf(buildingFeature);
          features[index] = {
            ...buildingFeature,
            constructionFactor: buildingCF,
          };
        }
      }

      hexes.push({
        coordinate,
        elevation,
        features,
      });
    }
  }

  if (!foundSize) {
    throw new Error('Missing size declaration');
  }

  return { width, height, hexes };
}

function convertOffsetToAxial(
  col: number,
  row: number,
): { q: number; r: number } {
  const q = col - 1;
  const r = row - 1 - Math.floor((col - 1) / 2);
  return { q, r };
}

function parseTerrainString(terrainStr: string): {
  features: ITerrainFeature[];
  buildingCF?: number;
} {
  if (!terrainStr || terrainStr === '""' || terrainStr === '') {
    return { features: [] };
  }

  const cleaned = terrainStr.replace(/^"|"$/g, '');
  if (!cleaned) {
    return { features: [] };
  }

  const parts = cleaned.split(';');
  const features: ITerrainFeature[] = [];
  let buildingCF: number | undefined;

  for (const part of parts) {
    const [terrainType, levelStr] = part.split(':');

    // Handle building CF metadata
    if (terrainType === 'bldg_cf') {
      buildingCF = parseInt(levelStr, 10);
      continue;
    }

    // Map terrain type
    const mapper = TERRAIN_MAP[terrainType];
    if (!mapper) {
      continue; // Skip unknown terrain types
    }

    const level = parseInt(levelStr, 10);
    if (isNaN(level)) {
      continue; // Skip invalid levels
    }

    const type = mapper(level);
    if (!type) {
      continue;
    }

    features.push({ type, level });
  }

  return { features, buildingCF };
}
```

---

## References

### Official Rules

- MegaMek .board file format (MegaMek source code)
- TechManual terrain rules (referenced by terrain-system spec)

### Related Specifications

- **terrain-system**: Defines TerrainType enum and terrain mechanics
- **scenario-generation**: Uses parsed boards for scenario setup
- **tactical-map-interface**: Renders parsed board data

### External Resources

- MegaMek GitHub repository: https://github.com/MegaMek/megamek
- MegaMek board file examples: megamek/data/boards/

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Defined .board file format parsing
- Specified coordinate conversion (offset to axial)
- Defined terrain type mapping
- Specified building construction factor handling
- Added comprehensive examples and validation rules
