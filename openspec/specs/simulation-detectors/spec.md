# simulation-detectors Specification

## Purpose

Defines algorithms and patterns for detecting and parsing BattleTech simulation file formats (MegaMek BLK, MegaMek MTF) to enable import, validation, and round-trip conversion of unit data.

## Requirements

### Requirement: BLK Format Detection

The system SHALL detect MegaMek BLK (Building Block) format files with high confidence.

#### Scenario: BLK file extension detection

- **GIVEN** a file with `.blk` extension
- **WHEN** performing format detection
- **THEN** confidence score SHALL be 0.9 (high)
- **AND** format SHALL be identified as "MegaMek BLK"

#### Scenario: BLK content signature detection

- **GIVEN** file content containing `<BlockVersion>` tag
- **WHEN** performing content-based detection
- **THEN** confidence score SHALL be 1.0 (certain)
- **AND** format SHALL be identified as "MegaMek BLK"

#### Scenario: BLK UnitType tag detection

- **GIVEN** file content containing `<UnitType>Tank</UnitType>` or similar unit type tag
- **WHEN** performing content-based detection
- **THEN** confidence score SHALL be 1.0 (certain)
- **AND** unit type SHALL be extracted from tag value
- **AND** unit type SHALL be mapped to internal UnitType enum

#### Scenario: BLK comment detection

- **GIVEN** file content with lines starting with `#`
- **WHEN** parsing BLK content
- **THEN** comment lines SHALL be ignored
- **AND** comments SHALL NOT affect format detection

### Requirement: MTF Format Detection

The system SHALL detect MegaMek MTF (Text Format) format files with high confidence.

#### Scenario: MTF file extension detection

- **GIVEN** a file with `.mtf` extension
- **WHEN** performing format detection
- **THEN** confidence score SHALL be 0.9 (high)
- **AND** format SHALL be identified as "MegaMek MTF"

#### Scenario: MTF location header detection

- **GIVEN** file content containing location headers like "Left Arm:", "Center Torso:", "Head:"
- **WHEN** performing content-based detection
- **THEN** confidence score SHALL be 1.0 (certain)
- **AND** format SHALL be identified as "MegaMek MTF"

#### Scenario: MTF chassis field detection

- **GIVEN** file content containing `chassis:` field
- **WHEN** performing content-based detection
- **THEN** confidence score SHALL be 0.95 (very high)
- **AND** format SHALL be identified as "MegaMek MTF"

#### Scenario: MTF configuration detection

- **GIVEN** file content containing `Config:Biped` or `Config:Quad Omnimech`
- **WHEN** parsing MTF header
- **THEN** configuration SHALL be extracted
- **AND** OmniMech status SHALL be detected from "Omnimech" suffix

### Requirement: BLK Unit Type Mapping

The system SHALL map BLK unit type strings to internal UnitType enum values.

#### Scenario: Vehicle type mapping

- **GIVEN** BLK UnitType value "Tank"
- **WHEN** mapping to internal enum
- **THEN** result SHALL be `UnitType.VEHICLE`

#### Scenario: Aerospace type mapping

- **GIVEN** BLK UnitType value "Aero" or "AeroSpaceFighter"
- **WHEN** mapping to internal enum
- **THEN** result SHALL be `UnitType.AEROSPACE`

#### Scenario: Battle Armor type mapping

- **GIVEN** BLK UnitType value "BattleArmor"
- **WHEN** mapping to internal enum
- **THEN** result SHALL be `UnitType.BATTLE_ARMOR`

#### Scenario: Case-insensitive type mapping

- **GIVEN** BLK UnitType value with non-standard casing (e.g., "battlemech", "VTOL")
- **WHEN** mapping to internal enum
- **THEN** mapping SHALL succeed via case-insensitive search
- **AND** result SHALL match canonical UnitType value

#### Scenario: Unknown unit type handling

- **GIVEN** BLK UnitType value not in BLK_UNIT_TYPE_MAP
- **WHEN** mapping to internal enum
- **THEN** mapping SHALL return undefined
- **AND** parse error SHALL be generated: "Unknown unit type: {value}"

