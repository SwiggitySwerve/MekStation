# Change: Add Battle Armor Combat

## Why

Battle Armor (BA) squads are constructed end-to-end today via the `battle-armor-unit-system` capability (820 LOC spec covering chassis, weight classes, manipulators, equipment mounting, BLK round-trip, BV 2.0 calculation, customizer UI). But combat mechanics are explicitly out-of-scope of that spec — line 9: "Combat mechanics (damage resolution, swarm attacks, anti-mech tactics) are OUT OF SCOPE". The same gap surfaces in code: `src/types/gameplay/GameplayUIInterfaces.ts:317` carries a `TODO: wire from battlearmor combat-behavior proposal` on the `mountedOn?: string` field of `IBattleArmorToken`. That TODO is the surfacing of a deeper gap — there is no spec authority for any BA-vs-mech, BA-vs-vehicle, BA-vs-BA, or mech-fire-vs-BA-squad mechanic.

A playtest that includes a BA squad on the table today has no defined behavior for: how anti-personnel fire allocates damage across troopers; how a BA squad swarms a mech and what damage they deal each turn while attached; how mech and BA tactical interactions resolve (leg attacks, anti-mech vibroclaw attacks, brush-off attempts); how dead troopers reduce squad firepower; how mounted-on-host (BA riding a mech) renders as a passenger badge rather than a standalone token.

MegaMek implements all of this across `BattleArmor.java` (68KB), `BAVibroClawAttackAction.java`, `LegAttack.java` + `LegAttackHandler.java`, `SwarmAttack.java` + `SwarmAttackHandler.java`, `SwarmWeaponAttackHandler.java`, `BrushOffAttackAction.java`, `BattleArmor.calculateSwarmDamage()`, `BattleArmor.rollHitLocation()`, and `BattleArmor.getTrooperAtLocation()`. The squad-damage / dead-trooper / swarm-state pattern is concentrated; the per-attack handlers are small (~100 LOC each). This change establishes spec authority for the combat surface so the Apply wave can implement the per-attack handlers + the squad-state machinery without re-deriving rules from Java each PR.

**Scope discipline**: BA construction is OUT — `battle-armor-unit-system` owns it. Anti-mech vibroclaw, leg attack, swarm-attach, swarm-detach, swarm-fire-while-attached, brush-off, conventional-infantry-vs-BA, mech-fire-vs-BA, squad-damage allocation, mounted-trooper rendering are IN. BA pilot SPAs (Anti-Mek skill, etc.) carry over from the existing SPA catalog — this change only references them, doesn't re-define. Magnetic-clamp-mount / mechanized BA riding host vehicles is IN as the `mountedOn` host relationship at combat-state level (transport-rules out of scope; assume host already exists). BA construction-time equipment that affects combat (vibroclaws, myomer booster, magnetic clamps) is referenced for its combat side-effect only.

## What Changes

### Capability deltas

