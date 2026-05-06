# Pilot System (delta)

## ADDED Requirements

### Requirement: Pilot Match Terminal State Closed Enum

When a match ends, every pilot SHALL have a `matchTerminalState` field on their per-match summary record. The field SHALL be a closed snake_case enum with exactly five values: `'unhurt' | 'wounded' | 'unconscious' | 'kia' | 'ejected'`. This is a per-match outcome distinct from the campaign-level `PilotStatus` at `src/types/pilot/PilotInterfaces.ts:30` (which derives from the match-terminal state plus campaign rules).

The match-terminal state taxonomy:
- **`unhurt`** — pilot took zero wounds during the match
- **`wounded`** — pilot took 1-5 wounds, did NOT fail consciousness, did NOT eject
- **`unconscious`** — pilot failed a consciousness roll AND did not subsequently regain consciousness before match end
- **`kia`** — pilot reached 6 wounds OR was killed by head-destruction event
- **`ejected`** — pilot voluntarily ejected from the mech and (regardless of mech fate) survived the ejection sequence

#### Scenario: Match ends with no pilot wounds → unhurt

- **GIVEN** a pilot with 0 wounds at match end
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'unhurt'`

#### Scenario: Match ends with 3 wounds → wounded

- **GIVEN** a pilot with 3 wounds at match end
- **AND** all consciousness rolls passed
- **AND** no ejection event
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'wounded'`

#### Scenario: Pilot reaches 6 wounds → kia

- **GIVEN** a pilot taking head damage that reaches 6 cumulative wounds
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'kia'`
- **AND** the corresponding `UnitDestroyed.cause` MUST be `'pilot_death'` per the closed set in `damage-system`

#### Scenario: Head location destroyed → kia regardless of wound count

- **GIVEN** a pilot in a unit whose HEAD location is destroyed (armor + structure both zeroed)
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'kia'`
- **AND** the corresponding `UnitDestroyed.cause` MUST be `'head_destroyed'`

#### Scenario: Failed consciousness roll without recovery → unconscious

- **GIVEN** a pilot fails a consciousness roll mid-match
- **AND** the pilot does NOT regain consciousness before match end
- **AND** the pilot does not reach 6 wounds
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'unconscious'`

#### Scenario: Voluntary ejection → ejected

- **GIVEN** a pilot voluntarily ejects from the mech mid-match
- **AND** the ejection sequence resolves with the pilot alive
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'ejected'`
- **AND** the pilot's wound count carries over per ejection rules

#### Scenario: matchTerminalState is mutually exclusive

- **GIVEN** a single pilot's match summary record
- **WHEN** the engine determines the match-terminal state
- **THEN** exactly ONE of the 5 enum values MUST be assigned
- **AND** the values MUST NOT be combined (no `'wounded_and_unconscious'`)

### Requirement: Pilot State Transitions Are Monotonic Within a Match

Within a single match, a pilot's match-terminal state SHALL transition only in the canonical direction `unhurt → wounded → unconscious → kia` (or laterally to `ejected` from any non-kia state). Once a pilot reaches `kia`, no further transitions occur. Once a pilot reaches `ejected`, no further wound damage applies.

#### Scenario: Wounded pilot taking more damage stays wounded until KIA threshold

- **GIVEN** a pilot at 3 wounds (currently `'wounded'`)
- **WHEN** the pilot takes 1 more wound (now 4)
- **THEN** the running terminal state MUST remain `'wounded'` until the consciousness roll either succeeds (stays `'wounded'`) or fails (transitions to `'unconscious'`)
- **AND** the state MUST NOT regress to `'unhurt'` even if the wound counter were somehow decremented

#### Scenario: Ejected pilot's mech destruction does not change pilot terminal state

- **GIVEN** a pilot has ejected (`matchTerminalState: 'ejected'`)
- **WHEN** the abandoned mech is subsequently destroyed
- **THEN** the pilot's `matchTerminalState` MUST remain `'ejected'`
- **AND** the pilot's wound count MUST NOT increase from the mech destruction