### Requirement: BLK Tag Extraction

The system SHALL extract XML-like tags from BLK content with multi-line value support.

#### Scenario: Single-line tag extraction

- **GIVEN** BLK content `<Name>Atlas</Name>`
- **WHEN** extracting tags
- **THEN** tag "Name" SHALL have value "Atlas"

#### Scenario: Multi-line tag extraction

- **GIVEN** BLK content with multi-line armor array:
  ```
  <armor>
  32
  24
  24
  </armor>
  ```
- **WHEN** extracting tags
- **THEN** tag "armor" SHALL have value "32\n24\n24"
- **AND** value SHALL be parsed as array of numbers [32, 24, 24]

#### Scenario: Equipment block extraction

- **GIVEN** BLK content with equipment block:
  ```
  <Front Equipment>
  Medium Laser
  SRM 6
  </Front Equipment>
  ```
- **WHEN** extracting tags
- **THEN** tag "Front Equipment" SHALL be recognized as equipment block
- **AND** value SHALL be array ["Medium Laser", "SRM 6"]
- **AND** location name SHALL be "Front" (extracted from tag name)

#### Scenario: Tag pattern matching

- **GIVEN** BLK content with tags
- **WHEN** extracting tags
- **THEN** regex pattern `/<([^>]+)>\s*([\s\S]*?)\s*<\/\1>/g` SHALL be used
- **AND** pattern SHALL match opening and closing tags with same name
- **AND** pattern SHALL capture tag name and content

### Requirement: BLK Equipment Location Mapping

The system SHALL map BLK equipment block tags to location names.

#### Scenario: Vehicle equipment locations

- **GIVEN** BLK equipment blocks for vehicle
- **WHEN** parsing equipment
- **THEN** valid locations SHALL be: Front, Left, Right, Rear, Turret, Body

#### Scenario: Aerospace equipment locations

- **GIVEN** BLK equipment blocks for aerospace fighter
- **WHEN** parsing equipment
- **THEN** valid locations SHALL be: Nose, Left Wing, Right Wing, Aft, Wings, Fuselage

#### Scenario: Battle Armor equipment locations

- **GIVEN** BLK equipment blocks for battle armor
- **WHEN** parsing equipment
- **THEN** valid locations SHALL be: Squad, Body, Left Arm, Right Arm, Turret
- **AND** trooper-specific locations SHALL be: Trooper 1 Equipment, Trooper 2 Equipment, etc.

#### Scenario: Equipment block tag recognition

- **GIVEN** tag name ending with " Equipment"
- **WHEN** checking if tag is equipment block
- **THEN** tag SHALL be recognized as equipment block
- **AND** location name SHALL be extracted by removing " Equipment" suffix

### Requirement: MTF Location Header Parsing

The system SHALL parse MTF location headers and critical slot assignments.

#### Scenario: Biped location headers

- **GIVEN** MTF content with biped location headers
- **WHEN** parsing critical slots
- **THEN** valid headers SHALL be: "Left Arm:", "Right Arm:", "Left Torso:", "Right Torso:", "Center Torso:", "Head:", "Left Leg:", "Right Leg:"
- **AND** each header SHALL map to internal location enum

#### Scenario: Quad location headers

- **GIVEN** MTF content with quad location headers
- **WHEN** parsing critical slots
- **THEN** valid headers SHALL be: "Front Left Leg:", "Front Right Leg:", "Rear Left Leg:", "Rear Right Leg:"
- **AND** each header SHALL map to internal location enum

#### Scenario: Slot count validation

- **GIVEN** parsed critical slots for location
- **WHEN** validating slot count
- **THEN** HEAD SHALL have 6 slots
- **AND** CENTER_TORSO SHALL have 12 slots
- **AND** LEFT_TORSO and RIGHT_TORSO SHALL have 12 slots each
- **AND** LEFT_ARM and RIGHT_ARM SHALL have 12 slots each
- **AND** LEFT_LEG and RIGHT_LEG SHALL have 6 slots each
- **AND** quad leg locations SHALL have 6 slots each

