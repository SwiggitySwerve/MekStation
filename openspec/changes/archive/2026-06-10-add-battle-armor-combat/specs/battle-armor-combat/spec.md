# Spec Delta: Battle Armor Combat (NEW capability)

## ADDED Requirements

### Requirement: BA Squad Combat State

Each Battle Armor squad entering combat SHALL carry an `IBASquadCombatState` slice tracking per-trooper liveness + armor, the swarm-attach pointer in both directions, the mounted-on-host pointer (if mounted as a passenger), and the per-turn flags for mimetic and stealth activation.

#### Scenario: Combat state initialization

- **GIVEN** a 4-trooper BA squad with 5 armor per trooper entering combat
- **WHEN** the engine initializes combat state
- **THEN** `state.troopers` SHALL be a 4-element array
- **AND** each element SHALL have `{ index, alive: true, armorRemaining: 5, equipmentDestroyed: [] }`
- **AND** `state.swarmingUnitId` SHALL be `undefined`
- **AND** `state.swarmedByUnitIds` SHALL be `[]`
- **AND** `state.mountedOn` SHALL be `undefined`
- **AND** `state.mimeticActiveThisTurn` SHALL be `false`

#### Scenario: Dead trooper retention

- **GIVEN** a 4-trooper squad where trooper index 2 was killed last turn
- **WHEN** combat state is read this turn
- **THEN** `state.troopers[2].alive` SHALL be `false`
- **AND** `state.troopers[2]` SHALL still occupy index 2 (no array compaction)
- **AND** `getNumberActiveTroopers(state)` SHALL return 3

#### Scenario: Dead trooper effects on squad fire

- **GIVEN** a squad with 2 of 4 troopers dead (50% active)
- **WHEN** the squad fires a squad-mounted weapon
- **THEN** `shootingStrength` SHALL be 2 (alive count)
- **AND** `isDmgModerate(state)` SHALL be `true` (`2/4 = 0.5 < 0.75`)
- **AND** `isDmgLight(state)` SHALL be `true` (`< 0.9`)

### Requirement: Squad Damage Allocation

Damage applied to a BA squad target SHALL be allocated by rolling d6 per damage point against trooper slots. Rolls that land on a dead trooper SHALL be re-rolled until an alive trooper is selected. Damage SHALL reduce the trooper's `armorRemaining`. When `armorRemaining` reaches 0, the trooper SHALL be marked `alive: false` and a `BATrooperKilled` event SHALL be emitted.

#### Scenario: Distribute 4 damage on full 4-trooper squad

- **GIVEN** a full 4-trooper squad with 5 armor per trooper
- **WHEN** an enemy weapon deals 4 damage to the squad
- **THEN** the resolver SHALL roll 4 d6 rolls and apply 1 damage per roll
- **AND** each roll's resulting trooper SHALL have armor reduced by 1

#### Scenario: Re-roll skips dead troopers

- **GIVEN** a squad with trooper index 3 already dead
- **WHEN** a damage allocation roll lands on trooper 3
- **THEN** the resolver SHALL re-roll until an alive trooper is selected
- **AND** the damage SHALL be applied to the newly selected trooper

#### Scenario: Trooper killed when armor reaches 0

- **GIVEN** trooper index 1 with 2 armor remaining
- **WHEN** 2 damage points are allocated to trooper 1
- **THEN** `troopers[1].armorRemaining` SHALL equal 0
- **AND** `troopers[1].alive` SHALL be set to `false`
- **AND** a `BATrooperKilled { trooperIndex: 1 }` event SHALL be emitted

#### Scenario: Tactical Operations BA Crit Slots option

- **GIVEN** the game option `tacOps_ba_crit_slots === true`
- **WHEN** two consecutive d6 rolls during a single damage allocation produce the same trooper index
- **AND** the attacker is NOT conventional infantry
- **THEN** the second hit SHALL be flagged `criticalHit: true`
- **AND** an equipment slot on the rolled trooper SHALL be marked destroyed