- **NEW `battle-armor-combat`** — first-class combat capability for BA squads:
  - ADDED **BA Squad Combat State**: per-trooper alive/armor/equipment-destroyed tracking, swarm-attach pointer (`swarmingUnitId | mountedOn`), mimetic/stealth state-this-turn flags. Builds on the existing minimal `BA Squad Combat State` requirement already in `battle-armor-unit-system` (which only covers swarm-on and dead-trooper retention) — promoted to first-class with full per-attack semantics.
  - ADDED **Squad Damage Allocation**: anti-personnel and weapon-fire damage SHALL roll d6 per damage point against trooper slots; rerolls SHALL skip dead troopers; the "second roll is same trooper triggers crit" Tactical Operations rule SHALL be supported behind an options flag. Mirrors MegaMek `BattleArmor.rollHitLocation()`.
  - ADDED **Swarm Attack — To-Hit**: a BA squad SHALL be able to declare a swarm attack against a mech via the dedicated `SwarmAttack` weapon. To-hit base is the attacker's Anti-Mek skill from `lib/spa/catalog`; resolution mirrors `SwarmAttackHandler`. Failed swarm SHALL leave the attacker in the same hex; successful swarm SHALL establish the `swarmingUnitId` link.
  - ADDED **Swarm Attack — Damage While Attached**: while a BA squad is attached as a swarmer to a host mech, the squad SHALL fire its squad weapons at the host each turn using `SwarmWeaponAttackHandler` rules. Damage formula: `sum(squad-mounted non-missile non-infantry-weapon damage × shootingStrength) + (vibroClaws × 1) + (myomerBooster ? troopers × 2 : 0)`. Mirrors `BattleArmor.calculateSwarmDamage()`.
  - ADDED **Swarm Attack — Hit-Location vs Mounted Host**: damage applied to a host mech with attached swarmers SHALL use the mounted-trooper-location adapter from MegaMek `getTrooperAtLocation` — RT-front → trooper 1, LT-front → trooper 2, RT-rear → trooper 3, LT-rear → trooper 4, CT-front → trooper 6, CT-rear → trooper 5 — so fire targeting the host mech's torsos can secondarily hit the attached squad's individual troopers.
  - ADDED **Leg Attack**: a BA squad SHALL be able to declare a leg attack against a mech via the `LegAttack` infantry attack action. Damage = `4 + vibroClaws + (myomerBooster ? troopers × 2 : 0)`. Hit-location SHALL be a leg per `rollHitLocation`; if the rolled leg is destroyed, the other leg SHALL be hit. Critical-hit modifier: `−2` if the targeted location's armor type is `HARDENED`; `+1` if the attacker has the `HUMAN_TRO_MEK` SPA. Mirrors `LegAttackHandler`.
  - ADDED **Vibroclaw Attack**: a BA trooper SHALL be able to make a melee vibroclaw attack against an adjacent enemy. Damage = `missilesHit(shootingStrength) × vibroClaws` per `BAVibroClawAttackAction`. Targets must have vibroclaws ≥ 1; UI MUST hide the action when vibroclaws == 0.
  - ADDED **Brush-Off Attempt**: a mech with attached swarmers MAY declare a brush-off attack each turn; the brush-off uses the mech pilot's skill rating; success detaches the squad and applies brush-off damage (per `BrushOffAttackAction`). Failure leaves the swarmer attached.
  - ADDED **Dislodge by Prone**: a mech with attached swarmers MAY drop prone instead of brushing off; PSR target = base + 0; success detaches the swarmer; failure inflicts pilot damage as a normal failed-PSR. Mirrors `Entity.checkDislodgeSwarmers()`.
  - ADDED **Dead Trooper Effects on Squad Fire**: when calculating outgoing squad fire from a BA squad, dead troopers SHALL reduce `shootingStrength` proportionally. A squad with `getNumberActiveTroopers() / squadSize < 0.75` SHALL be marked `dmgModerate`; `< 0.9` SHALL be `dmgLight`.
  - ADDED **Mounted-Trooper Passenger Badge**: when `IBattleArmorToken.mountedOn` is set (BA squad mounted as passenger on a friendly mech via magnetic clamps or mechanized chassis), the BA token SHALL render as a passenger badge attached to the host's token rather than as a standalone hex token. The mountedOn relationship SHALL be transport-state-driven, not BA-spec-driven.
  - ADDED **Anti-Mek Skill Source**: the BA pilot's Anti-Mek skill rating SHALL drive base to-hit for swarm and leg attacks; reference `personnel-system` for the pilot stat and `lib/spa/catalog` for SPA modifiers.

- **MODIFIED `combat-resolution`** — add the BA combat dispatch + event-log requirements:
  - ADDED **BA Combat Dispatch**: when an attack's attacker has `unitType === BATTLE_ARMOR` AND the weapon is `SwarmAttack` | `LegAttack` | `BAVibroClawAttack`, the resolver SHALL route to the corresponding BA-specific handler. When a non-BA attacker fires at a BA target, the resolver SHALL apply squad-damage allocation per `Squad Damage Allocation` instead of mech-style hit-location tables.
  - ADDED **BA Combat Event Coverage**: typed event log SHALL emit `BASwarmAttached`, `BASwarmDetached`, `BASwarmDamageApplied`, `BALegAttackResolved`, `BAVibroclawAttackResolved`, `BATrooperKilled`, `BABrushOffAttempted`. Each event carries stable fields including `attackerId`, `targetId | hostId`, `trooperIndex` (when applicable), `damage`, `criticalHit?`, `outcome: 'hit' | 'miss' | 'detached'`. Pairs with the event-log line-format suite (project memory: `project_event_log_line_format_suite`).

### Code touch points (Apply Wave — not in this change)

- `src/engine/InteractiveSession.ts` — register `SwarmAttack`, `LegAttack`, `BAVibroClawAttack` action handlers
- `src/lib/combat/baCombat.ts` (new) — squad damage allocator, swarm damage calculator, leg-attack damage helper
- `src/lib/combat/combatResolution.ts` — BA dispatch branch + 7 new event types
- `src/types/gameplay/CombatInterfaces.ts` — `IBASquadCombatState` (formalize the existing trooper-array shape), `BACombatEvent` discriminator + 7 variants, `attackerLegAttackContext`, `attackerSwarmContext`
- `src/types/gameplay/GameplayUIInterfaces.ts` — resolve the TODO on `IBattleArmorToken.mountedOn`; add `passengerBadge` render hint
- `src/components/gameplay/UnitToken.tsx` — render passenger badge when `mountedOn` is set
- `src/components/gameplay/AttackDeclarationPanel.tsx` — surface swarm/leg/vibroclaw action buttons for BA attackers
- `src/services/combat/replays/eventLogFormatter.ts` — extend columnar formatter for 7 new event types

