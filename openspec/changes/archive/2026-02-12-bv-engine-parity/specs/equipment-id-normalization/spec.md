# equipment-id-normalization Specification

## Purpose

Defines the multi-stage equipment ID normalization pipeline that maps equipment IDs from unit JSON files and MegaMek crit slot names to canonical equipment catalog entries. This is the foundation for accurate BV and heat resolution.

## Requirements

### Requirement: 6-Stage Normalization Pipeline

The system SHALL normalize equipment IDs through a 6-stage pipeline with early-exit on match.

#### Scenario: Stage 1 — Direct catalog lookup

- **WHEN** normalizing an equipment ID
- **THEN** Stage 1 SHALL attempt direct catalog lookup with lowercase ID
- **AND** if match found, return immediately (no further stages)
- **AND** this handles already-canonical IDs (e.g., `"medium-laser"`)

#### Scenario: Stage 2 — DIRECT_ALIAS_MAP lookup

- **WHEN** Stage 1 fails to find a match
- **THEN** Stage 2 SHALL check DIRECT_ALIAS_MAP for hardcoded aliases
- **AND** DIRECT_ALIAS_MAP contains ~320 common equipment aliases
- **AND** if alias found, return mapped catalog ID immediately
- **CRITICAL** DIRECT_ALIAS_MAP is checked BEFORE name-mappings.json
- **AND** incorrect alias entries will intercept correct name-mappings
- **EXAMPLE** `"ultra-ac-5"` → `"uac-5"` (catalog ID)

#### Scenario: Stage 3 — name-mappings.json lookup

- **WHEN** Stage 2 fails to find a match
- **THEN** Stage 3 SHALL check name-mappings.json for MegaMek name mappings
- **AND** name-mappings.json contains ~6,168 entries
- **AND** mappings are MegaMek internal names → catalog IDs
- **AND** if mapping found, return mapped catalog ID immediately
- **EXAMPLE** `"ISMediumLaser"` → `"medium-laser"`
- **NOTE** 92.9% of name-mappings resolve directly to valid catalog IDs

#### Scenario: Stage 4 — Lowercase + normalize (spaces to hyphens)

- **WHEN** Stage 3 fails to find a match
- **THEN** Stage 4 SHALL:
  1. Convert to lowercase
  2. Replace spaces with hyphens
  3. Attempt catalog lookup
- **AND** if match found, return immediately
- **EXAMPLE** `"Medium Laser"` → `"medium-laser"`

#### Scenario: Stage 5 — Tech base prefix stripping

- **WHEN** Stage 4 fails to find a match
- **THEN** Stage 5 SHALL strip tech base prefixes and retry:
  1. Strip `IS`, `Clan`, `CL` prefixes (case-insensitive)
  2. Attempt catalog lookup with stripped form
  3. If starts with `cl`, try adding `clan-` prefix
- **AND** if match found, return immediately
- **EXAMPLE** `"ISMediumLaser"` → `"mediumlaser"` → catalog lookup
- **EXAMPLE** `"CLERMediumLaser"` → `"ermediumlaser"` → `"clan-er-medium-laser"`

#### Scenario: Stage 6 — Numeric suffix/instance prefix stripping

- **WHEN** Stage 5 fails to find a match
- **THEN** Stage 6 SHALL strip numeric affixes and retry:
  1. Strip leading instance prefix (e.g., `"1-ismrm40"` → `"ismrm40"`)
  2. Strip trailing numeric suffix (e.g., `"medium-laser-1"` → `"medium-laser"`)
  3. Attempt catalog lookup
- **AND** if match found, return immediately
- **EXAMPLE** `"1-ismediumlaser"` → `"ismediumlaser"` → Stage 2/3 retry

#### Scenario: Final fallback — Direct catalog match

- **WHEN** all 6 stages fail to find a match
- **THEN** system SHALL return the normalized form (lowercase, stripped)
- **AND** equipment BV resolver will log unresolvable ID warning
- **AND** equipment will contribute 0 BV and 0 heat

### Requirement: DIRECT_ALIAS_MAP Priority

The system SHALL check DIRECT_ALIAS_MAP before name-mappings.json to handle common aliases efficiently.

#### Scenario: DIRECT_ALIAS_MAP intercepts name-mappings

- **WHEN** an equipment ID exists in both DIRECT_ALIAS_MAP and name-mappings.json
- **THEN** DIRECT_ALIAS_MAP entry SHALL take precedence
- **AND** name-mappings.json entry will NOT be checked
- **CRITICAL** Incorrect DIRECT_ALIAS_MAP entries can break resolution
- **EXAMPLE** `"iseherppc"` was mapped to `"er-ppc"` (wrong) instead of `"enhanced-er-ppc"` (correct)