### Requirement: Swarm Attack — Declaration and Attach

A BA squad SHALL be able to declare a swarm attack against a mech in the same hex using the `SwarmAttack` action. To-hit base SHALL derive from the attacker pilot's Anti-Mek skill (per `personnel-system`) with terrain and dead-trooper modifiers. On success, the resolver SHALL set the bidirectional swarm pointer (`attacker.swarmingUnitId = target.id` AND `target.swarmedByUnitIds.push(attacker.id)`) and emit `BASwarmAttached`. On failure, no state change SHALL occur except the consumed attack action.

#### Scenario: Successful swarm attach

- **GIVEN** a BA squad B in the same hex as Locust mech L, no current swarmer on L
- **WHEN** B declares `SwarmAttack` against L
- **AND** the to-hit roll succeeds
- **THEN** `B.combatState.squad.swarmingUnitId` SHALL equal `L.id`
- **AND** `L.combatState.swarmedByUnitIds` SHALL include `B.id`
- **AND** a `BASwarmAttached { attackerId: B.id, hostId: L.id }` event SHALL be emitted

#### Scenario: Failed swarm — no state change

- **GIVEN** B and L in the same hex, no current swarmer
- **WHEN** B declares `SwarmAttack` and the roll fails
- **THEN** the swarm pointers SHALL remain unchanged
- **AND** an `AttackResolved { outcome: 'miss', reason: 'Swarm attack failed' }` event SHALL be emitted

#### Scenario: Cannot swarm when host already has swarmer

- **GIVEN** L already has a swarmer attached
- **WHEN** a different BA squad B2 attempts to declare `SwarmAttack` against L
- **THEN** the action SHALL be rejected at the UI layer with reason `'Target already has a swarmer'`

### Requirement: Swarm Fire While Attached

While a BA squad is attached to a host mech via swarm, the squad SHALL fire its squad-mounted non-missile weapons at the host each turn. Damage applies without a to-hit roll. The damage formula is the sum of `squadWeaponDamage × shootingStrength` for each eligible weapon, plus the squad's vibroclaws count (0, 1, or 2), plus `troopers × 2` if the squad has a Myomer Booster. Missile weapons, body-mounted (per-trooper) weapons, and Infantry-Attack weapons SHALL be excluded.

#### Scenario: Basic swarm damage calculation

- **GIVEN** a 4-trooper squad with one squad-mounted Small Laser (damage 3) and no vibroclaws / no myomer
- **AND** all 4 troopers are alive
- **WHEN** the squad's swarm fire resolves
- **THEN** total damage SHALL be `3 × 4 = 12`

#### Scenario: Vibroclaws add flat squad damage

- **GIVEN** the same squad with 2 vibroclaws
- **WHEN** the swarm fire resolves
- **THEN** total damage SHALL be `12 + 2 = 14`

#### Scenario: Myomer Booster adds per-trooper damage

- **GIVEN** the same squad with 2 vibroclaws AND Myomer Booster
- **WHEN** the swarm fire resolves with 4 active troopers
- **THEN** total damage SHALL be `12 + 2 + (4 × 2) = 22`

#### Scenario: Missile weapons excluded

- **GIVEN** a squad with one squad-mounted SRM-2 (a missile weapon)
- **WHEN** swarm fire resolves
- **THEN** the SRM-2 SHALL NOT contribute damage (`F_MISSILE` excluded per MegaMek parity)

#### Scenario: Body-mounted weapons excluded