#### Scenario: Empty slot parsing

- **GIVEN** MTF slot entry "-Empty-"
- **WHEN** parsing critical slots
- **THEN** slot SHALL be represented as null
- **AND** slot SHALL count toward location slot total

### Requirement: MTF Field Parsing

The system SHALL parse key-value fields from MTF header.

#### Scenario: Simple field parsing

- **GIVEN** MTF line "chassis:Atlas"
- **WHEN** parsing field
- **THEN** field name SHALL be "chassis"
- **AND** field value SHALL be "Atlas"

#### Scenario: Case-insensitive field matching

- **GIVEN** MTF line "Config:Biped"
- **WHEN** parsing field with pattern `^Config:(.*)$`
- **THEN** field SHALL match case-insensitively
- **AND** value SHALL be "Biped"

#### Scenario: Engine field parsing

- **GIVEN** MTF line "engine:280 Fusion Engine(IS)"
- **WHEN** parsing engine field
- **THEN** rating SHALL be 280
- **AND** type SHALL be "Fusion Engine(IS)"

#### Scenario: Heat sinks field parsing

- **GIVEN** MTF line "heat sinks:10 Single"
- **WHEN** parsing heat sinks field
- **THEN** count SHALL be 10
- **AND** type SHALL be "Single"

### Requirement: Confidence Scoring

The system SHALL assign confidence scores to format detection results.

#### Scenario: Certain detection (1.0)

- **GIVEN** file contains BLK BlockVersion tag or MTF location headers
- **WHEN** calculating confidence
- **THEN** confidence SHALL be 1.0 (certain)

#### Scenario: Very high confidence (0.95)

- **GIVEN** file contains MTF chassis field but no location headers
- **WHEN** calculating confidence
- **THEN** confidence SHALL be 0.95 (very high)

#### Scenario: High confidence (0.9)

- **GIVEN** file has .blk or .mtf extension but no content signature
- **WHEN** calculating confidence
- **THEN** confidence SHALL be 0.9 (high)

#### Scenario: Low confidence (0.5)

- **GIVEN** file has some BattleTech-related keywords but no clear format markers
- **WHEN** calculating confidence
- **THEN** confidence SHALL be 0.5 (low)
- **AND** detection result SHALL include warning

#### Scenario: No detection (0.0)

- **GIVEN** file has no BattleTech format markers
- **WHEN** calculating confidence
- **THEN** confidence SHALL be 0.0 (none)
- **AND** format SHALL be "Unknown"

### Requirement: Parse Error Handling

The system SHALL provide detailed error messages for parse failures.

#### Scenario: Missing required field

- **GIVEN** BLK file missing UnitType tag
- **WHEN** parsing file
- **THEN** parse SHALL fail with error: "Missing required field: UnitType"
- **AND** success flag SHALL be false

#### Scenario: Invalid numeric value

- **GIVEN** BLK file with non-numeric tonnage value
- **WHEN** parsing tonnage field
- **THEN** parseNumber SHALL return undefined
- **AND** parse SHALL fail with error: "Missing required field: Tonnage"

#### Scenario: Unknown unit type

- **GIVEN** BLK file with UnitType "UnknownType"
- **WHEN** mapping unit type
- **THEN** parse SHALL fail with error: "Unknown unit type: UnknownType"

#### Scenario: Parse exception handling

- **GIVEN** BLK file with malformed content causing exception
- **WHEN** parsing file
- **THEN** exception SHALL be caught
- **AND** error message SHALL be: "Parse error: {exception message}"
- **AND** success flag SHALL be false

### Requirement: BLK Quirk Parsing

The system SHALL parse unit quirks and weapon quirks from BLK format.

#### Scenario: Unit quirks parsing

- **GIVEN** BLK content with `<quirks>` tag containing multi-line quirk list
- **WHEN** parsing quirks
- **THEN** each non-empty line SHALL be a quirk ID
- **AND** result SHALL be array of quirk strings

#### Scenario: Weapon quirks parsing

