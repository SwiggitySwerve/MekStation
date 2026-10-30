## ADDED Requirements

### Requirement: Unknown missile capacity requires explicit ammunition state

Known missile weapons with no positive ammo-per-ton capacity SHALL NOT become
ammo-independent because their catalog capacity is absent. The existing ammo
owner SHALL distinguish this state from energy weapons without inventing
capacity, ammunition quantity or compatible bins.

#### Scenario: Unknown capacity is not unlimited fire

- **GIVEN** a weapon recognized by the existing missile classifier and no positive ammo-per-ton capacity
- **WHEN** ammo counts are absent, zero or otherwise not a finite positive whole number
- **THEN** AI selection and coordinated-fire estimates SHALL exclude it
- **AND** its ammo runway, mean damage and damage-variance previews SHALL be zero
- **AND** the weapon attack builder SHALL classify it as a missile
- **AND** firing without a compatible nonempty bin SHALL be refused before attack, heat, ammo or damage side effects

#### Scenario: Connected ammunition is consumed and depletion stops fire

- **GIVEN** such a missile weapon and compatible bins containing a finite positive whole number of rounds
- **WHEN** the unit is adapted or projected for AI planning
- **THEN** live quantities SHALL come from the ammo owner, not from a guessed per-ton capacity
- **AND** its default firing-mode cost SHALL be one round
- **WHEN** an accepted runner shot consumes the last round
- **THEN** the existing consumption event SHALL record the depletion and a later shot SHALL be refused
- **AND** adapters SHALL retain the resolved ammo identity independently of display names and mount-instance prefixes
- **AND** live runner, engine and interactive-session AI projections SHALL use the runner's ammo identity selection contract
- **AND** runner firing and consumption SHALL use that same identity
- **AND** an explicit firing mode's ammo-family selection SHALL retain precedence

#### Scenario: Session firing identity remains an explicit gap

- **GIVEN** adapter ProtoMek SRM 1/3/5 weapons and supplied canonical clan-srm bins
- **WHEN** engine or interactive-session AI projects those bins
- **THEN** it SHALL recognize the live counts and permit weapon selection
- **AND** tests SHALL record that current session resolution still consumes by display name and refuses these attacks as OutOfAmmo without spending rounds or rolling dice
- **AND** successful engine and interactive-session firing SHALL remain unproven until that separate identity boundary is repaired

#### Scenario: Real preview consumers observe missile ammunition updates

- **GIVEN** an unknown-capacity missile and live counts projected from compatible bins
- **WHEN** the weapon selector or forecast modal renders a supplied weapon
- **THEN** its expected damage SHALL be positive
- **WHEN** only ammunition changes to depleted, empty, incompatible, fractional or nonfinite state
- **THEN** both consumers SHALL show zero mean damage and variance
- **AND** replenishing compatible whole rounds SHALL restore the supplied preview
- **AND** absent counts SHALL remain unavailable, energy previews SHALL remain unchanged and rendering SHALL NOT commit an attack

#### Scenario: Preserve distinct existing contracts before correction

- **WHEN** repeated ammo-dependency and count checks and adapter projection are consolidated
- **THEN** a separately verified refactor SHALL preserve their original results
- **AND** legacy AI unknown-count behavior for positive-capacity weapons and the preview's separate zero-capacity policy SHALL remain explicit
- **AND** normal energy behavior and one-shot depletion guards SHALL remain intact
- **AND** when nonempty live bin state is present, runner, engine and interactive-session AI SHALL use its current quantities instead of an empty or stale ammo map
- **AND** without nonempty live bins, the engine SHALL retain its legacy ammo map and the runner SHALL retain its existing empty-map fallback
- **AND** source quantity loading, implicit one-shot ammo, full ammunition/BV parity and production workflows SHALL remain separately accounted for
