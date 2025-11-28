# OpenSpec Terminology Glossary

**Version**: 1.0
**Last Updated**: 2025-11-28
**Purpose**: Canonical terminology reference for all BattleTech Editor OpenSpec specifications

---

## Introduction

This glossary establishes the **single source of truth** for terminology used across all OpenSpec specifications. Consistent terminology is critical for:

- **Maintainability**: Changes to concepts only require updating one definition
- **Clarity**: Developers and users understand exactly what each term means
- **Implementation**: Code can directly reference canonical property names
- **Communication**: Team members use consistent language

### How to Use This Glossary

1. **When writing specifications**: Use only canonical terms from this glossary
2. **When naming properties**: Follow the property naming standards exactly
3. **When reviewing specs**: Check against this glossary for consistency
4. **When implementing code**: Use property names as defined here

### Glossary Organization

- **Canonical Terms**: Alphabetical list of approved terms with definitions
- **Property Naming Standards**: Rules for TypeScript property names
- **Deprecated Terms**: Terms to avoid (what NOT to use)
- **Style Guide**: Writing conventions and usage rules
- **Quick Reference Tables**: Common concepts with correct/incorrect usage

---

## Canonical Terms (A-Z)

### A

#### Advanced (Rules Level)
**Canonical Term**: "Advanced"
**Context**: Rules level classification (third tier)
**Property**: `RulesLevel.ADVANCED`
**Usage**: Tournament-legal advanced technology
**See Also**: Rules Level, Experimental, Introductory, Standard
**Deprecated**: ~~"Tournament"~~ (incorrect), ~~"Advanced Tech"~~ (redundant)

#### Allocation
**Canonical Term**: "allocation"
**Context**: Assigning critical slots or space to components
**Property**: `allocate()` (function), `allocation` (noun)
**Usage**: "critical slot allocation", "weight allocation"
**See Also**: Placement, Assignment, Mounting
**Note**: Allocation = assigning space/slots; Placement = physical positioning

#### Armor
**Canonical Term**: "armor"
**Context**: Protective covering on mech exterior
**Property**: `armor` (general), `armorType: ArmorType`, `armorPoints: number`
**Usage**: "armor points", "armor type", "armor weight"
**Unit**: "armor points" or "points"
**See Also**: Armor Type, Armor Points
**Deprecated**: ~~"armour"~~ (British spelling)

#### Armor Points
**Canonical Term**: "armor points"
**Context**: Quantity of armor protection
**Property**: `armorPoints: number`
**Usage**: "16 armor points per ton", "maximum armor points"
**See Also**: Armor, Points Per Ton
**Deprecated**: ~~"armor"~~ (when referring to quantity), ~~"AP"~~ (avoid abbreviation in specs)

#### Armor Type
**Canonical Term**: "armor type"
**Context**: Classification of armor system
**Property**: `armorType: ArmorType`
**Enum Values**: `STANDARD`, `FERRO_FIBROUS_IS`, `FERRO_FIBROUS_CLAN`, `STEALTH`, `REACTIVE`, `REFLECTIVE`, `HARDENED`
**Usage**: "Standard armor type", "Ferro-Fibrous armor type"
**See Also**: Armor, Internal Structure Type

#### Assault (Weight Class)
**Canonical Term**: "Assault"
**Context**: Weight class for 80-100 ton BattleMechs
**Property**: `WeightClass.ASSAULT`
**Tonnage Range**: 80-100 tons
**Usage**: "Assault-class mech", "Assault weight class"
**See Also**: Weight Class, Heavy, Light, Medium

#### Assignment
**Canonical Term**: "assignment"
**Context**: Mapping components to locations
**Usage**: Use "allocation" or "placement" instead in most cases
**See Also**: Allocation, Placement
**Note**: Less precise than "allocation" or "placement" - avoid when more specific term applies

---

### B

#### Battle Value (BV)
**Canonical Term**: "Battle Value" or "BV"
**Context**: Point cost for unit construction and game balance
**Property**: `battleValue: number`
**Usage**: "total Battle Value", "BV calculation"
**Abbreviation**: "BV" is acceptable after first use
**See Also**: Cost, Tech Rating

#### BattleMech
**Canonical Term**: "BattleMech"
**Context**: Standard 20-100 ton bipedal combat unit
**Property**: `battleMech` or `mech` (depending on context)
**Interface**: `IBattleMech`
**Plural**: "BattleMechs"
**Usage**: "BattleMech construction", "the BattleMech has..."
**Informal**: "mech" is acceptable in prose (not formal definitions)
**See Also**: Mech, Unit
**Deprecated**: ~~"Battlemech"~~ (incorrect capitalization), ~~"Battle Mech"~~ (two words)

---

### C

#### Center Torso
**Canonical Term**: "Center Torso"
**Context**: Central body section of BattleMech
**Property**: `MechLocation.CENTER_TORSO`
**Abbreviation**: "CT" (acceptable in tables and diagrams)
**Slot Count**: 12 critical slots
**Usage**: "Center Torso location", "CT slots"
**See Also**: Location, Side Torso
**Deprecated**: ~~"centre torso"~~ (British spelling), ~~"central torso"~~

#### Clan
**Canonical Term**: "Clan"
**Context**: Technology base classification
**Property**: `TechBase.CLAN`
**Usage**: "Clan technology", "Clan tech base"
**See Also**: Tech Base, Inner Sphere, Mixed Tech
**Deprecated**: ~~"Clans"~~ (plural in tech base context)