#### Scenario: DIRECT_ALIAS_MAP size and coverage

- **WHEN** loading DIRECT_ALIAS_MAP
- **THEN** map SHALL contain ~320 entries
- **AND** entries cover most common equipment ID variations
- **AND** entries include:
  - Ultra AC variants (`"ultra-ac-5"` → `"uac-5"`)
  - Rotary AC variants (`"rotary-ac-5"` → `"rac-5"`)
  - Heavy laser word-order fixes (`"heavy-medium-laser"` → `"medium-heavy-laser"`)
  - Rocket launcher variants (`"rocket-launcher-10"` → `"rl10"`)
  - AMS variants (`"anti-missile-system"` → `"ams"`)

### Requirement: name-mappings.json as Resolution Layer

The system SHALL use name-mappings.json to map MegaMek internal names to catalog IDs.

#### Scenario: name-mappings.json size and coverage

- **WHEN** loading name-mappings.json
- **THEN** file SHALL contain ~6,168 entries
- **AND** entries are MegaMek crit slot names → catalog IDs
- **AND** 92.9% of entries resolve to valid catalog IDs
- **EXAMPLE** `"ISMediumLaser"` → `"medium-laser"`
- **EXAMPLE** `"CLERMediumLaser"` → `"clan-er-medium-laser"`

#### Scenario: name-mappings.json maintenance risk

- **WHEN** maintaining name-mappings.json
- **THEN** incorrect entries can map IS ammo to Clan IDs (or vice versa)
- **AND** Clan vs IS ammo have different BV values
- **AND** ammo resolution MUST validate tech base before using mapping
- **CRITICAL** name-mappings.json has 6,168 entries and requires careful maintenance

#### Scenario: Case-insensitive name-mappings fallback

- **WHEN** exact-case name-mappings lookup fails
- **THEN** system SHALL build lowercase index of name-mappings
- **AND** retry lookup with lowercase key
- **AND** this handles case variations in unit JSON files
- **EXAMPLE** `"ismediumlaser"` → lowercase lookup → `"medium-laser"`

### Requirement: Known Pitfalls and Edge Cases

The system SHALL document known pitfalls in equipment ID normalization.

#### Scenario: Missing catalog targets (6 alias entries)

- **WHEN** resolving equipment IDs
- **THEN** 6 DIRECT_ALIAS_MAP entries have missing catalog targets:
  - `"rac-10"` (not in catalog)
  - `"rocket-launcher-10"` → `"rl10"` (not in catalog)
  - `"rocket-launcher-15"` → `"rl15"` (not in catalog)
  - `"rocket-launcher-20"` → `"rl20"` (not in catalog)
- **AND** these will resolve to 0 BV and 0 heat
- **AND** validation will log unresolvable ID warnings

#### Scenario: Tech base prefix ambiguity

- **WHEN** stripping tech base prefixes
- **THEN** system MUST handle both IS and Clan variants:
  - `"IS"` prefix → Inner Sphere
  - `"CL"` or `"Clan"` prefix → Clan
- **AND** Clan equipment often has separate catalog entries
- **AND** stripping prefix may resolve to IS version (incorrect for Clan)
- **EXAMPLE** `"CLERMediumLaser"` should resolve to `"clan-er-medium-laser"`, not `"er-medium-laser"`

#### Scenario: Word-order mismatches

- **WHEN** normalizing equipment IDs
- **THEN** catalog uses `"improved-heavy-medium-laser"` (adjective-size-type order)
- **AND** MegaMek uses `"CLImprovedMediumHeavyLaser"` (adjective-type-size order)
- **AND** simple normalization will fail to match
- **AND** DIRECT_ALIAS_MAP provides explicit mapping for these cases
- **EXAMPLE** `"heavy-medium-laser"` → `"medium-heavy-laser"` (via DIRECT_ALIAS_MAP)

#### Scenario: Numeric instance prefixes

- **WHEN** unit JSON contains multiple instances of same equipment
- **THEN** equipment IDs may have numeric prefix (e.g., `"1-ismediumlaser"`, `"2-ismediumlaser"`)
- **AND** Stage 6 strips these prefixes before catalog lookup
- **AND** all instances resolve to same catalog entry (correct behavior)

### Requirement: Resolution Statistics

The system SHALL track and report equipment ID resolution statistics.

#### Scenario: Resolution success rate

- **WHEN** resolving equipment IDs across all 4,225 units
- **THEN** resolution success rate SHALL be >99%
- **AND** unresolvable IDs SHALL be logged once per session
- **AND** unresolvable IDs contribute 0 BV and 0 heat
- **NOTE** 6 known unresolvable IDs (missing catalog targets)