- **GIVEN** BLK content with `<weapon_quirks>` tag containing entries like "accurate:Medium Laser"
- **WHEN** parsing weapon quirks
- **THEN** format SHALL be "quirkName:weaponName"
- **AND** result SHALL be Record<weaponName, quirkId[]>
- **AND** multiple quirks for same weapon SHALL be aggregated

### Requirement: MTF Armor Parsing

The system SHALL parse armor allocation from MTF format with front/rear support.

#### Scenario: Simple armor location

- **GIVEN** MTF line "LA armor:24"
- **WHEN** parsing armor
- **THEN** LEFT_ARM armor SHALL be 24
- **AND** armor SHALL be single number (no front/rear)

#### Scenario: Torso armor with rear

- **GIVEN** MTF lines "CT armor:40" and "RTC armor:12"
- **WHEN** parsing armor
- **THEN** CENTER_TORSO armor SHALL be `{ front: 40, rear: 12 }`

#### Scenario: Patchwork armor parsing

- **GIVEN** MTF line "LA armor:Reactive(Inner Sphere):26"
- **WHEN** parsing armor
- **THEN** armor value SHALL be 26 (extracted from last colon-separated part)
- **AND** armor type SHALL be extracted separately

### Requirement: MTF Weapon Parsing

The system SHALL parse weapons list with location and OmniPod status.

#### Scenario: Standard weapon entry

- **GIVEN** MTF line "Medium Laser, Left Arm"
- **WHEN** parsing weapons
- **THEN** equipment id SHALL be "medium-laser"
- **AND** location SHALL be "LEFT_ARM"
- **AND** isOmniPodMounted SHALL be undefined

#### Scenario: OmniPod weapon entry

- **GIVEN** MTF line "LRM 20 (omnipod), Left Torso"
- **WHEN** parsing weapons
- **THEN** equipment id SHALL be "lrm-20"
- **AND** location SHALL be "LEFT_TORSO"
- **AND** isOmniPodMounted SHALL be true

#### Scenario: Weapons section detection

- **GIVEN** MTF line "Weapons:5"
- **WHEN** parsing weapons
- **THEN** parser SHALL enter weapons section
- **AND** weapon count SHALL be 5 (for validation)
- **AND** subsequent lines SHALL be parsed as weapon entries until blank line or location header

### Requirement: SSW Format Support

The system SHALL NOT support Solaris Skunk Werks (SSW) format in current implementation.

#### Scenario: SSW format detection attempt

- **GIVEN** file with SSW format content
- **WHEN** performing format detection
- **THEN** confidence SHALL be 0.0 (none)
- **AND** format SHALL be "Unknown"
- **AND** detection result SHALL include note: "SSW format not currently supported"

#### Scenario: Future SSW support requirements

- **GIVEN** requirement to add SSW support
- **WHEN** implementing SSW parser
- **THEN** new SSWParserService SHALL be created
- **AND** SSW format interface SHALL be defined
- **AND** equipment name mapping for SSW conventions SHALL be added
- **AND** handler registration in UnitTypeRegistry SHALL be updated

## Data Model Requirements

### IBlkDocument Interface

```typescript
/**
 * Raw parsed BLK document before type-specific conversion
 */
export interface IBlkDocument {
  /** Block version (typically 1) */
  readonly blockVersion: number;
  /** Format version (typically "MAM0") */
  readonly version: string;
  /** Unit type string from file */
  readonly unitType: string;
  /** Mapped UnitType enum value */
  readonly mappedUnitType: UnitType;
  /** Unit name */
  readonly name: string;
  /** Model/variant designation */
  readonly model: string;
  /** Master Unit List ID */
  readonly mulId?: number;
  /** Introduction year */
  readonly year: number;
  /** Tech base/rules level string */
  readonly type: string;
  /** Tonnage */
  readonly tonnage: number;
  /** Equipment by location - keys are location names */
  readonly equipmentByLocation: Record<string, readonly string[]>;
  /** Armor values per location */
  readonly armor: readonly number[];
  /** Unit quirks */
  readonly quirks?: readonly string[];
  /** Weapon-specific quirks: weapon name → quirk IDs */
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  /** All parsed tags for debugging/extension */
  readonly rawTags: Record<string, string | string[]>;
  // ... additional fields per unit type
}
```