#### Cockpit
**Canonical Term**: "cockpit"
**Context**: Pilot control station and life support system
**Property**: `cockpit: ICockpit`, `cockpitType: CockpitType`
**Types**: Standard, Small, Command Console, Torso-Mounted, Primitive
**Usage**: "Standard cockpit", "cockpit type", "cockpit weight"
**See Also**: Cockpit Type, Head

#### Cockpit Type
**Canonical Term**: "cockpit type"
**Context**: Classification of cockpit system
**Property**: `cockpitType: CockpitType`
**Enum Values**: `STANDARD`, `SMALL`, `COMMAND_CONSOLE`, `TORSO_MOUNTED`, `PRIMITIVE`
**Usage**: "cockpit type selection", "Standard cockpit type"

#### Component
**Canonical Term**: "component"
**Context**: Any discrete item in a BattleMech (broad category)
**Property**: `component: IComponent`
**Usage**: "structural components", "all components", "component weight"
**See Also**: Equipment, System Component
**Note**: Broad term - use "equipment" or "system component" when more specific distinction needed

#### Configuration
**Canonical Term**: "configuration"
**Context**: Current state/setup of a BattleMech
**Property**: `configuration: IConfiguration`
**Usage**: "mech configuration", "configure the unit"
**See Also**: Construction
**Note**: Refers to the configured state, not the process

#### Construction
**Canonical Term**: "construction"
**Context**: Process of building/assembling a BattleMech
**Property**: `construct()` (function), `construction` (noun)
**Usage**: "BattleMech construction", "construction rules", "construction sequence"
**See Also**: Configuration
**Deprecated**: ~~"build"~~ (informal), ~~"assembly"~~

#### Critical Slots
**Canonical Term**: "critical slots"
**Context**: Discrete equipment spaces within mech locations
**Property**: `criticalSlots: number` (count), `slots: ICriticalSlot[]` (array)
**Usage**: "12 critical slots", "critical slot allocation", "available critical slots"
**Abbreviation**: Avoid abbreviating in formal specs; "slots" alone acceptable in context
**See Also**: Slot, Location
**Deprecated**: ~~"crit slots"~~, ~~"critical spaces"~~, ~~"equipment slots"~~

---

### D

#### Dissipation
**Canonical Term**: "dissipation" or "heat dissipation"
**Context**: Heat removed per turn by heat sinks
**Property**: `dissipation: number` or `heatDissipation: number`
**Unit**: "heat per turn" or "heat/turn"
**Usage**: "Single heat sinks dissipate 1 heat per turn", "total heat dissipation"
**See Also**: Heat Sink, Heat

---

### E

#### Engine
**Canonical Term**: "engine"
**Context**: Primary propulsion and power system
**Property**: `engine: IEngine`, `engineType: EngineType`, `engineRating: number`
**Usage**: "engine type", "engine rating", "engine weight"
**See Also**: Engine Type, Engine Rating, Engine-Mounted

#### Engine-Integrated
**Canonical Term**: "engine-integrated" (adjective) or "integrated in engine" (past participle)
**Context**: Heat sinks mounted inside engine
**Property**: `engineIntegrated: number` (count of integrated heat sinks)
**Usage**: "engine-integrated heat sinks", "heat sinks integrated in engine"
**See Also**: Engine-Mounted, External Heat Sinks
**Deprecated**: ~~"internal heat sinks"~~ (ambiguous), ~~"engine heat sinks"~~

#### Engine-Mounted
**Canonical Term**: "engine-mounted"
**Context**: Components physically mounted in or on the engine
**Property**: `engineMountable: boolean` (capability), `engineIntegrated: number` (count)
**Usage**: "engine-mounted heat sinks", "engine-mountable components"
**See Also**: Engine-Integrated, External
**Note**: "Engine-mounted" is broader than "engine-integrated"; all integrated components are mounted, but not all mounted components are integrated

#### Engine Rating
**Canonical Term**: "engine rating"
**Context**: Power output of engine (determines walk MP)
**Property**: `engineRating: number` or `rating: number` (when context is clear)
**Range**: 10-500 (standard BattleMechs)
**Usage**: "300 rating engine", "engine rating determines walk speed"
**See Also**: Engine, Engine Type, Walk MP

#### Engine Type
**Canonical Term**: "engine type"
**Context**: Classification of engine technology
**Property**: `engineType: EngineType`
**Enum Values**: `STANDARD_FUSION`, `XL_IS`, `XL_CLAN`, `LIGHT`, `XXL`, `COMPACT`, `ICE`, `FUEL_CELL`, `FISSION`
**Usage**: "Standard Fusion engine type", "XL engine type"
**See Also**: Engine, Engine Rating

#### Equipment
**Canonical Term**: "equipment"
**Context**: Removable/configurable items (weapons, heat sinks, jump jets, ammunition)
**Property**: `equipment: IEquipment[]`
**Usage**: "add equipment", "equipment weight", "equipment slots"
**See Also**: Component, System Component
**Note**: Equipment is removable/configurable; System Components are fixed/required
**Examples**: Weapons, ammunition, heat sinks, jump jets, electronics
**Counter-examples**: Engine, gyro, actuators (these are system components)

#### Era
**Canonical Term**: "era"
**Context**: Historical timeline period in BattleTech universe
**Property**: `era: Era`
**Enum Values**: `AGE_OF_WAR`, `STAR_LEAGUE`, `EARLY_SUCCESSION_WARS`, `LATE_SUCCESSION_WARS`, `CLAN_INVASION`, `CIVIL_WAR`, `JIHAD`, `DARK_AGE`
**Usage**: "Clan Invasion era", "era filtering", "available in this era"
**See Also**: Introduction Year, Extinction Year, Temporal Availability

