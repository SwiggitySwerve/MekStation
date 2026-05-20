# Tasks: Add Battle Armor Combat

## 1. BA squad combat state (formalize existing minimal shape)

- [ ] 1.1 Define `IBASquadCombatState` in `src/types/gameplay/CombatInterfaces.ts` with fields `{ troopers: ITrooperState[], swarmingUnitId?: string, swarmedByUnitIds: string[], mountedOn?: string, mimeticActiveThisTurn: boolean, stealthActiveThisTurn: boolean }`. `ITrooperState` = `{ index, alive, armorRemaining, equipmentDestroyed: string[] }`
- [ ] 1.2 Provide a helper `getNumberActiveTroopers(state)` returning `state.troopers.filter(t => t.alive).length`
- [ ] 1.3 Provide helpers `isDmgLight(state)` / `isDmgModerate(state)` per the existing MegaMek thresholds (`< 0.9` and `< 0.75` of squad size respectively)
- [ ] 1.4 Unit-test initial state population, dead-trooper-retention, helper thresholds

## 2. Squad damage allocation

- [ ] 2.1 Implement `allocateSquadDamage(squad: IBASquadCombatState, totalDamage: number, rng: IDiceRoller, options: { tacOpsCritSlots: boolean })` in `src/lib/combat/baCombat.ts`. Returns `{ allocations: { trooperIndex, damage, criticalHit }[], events: BACombatEvent[] }`
- [ ] 2.2 For each damage point: roll d6, re-roll if the resulting trooper is dead, apply damage to that trooper's armor
- [ ] 2.3 If `tacOpsCritSlots && previousRollLocation === currentRollLocation && !isAttackingConvInfantry` → flag `criticalHit: true`
- [ ] 2.4 When a trooper's armor drops to 0, mark `alive: false` and emit `BATrooperKilled`
- [ ] 2.5 Unit-test: 4 damage on a full squad distributes 4 troopers; 4 damage with one dead trooper distributes among the 3 alive

## 3. Swarm attack — to-hit + state machine

- [ ] 3.1 Add `SwarmAttack` action handler in `src/engine/InteractiveSession.ts`. Eligible only when attacker is BA (`unitType === BATTLE_ARMOR`), target is a mech in the same hex, target has no current swarmer
- [ ] 3.2 To-hit base: attacker pilot's Anti-Mek skill (from `personnel-system`), plus terrain modifiers, plus per-trooper-dead penalty (each dead trooper = +1 to-hit, per MegaMek convention — confirm during Apply against `Compute.getSwarmMekBaseToHit`)
- [ ] 3.3 On success: set `attacker.combatState.squad.swarmingUnitId = target.id`, append `target.combatState.swarmedByUnitIds.push(attacker.id)`, emit `BASwarmAttached { attackerId, hostId }`
- [ ] 3.4 On failure: attacker remains in the same hex as the target; emit `AttackResolved { outcome: 'miss', reason: 'Swarm attack failed' }`
- [ ] 3.5 Unit test: success path attaches both sides of the swarm pointer; failure path leaves both unchanged

## 4. Swarm fire while attached

- [ ] 4.1 Implement `calculateSwarmDamage(squad: IBASquadCombatState, squadDef: IBattleArmor)` in `src/lib/combat/baCombat.ts`:
  - Sum non-missile non-body-mounted non-InfantryAttack squad weapons × shootingStrength
  - + vibroClaws (squad-level, max 2)
  - + (myomerBooster ? activeTroopers × 2 : 0)
- [ ] 4.2 Register `SwarmWeaponAttack` action: fires every turn the squad is attached; damage applies to the host without a to-hit roll (auto-hit)
- [ ] 4.3 Hit location on host: roll d6 per damage point against the host's standard mech hit-location table (front-side)
- [ ] 4.4 Emit `BASwarmDamageApplied { attackerId, hostId, totalDamage, perWeapon: [{ weaponId, damage }] }`
- [ ] 4.5 Unit test: 4-trooper squad with one squad-mounted SmallLaser (damage 3) → `3 × 4 = 12` swarm damage; with vibroclaws +2 → 14; with myomer +8 → 22

## 5. Swarm fire absorption + trooper hits (mounted-trooper adapter)

- [ ] 5.1 Implement `getTrooperAtLocation(hostLocation: MekLocation, isRear: boolean, squad: IBASquadCombatState)` per MegaMek's mapping: RT-front→1, LT-front→2, RT-rear→3, LT-rear→4, CT-front→6, CT-rear→5
- [ ] 5.2 When non-BA attacker fires at a swarmed host mech: for each hit roll, if the location is one of the mounted-trooper locations (CT/LT/RT) AND the rolled trooper is alive, route damage to the trooper instead of the host armor
- [ ] 5.3 Emit `BATrooperKilled` if the routed damage destroys the trooper
- [ ] 5.4 Unit test: enemy fires PPC (10 dmg) at host CT-rear → trooper 5 takes 10 dmg → if trooper 5 armor was 4, trooper 5 dies + 6 dmg lost (NOT carried to host)

## 6. Leg attack

- [ ] 6.1 Register `LegAttack` action handler. Eligible only when attacker is BA in same hex as a mech target
- [ ] 6.2 To-hit base: attacker pilot's Anti-Mek skill + terrain + dead-trooper penalty
- [ ] 6.3 Damage formula: `4 + vibroClaws + (myomerBooster ? activeTroopers × 2 : 0)` per MegaMek `LegAttackHandler` line 103
- [ ] 6.4 Hit location: roll for `LOC_LEFT_LEG` or `LOC_RIGHT_LEG`; if rolled leg has 0 internal, hit the other leg
- [ ] 6.5 Critical modifier: `−2` if target's armor at the hit location is `HARDENED`; `+1` if attacker pilot has `MISC_HUMAN_TRO_MEK` SPA
- [ ] 6.6 Emit `BALegAttackResolved { attackerId, targetId, hitLocation, damage, critModifier }`
- [ ] 6.7 Unit test: leg attack on mech with destroyed left leg rolls left first → falls through to right; armor type `HARDENED` reduces crit; HUMAN_TRO_MEK adds crit

