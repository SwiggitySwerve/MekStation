# Spec Delta: Indirect Fire System

## ADDED Requirements

### Requirement: Engine Integration Contract

The combat engine SHALL expose a single integration point `InteractiveSession.computeIndirectFireContext(attackerId, weaponId, targetHex)` that returns an `IIndirectFireResolution` consumed by the to-hit pipeline before each attack roll resolves. The contract SHALL enumerate spotter candidates from the current `gameState`, invoke the existing `evaluateIndirectFire` helper, and produce a stable `spotterId | null`, an `IndirectFireBasis` discriminator, and an integer `toHitPenalty` for the attack pipeline.

#### Scenario: Resolver invokes the contract before to-hit calculation

- **GIVEN** an attacker A declares an LRM-15 attack against hex H
- **AND** A has no line of sight to H
- **WHEN** the resolver begins the attack pipeline
- **THEN** `InteractiveSession.computeIndirectFireContext(A.id, weapon.id, H)` SHALL be called before `computeToHit` runs
- **AND** the returned `IIndirectFireResolution.toHitPenalty` SHALL be added to the running to-hit number by `computeToHit`
- **AND** the returned `spotterId` SHALL be recorded in the attack record for replay determinism

#### Scenario: Helper remains pure and engine-independent

- **GIVEN** the existing `src/utils/gameplay/indirectFire.ts` helper
- **WHEN** the engine integration is added
- **THEN** the helper SHALL NOT import any engine type (`InteractiveSession`, `gameState`, etc.)
- **AND** the helper SHALL continue to operate on synthetic `ISpotterCandidate[]` inputs as today
- **AND** the existing 594-LOC `indirectFire.test.ts` SHALL continue to pass without modification

### Requirement: Spotter Liveness Check

A spotter elected at to-hit time but destroyed before damage resolution SHALL invalidate the indirect attack. The system SHALL emit a typed `IndirectFireSpotterLost` event, force the attack to auto-miss, and SHALL still consume ammunition and heat for the attempted attack.

#### Scenario: Spotter destroyed between to-hit and damage

- **GIVEN** attacker A declares an indirect LRM attack at target T, with spotter S elected
- **AND** the to-hit roll succeeds
- **WHEN** a higher-initiative attack destroys S before A's damage resolves
- **THEN** the resolver SHALL re-validate `S.combatState.destroyed === true`
- **AND** the attack SHALL convert to an auto-miss
- **AND** an `IndirectFireSpotterLost` event SHALL be emitted with reason `'Spotter destroyed before resolution'`
- **AND** A's LRM ammo SHALL be decremented as if the attack fired
- **AND** A's heat SHALL be added as if the attack fired

#### Scenario: Spotter survives — no penalty change

- **GIVEN** attacker A's indirect attack is in progress with spotter S
- **WHEN** S takes damage but is not destroyed by the time A's attack resolves
- **THEN** the indirect attack SHALL proceed normally
- **AND** no `IndirectFireSpotterLost` event SHALL be emitted

### Requirement: NARC / iNarc Spotter Override

A target marked by friendly NARC or iNarc beacons SHALL be a valid indirect-fire target even when no friendly unit has line of sight. The marking team SHALL be the same team as the attacker. The `IIndirectFireResolution.basis` SHALL be `'narc'` or `'inarc'` respectively, and `spotterId` SHALL be `null` (no spotter unit was elected). No spotter-walked penalty SHALL apply in this case; the base +1 indirect-fire penalty SHALL still apply.

#### Scenario: NARC-marked target without LOS spotter

- **GIVEN** target T is NARC-marked by a friendly unit (same team as attacker A)
- **AND** no friendly unit has LOS to T
- **WHEN** A declares an indirect LRM attack at T
- **THEN** `computeIndirectFireContext` SHALL return `{ permitted: true, isIndirect: true, basis: 'narc', spotterId: null, toHitPenalty: 1 }`
- **AND** an `IndirectFireNarcOverride` event SHALL be emitted

#### Scenario: iNarc behaves identically with different basis tag

- **GIVEN** target T is iNarc-marked by a friendly unit (same team as A)
- **AND** no friendly unit has LOS to T
- **WHEN** A declares an indirect LRM attack at T
- **THEN** the resolution basis SHALL be `'inarc'`
- **AND** the basis tag SHALL be carried through to the `IndirectFireNarcOverride` event payload

#### Scenario: NARC by enemy team does not enable indirect

