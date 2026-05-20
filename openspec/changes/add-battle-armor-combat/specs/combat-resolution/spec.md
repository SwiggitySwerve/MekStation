# Spec Delta: Combat Resolution — Battle Armor Combat Dispatch

## ADDED Requirements

### Requirement: Battle Armor Combat Dispatch

The combat resolver SHALL route attacks involving Battle Armor units to BA-specific handlers per the following dispatch table:

| Attacker | Target | Weapon kind | Handler |
|---|---|---|---|
| BA | Mek | `SwarmAttack` | `swarmAttachResolver` |
| BA (swarmed) | Mek host | `SwarmWeaponAttack` | `swarmFireResolver` |
| BA | Mek | `LegAttack` | `legAttackResolver` |
| BA | Any adjacent | `BAVibroClawAttack` | `vibroclawResolver` |
| Mek | (swarmed by BA) | (brush-off declared) | `brushOffResolver` |
| Non-BA | BA squad | (any weapon) | apply `allocateSquadDamage` instead of mech hit-location |
| Non-BA | Mek with mounted BA | (hits to CT/LT/RT) | route via `getTrooperAtLocation` adapter |

#### Scenario: BA-attacker SwarmAttack routes correctly

- **GIVEN** attacker A has `unitType === BATTLE_ARMOR` and weapon kind is `SwarmAttack`
- **WHEN** the resolver processes the attack
- **THEN** the `swarmAttachResolver` SHALL be invoked (not the mech weapon handler)

#### Scenario: Non-BA attacker fires at BA target — squad damage allocation

- **GIVEN** attacker A is a mech, target T has `unitType === BATTLE_ARMOR`
- **WHEN** A's weapon hits T
- **THEN** the resolver SHALL invoke `allocateSquadDamage(T.combatState.squad, damage, rng)` instead of mech hit-location
- **AND** emitted events SHALL include per-trooper damage allocations + any `BATrooperKilled` events

#### Scenario: Non-BA attacker hits host mech with mounted-trooper at location

- **GIVEN** host mech L has swarmer B attached, A fires a hit landing on L's CT-rear
- **WHEN** damage is applied
- **THEN** the resolver SHALL consult `getTrooperAtLocation(CT_rear, ...)` → trooper 5
- **AND** if trooper 5 is alive, damage SHALL be routed to that trooper (per `Anti-Personnel Fire on Mounted Troopers` in `battle-armor-combat`)
- **AND** if trooper 5 is dead, damage SHALL be applied to L's CT-rear armor normally

#### Scenario: Mek brush-off declaration consumes weapon slot

- **GIVEN** mek L with attached swarmer B declares Brush-Off
- **WHEN** the resolver processes the declaration
- **THEN** one of L's weapon-attack slots for the turn SHALL be marked consumed
- **AND** the `brushOffResolver` SHALL be invoked

### Requirement: Battle Armor Combat Event Coverage

The typed combat event log SHALL emit one or more of seven BA-specific event variants whenever a BA-related attack resolves: `BASwarmAttached`, `BASwarmDetached`, `BASwarmDamageApplied`, `BALegAttackResolved`, `BAVibroclawAttackResolved`, `BATrooperKilled`, `BABrushOffAttempted`. Each event SHALL carry stable fields per the discriminated-union definition in `battle-armor-combat`.

#### Scenario: Swarm-attached emits BASwarmAttached

- **GIVEN** B's `SwarmAttack` against L succeeds
- **WHEN** the resolver records the result
- **THEN** a `BASwarmAttached { attackerId: B.id, hostId: L.id }` event SHALL be emitted

#### Scenario: Squad destroyed mid-swarm emits both BATrooperKilled and BASwarmDetached

- **GIVEN** swarmer B attached to L, last surviving trooper killed by enemy fire
- **WHEN** the trooper-killing damage is applied
- **THEN** a `BATrooperKilled` event SHALL be emitted for that trooper
- **AND** at end-of-turn cleanup, a `BASwarmDetached { reason: 'SquadDestroyed' }` event SHALL be emitted
- **AND** the two events SHALL be ordered: trooper kill first, detach second

#### Scenario: Brush-off attempt emits BABrushOffAttempted regardless of outcome

- **GIVEN** L declares Brush-Off against B
- **WHEN** the resolver processes the attempt
- **THEN** a `BABrushOffAttempted` event SHALL be emitted with `outcome: 'hit' | 'miss'`
- **AND** on hit, an additional `BASwarmDetached { reason: 'BrushedOff' }` SHALL be emitted

#### Scenario: Event log replay round-trips BA events

- **GIVEN** a JSONL event log containing all 7 BA event variants
- **WHEN** the replay loader replays the log
- **THEN** all 7 event types SHALL be parsed without loss
- **AND** the columnar formatter SHALL render each with its stable fields per the line-format suite (pairs with `project_event_log_line_format_suite`)