## 7. Vibroclaw attack

- [ ] 7.1 Register `BAVibroClawAttack` action handler. Eligible when attacker is BA with `vibroClaws ≥ 1` and target is adjacent
- [ ] 7.2 Damage formula: `missilesHit(shootingStrength) × vibroClaws` per MegaMek `BAVibroClawAttackAction.calcDamage`
- [ ] 7.3 UI MUST hide the vibroclaw action button when attacker `vibroClaws === 0`
- [ ] 7.4 Emit `BAVibroclawAttackResolved { attackerId, targetId, damage, missileHits, vibroClawCount }`
- [ ] 7.5 Unit test: 4-trooper squad with 2 vibroclaws + missilesHit(4) = 3 → damage = 6

## 8. Brush-off + drop-prone dislodge

- [ ] 8.1 Register `BrushOffAttack` action — eligible when target mech has `swarmedByUnitIds.length > 0`; only one swarmer can be brushed off per attempt; consumes one weapon attack slot for the turn
- [ ] 8.2 To-hit: mech pilot's piloting skill rating
- [ ] 8.3 On success: detach the swarmer (clear both sides of the pointer), apply brush-off damage `1 per trooper` to the squad via `allocateSquadDamage`
- [ ] 8.4 On failure: swarmer stays attached, brush-off attack slot wasted
- [ ] 8.5 Register `DropProneDislodge` — drops the mech prone with a PSR; success detaches; failure inflicts pilot damage per normal failed-PSR
- [ ] 8.6 Emit `BASwarmDetached { hostId, attackerId, reason: 'BrushedOff' | 'DroppedProne' | 'SquadDestroyed' }`
- [ ] 8.7 Auto-emit `BASwarmDetached { reason: 'SquadDestroyed' }` when `getNumberActiveTroopers(squad) === 0` at end-of-turn
- [ ] 8.8 Unit test: brush-off success path detaches both sides + applies brush-off damage; brush-off failure leaves state intact

## 9. Mounted-trooper passenger badge (resolve TODO)

- [ ] 9.1 Remove the `TODO: wire from battlearmor combat-behavior proposal` from `src/types/gameplay/GameplayUIInterfaces.ts:317`; replace with a JSDoc reference to this change
- [ ] 9.2 Add `IBattleArmorToken.passengerBadge?: { hostTokenId: string, slot: 'shoulder' | 'side' | 'back' }` for renderer hints
- [ ] 9.3 In `UnitToken.tsx` (hex-board renderer): when `token.mountedOn` is set, render a small BA badge attached to the host token; do NOT render the BA token at its own hex
- [ ] 9.4 Unit test (rendering): BA token with `mountedOn` set + host token in scene → only host renders at hex; BA badge is a child of host's render group

## 10. Combat-resolution dispatch + event-log

- [ ] 10.1 In `combatResolution.ts`: when `attacker.unitType === BATTLE_ARMOR` AND weapon kind is `SwarmAttack|LegAttack|BAVibroClawAttack`, route to BA-specific handler
- [ ] 10.2 When non-BA attacker fires at BA target (`target.unitType === BATTLE_ARMOR`): apply `allocateSquadDamage` instead of mech hit-location table
- [ ] 10.3 Extend `src/services/combat/replays/eventLogFormatter.ts` with the 7 new event types (BASwarmAttached, BASwarmDetached, BASwarmDamageApplied, BALegAttackResolved, BAVibroclawAttackResolved, BATrooperKilled, BABrushOffAttempted)
- [ ] 10.4 Scenario test: 4-trooper BA squad swarms a Locust, fires squad weapons next turn, takes 2 trooper kills from enemy mech fire next turn, squad destroyed turn 4 with auto-detach event

## 11. Spec deltas

- [ ] 11.1 Author `openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md` (NEW capability — first-class BA combat surface per the proposal)
- [ ] 11.2 Author `openspec/changes/add-battle-armor-combat/specs/combat-resolution/spec.md` (MODIFIED — BA dispatch + 7 typed events)
- [ ] 11.3 `npx openspec validate add-battle-armor-combat --strict` passes clean
- [ ] 11.4 `npm run build`, lint, typecheck, jest, scenario tests pass on CI (Apply wave gate)
- [ ] 11.5 Archive the change to `openspec/changes/archive/YYYY-MM-DD-add-battle-armor-combat/` after PR merge; sync the 2 deltas into source-of-truth specs (NEVER `--skip-specs`)

## 12. Documentation + follow-up notes

- [ ] 12.1 Add a `playtest/wave-7/BA_COMBAT_NOTES.md` section: scenarios to add to `playtest-scenarios.spec.ts` (BA-swarm-vs-Locust, BA-leg-vs-Atlas, anti-personnel-fire-vs-half-dead-squad)
- [ ] 12.2 Spec the future BA-transport follow-up — `add-ba-transport-rules` covering magnetic clamp mount/dismount, mechanized-chassis capacity, host-damage-triggered dismount. Note in `_followups.md` placeholder in archive folder
- [ ] 12.3 Note BA stealth / mimetic to-hit modifiers as a separate Wave-8 follow-up (`add-ba-stealth-modifiers`)