- **GIVEN** target T is NARC-marked by a team different from A's team
- **WHEN** A declares an indirect LRM attack at T
- **THEN** the NARC mark SHALL NOT be honored as a spotter override
- **AND** the resolver SHALL fall back to LOS-spotter election; if none exists, the attack SHALL be rejected

### Requirement: Forward Observer SPA

Pilots with the `FORWARD_OBSERVER` Special Piloting Ability SHALL act as spotters without the +1 spotter-walked penalty regardless of their movement type that turn. The base +1 indirect-fire penalty SHALL still apply.

#### Scenario: FO spotter walked — no penalty add

- **GIVEN** spotter S whose pilot has the `FORWARD_OBSERVER` SPA
- **AND** S walked during the movement phase
- **WHEN** S is elected as the spotter for an indirect attack
- **THEN** `toHitPenalty` SHALL be 1 (base only)
- **AND** an `IndirectFireForwardObserver` event SHALL be emitted recording that the FO ability cancelled the penalty

#### Scenario: FO spotter ran — still ineligible

- **GIVEN** spotter candidate S whose pilot has the `FORWARD_OBSERVER` SPA
- **AND** S ran during the movement phase
- **WHEN** the resolver enumerates spotter candidates
- **THEN** S SHALL NOT be eligible (FO does not override the run/jump ineligibility from `Spotter Movement Penalty`)

#### Scenario: Projection and commit paths hydrate FO consistently

- **GIVEN** spotter candidate S stores pilot abilities on either `pilotSpas` or
  the legacy `abilities` field
- **WHEN** an indirect attack is projected or committed
- **THEN** both paths SHALL recognize `FORWARD_OBSERVER`
- **AND** the projected modifier stack SHALL match the committed attack
  context for the same board state.

### Requirement: Indirect-Eligible Weapon Catalog

The system SHALL define a single source-of-truth catalog of weapon families that may fire indirectly: LRM, LRM (Improved), MML loaded with LRM ammo, Mek Mortar, NLRM. Streak LRM, ATM, MRM, ROCKET LAUNCHER, and direct-fire energy/ballistic weapons SHALL NOT be eligible. Attempts to fire an ineligible weapon indirectly SHALL be rejected.

#### Scenario: LRM-15 toggle to indirect mode succeeds

- **WHEN** a user toggles an LRM-15 weapon's mode to `'Indirect'`
- **THEN** the toggle SHALL be accepted

#### Scenario: AC/20 toggle to indirect mode is rejected

- **WHEN** a user toggles an AC/20 weapon's mode to `'Indirect'`
- **THEN** the toggle SHALL be rejected at the UI layer with reason `'AC/20 cannot fire indirectly'`
- **AND** if the toggle bypasses the UI and reaches the resolver, the weapon SHALL be treated as `'Direct'` mode for that attack

#### Scenario: MML loaded with SRM is ineligible

- **GIVEN** an MML mount currently loaded with SRM-2 ammo
- **WHEN** the user attempts to toggle indirect mode
- **THEN** the toggle SHALL be rejected with reason `'MML cannot fire indirectly with SRM ammo loaded'`

#### Scenario: Streak SRM/LRM never eligible

- **WHEN** a user attempts to toggle indirect mode on Streak SRM-2 or Streak LRM-5
- **THEN** the toggle SHALL be rejected; Streak weapons require lock-on which precludes indirect fire

### Requirement: Spotter-Election Determinism

When more than one valid spotter candidate exists for the same attack, the resolver SHALL elect a single spotter using the following ordered tiebreak: (1) lowest movement penalty (Stationary < Walked < Ran/Jumped — note Ran/Jumped is ineligible, so this reduces to Stationary preferred over Walked); (2) ties broken by closest hex range to the target; (3) further ties broken by the lowest `entityId` lexicographically.

#### Scenario: Two equally-eligible stationary spotters — closer wins

- **GIVEN** two spotters S1 and S2, both stationary, both with valid LOS to target T
- **AND** S1 is 4 hexes from T, S2 is 7 hexes from T
- **WHEN** the resolver elects a spotter
- **THEN** S1 SHALL be elected

#### Scenario: Equally-close stationary spotters — lowest id wins

- **GIVEN** two spotters S1 (id=`'mek-12'`) and S2 (id=`'mek-3'`), both stationary, both 5 hexes from T
- **WHEN** the resolver elects a spotter
- **THEN** S2 SHALL be elected (`'mek-12'` > `'mek-3'` lexicographically)

