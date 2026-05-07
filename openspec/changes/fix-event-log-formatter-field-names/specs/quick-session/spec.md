## ADDED Requirements

### Requirement: Readable Event-Log Companion Formatter Contract

The repository SHALL ship a Python utility at `scripts/format-event-log.py` that converts a `<gameId>.jsonl` event-log file (as produced by `Per-Game Event Log Persistence`) into a human-readable companion text file at `<gameId>.readable.txt`.

The formatter SHALL read each event's payload using the canonical field names emitted by the engine. The formatter SHALL NOT invent payload field names that the engine does not emit. The canonical field names per event type are:

| Event type | Canonical payload fields the formatter MUST read |
|---|---|
| `movement_declared` | `unitId`, `from` (`IHexCoordinate`), `to` (`IHexCoordinate`), `facing`, `movementType`, `mpUsed`, `path?` |
| `attack_declared` | `attackerId`, `targetId`, `weapons`, `toHitNumber`, `modifiers` |
| `attack_resolved` | `attackerId`, `targetId`, `weaponId`, `roll`, `toHitNumber`, `hit`, `hitLocation?`, `damage?` |
| `damage_applied` | `unitId` OR `targetId`, `location`, `damage`, `armorRemaining`, `structureRemaining`, `locationDestroyed?`, `sourceUnitId?` |
| `psr_triggered` | `unitId`, `reason`, `additionalModifier`, `triggerSource` |
| `psr_resolved` | `unitId`, `targetNumber`, `roll`, `passed`, `reason`, `modifiers` |
| `heat_dissipated` | `unitId`, `amount`, `source`, `newTotal`, `previousTotal`, `breakdown.baseDissipation` |
| `heat_generated` | `unitId`, `amount`, `breakdown` (weapons / movement / terrain) |
| `ammo_consumed` | `unitId`, `binId`, `roundsConsumed` |
| `ammo_explosion` | `unitId`, `binId`, `location`, `damage`, `source` |
| `pilot_hit` | `unitId`, `totalWounds`, `source`, `consciousnessCheckRequired?` |
| `unit_destroyed` | `unitId`, `cause` |
| `turn_ended` | (no payload fields — turn number SHALL be read from the envelope `IGameEventBase.turn`) |

The formatter SHALL render `IHexCoordinate` values using MegaMek-standard 4-digit notation (`NNNN` where positions 0-1 are the column and 2-3 are the row, both 1-indexed and zero-padded). The formatter SHALL convert internal axial `(q, r)` coordinates to offset `(col, row)` via the inverse of `convertOffsetToAxial` before formatting.

The formatter SHALL emit one line per event in monotonically-increasing `sequence` order, grouped by turn with a turn-header line when the `turn` value changes from the previous event.

#### Scenario: Movement event renders source and destination as 4-digit MegaMek hex labels

- **GIVEN** a `movement_declared` event with payload `{unitId: "player-1", from: {q: -1, r: -11}, to: {q: 4, r: -12}, mpUsed: 5, facing: 2, movementType: "run"}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain the from-coordinate in 4-digit form (e.g. `0312`) and the to-coordinate in 4-digit form (e.g. `0813`)
- **AND** the rendered line SHALL contain `mp=5`

#### Scenario: Attack-resolved event reads `roll` and `toHitNumber` (not `rolled2d6` / `rolledTN`)

- **GIVEN** an `attack_resolved` event with payload `{attackerId: "player-1", targetId: "opponent-2", weaponId: "srm-6-0", roll: 9, toHitNumber: 13, hit: false}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain `roll=9` and `TN=13`
- **AND** the rendered line SHALL NOT contain `roll=-` or `TN=-`

#### Scenario: Damage-applied event reads `armorRemaining` and `structureRemaining`

- **GIVEN** a `damage_applied` event with payload `{unitId: "opponent-2", location: "center_torso", damage: 5, armorRemaining: 20, structureRemaining: 20}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain `armor=20` (or equivalent) read from `armorRemaining`
- **AND** the rendered line SHALL contain `struct=20` (or equivalent) read from `structureRemaining`
- **AND** the rendered line SHALL NOT show `armor_after=-` or `struct_after=-`

#### Scenario: PSR-resolved event reads `roll` (not `rolled2d6`)

- **GIVEN** a `psr_resolved` event with payload `{unitId: "player-2", reason: "Kicked", targetNumber: 5, roll: 9, passed: true}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain `roll=9` and `TN=5` and `passed=True` (or `PASS`)
- **AND** the rendered line SHALL NOT show `roll=-`

#### Scenario: Heat-dissipated event reads `breakdown.baseDissipation` (not `heatSinkCount`)

- **GIVEN** a `heat_dissipated` event with payload `{unitId: "player-1", amount: 10, source: "dissipation", newTotal: 0, previousTotal: 0, breakdown: {baseDissipation: 10, waterBonus: 0}}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain a sink-count-equivalent value of 10 read from `breakdown.baseDissipation`
- **AND** the rendered line SHALL NOT show `sinks=-`

#### Scenario: Ammo events read `binId` and `roundsConsumed` (not `ammoBinId` / `amount`)

- **GIVEN** an `ammo_consumed` event with payload `{unitId: "player-1", binId: "lrm-ammo-0", roundsConsumed: 1}`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL contain the bin id read from `binId`
- **AND** the rendered line SHALL contain the consumption count read from `roundsConsumed`

#### Scenario: Turn-ended event reads `turn` from the envelope

- **GIVEN** a `turn_ended` event with envelope `{turn: 5, ...}` and an empty payload
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL show `turn=5` read from the event envelope (`IGameEventBase.turn`)
- **AND** the rendered line SHALL NOT show `turn=-`