#### Experimental (Rules Level)
**Canonical Term**: "Experimental"
**Context**: Rules level classification (fourth/highest tier)
**Property**: `RulesLevel.EXPERIMENTAL`
**Usage**: "Experimental technology", "not tournament legal"
**See Also**: Rules Level, Advanced, Standard, Introductory

#### External
**Canonical Term**: "external"
**Context**: Components placed outside the engine
**Usage**: "external heat sinks", "external mounting"
**See Also**: Engine-Mounted, Engine-Integrated
**Note**: External heat sinks require critical slots; engine-integrated do not

#### Extinction Year
**Canonical Term**: "extinction year"
**Context**: Year technology became unavailable
**Property**: `extinctionYear: number | undefined` (optional)
**Usage**: "extinction year 2855", "technology went extinct"
**See Also**: Introduction Year, Era, Temporal Availability
**Deprecated**: ~~"extinct year"~~, ~~"discontinued"~~, ~~"removed"~~

---

### G

#### Gyro
**Canonical Term**: "gyro"
**Context**: Stabilization system
**Property**: `gyro: IGyro`, `gyroType: GyroType`
**Types**: Standard, XL, Compact, Heavy-Duty
**Usage**: "Standard gyro", "gyro weight", "gyro type"
**See Also**: Gyro Type
**Deprecated**: ~~"gyroscope"~~ (too formal for BattleTech context)

#### Gyro Type
**Canonical Term**: "gyro type"
**Context**: Classification of gyroscope system
**Property**: `gyroType: GyroType`
**Enum Values**: `STANDARD`, `XL`, `COMPACT`, `HEAVY_DUTY`
**Usage**: "XL gyro type", "gyro type selection"

---

### H

#### Head
**Canonical Term**: "Head"
**Context**: Head location of BattleMech
**Property**: `MechLocation.HEAD`
**Abbreviation**: "HD" (acceptable in tables)
**Slot Count**: 6 critical slots
**Usage**: "Head location", "head armor", "HD slots"
**See Also**: Location, Cockpit

#### Heat
**Canonical Term**: "heat"
**Context**: Thermal energy generated by weapons and movement
**Property**: `heat: number`, `heatGenerated: number`
**Unit**: "heat" or "heat points"
**Usage**: "generates 10 heat", "heat management", "heat per turn"
**See Also**: Heat Sink, Dissipation

#### Heat Sink
**Canonical Term**: "heat sink"
**Context**: Thermal management component
**Property**: `heatSink: IHeatSink`, `heatSinkType: HeatSinkType`
**Types**: Single, Double (IS/Clan), Compact, Laser
**Usage**: "Double heat sink", "heat sink count", "heat sink type"
**Plural**: "heat sinks"
**See Also**: Heat Sink Type, Engine-Integrated, External
**Deprecated**: ~~"heatsink"~~ (one word)

#### Heat Sink Type
**Canonical Term**: "heat sink type"
**Context**: Classification of heat sink technology
**Property**: `heatSinkType: HeatSinkType`
**Enum Values**: `SINGLE`, `DOUBLE_IS`, `DOUBLE_CLAN`, `COMPACT`, `LASER`
**Usage**: "Single heat sink type", "Double heat sink type"

#### Heavy (Weight Class)
**Canonical Term**: "Heavy"
**Context**: Weight class for 60-75 ton BattleMechs
**Property**: `WeightClass.HEAVY`
**Tonnage Range**: 60-75 tons
**Usage**: "Heavy-class mech", "Heavy weight class"
**See Also**: Weight Class, Assault, Light, Medium

---

### I

#### Inner Sphere
**Canonical Term**: "Inner Sphere"
**Context**: Technology base classification
**Property**: `TechBase.INNER_SPHERE`
**Usage**: "Inner Sphere technology", "Inner Sphere tech base"
**Capitalization**: Always capitalize both words (proper noun)
**See Also**: Tech Base, Clan, Mixed Tech
**Deprecated**: ~~"IS"~~ (avoid in formal specifications), ~~"inner sphere"~~ (lowercase)

#### Internal Structure
**Canonical Term**: "internal structure"
**Context**: Skeletal framework of BattleMech
**Property**: `internalStructure: IInternalStructure`, `structureType: StructureType`
**Usage**: "internal structure type", "structure points", "Endo Steel internal structure"
**Short Form**: "structure" (acceptable when context is clear)
**See Also**: Structure Type, Structure Points

#### Introduction Year
**Canonical Term**: "introduction year"
**Context**: Year technology became available
**Property**: `introductionYear: number`
**Usage**: "introduction year 3025", "introduced in 3025"
**See Also**: Extinction Year, Era, Temporal Availability
**Deprecated**: ~~"intro year"~~, ~~"release year"~~, ~~"available year"~~

#### Introductory (Rules Level)
**Canonical Term**: "Introductory"
**Context**: Rules level classification (first tier)
**Property**: `RulesLevel.INTRODUCTORY`
**Usage**: "Introductory technology", "basic equipment"
**See Also**: Rules Level, Standard, Advanced, Experimental

---

### J

#### Jump Jets
**Canonical Term**: "jump jets"
**Context**: Short-range flight propulsion system
**Property**: `jumpJets: IJumpJet[]`, `jumpJetType: JumpJetType`
**Usage**: "Standard jump jets", "jump jet count", "jump jet weight"
**Abbreviation**: "JJ" acceptable in tables
**See Also**: Jump MP, Movement

