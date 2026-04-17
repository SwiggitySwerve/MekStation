## ADDED Requirements

### Requirement: Bot-Driven Weapon Selection Respects Combat Resolution Inputs

When `BotPlayer` emits an `AttackDeclared` event, the weapon list SHALL already reflect the combat-resolution inputs that the resolver will check: valid firing arc, range within maximum, sufficient ammo, and weapon not destroyed. Downstream combat resolution SHALL therefore not reject bot-declared attacks for basic viability reasons.

#### Scenario: Bot declares only weapons that pass resolver validation

- **GIVEN** a bot attacker with a mix of destroyed, out-of-arc, and out-of-ammo weapons alongside viable weapons
- **WHEN** `BotPlayer.playAttackPhase` emits an `AttackDeclared` event
- **THEN** every weapon ID in the payload SHALL pass `CombatResolver`'s pre-attack validation (arc, range, ammo, destruction status)
- **AND** the resolver SHALL NOT return a `WeaponUnavailable` rejection for any bot-declared weapon

#### Scenario: Bot does not declare weapons at minimum range penalty when alternatives exist

- **GIVEN** a bot attacker 2 hexes from target with both an LRM-10 (minRange 6) and a Medium Laser available
- **WHEN** the resolver processes the declared attack
- **THEN** only the Medium Laser SHALL appear in the declared weapon list
- **AND** the resolver SHALL NOT be asked to apply a minimum-range penalty for this attack

#### Scenario: Bot respects ammo depletion mid-phase

- **GIVEN** a bot attacker with an AC/20 whose ammo reaches zero after a prior declaration in the same turn
- **WHEN** the bot's next declaration considers the AC/20
- **THEN** the weapon SHALL be excluded from the candidate list
- **AND** the emitted event SHALL NOT reference the depleted weapon

### Requirement: Bot Heat Declaration Matches Resolver Heat Accounting

The projected heat used by bot heat management SHALL be computed using the same formula the `CombatResolver` uses when it applies heat at end of turn — namely `currentHeat + movementHeat + sum(firedWeaponHeat) - dissipation` — so that bot decisions and resolver outcomes agree.

#### Scenario: Bot-projected heat matches post-attack heat in the resolver

- **GIVEN** a bot declaration that includes Medium Laser (3 heat) and PPC (10 heat) with `movementHeat = 2` and `dissipation = 10`
- **WHEN** the resolver completes the heat phase
- **THEN** the resulting heat delta SHALL equal the value the bot used to decide whether to cull weapons
- **AND** the bot SHALL NOT trigger unexpected shutdown because of a mismatched heat model

#### Scenario: Bot accounts for already-dissipating heat

- **GIVEN** a bot at current heat 8 with 10 dissipation
- **WHEN** heat projection runs
- **THEN** the projection SHALL subtract the per-turn dissipation before comparing to `safeHeatThreshold`
- **AND** the bot SHALL be willing to fire slightly more aggressively than a naive additive projection would allow