### IBlkParseResult Type

```typescript
/**
 * Result of parsing a BLK file
 */
export type IBlkParseResult = ResultType<IBlkParseData, IBlkParseError>;

export interface IBlkParseData {
  /** Parsed document */
  readonly document: IBlkDocument;
  /** Parse warnings (non-fatal issues) */
  readonly warnings: readonly string[];
}

export interface IBlkParseError {
  /** Parse errors */
  readonly errors: readonly string[];
  /** Parse warnings (non-fatal issues) */
  readonly warnings: readonly string[];
}
```

### IMTFParseResult Interface

```typescript
/**
 * Result of parsing an MTF file
 */
export interface IMTFParseResult {
  readonly success: boolean;
  readonly unit?: ISerializedUnit;
  readonly errors: string[];
  readonly warnings: string[];
}
```

### BLK_UNIT_TYPE_MAP Constant

```typescript
/**
 * BLK unit type strings and their UnitType mappings
 */
export const BLK_UNIT_TYPE_MAP: Record<string, UnitType> = {
  // Vehicles
  Tank: UnitType.VEHICLE,
  SupportTank: UnitType.SUPPORT_VEHICLE,
  VTOL: UnitType.VTOL,
  // Aerospace
  Aero: UnitType.AEROSPACE,
  AeroSpaceFighter: UnitType.AEROSPACE,
  ConvFighter: UnitType.CONVENTIONAL_FIGHTER,
  // Capital ships
  Dropship: UnitType.DROPSHIP,
  Jumpship: UnitType.JUMPSHIP,
  Warship: UnitType.WARSHIP,
  SmallCraft: UnitType.SMALL_CRAFT,
  SpaceStation: UnitType.SPACE_STATION,
  // Personnel
  BattleArmor: UnitType.BATTLE_ARMOR,
  Infantry: UnitType.INFANTRY,
  // ProtoMech
  ProtoMech: UnitType.PROTOMECH,
  Protomech: UnitType.PROTOMECH,
  // Mechs (rarely in BLK but possible)
  BattleMech: UnitType.BATTLEMECH,
  Mek: UnitType.BATTLEMECH,
  IndustrialMech: UnitType.INDUSTRIALMECH,
};
```

### BLK_EQUIPMENT_LOCATIONS Constant

```typescript
/**
 * Equipment location patterns by unit type
 */
export const BLK_EQUIPMENT_LOCATIONS: Record<string, readonly string[]> = {
  Vehicle: ['Front', 'Left', 'Right', 'Rear', 'Turret', 'Body'],
  VTOL: ['Front', 'Left', 'Right', 'Rear', 'Turret', 'Body', 'Rotor'],
  Aero: ['Nose', 'Left Wing', 'Right Wing', 'Aft', 'Wings', 'Fuselage'],
  Dropship: ['Nose', 'Left Side', 'Right Side', 'Aft', 'Hull'],
  Capital: ['Nose', 'FL', 'FR', 'AL', 'AR', 'Aft', 'LBS', 'RBS'],
  BattleArmor: ['Squad', 'Body', 'Left Arm', 'Right Arm', 'Turret'],
  Infantry: [],
  ProtoMech: ['Head', 'Torso', 'Main Gun', 'Left Arm', 'Right Arm', 'Legs'],
};
```

### MTF Location Headers Constant

```typescript
/**
 * Location header patterns in MTF files
 */
const LOCATION_HEADERS: Record<string, string> = {
  // Biped locations
  'Left Arm:': 'LEFT_ARM',
  'Right Arm:': 'RIGHT_ARM',
  'Left Torso:': 'LEFT_TORSO',
  'Right Torso:': 'RIGHT_TORSO',
  'Center Torso:': 'CENTER_TORSO',
  'Head:': 'HEAD',
  'Left Leg:': 'LEFT_LEG',
  'Right Leg:': 'RIGHT_LEG',
  // Quad locations
  'Front Left Leg:': 'FRONT_LEFT_LEG',
  'Front Right Leg:': 'FRONT_RIGHT_LEG',
  'Rear Left Leg:': 'REAR_LEFT_LEG',
  'Rear Right Leg:': 'REAR_RIGHT_LEG',
  // Tripod locations
  'Center Leg:': 'CENTER_LEG',
};
```