#### Jump MP
**Canonical Term**: "Jump MP"
**Context**: Jump movement points
**Property**: `jumpMP: number`
**Usage**: "6 Jump MP", "jump movement points"
**See Also**: Walk MP, Run MP, Movement
**Note**: "MP" is standard abbreviation for Movement Points

---

### L

#### Left Arm
**Canonical Term**: "Left Arm"
**Property**: `MechLocation.LEFT_ARM`
**Abbreviation**: "LA"
**Slot Count**: 12 critical slots
**Usage**: "Left Arm location", "LA slots"
**See Also**: Location, Right Arm

#### Left Leg
**Canonical Term**: "Left Leg"
**Property**: `MechLocation.LEFT_LEG`
**Abbreviation**: "LL"
**Slot Count**: 6 critical slots
**Usage**: "Left Leg location", "LL slots"
**See Also**: Location, Right Leg

#### Left Torso
**Canonical Term**: "Left Torso"
**Property**: `MechLocation.LEFT_TORSO`
**Abbreviation**: "LT"
**Slot Count**: 12 critical slots
**Usage**: "Left Torso location", "LT slots"
**See Also**: Location, Side Torso, Right Torso

#### Light (Weight Class)
**Canonical Term**: "Light"
**Context**: Weight class for 20-35 ton BattleMechs
**Property**: `WeightClass.LIGHT`
**Tonnage Range**: 20-35 tons
**Usage**: "Light-class mech", "Light weight class"
**See Also**: Weight Class, Medium, Heavy, Assault

#### Location
**Canonical Term**: "location"
**Context**: Physical section/body part of BattleMech
**Property**: `location: MechLocation`
**Enum Values**: `HEAD`, `CENTER_TORSO`, `LEFT_TORSO`, `RIGHT_TORSO`, `LEFT_ARM`, `RIGHT_ARM`, `LEFT_LEG`, `RIGHT_LEG`
**Usage**: "component location", "location slots", "Head location"
**See Also**: Center Torso, Left Arm, Right Arm, etc.
**Deprecated**: ~~"section"~~, ~~"body part"~~, ~~"area"~~

---

### M

#### Mech
**Canonical Term**: "mech"
**Context**: Informal shorthand for BattleMech
**Usage**: Acceptable in prose and comments; use "BattleMech" in formal definitions
**See Also**: BattleMech, Unit
**Note**: Lowercase "mech" is informal; use "BattleMech" for formal specifications

#### Medium (Weight Class)
**Canonical Term**: "Medium"
**Context**: Weight class for 40-55 ton BattleMechs
**Property**: `WeightClass.MEDIUM`
**Tonnage Range**: 40-55 tons
**Usage**: "Medium-class mech", "Medium weight class"
**See Also**: Weight Class, Light, Heavy, Assault

#### Mixed Tech
**Canonical Term**: "Mixed Tech"
**Context**: Unit combining Inner Sphere and Clan technology
**Property**: `UnitTechBase.MIXED`
**Usage**: "Mixed Tech unit", "Mixed Tech configuration"
**Capitalization**: Capitalize both words
**See Also**: Tech Base, Inner Sphere, Clan

#### Mounting
**Canonical Term**: "mounting"
**Context**: Attaching equipment to a location
**Property**: `mount()` (function), `mounting` (noun)
**Usage**: "mounting equipment", "component mounting"
**See Also**: Placement, Allocation
**Note**: Mounting = physical attachment; Allocation = assigning space

#### Movement Points (MP)
**Canonical Term**: "Movement Points" or "MP"
**Context**: Unit of movement capability
**Property**: `walkMP: number`, `runMP: number`, `jumpMP: number`
**Abbreviation**: "MP" is standard and acceptable
**Usage**: "Walk MP", "Run MP", "6 MP"
**See Also**: Walk MP, Run MP, Jump MP

---

### P

#### Placement
**Canonical Term**: "placement"
**Context**: Physical positioning of components
**Property**: `place()` (function), `placement` (noun)
**Usage**: "component placement", "slot placement", "placement rules"
**See Also**: Allocation, Mounting
**Note**: Placement = physical positioning; Allocation = assigning space/slots

#### Points Per Ton
**Canonical Term**: "points per ton"
**Context**: Armor efficiency rating
**Property**: `pointsPerTon: number`
**Usage**: "16 points per ton", "armor points per ton"
**See Also**: Armor, Armor Points

---

### R

#### Rating
**Canonical Term**: "rating"
**Context**: Engine power output number
**Property**: `rating: number` (when context is engine)
**See Also**: Engine Rating
**Note**: Use "engine rating" when context is ambiguous

#### Right Arm
**Canonical Term**: "Right Arm"
**Property**: `MechLocation.RIGHT_ARM`
**Abbreviation**: "RA"
**Slot Count**: 12 critical slots
**Usage**: "Right Arm location", "RA slots"
**See Also**: Location, Left Arm

#### Right Leg
**Canonical Term**: "Right Leg"
**Property**: `MechLocation.RIGHT_LEG`
**Abbreviation**: "RL"
**Slot Count**: 6 critical slots
**Usage**: "Right Leg location", "RL slots"
**See Also**: Location, Left Leg

