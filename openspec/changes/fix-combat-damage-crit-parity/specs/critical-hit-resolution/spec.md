# critical-hit-resolution Delta — fix-combat-damage-crit-parity

## MODIFIED Requirements

### Requirement: Critical Slot Selection

The system SHALL select critical slots by a UNIFORM random draw across ALL slots in the affected
location, rejecting already-destroyed and empty slots and re-drawing until a live slot is found,
so every slot index is reachable (no modulo bias). Selection SHALL use the injected DiceRoller so
identical seeds produce identical outcomes.

#### Scenario: Random slot selection from occupied slots

- **WHEN** applying N critical hits to a location
- **THEN** each critical hit SHALL randomly select one occupied, non-destroyed slot
- **AND** the component occupying that slot SHALL receive a critical hit
- **AND** if all occupied slots are already destroyed, remaining critical hits SHALL have no additional effect

#### Scenario: Multi-slot component receives one hit

- **WHEN** a critical slot is selected that belongs to a multi-slot component (e.g., a weapon occupying 3 slots)
- **THEN** only one critical hit SHALL be applied to that component per slot selection
- **AND** additional slot selections on the same component SHALL count as additional hits

#### Scenario: Every live slot index is reachable

- **GIVEN** a 12-slot location with 8 live (non-destroyed, occupied) slots, including slots at
  index 6 and 7
- **WHEN** critical slots are selected across the full range of the dice source
- **THEN** slots at index 6 and 7 SHALL be selectable (no `(roll - 1) % length` exclusion of
  high indices)
- **AND** last-placed equipment such as ammo or heat sinks SHALL NOT be unreachable

### Requirement: Cascade Effects

Critical hits SHALL trigger appropriate cascade effects such as ammo explosions and PSR triggers.
An ammo critical SHALL route through the ammo-explosion module on EVERY resolution path
(including the resolver `applyAmmoHit` path) so explosion damage, CASE handling, and pilot damage
are applied rather than silently dropped.

#### Scenario: Ammo critical triggers explosion

- **WHEN** an ammo bin receives a critical hit
- **THEN** an ammo explosion SHALL be triggered immediately
- **AND** the ammo-explosion-system SHALL handle damage resolution

#### Scenario: Resolver ammo critical applies explosion damage

- **GIVEN** a critical hit lands on a LOADED ammo bin via the resolver path
  (`processTAC → resolveCriticalHits → applyAmmoHit`)
- **WHEN** the critical is applied
- **THEN** the ammo-explosion module SHALL apply internal-structure damage at the bin location,
  apply CASE/CASE-II handling, and apply pilot damage per the ammo-explosion-system rules
- **AND** an `AmmoExplosion` event SHALL be emitted
- **AND** the slot SHALL NOT be merely marked destroyed with no damage

#### Scenario: Resolver ammo critical on empty bin is destroy-only

- **GIVEN** a critical hit lands on an ammo bin with 0 remaining rounds via the resolver path
- **WHEN** the critical is applied
- **THEN** the slot SHALL be marked destroyed
- **AND** NO explosion damage and NO `AmmoExplosion` event SHALL be produced

#### Scenario: Gyro or leg critical triggers PSR

- **WHEN** a gyro, hip, upper leg, lower leg, or foot actuator receives a critical hit
- **THEN** a piloting skill roll SHALL be triggered
- **AND** the PSR SHALL use appropriate modifiers for the damaged component