## Detection Algorithms

### BLK Format Detection Algorithm

```typescript
function detectBLKFormat(
  filePath: string,
  content: string,
): {
  format: string;
  confidence: number;
  notes: string[];
} {
  const notes: string[] = [];

  // Check file extension
  if (filePath.endsWith('.blk')) {
    notes.push('File extension matches .blk');

    // Check for content signatures
    if (content.includes('<BlockVersion>')) {
      return { format: 'MegaMek BLK', confidence: 1.0, notes };
    }
    if (content.includes('<UnitType>')) {
      return { format: 'MegaMek BLK', confidence: 1.0, notes };
    }

    // Extension only, no content signature
    return { format: 'MegaMek BLK', confidence: 0.9, notes };
  }

  // Check content signatures without extension
  if (content.includes('<BlockVersion>') || content.includes('<UnitType>')) {
    notes.push('BLK content signature detected');
    return { format: 'MegaMek BLK', confidence: 1.0, notes };
  }

  return { format: 'Unknown', confidence: 0.0, notes };
}
```

### MTF Format Detection Algorithm

```typescript
function detectMTFFormat(
  filePath: string,
  content: string,
): {
  format: string;
  confidence: number;
  notes: string[];
} {
  const notes: string[] = [];

  // Check file extension
  if (filePath.endsWith('.mtf')) {
    notes.push('File extension matches .mtf');

    // Check for location headers
    const locationHeaders = [
      'Left Arm:',
      'Right Arm:',
      'Left Torso:',
      'Right Torso:',
      'Center Torso:',
      'Head:',
      'Left Leg:',
      'Right Leg:',
    ];

    if (locationHeaders.some((header) => content.includes(header))) {
      return { format: 'MegaMek MTF', confidence: 1.0, notes };
    }

    // Check for chassis field
    if (content.includes('chassis:')) {
      return { format: 'MegaMek MTF', confidence: 0.95, notes };
    }

    // Extension only, no content signature
    return { format: 'MegaMek MTF', confidence: 0.9, notes };
  }

  // Check content signatures without extension
  const locationHeaders = [
    'Left Arm:',
    'Right Arm:',
    'Left Torso:',
    'Right Torso:',
    'Center Torso:',
    'Head:',
    'Left Leg:',
    'Right Leg:',
  ];

  if (locationHeaders.some((header) => content.includes(header))) {
    notes.push('MTF location headers detected');
    return { format: 'MegaMek MTF', confidence: 1.0, notes };
  }

  if (content.includes('chassis:')) {
    notes.push('MTF chassis field detected');
    return { format: 'MegaMek MTF', confidence: 0.95, notes };
  }

  return { format: 'Unknown', confidence: 0.0, notes };
}
```

### BLK Tag Extraction Algorithm

```typescript
function extractTags(content: string): Record<string, string | string[]> {
  const tags: Record<string, string | string[]> = {};

  // Match <TagName>...content...</TagName> patterns
  const tagPattern = /<([^>]+)>\s*([\s\S]*?)\s*<\/\1>/g;

  let match;
  while ((match = tagPattern.exec(content)) !== null) {
    const tagName = match[1].trim();
    const tagContent = match[2].trim();

    // Check if this is an equipment block
    if (isEquipmentBlock(tagName)) {
      tags[tagName] = tagContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else if (tagContent.includes('\n')) {
      // Multi-line value
      const lines = tagContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // If all lines are numbers, keep as string for armor parsing
      if (lines.every((line) => !isNaN(parseFloat(line)))) {
        tags[tagName] = tagContent;
      } else {
        tags[tagName] = lines;
      }
    } else {
      tags[tagName] = tagContent;
    }
  }

  return tags;
}

function isEquipmentBlock(tagName: string): boolean {
  return BLK_EQUIPMENT_BLOCK_TAGS.some(
    (block) => tagName.toLowerCase() === block.toLowerCase(),
  );
}
```