## Capabilities

### New

- `battle-armor-combat` — BA squad combat state, swarm + leg + vibroclaw + brush-off mechanics, anti-personnel squad-damage allocation, mounted-trooper rendering

### Modified

- `combat-resolution` — adds BA dispatch + 7 typed event variants
- `battle-armor-unit-system` — references the new `battle-armor-combat` capability for BA combat behavior (existing minimal `BA Combat State` section can stay as construction-time state; combat-time semantics move to the new capability). NO delta in this change — the existing requirements are not modified, only the new capability is the canonical source for combat mechanics going forward.

## Impact

- **Affected source files (Apply estimate)**: ~10 files, ~700-1000 LOC across engine/handlers/types/event-log/UI. The new `src/lib/combat/baCombat.ts` is the biggest single addition (~300-400 LOC).
- **No new transport** — uses existing Zustand stores + typed event log.
- **No DB migration**.
- **Storybook deltas (Apply wave)**: 2-3 stories — passenger-badge BA token, swarmed-mech token, vibroclaw-action button visibility.
- **Test footprint estimate (Apply wave)**: ~40-60 new unit tests + 5-8 scenario tests (swarm-attach-detach-damage cycle, leg-attack-on-already-destroyed-leg, anti-personnel damage to half-dead squad, mounted-trooper hit-location adapter).

## Non-Goals

- **BA construction changes** — the existing `battle-armor-unit-system` is canonical for chassis, weight classes, equipment mounting, BLK round-trip. This change references BA construction data but does not modify it.
- **BA transport (mechanized BA riding host)** — assumed to exist via `mountedOn` field on combat state. The actual mounting/dismounting transport rules (magnetic clamps, host can move with passengers, dismount triggers, etc.) live in a future `add-ba-transport-rules` change.
- **Conventional infantry-vs-mech combat** — out; conventional infantry has its own spec (`infantry-unit-system` exists at 0 LOC for combat — that's a future `add-infantry-combat` follow-up).
- **BA-vs-aerospace** — out; aerospace combat is the third change in this Wave 7 batch.
- **BA squad command unit specialties (Newtsuit, Anti-VTOL Light Suit Mods, etc.)** — out; these are construction-time chassis variants already covered by `battle-armor-unit-system`.
- **BA stealth / mimetic camouflage to-hit modifiers** — out for this change; the squad-state field already exists per the existing `BA Squad Combat State` requirement. A follow-up `add-ba-stealth-modifiers` change spec'd separately can wire the to-hit consumer.
- **BA-vs-Aerospace ground-attack rules (BA on the ground gets strafed by ASF)** — handled by `aerospace-combat` change (#3 in this batch).
- **BA AI heuristics (when to swarm vs when to fire)** — out; bot decision-making is a follow-up.
- **MekHQ-side BA repair / replacement / promotion-on-anti-mek-kills** — out; campaign-side handled by existing campaign specs.

## Open Questions

- **Should the swarm-fire damage formula include missile-flagged BA squad weapons (e.g., BA SRM-2)?** Decision: NO — mirrors MegaMek `calculateSwarmDamage` which explicitly `continue`s on `F_MISSILE`. Missile weapons can't be aimed point-blank at the swarmed mech during the swarm clinch. Documented in spec.
- **Should the "second roll same trooper triggers crit" Tactical Operations rule be on by default?** Decision: behind options flag `gameOptions.tacOps_ba_crit_slots`, default `false` for Wave-7 compatibility. Players opt in for grittier games. Mirrors MegaMek `ADVANCED_COMBAT_TAC_OPS_BA_CRITICAL_SLOTS`.
- **Should brush-off attack damage to the squad be applied at brush-off time or end-of-turn?** Decision: at brush-off time, mirrors MegaMek `BrushOffAttackAction` resolution order. Documented in spec.
- **Should a destroyed swarmer (all troopers dead) auto-detach from the host?** Decision: YES — when `getNumberActiveTroopers() === 0`, the resolver SHALL emit `BASwarmDetached` with reason `'Squad destroyed'`. Documented in spec.