#### Scenario: Stationary preferred over walked

- **GIVEN** S1 (walked) and S2 (stationary), both with valid LOS
- **WHEN** the resolver elects a spotter
- **THEN** S2 SHALL be elected (lower movement penalty wins)

### Requirement: Min-Range Calculation Origin

The minimum-range penalty for an indirect attack SHALL be measured from the attacker to the target, not from the spotter to the target.

#### Scenario: Attacker within min-range despite distant spotter

- **GIVEN** attacker A is 3 hexes from target T (within LRM min-range of 6)
- **AND** spotter S is 10 hexes from T
- **WHEN** the indirect attack resolves
- **THEN** the min-range penalty SHALL apply (attacker-to-target = 3, below the 6-hex min)
- **AND** the spotter's distance to T SHALL NOT affect the min-range calculation

#### Scenario: Attacker outside min-range with nearby spotter

- **GIVEN** A is 12 hexes from T (clear of min-range)
- **AND** S is 2 hexes from T
- **WHEN** the indirect attack resolves
- **THEN** no min-range penalty SHALL apply

## MODIFIED Requirements

### Requirement: LRM Indirect Fire Mode

LRM-family weapons (LRM, LRM Improved, MML loaded with LRM ammo, Mek Mortar, NLRM) SHALL support indirect fire, allowing attacks against targets without direct line of sight provided either (a) a friendly spotter unit has LOS to the target, or (b) the target is NARC-marked or iNarc-marked by a friendly unit. The set of eligible weapon families SHALL be the catalog defined by the `Indirect-Eligible Weapon Catalog` requirement.

#### Scenario: Indirect fire with valid LOS spotter

- **WHEN** an LRM weapon fires indirectly at a target
- **AND** a friendly unit has line of sight to the target
- **THEN** the spotter MUST NOT have run or jumped that turn (stationary or walked only; FO SPA does not override this)
- **AND** the attack SHALL be resolved using the standard to-hit calculation plus indirect-fire modifiers

#### Scenario: Indirect fire with no spotter and no NARC

- **WHEN** an LRM weapon attempts indirect fire and no friendly unit has LOS to the target and the target is not NARC/iNarc-marked by a friendly unit
- **THEN** the indirect-fire attack SHALL NOT be permitted
- **AND** `computeIndirectFireContext` SHALL return `{ permitted: false, reason: 'No valid spotter and no NARC override' }`

#### Scenario: Interactive no-spotter rejection has no side effects

- **GIVEN** a blocked-LOS indirect weapon attack has no valid spotter and no
  friendly NARC/iNARC override
- **WHEN** the attack reaches the interactive session command path
- **THEN** the command SHALL emit `AttackInvalid` with reason `NoLineOfSight`
- **AND** no attack declaration, target lock, heat, ammunition, or indirect-fire
  event SHALL be recorded.

#### Scenario: Direct-fire ineligible weapon attempts indirect

- **WHEN** a non-eligible weapon (e.g., AC/20, PPC, large laser) attempts indirect fire
- **THEN** the attack SHALL be rejected per the `Indirect-Eligible Weapon Catalog` requirement

### Requirement: Semi-Guided LRM with TAG

Semi-guided LRM attacks SHALL require TAG designation that was set **during the current turn** by any friendly unit (not a stale designation from a prior turn). When TAG is present, the semi-guided hit table SHALL be used. When TAG is absent, semi-guided LRM SHALL fall back to **standard indirect fire** behavior (LOS spotter or NARC override required) — NOT to standard direct fire.

#### Scenario: Semi-guided LRM with current-turn TAG

- **WHEN** a semi-guided LRM fires at a TAG-designated target whose TAG was set this turn
- **THEN** the attack SHALL use the semi-guided hit table
- **AND** the `IIndirectFireResolution.basis` SHALL be `'semi-guided-tag'`

#### Scenario: Semi-guided LRM with stale TAG designation

- **GIVEN** target T was TAG-designated on a previous turn but not the current turn
- **WHEN** a semi-guided LRM fires at T
- **THEN** the TAG designation SHALL be considered absent
- **AND** the weapon SHALL fall back to standard indirect-fire rules

#### Scenario: Semi-guided LRM without TAG and without spotter

- **WHEN** a semi-guided LRM fires at a target with no current-turn TAG and no friendly LOS spotter and no NARC mark
- **THEN** the attack SHALL be rejected with reason `'No valid spotter, no NARC, no current-turn TAG'`