- **GIVEN** a squad with one Body-mounted Machine Gun on each trooper
- **WHEN** swarm fire resolves
- **THEN** the Body-mounted MGs SHALL NOT contribute damage (per-trooper weapons can't aim point-blank in a swarm clinch)

#### Scenario: Dead troopers reduce damage

- **GIVEN** a squad with one squad Small Laser, 2 of 4 troopers dead
- **WHEN** swarm fire resolves
- **THEN** total damage SHALL be `3 × 2 = 6` (shootingStrength = 2, not 4)

### Requirement: Anti-Personnel Fire on Mounted Troopers

When a non-BA attacker fires at a host mech with attached swarmers, hits to the mounted-trooper locations (CT, LT, RT — front and rear) SHALL be routed to the corresponding trooper via the mounted-trooper-location adapter. The adapter mapping SHALL be: RT-front → trooper 1, LT-front → trooper 2, RT-rear → trooper 3, LT-rear → trooper 4, CT-front → trooper 6, CT-rear → trooper 5.

#### Scenario: CT-rear hit routes to trooper 5

- **GIVEN** host mech L with attached squad B (all 4 troopers alive, 5 armor each)
- **WHEN** an enemy PPC (10 damage) hits L's CT-rear
- **THEN** the damage SHALL be routed to trooper 5
- **AND** `troopers[5].armorRemaining` SHALL be reduced by 5 (if trooper had 5 armor)
- **AND** trooper 5 SHALL die (`armorRemaining → 0`), `BATrooperKilled` emitted
- **AND** the 5 excess damage SHALL be lost (does NOT pass to host)

#### Scenario: Dead mounted-trooper routes damage to host

- **GIVEN** host L with attached squad B, but trooper 5 already dead
- **WHEN** an enemy hit lands on CT-rear of L
- **THEN** the damage SHALL be applied to L's CT-rear armor normally (no trooper to absorb)

#### Scenario: Non-trooper locations route to host normally

- **GIVEN** host L with attached squad B
- **WHEN** an enemy hit lands on L's Head, an Arm, or a Leg
- **THEN** the damage SHALL be applied to L's armor normally (those locations have no mounted trooper)

### Requirement: Leg Attack

A BA squad SHALL be able to declare a `LegAttack` against a mech in the same hex. Damage = `4 + vibroClaws + (myomerBooster ? activeTroopers × 2 : 0)`. The attack SHALL roll for a leg location; if the rolled leg is destroyed (internal 0), the other leg SHALL be hit. Critical-hit modifier SHALL be `−2` if the targeted location's armor type is Hardened; `+1` if the attacker pilot has the `MISC_HUMAN_TRO_MEK` SPA.

#### Scenario: Basic leg attack

- **GIVEN** a 4-trooper BA squad with 1 vibroclaw, no myomer booster
- **WHEN** the squad declares a `LegAttack` against an Atlas
- **AND** the to-hit roll succeeds
- **THEN** damage SHALL be `4 + 1 + 0 = 5`
- **AND** a leg location SHALL be rolled and damage applied to that leg
- **AND** a `BALegAttackResolved { hitLocation, damage: 5, critModifier: 0 }` event SHALL be emitted

#### Scenario: Myomer booster boosts leg-attack damage

- **GIVEN** the same squad with Myomer Booster and 4 active troopers
- **WHEN** the leg attack resolves
- **THEN** damage SHALL be `4 + 1 + (4 × 2) = 13`

#### Scenario: Destroyed leg fallback

- **GIVEN** a mech with destroyed left leg (internal 0)
- **WHEN** the leg-attack roll lands on the left leg
- **THEN** the resolver SHALL fall through and hit the right leg instead

#### Scenario: Hardened armor reduces crit chance

- **GIVEN** the target leg has Hardened armor
- **WHEN** the crit modifier is computed
- **THEN** `critModifier` SHALL include `−2`

#### Scenario: HUMAN_TRO_MEK SPA increases crit chance

- **GIVEN** the attacker pilot has `MISC_HUMAN_TRO_MEK` SPA
- **WHEN** the crit modifier is computed
- **THEN** `critModifier` SHALL include `+1`

### Requirement: Vibroclaw Attack

A BA trooper with `vibroClaws ≥ 1` SHALL be able to make a vibroclaw melee attack against an adjacent enemy. Damage = `missilesHit(shootingStrength) × vibroClaws` (cluster-table lookup against the squad's surviving trooper count). UI MUST hide the vibroclaw action button when the squad's `vibroClaws === 0`.

#### Scenario: Vibroclaw damage on full squad

- **GIVEN** a 4-trooper squad with 2 vibroclaws (squad-level)
- **AND** `missilesHit(4)` returns 3 on the cluster table
- **WHEN** the vibroclaw attack resolves
- **THEN** damage SHALL be `3 × 2 = 6`

#### Scenario: Vibroclaw button hidden when vibroClaws == 0

- **GIVEN** a BA squad with `vibroClaws === 0`
- **WHEN** the attack-declaration UI renders for this squad
- **THEN** the Vibroclaw action button SHALL NOT be visible

### Requirement: Brush-Off and Drop-Prone Dislodge

A mech with attached swarmers SHALL be permitted to declare EITHER a brush-off attack OR a drop-prone dislodge per turn, but not both. Brush-off SHALL use the mech pilot's piloting skill rating as the to-hit base, SHALL consume one of the mech's weapon-attack slots for the turn, and on success SHALL detach the targeted swarmer plus apply 1 damage per surviving trooper to that swarmer. Drop-prone SHALL be a movement-phase action gated by a PSR; success SHALL detach all swarmers; failure SHALL inflict pilot damage per normal failed-PSR.

#### Scenario: Successful brush-off

- **GIVEN** mech L with attached swarmer B (4 troopers)
- **WHEN** L declares Brush-Off and succeeds
- **THEN** the swarm pointer SHALL be cleared on both sides
- **AND** 4 damage SHALL be allocated to B (1 per surviving trooper, via `allocateSquadDamage`)
- **AND** a `BASwarmDetached { reason: 'BrushedOff' }` event SHALL be emitted
- **AND** one of L's weapon-attack slots SHALL be marked consumed

#### Scenario: Failed brush-off

- **GIVEN** the same setup
- **WHEN** L declares Brush-Off and fails
- **THEN** the swarm pointer SHALL remain
- **AND** the weapon-attack slot SHALL still be marked consumed
- **AND** a `BABrushOffAttempted { outcome: 'miss' }` event SHALL be emitted

#### Scenario: Drop-prone success detaches all swarmers

- **GIVEN** mech L with two attached swarmers B1 and B2
- **WHEN** L drops prone and the PSR succeeds
- **THEN** both swarmers SHALL be detached
- **AND** `L.combatState.swarmedByUnitIds` SHALL equal `[]`
- **AND** two `BASwarmDetached { reason: 'DroppedProne' }` events SHALL be emitted (one per swarmer)

#### Scenario: Auto-detach when squad destroyed

- **GIVEN** swarmer B attached to L, all 4 troopers in B are killed by enemy fire this turn
- **WHEN** end-of-turn cleanup runs
- **THEN** the swarm pointer SHALL be cleared on both sides
- **AND** a `BASwarmDetached { hostId: L.id, attackerId: B.id, reason: 'SquadDestroyed' }` event SHALL be emitted

#### Scenario: Cannot declare both brush-off and drop-prone same turn

- **GIVEN** mech L declared Brush-Off this turn
- **WHEN** L attempts to also declare Drop-Prone-Dislodge
- **THEN** the second declaration SHALL be rejected with reason `'Already attempted Brush-Off this turn'`

### Requirement: Mounted-Trooper Passenger Badge

When a BA squad's `combatState.mountedOn` is set to a host unit ID (BA mounted as passenger via magnetic clamps or mechanized chassis), the BA token SHALL render as a passenger badge attached to the host's token rather than as a standalone hex token. The badge SHALL display the trooper count and squad name; the BA token SHALL NOT occupy its own hex while mounted. The render token MAY carry `passengerBadge: { hostTokenId, slot }` as a presentation hint; when present, `hostTokenId` identifies the host render group and `slot` places the badge at the host shoulder, side, or back without changing the rules-state `mountedOn` relationship.

#### Scenario: Mounted-on host suppresses standalone token

- **GIVEN** a BA squad B with `combatState.mountedOn === 'mech-host-1'`
- **WHEN** the hex board renders
- **THEN** B SHALL NOT have a standalone hex token at its position
- **AND** the host token for `mech-host-1` SHALL display a passenger badge for B
- **AND** the passenger badge SHALL be a child of the host token render group

#### Scenario: Map projections preserve host-owned badge

- **GIVEN** a tactical map that can switch between top-down and isometric projections
- **AND** a BA squad B mounted on host H with a `passengerBadge` slot hint
- **WHEN** the map renders in top-down projection
- **THEN** B's passenger badge SHALL be a child of H's token render group
- **AND** B's badge SHALL report H's map position while preserving B's source position
- **WHEN** the map switches to isometric projection
- **THEN** B's passenger badge SHALL remain a child of H's isometric token render group

#### Scenario: Badge updates when troopers die

- **GIVEN** B mounted on host with 4 troopers
- **WHEN** 2 troopers die
- **THEN** the passenger badge SHALL show trooper count `2/4`

#### Scenario: Dismount restores standalone token

- **GIVEN** B was mounted on a host
- **WHEN** `combatState.mountedOn` is cleared (dismount triggered by upstream transport logic — out of this spec's scope)
- **THEN** B SHALL render as a standalone hex token at its dismount hex

### Requirement: Anti-Mek Skill Source

The to-hit base for swarm and leg attacks SHALL derive from the BA pilot's Anti-Mek skill rating (per `personnel-system`). SPA modifiers SHALL come from `lib/spa/catalog` — relevant SPAs include `MISC_HUMAN_TRO_MEK` (mentioned in the Leg Attack requirement above) and any Anti-Mek-specific SPAs already in the catalog.

#### Scenario: Anti-Mek skill drives swarm to-hit

- **GIVEN** BA pilot P with Anti-Mek skill 4
- **WHEN** P's squad declares a swarm attack
- **THEN** the to-hit base SHALL be 4

#### Scenario: Anti-Mek skill drives leg-attack to-hit

- **GIVEN** BA pilot P with Anti-Mek skill 4
- **WHEN** P's squad declares a leg attack
- **THEN** the to-hit base SHALL be 4

## Data Model

### Interface: IBASquadCombatState

```typescript
interface IBASquadCombatState {
  readonly troopers: ITrooperState[];
  swarmingUnitId?: string;          // ID of host this squad is attached to (as swarmer)
  swarmedByUnitIds: string[];       // IDs of BA squads attached to THIS unit (when this state is on a host mech, e.g.)
  mountedOn?: string;               // ID of friendly host this squad is mounted on (passenger)
  mimeticActiveThisTurn: boolean;
  stealthActiveThisTurn: boolean;
}

interface ITrooperState {
  readonly index: number;           // 1-6 (per MegaMek LOC_TROOPER_1..LOC_TROOPER_6)
  alive: boolean;
  armorRemaining: number;
  equipmentDestroyed: string[];     // Equipment IDs marked destroyed by crit hits
}
```

### Event Types: BACombatEvent

```typescript
type BACombatEvent =
  | { kind: 'BASwarmAttached';        attackerId: string; hostId: string; }
  | { kind: 'BASwarmDetached';        attackerId: string; hostId: string; reason: 'BrushedOff' | 'DroppedProne' | 'SquadDestroyed'; }
  | { kind: 'BASwarmDamageApplied';   attackerId: string; hostId: string; totalDamage: number; perWeapon: { weaponId: string; damage: number }[]; }
  | { kind: 'BALegAttackResolved';    attackerId: string; targetId: string; hitLocation: MekLocation; damage: number; critModifier: number; }
  | { kind: 'BAVibroclawAttackResolved'; attackerId: string; targetId: string; damage: number; missileHits: number; vibroClawCount: number; }
  | { kind: 'BATrooperKilled';        squadId: string; trooperIndex: number; }
  | { kind: 'BABrushOffAttempted';    hostId: string; targetSwarmerId: string; outcome: 'hit' | 'miss'; };
```
