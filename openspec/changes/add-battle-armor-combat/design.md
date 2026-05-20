# Design: Add Battle Armor Combat

## Reference Material

- MegaMek `BattleArmor.java` (68KB) — squad state, dead-trooper tracking, `calculateSwarmDamage`, `rollHitLocation`, `getTrooperAtLocation`
- MegaMek `SwarmAttack.java` + `SwarmAttackHandler.java` (~100 LOC) — swarm declaration + attach state mutation
- MegaMek `SwarmWeaponAttackHandler.java` (~90 LOC) — damage-while-attached resolution
- MegaMek `LegAttack.java` + `LegAttackHandler.java` (~125 LOC) — leg attack damage + crit math
- MegaMek `BAVibroClawAttackAction.java` — vibroclaw attack action shape
- MegaMek `BrushOffAttackAction.java` — brush-off declaration
- MegaMek `Entity.java:8362-8380` — `checkDislodgeSwarmers` (drop-prone PSR)
- Local `src/types/gameplay/GameplayUIInterfaces.ts:312-324` — existing `IBattleArmorToken` with the unresolved TODO

## Architecture Decisions

### Decision A: New `battle-armor-combat` capability, not delta on `battle-armor-unit-system`

**Choice**: combat mechanics live in a separate `battle-armor-combat` capability. `battle-armor-unit-system` stays construction-focused.

**Rationale**: the existing 820-LOC `battle-armor-unit-system` spec is well-bounded around construction (chassis, equipment mounting, BLK round-trip, BV calculation, customizer UI). Adding ~12 combat requirements to it would push it past 1100 LOC and conflate two distinct domains. The existing `BA Combat State` section (lines 766-791) is minimal — just trooper-array + swarmingUnitId — and lives there because the squad's runtime shape needs to round-trip from construction state. The new capability cross-references that existing state but is the canonical source for combat mechanics going forward.

**Alternatives considered**:
- *Modify `battle-armor-unit-system` and remove its `Non-Goals → Combat mechanics` line*: rejected — splits the responsibility unclearly; the construction spec's Non-Goals are correct as-stated.
- *Bundle BA combat into the existing `combat-resolution` spec*: rejected — `combat-resolution` is already 1264 LOC; further bloat hurts readability. Per-unit-type combat capabilities (already exists for `aerospace`, conventional pattern is forming) is the cleaner mental model.

### Decision B: Squad-damage allocation uses re-roll loop, not weighted distribution

**Choice**: each damage point rolls d6 against trooper slots; if the rolled trooper is dead, re-roll. Matches MegaMek `BattleArmor.rollHitLocation()` line 666 (`loc = Compute.d6()` in a `while` loop until alive trooper is found).

**Rationale**: MegaMek parity is the priority. Players importing MegaMek-derived scenarios expect identical damage distributions. A weighted approach (e.g., divide by living-trooper-count) would skew slightly differently on small squads and break replay parity against MegaMek logs.

**Alternatives considered**:
- *Weighted random across living troopers (no re-roll)*: rejected — non-canonical, breaks parity.
- *Fill the most-damaged trooper first*: rejected — non-canonical, conceptually wrong (swarm fire is dispersed).

### Decision C: Swarm damage uses `calculateSwarmDamage` formula verbatim

**Choice**: `sum(squad-mounted non-missile non-infantry-attack non-body-mounted weapon damage × shootingStrength) + vibroClaws + (myomerBooster ? troopers × 2 : 0)`. The `× shootingStrength` accounts for "each surviving trooper hits" on a squad-mounted weapon.

**Rationale**: MegaMek parity. The formula is in `BattleArmor.calculateSwarmDamage()` lines 1502-1540, which I've read verbatim. Body-mounted weapons (per-trooper, not squad-shared) are excluded because they fire forward, not at the swarmed mech. Missile weapons are excluded because they can't be aimed point-blank in a swarm clinch.

**Alternatives considered**:
- *Include missile weapons in swarm fire*: rejected — non-canonical.
- *Average damage instead of sum*: rejected — non-canonical; swarm fire is meant to be devastating, that's the tactical role.

### Decision D: Leg attack hit-location fallback to other leg

**Choice**: roll for leg location (`Mek.LOC_LEFT_LEG` or `Mek.LOC_RIGHT_LEG`); if the rolled leg has 0 internal, hit the other leg. Mirrors MegaMek `LegAttackHandler.java` lines 88-94.

**Rationale**: parity, and a sensible rule — the troopers physically wrap the leg; if one leg is gone, they wrap the other.

**Alternatives considered**:
- *Miss when leg destroyed*: rejected — non-canonical; the attack should always hit one of the legs.

### Decision E: Brush-off + drop-prone as alternatives in the same phase

**Choice**: the targeted mech declares EITHER brush-off OR drop-prone per turn, not both. Brush-off requires the mech to forfeit one weapon attack that turn; drop-prone is a standalone movement action with a PSR.

**Rationale**: matches MegaMek; both actions consume similar "attention budget" so allowing both per turn would be too generous.

**Alternatives considered**:
- *Allow both per turn*: rejected — too strong against swarmers.
- *Auto-select the better one*: rejected — player tactical choice should be explicit.

### Decision F: `mountedOn` resolves the existing TODO; transport rules deferred