#### Right Torso
**Canonical Term**: "Right Torso"
**Property**: `MechLocation.RIGHT_TORSO`
**Abbreviation**: "RT"
**Slot Count**: 12 critical slots
**Usage**: "Right Torso location", "RT slots"
**See Also**: Location, Side Torso, Left Torso

#### Rules Level
**Canonical Term**: "rules level"
**Context**: Technology complexity classification
**Property**: `rulesLevel: RulesLevel`
**Enum Values**: `INTRODUCTORY`, `STANDARD`, `ADVANCED`, `EXPERIMENTAL`
**Usage**: "Advanced rules level", "rules level restriction"
**See Also**: Introductory, Standard, Advanced, Experimental
**Deprecated**: ~~"tech level"~~ (different concept), ~~"complexity level"~~

#### Run MP
**Canonical Term**: "Run MP"
**Context**: Running movement points
**Property**: `runMP: number`
**Formula**: `floor(walkMP × 1.5)`
**Usage**: "9 Run MP", "running movement points"
**See Also**: Walk MP, Jump MP, Movement Points

---

### S

#### Side Torso
**Canonical Term**: "side torso" (generic) or "Left Torso"/"Right Torso" (specific)
**Context**: Left or right torso location (generic reference)
**Usage**: "side torso locations", "both side torsos"
**See Also**: Left Torso, Right Torso, Center Torso
**Note**: Use specific "Left Torso" or "Right Torso" when referring to a particular location

#### Slot
**Canonical Term**: "slot" or "critical slot"
**Context**: Individual equipment space
**Usage**: "critical slot", "12 slots", "slot allocation"
**See Also**: Critical Slots
**Note**: "Slot" alone is acceptable when context is clear (e.g., "12 slots" instead of "12 critical slots")

#### Standard (Rules Level)
**Canonical Term**: "Standard"
**Context**: Rules level classification (second tier)
**Property**: `RulesLevel.STANDARD`
**Usage**: "Standard technology", "tournament legal"
**See Also**: Rules Level, Introductory, Advanced, Experimental

#### Structure
**Canonical Term**: "structure" (short form) or "internal structure" (full form)
**Context**: Skeletal framework
**Property**: `structure: IInternalStructure`
**Usage**: Both "structure" and "internal structure" are acceptable
**See Also**: Internal Structure, Structure Points, Structure Type

#### Structure Points
**Canonical Term**: "structure points"
**Context**: Damage capacity of internal structure
**Property**: `structurePoints: number`
**Usage**: "10 structure points", "structure points per location"
**See Also**: Internal Structure, Armor Points

#### Structure Type
**Canonical Term**: "structure type"
**Context**: Classification of internal structure technology
**Property**: `structureType: StructureType`
**Enum Values**: `STANDARD`, `ENDO_STEEL_IS`, `ENDO_STEEL_CLAN`, `REINFORCED`, `COMPOSITE`, `ENDO_COMPOSITE`, `INDUSTRIAL`
**Usage**: "Standard structure type", "Endo Steel structure type"

#### System Component
**Canonical Term**: "system component"
**Context**: Fixed/required components (engine, gyro, actuators, cockpit)
**Usage**: "system components are required", "structural system components"
**See Also**: Component, Equipment
**Note**: System components are fixed/required; Equipment is removable/configurable
**Examples**: Engine, gyro, cockpit, actuators, internal structure
**Counter-examples**: Weapons, ammunition, heat sinks (these are equipment)

---

### T

#### Tech Base
**Canonical Term**: "tech base"
**Context**: Technology source classification
**Property**: `techBase: TechBase` (component-level), `unitTechBase: UnitTechBase` (unit-level)
**Enum Values**: `TechBase.INNER_SPHERE`, `TechBase.CLAN` (component), `UnitTechBase.INNER_SPHERE`, `UnitTechBase.CLAN`, `UnitTechBase.MIXED` (unit)
**Usage**: "Inner Sphere tech base", "tech base compatibility"
**See Also**: Inner Sphere, Clan, Mixed Tech
**Deprecated**: ~~"technology base"~~ (wordy), ~~"faction"~~ (different concept)

#### Temporal Availability
**Canonical Term**: "temporal availability"
**Context**: When technology is available based on timeline
**Properties**: `introductionYear: number`, `extinctionYear?: number`
**Usage**: "temporal availability check", "available in this timeframe"
**See Also**: Introduction Year, Extinction Year, Era

#### Tonnage
**Canonical Term**: "tonnage"
**Context**: Total mass of BattleMech (unit of measurement)
**Usage**: "55 tons", "total tonnage", "mech tonnage"
**Property Name**: Use `weight` (not "tonnage") for property names
**See Also**: Weight, Weight Class
**Note**: "Tonnage" is acceptable in prose (e.g., "100 tons tonnage") but property should be named `weight`

#### Tons
**Canonical Term**: "tons"
**Context**: Unit of mass measurement
**Usage**: "weighs 3 tons", "10 tons"
**See Also**: Weight, Tonnage
**Note**: "Tons" is the unit; use "weight" as the property name

---

### U

#### Unit
**Canonical Term**: "unit"
**Context**: Generic term for any game entity (BattleMech, Vehicle, Infantry, etc.)
**Property**: `unit: IUnit`
**Usage**: Use when discussing non-BattleMech types or generic gameplay
**See Also**: BattleMech, Mech
**Note**: Too generic for BattleMech-specific contexts - prefer "BattleMech" or "mech"