#### Scenario: name-mappings.json coverage

- **WHEN** analyzing name-mappings.json entries
- **THEN** 92.9% of entries SHALL resolve to valid catalog IDs
- **AND** 7.1% of entries have missing catalog targets
- **AND** missing targets are typically rare/experimental equipment

## Data Model Requirements

### Interface: EquipmentBVResult

```typescript
interface EquipmentBVResult {
  battleValue: number;
  heat: number;
  resolved: boolean;
}
```

### Interface: EquipmentCatalogEntry

```typescript
interface EquipmentCatalogEntry {
  id: string;
  name: string;
  category: string;
  subType?: string;
  techBase: string;
  heat?: number;
  battleValue: number;
  damage?: number | string;
}
```

## Normalization Rules

### Rule: Early-Exit on Match

- Each stage MUST return immediately on successful match
- Subsequent stages SHALL NOT be executed after a match
- This ensures deterministic resolution order

### Rule: Lowercase Normalization

- All equipment IDs MUST be converted to lowercase before comparison
- Catalog keys are lowercase
- name-mappings.json keys are case-sensitive (fallback to lowercase index)

### Rule: Prefix Stripping Order

- Numeric instance prefix (`"1-"`) stripped first
- Tech base prefix (`"IS"`, `"CL"`, `"Clan"`) stripped second
- Numeric suffix (`"-1"`) stripped last

### Rule: DIRECT_ALIAS_MAP Correctness

- DIRECT_ALIAS_MAP entries MUST map to valid catalog IDs
- Incorrect entries will break resolution for affected equipment
- Changes to DIRECT_ALIAS_MAP require validation against full unit set

## Implementation Notes

### Performance Considerations

- Equipment catalog loaded once and cached in memory
- name-mappings.json loaded once and cached
- Lowercase name-mappings index built lazily on first use
- Unresolvable IDs logged once per session (Set-based deduplication)

### Edge Cases

- Equipment with 0 BV (valid — e.g., TAG has BV=0)
- Equipment with 0 heat (valid — e.g., Gauss Rifle has heat=1)
- Equipment with missing `heat` field (defaults to 0)
- Equipment with `heat` as string (invalid — should be number)

### Common Pitfalls

- Forgetting to check DIRECT_ALIAS_MAP before name-mappings.json
- Adding incorrect DIRECT_ALIAS_MAP entries that intercept correct name-mappings
- Not handling case-insensitive fallback for name-mappings.json
- Assuming all name-mappings.json entries have valid catalog targets
- Not stripping numeric instance prefixes before normalization

## Examples

### Example: Successful resolution via DIRECT_ALIAS_MAP

```typescript
// Input: "ultra-ac-5"
// Stage 1: Direct catalog lookup → FAIL (not in catalog)
// Stage 2: DIRECT_ALIAS_MAP["ultra-ac-5"] → "uac-5" → SUCCESS
// Result: { battleValue: 112, heat: 1, resolved: true }
```

### Example: Successful resolution via name-mappings.json

```typescript
// Input: "ISMediumLaser"
// Stage 1: Direct catalog lookup → FAIL
// Stage 2: DIRECT_ALIAS_MAP → FAIL (not in map)
// Stage 3: name-mappings["ISMediumLaser"] → "medium-laser" → SUCCESS
// Result: { battleValue: 46, heat: 3, resolved: true }
```

### Example: Successful resolution via prefix stripping

```typescript
// Input: "CLERMediumLaser"
// Stage 1: Direct catalog lookup → FAIL
// Stage 2: DIRECT_ALIAS_MAP → FAIL
// Stage 3: name-mappings → FAIL (not in mappings)
// Stage 4: Lowercase + normalize → "clermediumlaser" → FAIL
// Stage 5: Strip "CL" prefix → "ermediumlaser" → try "clan-er-medium-laser" → SUCCESS
// Result: { battleValue: 62, heat: 5, resolved: true }
```

### Example: Unresolvable ID

```typescript
// Input: "rac-10"
// Stage 1-6: All stages FAIL
// Result: { battleValue: 0, heat: 0, resolved: false }
// Log: "[equipmentBVResolver] Unresolvable equipment ID: "rac-10" (normalized: "rac-10")"
```

## References

- Equipment catalog: `public/data/equipment/official/`
- name-mappings.json: `public/data/equipment/name-mappings.json`
- Implementation: `src/utils/construction/equipmentBVResolver.ts`
- Related spec: `battle-value-system/spec.md`
- Proposal edge case: EC-7 (Equipment ID Normalization Complexity)