**Choice**: this change resolves the `IBattleArmorToken.mountedOn` TODO by formalizing `mountedOn` as a combat-state field driven by transport state. Render-side: when set, the BA token renders as a passenger badge on the host. Transport-side: this change does NOT define HOW BA squads mount/dismount (that's `add-ba-transport-rules`, a future change). Assumed prerequisite: `mountedOn` is set by some upstream system, and combat-state read-side honors it.

**Rationale**: closing the TODO needs the render-side contract pinned. The mounting transport rules are a separate domain (load/unload phase, magnetic-clamp eligibility, mechanized-chassis-capacity, dismount-when-host-takes-Y-damage rules) and would balloon this change past 200 LOC.

**Alternatives considered**:
- *Bundle transport rules into this change*: rejected — scope creep; transport is its own 200+ LOC domain.
- *Leave the TODO alone*: rejected — render-side BA passenger handling is a Wave-7 visible bug.

### Decision G: Anti-Mek skill source is `personnel-system` + `lib/spa/catalog`

**Choice**: BA pilot's Anti-Mek skill rating + SPAs drive swarm/leg-attack to-hit. The new spec references the existing `personnel-system` for the pilot stat and the existing `lib/spa/catalog` for `MISC_HUMAN_TRO_MEK` (and any other Anti-Mek SPAs).

**Rationale**: don't re-define pilot stats here. Cross-spec reference keeps the spec footprint small and ensures pilot-stat changes flow through naturally.

**Alternatives considered**:
- *Hardcode Anti-Mek = 4*: rejected — non-canonical and breaks pilot-progression integration.
- *Author a new SPA in this change*: rejected — `HUMAN_TRO_MEK` already exists per MegaMek `OptionsConstants`; only the Anti-Mek skill stat needs a cross-reference, not creation.

## Data Flow

```
BA squad B has 4 troopers, attached to host mech M via swarm
              ↓
B declares squad-fire-while-swarming (W = SwarmWeaponAttack)
              ↓
Resolver: B.unitType === BATTLE_ARMOR && W kind === SwarmWeaponAttack
              ↓
SwarmWeaponAttackHandler resolves:
  ├─ Roll d6 per damage point against host M location table
  ├─ For each hit:
  │     ├─ Determine M location (CT/LT/RT front/rear)
  │     ├─ Apply damage to M armor → internal
  │     └─ Emit AttackResolved + WeaponDamageApplied
  └─ Compute B's outgoing swarm damage = calculateSwarmDamage(B)
       = sum(non-missile non-body squad weapons × shootingStrength)
       + vibroClaws + (myomer ? troopers × 2 : 0)
              ↓
Apply outgoing damage to M
              ↓
Emit BASwarmDamageApplied { attackerId: B.id, hostId: M.id, damage, weapons: [...] }
              ↓
NEXT: enemy E fires at M with autocannon for 12 damage
              ↓
Resolver: M has swarmers (M.combatState.swarmedByUnitIds.includes(B.id))
              ↓
For each hit roll on M's CT/LT/RT (mounted-trooper-able):
   ├─ Some hits go to M armor (normal)
   ├─ Other hits (e.g. CT rear) translate via getTrooperAtLocation
   │   → trooper 5 takes the damage
   ├─ Apply damage to B.combatState.squad.troopers[5].armor
   └─ Emit BATrooperKilled if armor → 0
              ↓
At end of turn: if B.getNumberActiveTroopers() === 0
              ↓
Auto-emit BASwarmDetached { hostId: M.id, reason: 'Squad destroyed' }
```

## File Changes (Apply estimate — informational; not part of this change)

- New:
  - `src/lib/combat/baCombat.ts` — squad damage allocator, swarm damage calculator, leg-attack damage helper, trooper-location-on-host adapter (~300-400 LOC)
- Modified:
  - `src/engine/InteractiveSession.ts` — register the 3 BA action handlers (SwarmAttack, LegAttack, BAVibroClawAttack), brush-off declaration
  - `src/lib/combat/combatResolution.ts` — BA dispatch branch + 7 new event emissions
  - `src/types/gameplay/CombatInterfaces.ts` — `IBASquadCombatState` formalization, 7 BACombatEvent variants, swarm/leg/vibroclaw attack context types
  - `src/types/gameplay/GameplayUIInterfaces.ts` — resolve TODO on `IBattleArmorToken.mountedOn`, add `passengerBadge` render hint
  - `src/components/gameplay/UnitToken.tsx` (or hex-board equivalent) — passenger badge rendering
  - `src/components/gameplay/AttackDeclarationPanel.tsx` — swarm/leg/vibroclaw action buttons for BA attackers
  - `src/services/combat/replays/eventLogFormatter.ts` — 7 new event types in the columnar formatter
- Deleted: none

## Risks

- **R1 (medium)**: passenger-badge rendering interacts with the existing hex-token layer and z-ordering. Mitigation: the spec pins the render contract (`passengerBadge` rendering hint); the Apply wave's UI work needs storybook story coverage before shipping to playtest.
- **R2 (medium)**: squad-damage allocation parity against MegaMek needs harness validation on a representative scenario set. Mitigation: include a 5-scenario regression harness in the Apply wave (proposal Open Questions section flagged the test footprint).
- **R3 (low)**: the swarm-while-attached damage formula has edge cases around BA squads with mixed Body + Squad mounted weapons. Mitigation: spec'd verbatim against MegaMek; tests cover the body-mounted-excluded case explicitly.
- **R4 (low)**: the new event types interact with the JSONL event-log replay path (per `replay-library` capability). Mitigation: spec the round-trip explicitly + extend the columnar formatter in the same Apply wave.
- **R5 (low)**: `mountedOn` for passenger-badge requires upstream transport system to populate the field. Mitigation: spec is explicit that this change defines the read-side contract; transport rules are deferred to a follow-up. The field already exists in `IBattleArmorToken` so no shape change is needed — only the render-side contract is new.