#### Unit Tech Base
**Canonical Term**: "unit tech base"
**Context**: Overall tech base classification of a unit
**Property**: `unitTechBase: UnitTechBase`
**Enum Values**: `INNER_SPHERE`, `CLAN`, `MIXED`
**Usage**: "unit tech base is Mixed Tech", "Inner Sphere unit tech base"
**See Also**: Tech Base (component-level)

---

### V

#### Validation
**Canonical Term**: "validation"
**Context**: Checking rules compliance
**Property**: `validate()` (function), `validation` (noun), `ValidationResult` (interface)
**Usage**: "validation rules", "validate configuration", "validation errors"
**See Also**: Validation Error, Validation Warning
**Deprecated**: ~~"verification"~~, ~~"checking"~~

#### Validation Error
**Canonical Term**: "validation error" or "error"
**Context**: Blocking validation failure
**Property**: `errors: ValidationError[]`
**Severity**: Prevents save/use of configuration
**Usage**: "validation error occurred", "critical error"
**See Also**: Validation, Validation Warning

#### Validation Warning
**Canonical Term**: "validation warning" or "warning"
**Context**: Non-blocking validation advisory
**Property**: `warnings: ValidationWarning[]`
**Severity**: Configuration is legal but unusual
**Usage**: "validation warning", "warning about zero armor"
**See Also**: Validation, Validation Error

---

### W

#### Walk MP
**Canonical Term**: "Walk MP"
**Context**: Walking movement points
**Property**: `walkMP: number`
**Formula**: `floor(engineRating / tonnage)`
**Usage**: "6 Walk MP", "walking movement points"
**See Also**: Run MP, Jump MP, Movement Points

#### Weight
**Canonical Term**: "weight"
**Context**: Mass property of components and units
**Property**: `weight: number` (ALWAYS use "weight", never "tons" or "mass" for property names)
**Unit**: "tons"
**Usage**: "component weight", "total weight", "weighs 3 tons"
**See Also**: Tonnage, Tons
**Deprecated**: ~~"mass"~~, ~~"tons"~~ (as property name), ~~"tonnage"~~ (as property name)

#### Weight Class
**Canonical Term**: "weight class"
**Context**: BattleMech tonnage classification
**Property**: `weightClass: WeightClass`
**Enum Values**: `LIGHT`, `MEDIUM`, `HEAVY`, `ASSAULT`
**Usage**: "Light weight class", "weight class boundaries"
**See Also**: Light, Medium, Heavy, Assault

---

## Property Naming Standards

### General Rules

1. **Use camelCase**: `introductionYear`, `criticalSlots`, `engineRating`
2. **No snake_case**: ~~`introduction_year`~~, ~~`critical_slots`~~
3. **No abbreviations**: Use `introductionYear` not `introYear`, `criticalSlots` not `critSlots`
4. **Boolean properties**: Start with `is`, `has`, or `can`
   - `isFixed: boolean`
   - `hasLowerArm: boolean`
   - `canAllocate: boolean`
   - Exception: `engineMountable: boolean` (established convention)
5. **Count properties**: Use plural noun or `count` suffix
   - `criticalSlots: number` (count)
   - `heatSinks: IHeatSink[]` (array of objects)
6. **Collections**: Use plural nouns
   - `locations: MechLocation[]`
   - `components: IComponent[]`

### Standard Property Names

| Concept | Property Name | Type | Example |
|---------|---------------|------|---------|
| Weight | `weight` | `number` | `weight: 10` |
| Critical slots | `criticalSlots` | `number` | `criticalSlots: 3` |
| Tonnage (mech total) | `tonnage` or `weight` | `number` | `tonnage: 55` |
| Engine rating | `engineRating` or `rating` | `number` | `rating: 275` |
| Introduction year | `introductionYear` | `number` | `introductionYear: 3025` |
| Extinction year | `extinctionYear` | `number \| undefined` | `extinctionYear: 2855` |
| Tech base (component) | `techBase` | `TechBase` | `techBase: TechBase.CLAN` |
| Tech base (unit) | `unitTechBase` | `UnitTechBase` | `unitTechBase: UnitTechBase.MIXED` |
| Rules level | `rulesLevel` | `RulesLevel` | `rulesLevel: RulesLevel.ADVANCED` |
| Era | `era` | `Era` | `era: Era.CLAN_INVASION` |
| Weight class | `weightClass` | `WeightClass` | `weightClass: WeightClass.HEAVY` |
| Location | `location` | `MechLocation` | `location: MechLocation.CENTER_TORSO` |
| Engine type | `engineType` | `EngineType` | `engineType: EngineType.XL_CLAN` |
| Armor type | `armorType` | `ArmorType` | `armorType: ArmorType.FERRO_FIBROUS_CLAN` |
| Structure type | `structureType` | `StructureType` | `structureType: StructureType.ENDO_STEEL_IS` |

### Enum Naming

1. **Enum type names**: PascalCase/TitleCase
   - `TechBase`, `StructureType`, `EngineType`, `WeightClass`
2. **Enum values**: UPPER_SNAKE_CASE
   - `TechBase.INNER_SPHERE`, `Era.CLAN_INVASION`, `RulesLevel.ADVANCED`
3. **Display values**: Title Case strings
   - `TechBase.INNER_SPHERE = 'Inner Sphere'`
   - `Era.CLAN_INVASION = 'Clan Invasion'`

### Constant Naming

1. **Constants**: UPPER_SNAKE_CASE
   - `MAX_MECH_TONNAGE = 100`
   - `MIN_MECH_TONNAGE = 20`
   - `MIN_HEAT_SINKS = 10`
   - `HEAD_ARMOR_MAX = 9`

