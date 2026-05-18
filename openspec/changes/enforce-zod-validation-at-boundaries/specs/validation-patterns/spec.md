# validation-patterns — Delta for enforce-zod-validation-at-boundaries

## ADDED Requirements

### Requirement: Zod Schema Validation at I/O Boundaries

Data crossing an I/O boundary into typed domain code SHALL be validated against
a Zod schema. An I/O boundary is any point where data from the filesystem,
`localStorage`, the network, or a user import enters typed application code.

The TypeScript type used at each boundary SHALL be inferred from the Zod schema
(`z.infer`) rather than maintained as a separate hand-written interface, so the
schema and the type cannot drift. New backward-compatible fields SHALL use
`.optional()` and SHALL NOT use `.default()`.

The failure behaviour SHALL match the boundary:

- Persisted store hydration (`localStorage`) — on validation failure the
  payload SHALL be discarded and the store SHALL fall back to its default
  state; hydration SHALL NOT throw.
- Bundled data files (unit JSON) — on validation failure the loader SHALL throw
  an error naming the offending field path.
- API route request bodies — on validation failure the route SHALL return a
  `400` response carrying the schema error and SHALL NOT pass the body to
  domain code.

#### Scenario: Corrupt persisted store state falls back to default

- **GIVEN** a per-type store whose `localStorage` payload fails its Zod schema
- **WHEN** the store rehydrates
- **THEN** the invalid payload SHALL be discarded
- **AND** the store SHALL initialise to its default state
- **AND** hydration SHALL NOT throw

#### Scenario: Malformed unit JSON fails loudly at load

- **GIVEN** a unit JSON file that does not conform to the unit schema
- **WHEN** the unit loader reads it
- **THEN** the loader SHALL throw an error identifying the offending field path

#### Scenario: Malformed API request body returns 400

- **GIVEN** an API route whose request body fails its Zod schema
- **WHEN** the route handler runs
- **THEN** the route SHALL return a `400` response containing the schema error
- **AND** the body SHALL NOT reach domain code

#### Scenario: Boundary type is inferred from the schema

- **GIVEN** a boundary with a Zod schema
- **WHEN** typed code consumes the validated value
- **THEN** its TypeScript type SHALL be `z.infer` of that schema
- **AND** no parallel hand-written interface SHALL describe the same shape
