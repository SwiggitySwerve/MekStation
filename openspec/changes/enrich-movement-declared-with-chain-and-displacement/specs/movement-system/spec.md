## ADDED Requirements

### Requirement: Movement Phase Step Chain Emission

The simulation runner SHALL emit every committed move as a `movement_declared` event whose payload carries a `steps` array — the chain of micro-moves the unit executed in order. Each entry in the array SHALL be one of the discriminated `IMovementStep` variants:

- `'forward'` — straight movement (FORWARDS or BACKWARDS); carries `from`, `to`, `mpCost`, `terrainEntered`, `elevationDelta`, and a `direction: 'forward' | 'backward'` discriminator.
- `'turn'` — facing change (TURN_LEFT or TURN_RIGHT); carries `at`, `fromFacing`, `toFacing`, `mpCost`.
- `'lateral'` — sideslip (LATERAL_LEFT, LATERAL_RIGHT, LATERAL_LEFT_BACKWARDS, LATERAL_RIGHT_BACKWARDS); carries `from`, `to`, `mpCost`, `direction`.
- `'jump'` — jump segment (one event per START_JUMP committed); carries `from`, `to`, `mpCost`, `terrainEntered`.
- `'standUp'` — GET_UP; carries `at`, `mpCost` (typically 2), `psrTriggered: boolean`.
- `'goProne'` — voluntary prone; carries `at`, `mpCost`.
- `'chargeDeclared'` — CHARGE physical-attack declaration handoff; carries `at`, `targetId`, `straightLineHexes`.
- `'dfaDeclared'` — DFA physical-attack declaration handoff; carries `at`, `targetId`, `jumpHeight`.
- `'shakeOffSwarm'` — SHAKE_OFF_SWARMERS; carries `at`, `psrTriggered: boolean`.

Every step SHALL include `index: number` (0-based ordinal within the move) so consumers can correlate per-step PSR events back to the originating step.

The `steps` array is OPTIONAL on `IMovementDeclaredPayload` for back-compat — NDJSON event streams written before this change SHALL replay unchanged.

The runner MAY skip emitting a step type that is not yet implemented in the engine (e.g. SHAKE_OFF_SWARMERS in early scenarios), but SHALL NOT emit a step type with a kind discriminator that is not in the `IMovementStep` union.

#### Scenario: A walk-only move emits forward steps and turn steps in commit order

- **GIVEN** a unit committing a 5-MP walk that consists of: forward 2 hexes, turn right, forward 2 hexes, turn right, forward 1 hex
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL be exactly:
  ```
  [{kind:'forward', index:0, ...}, {kind:'forward', index:1, ...},
   {kind:'turn', index:2, ...},
   {kind:'forward', index:3, ...}, {kind:'forward', index:4, ...},
   {kind:'turn', index:5, ...},
   {kind:'forward', index:6, ...}]
  ```
- **AND** the sum of `step.mpCost` SHALL equal `payload.mpUsed`

#### Scenario: A jump move emits a single jump step (not a chain of forward steps)

- **GIVEN** a unit jumping 4 hexes from `(q=0, r=0)` to `(q=4, r=0)` for 4 MP
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL contain exactly one entry with `kind: 'jump'`
- **AND** that entry's `from` and `to` SHALL match the move's `from` and `to`
- **AND** that entry's `mpCost` SHALL equal `payload.mpUsed`
- **AND** `payload.movementType` SHALL be `'jump'`

#### Scenario: A charge declaration produces a chargeDeclared step at the end of the chain

- **GIVEN** a unit declaring a charge attack against opponent-1 at the end of a 3-hex straight-line forward move
- **WHEN** the runner emits the `movement_declared` event
- **THEN** the last entry in `payload.steps` SHALL have `kind: 'chargeDeclared'`
- **AND** that entry's `targetId` SHALL be `'opponent-1'`
- **AND** that entry's `straightLineHexes` SHALL be `3`

#### Scenario: A stand-up step records its MP cost and PSR trigger

- **GIVEN** a prone unit attempting to stand
- **WHEN** the runner emits the `movement_declared` event
- **THEN** `payload.steps` SHALL begin with a `kind: 'standUp'` entry
- **AND** that entry's `mpCost` SHALL be 2 (per Total Warfare Errata)
- **AND** that entry's `psrTriggered` SHALL be `true` (the AttemptStand PSR fires regardless of stand outcome)

### Requirement: Movement Decomposition Fields

Every `movement_declared` event SHALL include four optional decomposition fields summarizing the chain:

- `hexesMoved: number` — total hex transitions (`path.length - 1`); equals the count of forward + lateral + jump steps that result in a hex-position change.
- `straightHexes: number` — number of hexes entered without a facing change in the same step (forward + backward + lateral, excluding turns and stand-up / go-prone steps).
- `turningMpCost: number` — `mpUsed - straightHexes - jumpMpCost - specialStepMpCost`; the residual MP that went to facing changes only.
- `netDisplacement: number` — `hexDistance(from, to)` computed via the existing axial-distance utility; equals the straight-line distance from start to end regardless of path.

These fields SHALL be derived deterministically from the `steps` array when both are present. When `steps` is omitted (legacy stream), consumers MAY treat the four fields as the only available decomposition.

#### Scenario: Decomposition fields satisfy the conservation invariant

- **GIVEN** a `movement_declared` event with `mpUsed: 5`, `straightHexes: 4`, `turningMpCost: 1`, no jump steps
- **WHEN** consumers read the event
- **THEN** `straightHexes + turningMpCost` SHALL equal `mpUsed`
- **AND** `straightHexes` SHALL equal the count of `kind: 'forward' | 'backward' | 'lateral'` entries in `payload.steps`

#### Scenario: Net displacement equals hexDistance regardless of path

- **GIVEN** a unit moving from `(q=0, r=0)` to `(q=3, r=0)` via a winding path of 5 hex transitions
- **WHEN** the runner emits the event
- **THEN** `payload.hexesMoved` SHALL be 5
- **AND** `payload.netDisplacement` SHALL be 3 (= `hexDistance({q:0,r:0}, {q:3,r:0})`)

### Requirement: Hex Coordinate Board Label Utility

The hex-math utility module (`src/utils/gameplay/hexMath.ts`) SHALL export a function `coordToBoardLabel(coord: IHexCoordinate): string` that converts an axial `(q, r)` coordinate to a MegaMek-standard 4-digit `NNNN` board-label string where the first two digits are the 1-indexed column and the last two digits are the 1-indexed row, both using `String.prototype.padStart(2, '0')` for zero-padding.

The function SHALL be the inverse of the existing `convertOffsetToAxial(col, row)` in `src/lib/parsers/megaMekBoard.ts:141` so that round-tripping is identity over the valid coordinate range.

#### Scenario: Axial origin maps to 4-digit `0101`

- **GIVEN** an axial coordinate `{q: 0, r: 0}`
- **WHEN** `coordToBoardLabel` is called
- **THEN** the return value SHALL be `'0101'`

#### Scenario: A typical board hex round-trips through axial and back

- **GIVEN** a MegaMek board hex at column 12, row 7 (`'1207'`)
- **AND** the axial coordinate produced by `convertOffsetToAxial(12, 7)`
- **WHEN** `coordToBoardLabel` is called on that axial coordinate
- **THEN** the return value SHALL be `'1207'`