### Interface Naming

1. **Interfaces**: Start with `I`, then PascalCase
   - `IEntity`, `ITechBaseEntity`, `IWeightedComponent`
   - `IBattleMech`, `IEngine`, `IGyro`
2. **Exception**: Type guards and utility types don't need `I` prefix
   - `ValidationResult`, `ValidationError`

---

## Deprecated Terms (What NOT to Use)

### ❌ Incorrect Terms

| ❌ **Deprecated** | ✅ **Use Instead** | Context |
|---|---|---|
| ~~"Tournament"~~ | "Advanced" | Rules level (not a rules level value) |
| ~~"crit slots"~~ | "critical slots" | Slot terminology |
| ~~"critical spaces"~~ | "critical slots" | Slot terminology |
| ~~"tons"~~ (property) | `weight` | Property naming |
| ~~"mass"~~ | `weight` | Property naming |
| ~~"tonnage"~~ (property) | `weight` | Property naming |
| ~~"IS"~~ | "Inner Sphere" | Tech base (formal specs) |
| ~~"tech level"~~ | "rules level" | Different concept |
| ~~"complexity level"~~ | "rules level" | Rules classification |
| ~~"section"~~ | "location" | Mech body parts |
| ~~"body part"~~ | "location" | Mech body parts |
| ~~"centre torso"~~ | "Center Torso" | British spelling |
| ~~"armour"~~ | "armor" | British spelling |
| ~~"gyroscope"~~ | "gyro" | Too formal |
| ~~"heatsink"~~ | "heat sink" | One word vs two |
| ~~"internal heat sinks"~~ | "engine-integrated heat sinks" | Ambiguous |
| ~~"additional heat sinks"~~ | "external heat sinks" | Imprecise |
| ~~"verify"~~ | "validate" | Validation process |
| ~~"checking"~~ | "validation" | Validation process |
| ~~"build"~~ | "construction" | Formal specs |
| ~~"intro year"~~ | "introduction year" | Abbreviation |
| ~~"extinct year"~~ | "extinction year" | Incorrect term |
| ~~"AP"~~ | "armor points" | Abbreviation in formal specs |
| ~~"Battlemech"~~ | "BattleMech" | Incorrect capitalization |
| ~~"Battle Mech"~~ | "BattleMech" | Two words |

### Acceptable Informal Variants

Some terms are acceptable in informal contexts but should be avoided in formal specifications:

| Informal (Comments OK) | Formal (Specs) |
|---|---|
| "mech" | "BattleMech" |
| "CT" | "Center Torso" (spell out first use) |
| "slots" | "critical slots" (spell out first use) |
| "BV" | "Battle Value" (spell out first use) |
| "MP" | "Movement Points" (spell out first use) |

---

## Style Guide

### Writing Conventions

#### 1. Sentence Structure
- **Use active voice**: "allocate slots" not "slots are allocated"
- **Use imperative for requirements**: "Component SHALL have weight property"
- **Avoid future tense**: Use "SHALL" not "will"
- **Be specific**: "the mech" or "the BattleMech" not just "it"

#### 2. Term Definition
- **Define on first use**: "internal structure (also called 'structure')"
- **Use consistent terminology**: Once defined, use same term throughout
- **Clarify abbreviations**: "Battle Value (BV)" before using "BV" alone

#### 3. Capitalization

**Proper Nouns (Always Capitalize)**:
- Location names: "Center Torso", "Left Arm", "Right Leg"
- Faction names: "Inner Sphere", "Clan"
- Era names: "Clan Invasion", "Star League", "Dark Age"
- Game terms: "BattleMech", "Battle Value"

**Lowercase**:
- Generic terms: "armor", "weight", "engine", "gyro"
- Descriptive phrases: "tech base", "rules level", "weight class"

**Special Cases**:
- "Inner Sphere" (proper noun - always capitalize)
- "center torso" (lowercase when used generically, "Center Torso" when referring to specific location)

#### 4. Hyphenation

**Use Hyphens**:
- Compound adjectives before noun: "engine-mounted heat sinks", "tech-base compatibility"
- Compound terms: "heat-sink slots" (when "heat sink" modifies "slots")

**Don't Hyphenate**:
- Noun phrases: "heat sink", "tech base", "internal structure"
- After noun: "heat sinks mounted in engine"

#### 5. Pluralization

- BattleMech → BattleMechs
- location → locations
- heat sink → heat sinks
- gyro → gyros
- slot → slots

#### 6. Abbreviations

**In Formal Specifications**:
- Spell out first use, then abbreviate: "Battle Value (BV)"
- Avoid in property names: `introductionYear` not `introYear`
- Avoid in formal definitions

**In Tables and Diagrams**:
- Abbreviations acceptable: CT, LT, RT, LA, RA, LL, RL, HD
- Use consistently throughout table

**In Comments and Prose**:
- Abbreviations acceptable after first definition
- Common: BV, MP, IS (after "Inner Sphere" established)

---

## Quick Reference Tables

### Critical Slots Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| `criticalSlots: number` | ~~`slots: number`~~ (property name) |
| "12 critical slots" | ~~"12 crit slots"~~ |
| "critical slot allocation" | ~~"slot allocation"~~ (be specific) |
| "available critical slots" | ~~"available spaces"~~ |

### Weight Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| `weight: number` | ~~`tons: number`~~ (property) |
| `weight: number` | ~~`mass: number`~~ |
| "weighs 10 tons" | ~~"10 tons weight"~~ |
| "total tonnage" | ~~"total tons"~~ (awkward) |
| "component weight" | ~~"component mass"~~ |

