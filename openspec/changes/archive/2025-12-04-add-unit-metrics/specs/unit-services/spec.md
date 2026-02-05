## MODIFIED Requirements

### Requirement: Unit Index Structure

The system SHALL maintain a master index of all canonical units.

**Rationale**: Index enables fast browsing without loading full unit data.

**Priority**: Critical

#### Scenario: Master index location

- **GIVEN** units are stored in `public/data/units/battlemechs/`
- **WHEN** accessing the index
- **THEN** index SHALL be at `public/data/units/battlemechs/index.json`

#### Scenario: Index entry format

- **GIVEN** a unit in the index
- **THEN** entry SHALL contain:
  - `id` - Unique unit identifier (e.g., "atlas-as7-d")
  - `chassis` - Base chassis name (e.g., "Atlas")
  - `model` - Variant designation (e.g., "AS7-D")
  - `tonnage` - Unit weight in tons (e.g., 100)
  - `techBase` - INNER_SPHERE, CLAN, or MIXED
  - `year` - Introduction year (e.g., 2755)
  - `role` - Combat role (e.g., "Juggernaut")
  - `rulesLevel` - Rules complexity level (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL)
  - `bv` - Battle Value 2.0 (integer, e.g., 1897)
  - `cost` - C-Bill cost (integer, e.g., 9626000)
  - `path` - Relative path to full JSON file

#### Scenario: Index metadata

- **GIVEN** the index.json file
- **THEN** metadata SHALL include:
  - `version` - Format version string
  - `generatedAt` - ISO timestamp of generation
  - `totalUnits` - Total count of units in index

#### Scenario: Index entry with metrics

- **GIVEN** Atlas AS7-D unit in the index
- **THEN** entry SHALL include:
  - `rulesLevel`: "STANDARD"
  - `bv`: 1897
  - `cost`: 9626000
