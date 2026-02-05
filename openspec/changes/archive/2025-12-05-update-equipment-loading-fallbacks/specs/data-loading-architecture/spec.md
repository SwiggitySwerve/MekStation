## ADDED Requirements

### Requirement: Cross-Environment Equipment Loading

The system SHALL load equipment JSON files in both server-side (Node.js) and client-side (browser) environments.

**Rationale**: Next.js applications render on both server and client; equipment must be available in both contexts.

**Priority**: Critical

#### Scenario: Server-side loading

- **GIVEN** the application is running in a Node.js environment (SSR/API routes)
- **WHEN** loading equipment JSON files
- **THEN** system SHALL use dynamic import of `fs/promises` module
- **AND** system SHALL read files from `public/data/` directory
- **AND** system SHALL NOT use `fetch` (unavailable for local files in Node.js)

#### Scenario: Client-side loading

- **GIVEN** the application is running in a browser environment
- **WHEN** loading equipment JSON files
- **THEN** system SHALL use `fetch` API
- **AND** system SHALL request from `/data/equipment/` path
- **AND** system SHALL handle network errors gracefully

#### Scenario: Environment detection

- **GIVEN** the equipment loader is initializing
- **WHEN** determining the runtime environment
- **THEN** system SHALL check `typeof window === 'undefined'`
- **AND** server environment SHALL be detected when `window` is undefined
- **AND** client environment SHALL be detected when `window` exists

---

### Requirement: Equipment Loading Fallback Pattern

The system SHALL provide fallback equipment definitions for critical construction components.

**Rationale**: Unit construction requires certain equipment immediately, before async JSON loading completes.

**Priority**: Critical

#### Scenario: Critical equipment fallbacks

- **GIVEN** the JSON equipment loader has not completed initialization
- **WHEN** equipment utilities request critical equipment definitions
- **THEN** system SHALL provide hardcoded fallback definitions for:
  - Heat sinks (single, double IS, double Clan, compact, laser)
  - Jump jets (standard light/medium/heavy, improved light/medium/heavy)
  - Targeting computers (IS, Clan)
  - Movement enhancements (MASC IS, MASC Clan, TSM, Supercharger)

#### Scenario: Fallback lookup order

- **GIVEN** equipment is requested by ID
- **WHEN** resolving the equipment definition
- **THEN** system SHALL first attempt JSON loader lookup
- **AND** if loader is not loaded or returns null, system SHALL use fallback definition
- **AND** fallback SHALL contain all required fields (id, name, weight, criticalSlots, etc.)

#### Scenario: Fallback completeness

- **GIVEN** a fallback equipment definition exists
- **WHEN** the fallback is used
- **THEN** definition SHALL include:
  - `id` - Unique identifier
  - `name` - Display name
  - `category` - Equipment category enum value
  - `techBase` - INNER_SPHERE or CLAN
  - `rulesLevel` - Rules level enum value
  - `weight` - Weight in tons (may be 0 for variable equipment)
  - `criticalSlots` - Number of critical slots (may be 0 for variable equipment)
  - `costCBills` - C-Bill cost
  - `battleValue` - Battle value
  - `introductionYear` - Year of introduction