### Component Classification

| Type | ✅ **Correct Usage** | Examples |
|---|---|---|
| **Component** | Any discrete item (broad) | All engines, gyros, weapons, heat sinks |
| **System Component** | Fixed/required items | Engine, gyro, cockpit, actuators, structure |
| **Equipment** | Removable/configurable items | Weapons, ammunition, heat sinks, jump jets |

### Tech Base Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| `TechBase.INNER_SPHERE` | ~~`TechBase.IS`~~ |
| "Inner Sphere technology" | ~~"IS tech"~~ (formal specs) |
| `techBase: TechBase` | ~~`faction: string`~~ |
| "Inner Sphere" (capitalized) | ~~"inner sphere"~~ (lowercase) |

### Location Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| `MechLocation.CENTER_TORSO` | ~~`MechLocation.CT`~~ (enum value) |
| "Center Torso location" | ~~"centre torso location"~~ |
| "location" (generic) | ~~"section"~~, ~~"body part"~~ |
| "Head location" | ~~"head section"~~ |

### Engine Heat Sink Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| "engine-mounted heat sinks" | ~~"internal heat sinks"~~ |
| "engine-integrated heat sinks" | ~~"engine heat sinks"~~ |
| "external heat sinks" | ~~"additional heat sinks"~~ |
| `engineIntegrated: number` | ~~`internalHS: number`~~ |

### Validation Terminology

| ✅ **Correct** | ❌ **Incorrect** |
|---|---|
| `validate()` | ~~`verify()`~~, ~~`check()`~~ |
| "validation error" | ~~"invalid error"~~, ~~"validation failure"~~ |
| "validation warning" | ~~"warning error"~~ |
| `ValidationResult` | ~~`VerificationResult`~~ |

---

## Usage Examples

### ✅ Correct Examples

```typescript
// Property naming
interface IBattleMech {
  weight: number;                    // ✅ Use "weight" not "tons" or "mass"
  criticalSlots: number;             // ✅ Full "criticalSlots" not "slots"
  introductionYear: number;          // ✅ Full "introductionYear" not "introYear"
  techBase: TechBase;                // ✅ "techBase" not "faction"
  engineIntegrated: number;          // ✅ "engineIntegrated" heat sinks
}

// Prose
"The BattleMech has 12 critical slots in the Center Torso location."
"Inner Sphere technology uses engine-mounted heat sinks."
"Component weight must be non-negative."
"Advanced rules level technology is tournament legal."

// Comments
// Calculate total weight of all components
// Allocate critical slots for engine and gyro
// Validate tech base compatibility
```

### ❌ Incorrect Examples

```typescript
// ❌ WRONG - Do not use these
interface IBattleMech {
  tons: number;                      // ❌ Use "weight" instead
  slots: number;                     // ❌ Use "criticalSlots"
  introYear: number;                 // ❌ Don't abbreviate
  faction: string;                   // ❌ Use "techBase: TechBase"
  internalHS: number;                // ❌ Use "engineIntegrated"
}

// ❌ WRONG prose
"The mech has 12 crit slots in the CT."              // Too many abbreviations
"IS tech uses internal heat sinks."                  // Ambiguous terminology
"Component mass must be positive."                   // Use "weight" not "mass"
"Tournament level technology is legal."              // "Advanced" not "Tournament"
```

---

## Glossary Maintenance

### Version History

**Version 1.0** (2025-11-28)
- Initial glossary creation
- 100+ canonical terms defined
- Property naming standards established
- Deprecated terms documented
- Style guide created

### How to Update This Glossary

1. **Adding New Terms**:
   - Insert alphabetically in Canonical Terms section
   - Include: Definition, Property name, Usage, See Also, Deprecated terms
   - Update Quick Reference Tables if applicable

2. **Deprecating Terms**:
   - Move from Canonical Terms to Deprecated Terms section
   - Document replacement term
   - Update all specifications using deprecated term

3. **Changing Standards**:
   - Update version number
   - Document change in Version History
   - Create migration guide if breaking change
   - Update all affected specifications

### Related Documents

- **Specification Template**: `openspec/templates/spec-template.md`
- **Style Guide**: This document (Style Guide section)
- **All Specifications**: Must conform to this glossary

---

## Enforcement

### For Specification Authors

- ✅ **Required**: Use only canonical terms from this glossary
- ✅ **Required**: Follow property naming standards exactly
- ✅ **Required**: Avoid deprecated terms
- ✅ **Recommended**: Reference this glossary in spec header

### For Code Reviewers

- ✅ Check property names match glossary standards
- ✅ Verify terminology consistency
- ✅ Flag deprecated term usage
- ✅ Ensure new terms are added to glossary

### For Implementers

- ✅ Use property names exactly as defined
- ✅ Follow TypeScript interface definitions
- ✅ Reference canonical terms in code comments

---

## Summary

This glossary establishes **canonical terminology** for all BattleTech Editor OpenSpec specifications. By using consistent terminology:

- **Maintainability improves**: Changes only need to be made in one place
- **Clarity increases**: Everyone uses the same terms for the same concepts
- **Implementation simplifies**: Property names are standardized and predictable
- **Communication becomes easier**: Team members speak the same language

**Key Principles**:
1. Use canonical terms exclusively
2. Follow property naming standards
3. Avoid deprecated terms
4. Be specific and precise
5. Write for clarity and consistency

---

**Questions or suggestions?** Update this glossary and increment the version number.
