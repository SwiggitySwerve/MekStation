# Tasks: Add ProtoMech Combat Behavior

## 1. Unit-Type Dispatch

- [ ] 1.1 Route `resolveDamage()` to `protoMechResolveDamage()` when target is `IProtoMechUnit`
- [ ] 1.2 Route `resolveCriticalHits()` to proto-specific crit resolver
- [ ] 1.3 Route `hitLocation.ts` to proto tables

> Deferred — follows aerospace precedent. ProtoMech module exposes `dispatchProtoCombat()` via subfolder barrel; GameEngine wiring happens in a later integration wave alongside aerospace.

## 2. Proto Combat State

- [x] 2.1 `unit.combatState.proto.armorByLocation`, `structureByLocation`
- [x] 2.2 Locations: Head, Torso, MainGun (if present), LeftArm, RightArm, Legs (or FrontLegs/RearLegs for Quad)
- [x] 2.3 `pilotWounded` flag (proto pilot takes damage from head crits)
- [x] 2.4 `destroyed` flag

## 3. Proto Hit Location Tables

- [x] 3.1 Front attack (2d6): 2=Torso(TAC), 3-4=RightArm, 5-7=Torso, 8-9=LeftArm, 10=Legs, 11=MainGun, 12=Head
- [x] 3.2 Side attack: 2=Side(TAC), 3-5=Legs, 6-8=Near Arm/Torso, 9-10=Torso, 11=MainGun, 12=Head
- [x] 3.3 Rear attack: 2=Torso(TAC), 3-5=Legs, 6-8=Torso, 9-10=Arms, 11=MainGun, 12=Head
- [x] 3.4 Glider bonus: +1 to attacker's to-hit (flying target)

## 4. Proto Damage Chain

- [x] 4.1 Apply damage to hit-location armor first
- [x] 4.2 Excess reduces structure at same location
- [x] 4.3 No location-to-location transfer (proto structure damage stays local)
- [x] 4.4 Head / Torso destruction = proto destroyed
- [x] 4.5 MainGun destruction = main gun weapon removed
- [x] 4.6 Legs destruction = immobilized (still fires from other locations)
- [x] 4.7 Emit `ProtoLocationDestroyed` events

## 5. Proto Critical Hits

- [x] 5.1 Trigger on TAC (roll 2) or structure-exposing damage
- [x] 5.2 Table: 2-7 no crit, 8-9 random equipment destroyed, 10-11 engine hit, 12 pilot killed
- [x] 5.3 Engine hit: 1 = -1 MP, 2 = destroyed
- [x] 5.4 Pilot killed: proto abandoned (counts as destroyed for victory)
- [x] 5.5 Emit `ProtoPilotKilled` or `ComponentDestroyed`

## 6. Proto Physical Attacks

- [x] 6.1 Kick: damage = floor(tonnage / 2) — max 4 damage for 9-ton proto
- [x] 6.2 Punch: damage = floor(tonnage / 5) — max 3 damage for 15-ton ultraheavy
- [x] 6.3 No main-gun melee (main gun is fixed fire only)
- [x] 6.4 Quad protos cannot punch (no arms)

## 7. Point-Level Fire (Optional)

- [x] 7.1 If 5-proto point is coordinated, declare a single attack pool covering all 5 protos
- [x] 7.2 Cluster-hits-style distribution across point members
- [x] 7.3 Emit `ProtoPointAttack` for audit
- [x] 7.4 Point fire is opt-in per scenario flag (off by default for MVP — individual protos fight on their own)

## 8. Glider Proto Rules

- [x] 8.1 Glider treated as low-altitude flying unit (not full aerospace)
- [x] 8.2 Attacker +1 to-hit (flight TMM bonus)
- [x] 8.3 Any structure-exposing damage → GliderFall roll (piloting vs TN 7)
- [x] 8.4 Failed roll → fall; proto takes 10 × altitude damage, altitude reset to 0
- [x] 8.5 Emit `GliderFall` event

## 9. Heat System for Protos

- [x] 9.1 Proto has 2 base heat sinks (built into engine)
- [x] 9.2 Heat levels: 4+ shutdown risk (lower than mech threshold due to proto fragility)
- [x] 9.3 Heat follows simplified proto table

## 10. AI Adaptations

- [x] 10.1 Bot uses protos as fast flankers
- [x] 10.2 Bot keeps protos at medium range (avoid mech punch counterattack)
- [x] 10.3 Bot retreats protos below 50% armor

## 11. Validation

- [ ] 11.1 `openspec validate add-protomech-combat-behavior --strict`
- [x] 11.2 Unit tests: hit location per direction, damage chain, crit table, glider fall
- [ ] 11.3 Simulation: point of 5 protos vs 1 mech
- [x] 11.4 Build + lint clean

> 11.1 / 11.3 deferred — matches Wave 3 aerospace pattern. `openspec validate --strict` is skipped per user instructions ("Skip pre-existing `openspec validate --strict` failures"). 5-proto vs mech simulation is end-to-end integration work that requires the GameEngine wiring in §1.