### Unit Type Mapping Algorithm

```typescript
function mapUnitType(unitTypeStr: string): UnitType | undefined {
  // Direct mapping
  if (BLK_UNIT_TYPE_MAP[unitTypeStr]) {
    return BLK_UNIT_TYPE_MAP[unitTypeStr];
  }

  // Case-insensitive search
  const lowerStr = unitTypeStr.toLowerCase();
  for (const [key, value] of Object.entries(BLK_UNIT_TYPE_MAP)) {
    if (key.toLowerCase() === lowerStr) {
      return value;
    }
  }

  return undefined;
}
```

## Validation Rules

### BLK Parse Validation

1. **Required Fields**: UnitType, Name, Tonnage, year MUST be present
2. **Unit Type Mapping**: UnitType MUST map to valid UnitType enum value
3. **Numeric Fields**: Tonnage, year, rating values MUST be valid numbers
4. **Armor Array**: Armor values MUST be non-negative numbers
5. **Equipment Blocks**: Equipment block tags MUST match known location patterns

### MTF Parse Validation

1. **Required Fields**: chassis MUST be present (model can be empty)
2. **Location Headers**: Location headers MUST match known patterns
3. **Slot Counts**: Critical slot counts MUST match expected values per location
4. **Armor Values**: Armor values MUST be non-negative integers
5. **Weapon Format**: Weapon entries MUST follow "name, location" format

### Confidence Score Validation

1. **Range**: Confidence MUST be between 0.0 and 1.0 inclusive
2. **Thresholds**:
   - 1.0 = Certain (content signature match)
   - 0.95 = Very high (strong content indicators)
   - 0.9 = High (file extension match)
   - 0.5 = Low (weak indicators)
   - 0.0 = None (no match)

## Implementation Notes

### Performance Considerations

1. **Regex Efficiency**: Tag extraction regex uses non-greedy matching to avoid catastrophic backtracking
2. **Line-by-Line Parsing**: MTF parser processes line-by-line to minimize memory usage
3. **Early Exit**: Format detection returns immediately on high-confidence match
4. **Comment Filtering**: BLK comments removed before tag extraction to reduce processing

### Edge Cases

1. **Empty Model Field**: MTF files may have `model:` with no value - this is valid
2. **Patchwork Armor**: MTF armor values may include type prefix (e.g., "Reactive(Inner Sphere):26")
3. **OmniMech Detection**: Config field may contain "Omnimech" suffix (case-insensitive)
4. **Multi-line Fluff**: BLK fluff text (overview, capabilities) may span multiple lines
5. **Weapon Quirks Format**: BLK uses "quirkName:weaponName", MTF uses "weapon_quirk:quirkName:weaponName"

### Common Pitfalls

1. **Case Sensitivity**: BLK tags are case-sensitive, but unit type mapping should be case-insensitive
2. **Tag Closure**: BLK tags MUST have matching opening and closing tags
3. **Location Name Extraction**: Equipment block location name is tag name minus " Equipment" suffix
4. **Slot Padding**: MTF critical slots MUST be padded to expected count (6 or 12 per location)
5. **Rear Armor**: Only torso locations (LEFT_TORSO, RIGHT_TORSO, CENTER_TORSO) have rear armor

## Examples

### Example: BLK Format Detection

```typescript
import { BlkParserService } from '@/services/conversion/BlkParserService';

const parser = new BlkParserService();

// Example 1: File with .blk extension and content signature
const blkContent = `
<BlockVersion>
1
</BlockVersion>
<Version>
MAM0
</Version>
<UnitType>
Tank
</UnitType>
<Name>
Demolisher
</Name>
`;

const result = parser.parse(blkContent);
if (result.success) {
  console.log('Unit Type:', result.data.document.unitType); // "Tank"
  console.log('Mapped Type:', result.data.document.mappedUnitType); // UnitType.VEHICLE
  console.log('Name:', result.data.document.name); // "Demolisher"
}
```

### Example: MTF Format Detection

```typescript
import { MTFParserService } from '@/services/conversion/MTFParserService';

const parser = new MTFParserService();

// Example 2: MTF file with location headers
const mtfContent = `
chassis:Atlas
model:AS7-D
Config:Biped
techbase:Inner Sphere
era:2755
rules level:1
mass:100

Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Heat Sink
Heat Sink
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-
-Empty-

Center Torso:
Fusion Engine
Fusion Engine
Fusion Engine
Gyro
Gyro
Gyro
Gyro
Fusion Engine
Fusion Engine
Fusion Engine
-Empty-
-Empty-
`;

const result = parser.parse(mtfContent);
if (result.success) {
  console.log('Chassis:', result.unit?.chassis); // "Atlas"
  console.log('Model:', result.unit?.model); // "AS7-D"
  console.log('Configuration:', result.unit?.configuration); // "Biped"
  console.log('Left Arm Slots:', result.unit?.criticalSlots.LEFT_ARM.length); // 12
}
```

### Example: BLK Equipment Parsing

```typescript
// Example 3: BLK equipment block parsing
const blkWithEquipment = `
<Front Equipment>
Medium Laser
Medium Laser
SRM 6
</Front Equipment>
<Turret Equipment>
AC/20
</Turret Equipment>
`;

const result = parser.parse(blkWithEquipment);
if (result.success) {
  const equipment = result.data.document.equipmentByLocation;
  console.log('Front:', equipment.Front); // ["Medium Laser", "Medium Laser", "SRM 6"]
  console.log('Turret:', equipment.Turret); // ["AC/20"]
}
```

### Example: MTF OmniPod Detection

```typescript
// Example 4: MTF OmniPod weapon parsing
const mtfWithOmniPod = `
Weapons:3
Medium Laser, Left Arm
LRM 20 (omnipod), Left Torso
ER PPC (omnipod), Right Arm
`;

const result = parser.parse(mtfWithOmniPod);
if (result.success) {
  const weapons = result.unit?.equipment;
  console.log('Weapon 1:', weapons[0]); // { id: "medium-laser", location: "LEFT_ARM" }
  console.log('Weapon 2:', weapons[1]); // { id: "lrm-20", location: "LEFT_TORSO", isOmniPodMounted: true }
  console.log('Weapon 3:', weapons[2]); // { id: "er-ppc", location: "RIGHT_ARM", isOmniPodMounted: true }
}
```

## Dependencies

### Depends On

- **core-entity-types**: UnitType enum
- **unit-entity-model**: ISerializedUnit interface
- **equipment-database**: Equipment ID normalization

### Used By

- **unit-services**: Unit import and conversion
- **mtf-parity-validation**: Round-trip validation
- **unit-type-handlers**: Type-specific BLK parsing
- **data-loading-architecture**: Bulk unit import

## References

### Official Rules

- MegaMek BLK Format: https://github.com/MegaMek/megamek/wiki/BLK-File-Format
- MegaMek MTF Format: https://github.com/MegaMek/megamek/wiki/MTF-File-Format
- mm-data Repository: https://github.com/MegaMek/mm-data

### Related Specifications

- `unit-entity-model/spec.md` - Unit data model
- `equipment-database/spec.md` - Equipment catalog
- `data-loading-architecture/spec.md` - Data import pipeline
- `unit-services/spec.md` - Unit management services

### Implementation Files

- `src/types/formats/BlkFormat.ts` - BLK interfaces and constants
- `src/services/conversion/BlkParserService.ts` - BLK parser implementation
- `src/services/conversion/MTFParserService.ts` - MTF parser implementation
- `src/services/units/handlers/AbstractUnitTypeHandler.ts` - Base handler for BLK parsing
- `src/services/units/UnitTypeRegistry.ts` - Handler registry for unit types
