# Tactical Map Rules Source Matrix

Date: 2026-05-22

This audit answers whether the current tactical-map plan has been checked
against real BattleTech rules or MekHQ/MegaMek behavior. The answer is:
partially. Pockets are source-backed, but movement, LOS, elevation, and combat
overlays still need explicit source pins and golden fixtures before the map can
claim full rules trust.

## Source Order

1. Official BattleTech rules where the project has a licensed/citable table or
   rule reference.
2. MegaMek tactical implementation as the executable oracle for movement,
   LOS, weapon range, firing arcs, modifiers, terrain, and elevation.
3. MekHQ only for campaign/scenario orchestration. MekHQ is not the tactical
   rules oracle for hex movement or weapon resolution.
4. MekStation OpenSpec and Jest fixtures after each behavior is source-pinned.

## Current Anchors And Gaps

| Mechanic                                            | Source anchor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | MekStation anchor                                                                                                                                                                                                                                                        | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimum range modifier                              | `E:\Projects\megamek\megamek\src\megamek\common\compute\Compute.java:1712`, gated by `Compute.isGroundToGround` at `Compute.java:6762`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `src/utils/gameplay/groundToGround.ts`, combat projection, session attack, quick-sim attack                                                                                                                                                                              | Verified and fixed in this slice: penalty applies only when neither represented unit is airborne.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Weapon range bands                                  | MegaMek `Compute.getRangeMods` at `Compute.java:1313-1517` computes range per attacking weapon, and `RangeType.java:95-151` brackets distance against that weapon's range table. MekStation commit path filters to weapons that are both in range and in arc before choosing the attack bracket (`InteractiveSession.actions.ts:383-450`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `src/utils/gameplay/range.ts`, `src/utils/gameplay/combatProjection.targeting.ts`, `src/utils/gameplay/combatProjection.ts`, `src/engine/InteractiveSession.actions.ts`                                                                                                  | Partially source-pinned. This slice fixes mixed selected-weapon previews so an out-of-arc short-range weapon can no longer lower the displayed attack bracket/to-hit for a target that will actually be fired on by a different usable weapon. UI and commit tests now cover that arc+range mismatch. Combat and combined tactical hovers now also surface each projected weapon's heat, damage, ammo consumed, and post-shot ammo remaining from `availableWeaponImpacts`, so aggregate volley impact is traceable to the contributing weapons. C3 range-benefit hovers now surface the projection's C3 spotter id, spotter range, and effective bracket instead of leaving the range improvement implicit in the modifier stack. Underwater/torpedo environment hovers now surface projection-provided per-weapon environment restriction reasons for non-torpedo underwater targets and torpedo water-line failures. Broader fixtures for special range modes and LOS/extreme range remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Indirect-fire eligibility                           | MegaMek `FireControl.java:2549-2553` rejects airborne shooters from LRM-style indirect fire before considering indirect-capable weapons or spotters. MegaMek `NarcHandler.java:244-290` attaches NARC/iNarc pods with the firing unit's team, `Entity.java:7303-7333` checks team-owned NARC and homing-iNarc beacons, `ComputeToHit.java:367-378` treats a friendly NARC/iNarc target as the indirect spotter before searching ordinary LOS spotters, and `ComputeToHit.java:418-462` derives indirect LOS from the elected spotter line. MegaMek `ComputeToHit.java:173-179`, `472-474`, and `1521-1534` identify semi-guided TAG shots, arc the indirect LOS, ignore terrain modifiers, and cancel the base indirect penalty when TAG is active. `Entity.java:9812-9817` defines the base `canSpot()` gate, while `Aero.java:2647-2657` and `LandAirMek.java:2136-2147` reject airborne aerospace spotters unless recon/imager equipment applies; `FireControl.java:2577-2612` consumes `spotter.canSpot()` when selecting a spot action. Missile handlers such as `MissileWeaponHandler.java:233-249` / `lrm/LRMHandler.java:235-250` consume friendly-team beacon checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `src/utils/gameplay/indirectFire.ts`, `src/utils/gameplay/combatProjection.toHit.ts`, `src/utils/gameplay/combatProjection.ts`, `src/engine/InteractiveSession.indirectFire.ts`, `src/engine/InteractiveSession.actions.ts`, `src/engine/GameEngine.phases.ts`           | Source-pinned in this slice. The shared indirect-fire helper now carries an attacker-airborne gate, so an airborne aerospace attacker with blocked direct LOS no longer gets a spotter-based indirect-fire highlight and the committed attack emits the same `NoLineOfSight` rejection. NARC/iNarc beacon overrides now take precedence over ordinary LOS spotters, have projection-to-commit agreement fixtures proving the map highlights no-spotter beacon indirect fire, suppress the attacker's blocked direct-LOS terrain modifiers, and commit with `IndirectFireNarcOverride` without `IndirectFireSpotterSelected`. Ordinary LOS spotter attacks now derive committed terrain modifiers from the elected spotter line instead of the blocked attacker line. Semi-guided TAG is now wired into the same projection/engine path: a TAG-designated target can permit no-spotter semi-guided indirect fire, cancels the indirect to-hit penalty, ignores the blocked attacker terrain line, and has a projection-to-commit agreement fixture. Airborne aerospace spotter eligibility is now represented by shared resolver flags and projection/commit agreement fixtures: airborne aero spotters are ignored unless recon/imager equipment is represented on the unit state. TAG spotter identity/event modeling, ECM-source fidelity for TAG, artillery-specific indirect-fire cases, and full equipment import for airborne aero spotter sensors still need broader fixtures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Prone to-hit modifiers                              | MegaMek `ComputeTargetToHitMods.java:115-128` and `ComputeToHit.java:1279-1290` apply target-prone -2 at distance <= 1 and +1 beyond that. `Compute.java:2248-2334` applies represented attacker-prone penalties, with +2 for the simple biped case.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `src/utils/gameplay/toHit/damageModifiers.ts`, `src/utils/gameplay/combatProjection.toHit.ts`, `src/utils/gameplay/gameSessionCore.ts`                                                                                                                                   | Source-pinned in this slice. The map projection and committed attack declaration now consume `IUnitGameState.prone` for attacker and target so to-hit badges/tooltips agree with engine attack events for represented prone modifiers. Complex MegaMek prone weapon restrictions are still out of scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Immobile target to-hit modifier                     | MegaMek `Compute.java:1272-1302` returns `target immobile` -4, while `ComputeTargetToHitMods.java:248-267` appends that modifier for normal weapon attacks. `Targetable.java:117-122` defines immobile units to include represented shutdown and crew-unconscious states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `src/utils/gameplay/toHit/damageModifiers.ts`, `src/utils/gameplay/combatImmobility.ts`, `src/utils/gameplay/combatProjection.toHit.ts`, `src/utils/gameplay/gameSessionCore.ts`                                                                                         | Source-pinned in this slice. The map projection and committed attack declaration now share a represented immobility helper for shutdown targets and unconscious pilots, so combat badges/tooltips agree with engine attack events. Damage/bracing immobility and special MegaMek exclusions remain out of scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Line of sight, terrain blockers, elevation blockers | MegaMek `LosEffects.java:797-799` / `:842-863` blocks when cumulative woods/smoke density exceeds 2, `:874-911` adds intervening woods/smoke to-hit modifiers, and `:1412-1433` treats smoke plus elevation-2 foliage as LOS-affecting; `:1423` explicitly notes smoke and woods stack for LOS. MegaMek `LosEffects.java:1322-1338` blocks intervening building/hill elevation only when it rises above the relevant unit/sight height under normal LOS, while `:1465-1483` leaves equal-height terrain to partial-cover handling instead of hard LOS rejection. MegaMek `LosEffects.java` does not consult wrecked entities as LOS blockers; `TWGameManager.java:22276-22291` represents optional battlefield wreckage as rough/ultra-rough terrain, and `Game.java:1121-1133` keeps wrecked entities as a separate wreck/salvage enumeration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/utils/gameplay/lineOfSight.ts`, `src/utils/overlays/losClassifier.ts`, `src/utils/gameplay/combatProjection.ts`, `src/engine/InteractiveSession.actions.ts`                                                                                                         | Partially source-pinned. This slice adds smoke to the shared LOS projection: light smoke contributes +1, level-2/heavy smoke contributes +2, and smoke stacks with woods for blocking once cumulative density exceeds 2, including when both effects occupy the same intervening hex. It also aligns normal-LOS building/hill thresholds so level-1 terrain equal to mech sight height stays visible while level-2 terrain blocks, and removes MekStation's synthetic destroyed-token LOS blocker so preview, commit validation, indirect-fire election, and map highlights stay clear through wreck markers unless terrain/elevation actually blocks. Map metadata/tooltips and committed attack declarations now agree for intervening smoke/woods stacks and equal-height/tall building-or-ridge cases. Combat and combined tactical hovers now surface the projection's exact LOS blocker hex, blocker kind, terrain/elevation metadata, and reason from `ICombatRangeHex.lineOfSightBlocker`. Water, TacOps diagram LOS, optional battlefield-wreck rough terrain conversion, and a broader elevation fixture matrix still need expansion.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Firing arcs                                         | MegaMek `FacingArc.java:48-53` and `ComputeArc.java:169-181`: front owns 60/300 degree boundaries, side arcs own 120/240 degree boundaries, rear is strict interior. MegaMek `IdealHex.java:63-73` + `Coords.java:439-480` define the center geometry used for angles. Tank chassis mounts route through `Tank.java:1057-1101`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `src/utils/gameplay/hexMath.ts`, `src/utils/gameplay/firingArcs.ts`, `src/utils/gameplay/vehicleFiringArc.ts`, `src/utils/overlays/arcClassifier.ts`                                                                                                                     | Partially source-pinned. This slice aligns axial hex angles to MegaMek center geometry, fixes front/side/rear boundary precedence for projection/attack validation/AI/UI overlays, and corrects represented vehicle chassis arc spans to front/rear 120 and side 60. Turret/special arcs still need broader fixtures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Movement reachability and MP costs                  | MegaMek movement path logic (`MovePath`, `MoveStep`, pathfinders) plus official terrain MP tables. Vehicle elevation gate source-pinned to `Mek.java:3416`, `Tank.java:1421`, and `VTOL.java:144`. Jump movement source-pinned to `ShortestPathFinder.java:172-174` / `:249-251` (facing and elevation MP ignored while jumping), `BoardEdgePathFinder.java:614-617` (upward jump rise capped by jump MP; downward jump unlimited), and `DestructionAwareDestinationPathfinder.java:243-250` (legal jump destinations fail when going up too high). Water movement source-pinned to `MoveStep.java:2755-2807` (depth-1 water +1 MP, deeper water +3 MP in the non-playtest rules branch, with hover/naval/hydrofoil/submarine/VTOL/WiGE exemptions), `MoveStep.java:651-685` / `:3236-3280` (ice-covered water suppresses water/run prohibitions for surface movement and the run-into-water legality check has a first-step exception), `MoveStep.java:3341-3359`, `Terrains.java:70-74` (road levels: normal/alley/dirt/gravel), `Hex.java:508-535` (dirt/gravel roads are not paved roads), `Entity.java:3564-3567`, `Tank.java:431-435`, `Mek.java:1333-1336`, `MoveStep.java:977-988`, and `MoveStep.java:1900-1909` (pavement/road bonus eligibility, dirt/gravel surface eligibility by motive mode, and +1 MP while the path remains only pavement/road), and `Tank.java:755` (pavement, bridges, and paved roads lift otherwise prohibited terrain restrictions for represented surface movement), `Mek.java:4182-4212`, `Tank.java:757-850`, and `Entity.java:2696-2706` (tracked/wheeled water prohibitions are skipped when the hex contains ice; naval/hydrofoil require non-ice water and enough bridge clearance from the water surface; submarine can still use water and uses the water floor for bridge clearance), `MoveStep.java:651-685` / `:2631-2632` / `:2764-2798` / `:3236-3280`, `Tank.java:744-813`, and `MiscType.java:9486-9557` (fully amphibious movement can run into water, limited/full amphibious movement pays the amphibious water surcharge, flotation hulls lift tracked/wheeled water prohibitions while the first-step rule controls run entry, and the imported chassis-mod equipment names are represented). | Movement projection and map overlay files under `src/utils/gameplay` and `src/components/gameplay/HexMapDisplay`                                                                                                                                                         | Partially source-pinned. This slice aligns tracked/wheeled/hover vehicle climbs to max +1, preserves mech-style walk/run +2 and VTOL/WiGE terrain/elevation bypasses, caps jump landing rise by effective jump MP while preserving terrain-ignored MP cost and unlimited downward landings, and aligns heat-reduced zero jump-MP hover explanations with committed movement invalid events. It also fixes water reachability so walking Mech-style movement can enter depth-1/deeper water with MegaMek depth-based MP costs, while tracked/wheeled and running water entry remain blocked/conservative after the first step. Ice-covered water now projects as surface ice for ground movement, blocks naval/hydrofoil as non-open water, allows submarine movement, and has preview/commit agreement coverage. Bridge-, pavement-, and represented paved-road-covered water now project as pavement crossings for represented ground/tracked movement through preview and commit validation; dirt/gravel road-covered water remains non-pavement and blocked/conservative for tracked/wheeled movement. Represented tracked/wheeled/hover road-bonus path-state now extends walk/run reachability by +1 MP only when every path step stays on qualifying pavement/road, with dirt/gravel motive eligibility matching MegaMek. Naval/hydrofoil/submarine bridge hexes now check represented bridge clearance against the water surface/floor. Amphibious/flotation equipment now flows from vehicle raw tags and chassis-mod equipment names into adapted unit movement capability so preview, commit validation, and reachable overlays agree on water entry, first-step run legality, non-first-step run blocking, and amphibious water MP. Full movement oracle coverage is still required, especially frogman/swim modes, optional infantry pavement-bonus rules, and remaining unit-height cases such as infantry mount height beyond explicit source fields and dynamic runtime conversion-state changes after import. |
| Unit immobility and movement                        | MegaMek `Entity.java:1902-1911` excludes shut down and inactive-crew units from active phase participation, while `Entity.java:2002-2025` defines immobile units as shut down or crew-unconscious and unable to move actively. `Entity.java:10246-10253` gates charge/DFA-style movement actions on `!isImmobile()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `src/utils/gameplay/unitImmobility.ts`, `src/utils/gameplay/movement/reachable.ts`, `src/utils/gameplay/movement/commitValidation.ts`, `src/components/gameplay/HexMapDisplay/HexCell.invalidBadges.tsx`                                                                 | Source-pinned in this slice. Shutdown and unconscious-pilot units now project blocked movement with an explicit `UnitImmobile` reason, commit validation rejects before emitting movement/lock events, and the map shows a non-color blocked badge/reason. Damage/stuck/permanent immobilization remain out of scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Movement heat generation                            | MegaMek `Entity.java:3366`, `Entity.java:3419`, and `Entity.java:3532` default walk/run/jump heat to 0. MegaMek `Engine.java:681-720` and `Mek.java:984-1037` / `Mek.java:1281-1301` apply Mek engine heat: normal walk +1, run +2, jump max(3, moved MP), with special engine/jump variants outside this slice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `src/utils/gameplay/movement/modifiers.ts`, `src/utils/gameplay/movement/reachable.ts`, `src/utils/gameplay/movement/validation.ts`, `src/simulation/ai/MoveAI.ts`                                                                                                       | Source-pinned in this slice. Default/Mek-style movement keeps existing walk/run/jump heat, while represented vehicle motive modes now project and commit 0 movement heat so map previews, movement events, and AI move candidates no longer overheat vehicles for moving. Special engines and coolant damage remain out of scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Elevation and terrain labels                        | Official terrain/elevation semantics plus MegaMek terrain encoding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `src/components/gameplay/HexMapDisplay/HexCell.labels.tsx`, `src/components/gameplay/HexMapDisplay.stories.tsx`, `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.terrainLabels.test.tsx`                                                                  | Partially verified. This slice makes the visible terrain/elevation badges self-describing with label/data metadata and adds a full represented-terrain vocabulary fixture across top-down and isometric modes. Terrain badges now cover clear, pavement, road, woods, rough, rubble, water, sand, mud, snow, ice, swamp, building, bridge, fire, and smoke. Storybook's all-terrain scene now uses deterministic non-colliding coordinates plus mixed elevations, and browser verification saved `validation-output/2026-05-22-hexmap-terrain-labels-storybook.png`. Movement/elevation rule effects still depend on the movement/LOS fixture matrix above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Isometric stacked hexes and rotation                | UI presentation concern, but must consume the same source-pinned terrain/elevation projection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `src/components/gameplay/HexMapDisplay/HexMapDisplay.isometric.ts`, `src/components/gameplay/HexMapDisplay/projection.ts`, `src/components/gameplay/HexMapDisplay/HexCell.isometricStack.tsx`, `src/pages/e2e/tactical-map.tsx`, `e2e/tactical-map-visual-smoke.spec.ts` | Partially verified. Helper and component tests cover rotatable 2.5D scene depth ordering, stacked elevation layers, unchanged axial click targets, selected/target/occluded unit visibility boosts, camera-dependent removal of occlusion highlights, and rotation handoff where the active occluder highlight/hover moves to a different tall elevation after the camera turns. This slice adds a rendered scene-order test proving camera rotation updates actual DOM depth order, and a Storybook browser smoke proves isometric terrain/elevation labels plus elevation stacks render as nonblank pixels. The tactical-map browser harness now renders top-down terrain/elevation, movement, combat, and isometric occluder context in one real SVG surface; Playwright verifies top-down badge metadata, switches to isometric, confirms stack/occluder/visibility/rotation/depth metadata, and checks nonblank top-down/isometric pixels. Broader browser coverage for full battlefield rotation/occlusion interactions remains.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

2026-05-25 C3 browser pin: the tactical-map harness now has a represented C3
master/slave network where the attacker sees the target at medium range but a
network spotter sees the same target at short range. The shared projection,
browser metadata, accessible context, and committed `AttackDeclared` event all
agree on the C3-improved short bracket, spotter id, spotter range, to-hit
number, and zero-value C3 equipment modifier.

2026-05-25 indirect-fire browser pin: the tactical-map harness now has a
represented LRM target whose direct attacker LOS is blocked by cumulative woods
while a friendly spotter has clean LOS. The shared projection, browser metadata,
indirect-fire badge, accessible context, and committed indirect-fire events all
agree that the target remains attackable through LOS-spotter indirect fire with
basis `los`, spotter id, +1 indirect penalty, and matching to-hit metadata.

2026-05-25 spotter-gunnery browser pin: the same LOS-spotter harness now also
represents a poor-gunnery spotter. The shared projection, browser metadata,
indirect-fire badge, accessible context, and committed
`IndirectFireSpotterSelected` event all agree that the spotter's gunnery 6 adds
+1 to the net indirect-fire penalty, raising the represented indirect modifier
to +2 with matching to-hit metadata.

2026-05-25 Forward Observer browser pin: the same indirect-fire harness now
also represents a walked friendly spotter with the `forward_observer` SPA. The
shared projection, browser metadata, indirect-fire badge, accessible context,
and committed Forward Observer event all agree on the +1 net indirect penalty,
the Forward Observer flag, and the single cancelled spotter-walk penalty point.

2026-05-25 NARC beacon browser pin: the tactical-map harness now also represents
a LOS-blocked LRM target carrying a player-team NARC beacon and no friendly
spotter token. The shared projection, browser metadata, indirect-fire badge,
accessible context, and committed `IndirectFireNarcOverride` event all agree
that the target remains attackable through beacon indirect fire with basis
`narc`, no spotter id, +1 indirect penalty, and matching to-hit metadata.

2026-05-25 isometric scene hex projection pin: isometric scene hex wrappers now
carry the same shared projection summary as the nested rendered hex: map
coordinate, terrain elevation, primary terrain type, projection intent/status,
movement status, combat status, blocked reasons, and source references. This
keeps the depth-sorted 2.5D layer inspectable without adding a separate
isometric-only movement/combat calculation path.

2026-05-25 iNarc beacon browser pin: the tactical-map harness now also
represents the same no-spotter blocked LRM target carrying a player-team iNarc
beacon. The shared projection, browser metadata, indirect-fire badge,
accessible context, and committed `IndirectFireNarcOverride` event all agree on
basis `inarc`, no spotter id, +1 indirect penalty, and matching to-hit
metadata.

2026-05-25 semi-guided TAG browser pin: the tactical-map harness now represents
a LOS-blocked TAG-designated target attacked by semi-guided LRM fire with no
friendly spotter token. The shared projection, browser metadata, indirect-fire
badge, accessible context, and committed attack all agree on basis
`semi-guided-tag`, no spotter id, zero indirect penalty, no NARC override event,
and matching to-hit metadata.

2026-05-25 ECM-nullified TAG browser pin: the tactical-map harness now also
represents the same no-spotter semi-guided LRM shot when ECM protection
nullifies the target's TAG designation. The shared projection, browser
metadata, invalid combat badge, and committed `AttackInvalid` event all agree
that the shot stays blocked by LOS with no indirect-fire basis, no indirect
badge, no spotter event, and no NARC override event.

2026-05-24 isometric browser update: the tactical-map browser harness now places
opposing tall elevation stacks around an active target and verifies that camera
rotation moves the active occluder metadata and highlight to the stack that is
actually in front for that view. Remaining isometric browser gaps are broader
interaction sweeps beyond the smoke harness, such as repeated rotation cycles
and mobile/pointer gesture coverage.

2026-05-25 isometric rotation-cycle pin: helper, component, and browser coverage
now verify that six discrete camera rotations return the projection layer,
scene depth metadata, and active occluder highlight back to the original
heading. This closes the repeated-rotation smoke gap for deterministic
click-button rotation; broader pointer/gesture coverage remains outside the
current browser harness.

2026-05-25 isometric reset-heading pin: the reset-view control now restores
pan, zoom, and the isometric camera heading together, and focused component
coverage asserts projection-layer rotation metadata, visible heading metadata,
the canonical transform, and unchanged axial clicks after reset.

2026-05-24 top-down movement browser update: the tactical-map browser harness
now renders a single highlighted destination with walk, run, and jump options
and verifies the combined badge metadata for option costs, terrain costs,
elevation costs, and heat. Remaining browser movement gaps are broad path-shape
and invalid-destination sweeps beyond the smoke harness.

2026-05-25 movement path-shape browser pin: the tactical-map browser harness
now verifies the rendered projection path sequence itself, not just destination
costs. The top-down map exposes start/step metadata and visible `S`, `#1`,
and `#2` badges for the shared movement path, and the same path metadata
survives after switching to isometric mode.

2026-05-24 blocked movement browser update: the tactical-map browser harness now
also renders an unreachable jump destination with an engine-style
`TerrainBlocked` reason and verifies the top-down invalid badge plus rejection
detail metadata. Remaining browser movement gaps are broader blocked-reason
families and complete path-shape sweeps beyond the smoke harness.

2026-05-24 mixed movement-options browser update: the tactical-map browser
harness now also renders a reachable destination with walk/run legal options and
a blocked jump option, then verifies the top-down option states, blocked jump
reason metadata, and separate non-color blocked-options badge. Remaining browser
movement gaps are broader blocked-reason families and complete path-shape sweeps
beyond the smoke harness.

2026-05-24 blocked combat browser update: the tactical-map browser harness now
also renders an enemy behind the tall elevation/building blocker and verifies
the top-down combat target id, `NoLineOfSight` rejection, blocker hex metadata,
and invalid combat badge in the same real SVG surface. Remaining browser combat
gaps are broader LOS terrain families and special range-mode sweeps beyond the
smoke harness.

2026-05-25 LOS blocker parity update: the same browser harness now verifies the
player-facing blocker reason, blocker kind, building terrain metadata, combat
invalid badge label, and intervening blocker-hex badge for the blocked target.
A fixture-level Jest parity test feeds that projection into
`applyInteractiveSessionAttack` and proves the commit path rejects the attack
with the same `NoLineOfSight` reason and `Blocked by building at (1, 0)`
details before declaration or attack locking.

2026-05-25 elevation LOS browser pin: the tactical-map browser harness now also
uses a clear level-2 elevation blocker between attacker and target, proving the
rendered target exposes `NoLineOfSight`, `Blocked by elevation +2 at (1, 0)`,
the blocker hex, the blocker kind `elevation`, the top-down +2 elevation label,
an `ELEV` combat invalid badge, and a `LOS ELEV` blocker badge. A fixture-level
Jest parity test feeds the same projection into `applyInteractiveSessionAttack`
and proves the commit path rejects the attack with the same reason and details.

2026-05-25 swim movement browser pin: the tactical-map browser harness now also
uses represented biped swim movement through deep water into a higher elevation
water hex, proving the rendered destination exposes `biped_swim`, 1 MP, zero
water/elevation surcharge, +3 elevation delta, swim heat +1, water level 2
terrain metadata, and the top-down +3 elevation label. A fixture-level Jest
parity test feeds the same movement projection into `validateCommittedMovement`
and proves the commit gate accepts it with matching MP, heat, and path.

2026-05-25 Frogman movement browser pin: the tactical-map browser harness now
also uses represented Frogman water capability entering depth-2 water, proving
the rendered destination exposes the reduced +2 deep-water terrain surcharge
instead of the ordinary +3, 3 MP total, heat +1, water level 2 terrain
metadata, and a non-color cost badge. A fixture-level Jest parity test feeds
the same movement projection into `validateCommittedMovement` and proves the
commit gate accepts it with matching MP, heat, and path.

2026-05-25 prone combat browser pin: the tactical-map browser harness now also
uses a prone attacker firing at a prone target at range 2, proving the rendered
target exposes TN7, `Attacker Prone +2`, `Target Prone +1`, the available
medium laser, and tooltip rows for both modifiers. A fixture-level Jest parity
test feeds the same projection into `applyInteractiveSessionAttack` and proves
the committed attack declaration carries the matching target number and
modifiers.

2026-05-25 immobile target browser pin: the tactical-map browser harness now
also uses a represented shutdown target at range 2, proving the rendered target
exposes TN0, `Target Immobile -4`, the available medium laser, and tooltip rows
for the modifier. A fixture-level Jest parity test feeds the same projection
into `applyInteractiveSessionAttack` and proves the committed attack
declaration carries the matching target number and modifier.

2026-05-25 hot-attacker browser pin: MegaMek
`ComputeAttackerToHitMods.java:192-193` adds the attacker heat firing modifier,
and `Entity.java:4188-4217` source-pins the base thresholds at heat 8/13/17/24.
The tactical-map browser harness now uses a represented attacker at heat 13,
proving the rendered target exposes TN6, `Heat +2`, the available medium laser,
and tooltip rows with `Heat 13: +2`. A fixture-level Jest parity test feeds the
same projection into `applyInteractiveSessionAttack` and proves the committed
attack declaration carries the matching target number and modifier.

2026-05-24 medium-range combat browser update: the tactical-map browser harness
now also renders a target at four hexes and verifies that the top-down hex and
combat badge expose the medium range band, distance, available weapon id, and
per-weapon range option metadata. Remaining browser combat gaps are special
range-mode sweeps beyond the smoke harness.

2026-05-24 mixed selected-weapon range browser update: the tactical-map browser
harness now selects a medium laser plus a shorter-ranged small laser against
the four-hex target and verifies that the target remains legal through the
available medium laser while the small laser exposes `out_of_range`,
`blocked`, and `out of range` per-weapon metadata plus a non-color weapon count
badge. A fixture-level Jest parity test now proves the same browser projection
is accepted by `applyInteractiveSessionAttack` with the projected usable
weapons, range bracket, and to-hit number. Remaining browser range gaps are
minimum/extreme range and all-weapons out-of-range sweeps beyond the smoke
harness.

2026-05-24 minimum-range browser update: the tactical-map browser harness now
also selects a represented minimum-range weapon and verifies that a one-hex
target exposes the minimum-range penalty, affected weapon id, reason, to-hit
modifier metadata, and a non-color `MIN+` badge. A fixture-level Jest parity
test now proves the same browser projection reaches `applyInteractiveSessionAttack`
with a matching committed minimum-range to-hit modifier. Remaining browser
range gaps are extreme range and all-selected-weapons-out-of-range sweeps
beyond the smoke harness.

2026-05-24 ground-to-air minimum-range browser update: the tactical-map browser
harness now adds an airborne aerospace target at nominal minimum range and
verifies that the same represented minimum-range weapon stays attackable without
a `Minimum Range` to-hit modifier, minimum-range hex metadata, or `MIN+` badge.
The shared fixture also proves `applyInteractiveSessionAttack` commits the
attack without a minimum-range modifier, matching the MegaMek-sourced
ground-to-ground-only rule captured in `src/utils/gameplay/groundToGround.ts`.
The browser proof keeps the target's state-derived altitude and velocity
metadata visible in both top-down and isometric projections.

2026-05-25 ground-to-air altitude modifier pin: MegaMek
`ComputeTargetToHitMods.java:233-250` applies NOE and optional StratOps
velocity anti-air modifiers for ground-to-air targets. MekStation's active
`add-aerospace-deployment` design intentionally simplifies that surface to
altitude tiers (`1-3=low +1`, `4-6=medium +2`, `7-10=high +3`) until full
`aerospaceCombat.ts` dispatch lands. The tactical-map projection and committed
`AttackDeclared` path now share one helper for that OpenSpec rule, and the
browser/fixture tests prove the visible TN and committed TN both include the
same `Ground-to-air altitude` modifier.

2026-05-24 extreme-range browser update: the tactical-map browser harness now
also selects a represented extreme-range weapon with long range 3 and extreme
range 4 against the four-hex target, verifying that the weapon stays available
with `extreme` per-weapon range metadata instead of being marked out of range.
At that point, the remaining browser range gap was
all-selected-weapons-out-of-range sweeps beyond the smoke harness.

2026-05-24 all-out-of-range browser update: the tactical-map browser harness
now includes an alternate browser scenario that selects only the represented
short-range weapons against the four-hex target, verifying that the target is
non-attackable with `OutOfRange`, empty available-weapon metadata, per-weapon
`out_of_range` options, and a non-color `0/2 WPN` badge. A fixture-level Jest
parity test now feeds that same projection into `applyInteractiveSessionAttack`
and proves the commit path rejects it with the same `OutOfRange` reason and
details before declaring or locking an attack.

2026-05-24 partial-cover browser update: the tactical-map browser harness now
also renders a Mech-style target in depth-1 water and verifies that the top-down
hex and cover badge expose partial cover, cover modifier, cover reason, and the
to-hit partial-cover modifier from the shared combat projection. Remaining
browser combat gaps are broader cover/elevation families and special range-mode
sweeps beyond the smoke harness.

2026-05-25 elevation partial-cover browser pin: the elevation LOS browser
scenario now renders a hard-blocked target behind elevation +2 and a separate
attackable target partially covered by adjacent elevation +1. The browser
verifies `NoLineOfSight` only on the blocked target, while the covered target
stays legal with partial-cover level, +1 modifier, projected reason, and
to-hit modifier metadata. A fixture-level Jest parity test feeds the same
projection into `applyInteractiveSessionAttack` and proves the committed attack
declares the matching partial-cover modifier.

2026-05-24 target-terrain browser update: the tactical-map browser harness now
also renders a target standing in light woods and verifies that the top-down hex
and combat tooltip expose `Target Terrain +1` plus the `Target in light woods:
+1` modifier description, and that the committed `AttackDeclared` modifier
preserves the same description from the shared projection. The same browser
proof verifies that target-hex woods do not render the partial-cover badge,
matching the MegaMek distinction between target terrain modifiers and true
partial cover.

2026-05-24 fog-contact browser update: the tactical-map browser harness now
also renders hidden-only and last-known opponent contacts and verifies that the
top-down combat projection marks them non-attackable with obscured target ids,
`TargetNotVisible` rejection metadata, visibility-blocked reasons, and non-color
invalid/visibility badges. The same browser smoke switches to isometric mode and
verifies the fog-rule markers for hidden and last-known contacts, separating fog
visibility limits from terrain occlusion aids. Remaining browser fog gaps are
mixed visible/obscured same-hex contacts and broader dynamic visibility
recalculation sweeps beyond the smoke harness.

2026-05-25 last-known isometric projection pin: helper coverage now proves
that last-known fog contacts use the displayed stale hex, not the hidden current
position, for isometric depth sorting and terrain/elevation occlusion checks.
The browser smoke also verifies the tactical-map scene depth for the rendered
last-known marker in isometric mode, including its existing foreground display
boost, keeping ghost visibility aligned with the map surface the player can
actually inspect.

2026-05-24 mixed-visibility browser update: the tactical-map browser harness
now stacks a visible target, hidden contact, and last-known contact on the same
displayed hex and verifies that the visible target remains attackable while the
hidden/last-known contacts stay listed as obscured information. The rendered hex
now exposes `data-combat-valid-target-ids` alongside visible and obscured target
ids, so a mixed-visibility hex identifies the actual attackable commit target
without relying only on color or aggregate `mixed` status. Remaining fog gaps
are broader dynamic visibility recalculation sweeps beyond the smoke harness.

2026-05-25 dynamic fog visibility browser pin: the tactical-map browser harness
now builds tokens through `buildGameplayTokens` using the same combat state with
two grids: a clear grid that leaves the target visible/targetable and a
heavy-woods plus light-woods grid that recalculates the target as last-known.
The rendered map exposes the LOS-blocking terrain layers, `lastKnown`
visibility, empty visible/valid target ids, obscured target id metadata, and
`TargetNotVisible` invalid state before commit. A fixture-level Jest parity
test feeds the same fog-on grid into `applyInteractiveSessionAttack`, proving
the engine rejects the attack as not currently visible. Remaining fog gaps are
now broader multiplayer visibility-history/replay sweeps beyond the tactical
map smoke harness.

2026-05-24 movement gap update: the movement row's older frogman/swim and
TacOps infantry pavement-bonus gaps are closed by the current
`tactical-map-interface` spec and fixtures. Remaining movement oracle gaps were
then narrower: dynamic runtime conversion-state changes after import, infantry
mount/dismount updates after import, and a broader external oracle differential
fixture matrix across movement profiles. Later QuadVee and LAM AirMek pins
close the shared runtime projection/commit side of conversion-state updates;
full gameplay events/UI that mutate conversion or mount state, LAM fighter
mode, AirMek ground-clearance submodes, and broader external oracle sweeps
remain.

2026-05-25 runtime movement UI parity pin: the gameplay movement hook and
command-capability surface now resolve the same runtime movement capability used
by movement projection and commit validation before building legend MP, motive,
jump availability, planning-panel heat profile, and command context. Focused
coverage pins grounded LAM Fighter conversion so the real gameplay UI exposes
wheeled cruise/flank MP, disables jump selection, and keeps command surfaces on
the same resolved state.

2026-05-24 jump browser parity update: the jump elevation browser scenario now
uses `deriveMovementRangeHexForDestination` instead of a hand-authored movement
row, so the rendered top-down jump badge exposes the same MP cost, heat, path,
and origin-to-destination elevation delta that `validateCommittedMovement`
accepts. This corrected the browser fixture from a static `3 MP / +1 elevation`
row to the engine-backed `2 MP / -4 elevation` descent produced by the
represented terrain on the test map.

2026-05-24 biped movement browser parity update: a separate browser scenario
now places the selected biped unit on flat ground and derives same-hex walk,
run, and jump options from `deriveMovementRangeHexForDestination`. The focused
Jest parity test feeds all three projected options into
`validateCommittedMovement`, and the Playwright smoke verifies the real
top-down map exposes matching MP, terrain cost, elevation cost/delta, heat, and
reachable option metadata without relying on the older synthetic default
movement row.

Additional isometric building-height pin: `lineOfSight.ts` already treats
represented building feature levels as vertical LOS height. The isometric
readability projection now mirrors that vertical fact for presentation-only
occluder detection, scene depth ordering, and visible isometric stack layers,
so a level-3 building on flat ground can highlight/foreground a unit hidden
behind it and render as a three-layer 2.5D stack instead of acting like flat
elevation-0 terrain.

Additional terrain feature-level pin: top-down and isometric hex reference
labels now preserve represented terrain feature levels/depths/intensities in
the same ordered terrain surface as terrain type. Layered terrain such as
depth-2 water, level-2 smoke, and level-3 buildings exposes stable
`data-terrain-feature-levels` metadata on the hex and terrain badge, and
compact terrain badges show level suffixes for represented feature levels above
level 1. The shared projection source metadata now preserves the same
represented levels, water depths, and smoke/fire intensities so hover/source
summaries do not collapse layered terrain back to type-only labels.

Additional extreme-range pin: MegaMek `RangeType.java:80-84` classifies
distances through `r_extreme`, `RangeType.java:143-148` gates extreme by the
extreme-range option, and `Compute.java:1652` applies the extreme-range
modifier. MekStation already allowed committed attacks to use
`IWeapon.extremeRange`; this slice carries `extremeRange` through
`IWeaponStatus.ranges.extreme` so map projection, combat badges, and committed
`AttackDeclared.range`/to-hit agree for represented extreme-capable weapons.
Coverage: `InteractiveSession.queries.ts`, `weaponAttackBuilder.ts`,
`combatProjection.targeting.ts`, `HexMapDisplay.combatProjection.test.tsx`,
`weaponAttackBuilder.test.ts`, and
`InteractiveSession.attackProjectionAgreement.scenario.test.ts`.

Additional selected-weapon projection pin: selected weapon IDs are a
MekStation attack-plan constraint layered on top of MegaMek-style per-weapon
range and arc legality. The map now passes the active selected weapon IDs into
combat range, firing-arc, valid-target, and command-preview projection instead
of projecting from every configured weapon after the player narrows the attack
plan. Empty selected-weapon lists retain the broad all-weapons preview. A
preview/commit agreement fixture now verifies that selecting only an out-of-arc
weapon produces the same invalid reason in map projection and committed attack
resolution. Coverage:
`src/utils/gameplay/combatProjection.weaponSelection.ts`,
`src/components/gameplay/HexMapDisplay/HexMapDisplay.state.tsx`,
`src/components/gameplay/GameplayLayout.commandPreview.ts`,
`src/utils/gameplay/combatTargetIds.ts`,
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.combatProjection.test.tsx`,
`src/components/gameplay/__tests__/GameplayLayout.commandPreview.test.ts`,
`src/utils/gameplay/__tests__/combatProjection.test.ts`, and
`src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts`.

2026-05-25 selected-weapon arc browser update: the tactical-map browser harness
now has a dedicated selected-front-weapon vs rear-arc target scenario. The
rendered target exposes `OutOfArc`, `No selected weapons can fire into the rear
arc`, per-weapon `front-arc-laser:out of rear arc` metadata, an `ARC` combat
invalid badge, and a rear-arc badge marked not covered. The companion fixture
feeds the same projection into `applyInteractiveSessionAttack` and proves the
commit path rejects the attack with matching reason/details before declaration
or attack locking.

2026-05-25 same-hex combat browser update: the tactical-map browser harness now
has a dedicated normal-weapon same-hex target scenario. The rendered target
exposes distance 0, `SameHex`, `Attacker and target occupy the same hex`, an
otherwise in-range selected weapon, and a `SAME` combat invalid badge. The
companion fixture feeds the same projection into `applyInteractiveSessionAttack`
and proves the commit path rejects the attack with matching reason/details
before declaration or attack locking.

Additional battlefield-wreck terrain pin: MegaMek
`OptionsConstants.java:364` defines `tacops_battle_wreck`, `GameOptions.java:140`
defaults it off, and `TWGameManager.java:22276-22291` converts qualifying
destroyed ground units to rough terrain instead of treating wreck entities as
LOS blockers. MekStation now keeps wreck markers non-blocking while the
represented optional rule mutates the live interactive tactical grid: destroyed
non-infantry/non-battle-armor/non-protomek units at 40+ tons add level-1 rough,
and represented large support tank profiles can upgrade rough to level 2 while
preserving stacked terrain. Coverage lives in
`src/utils/gameplay/battlefieldWreckTerrain.ts`,
`src/engine/InteractiveSession.ts`,
`src/engine/GameEngine.ts`, and
`src/utils/gameplay/__tests__/battlefieldWreckTerrain.test.ts`. The
conversion is now event-sourced through `TerrainChanged`, so recovered
interactive sessions hydrate the rough terrain from derived terrain state and
the replay projection exposes the mutation through `hexTerrain` at the correct
timeline cursor.

2026-05-25 browser pin: the tactical-map harness now consumes a TacOps
battlefield-wreck converted grid, renders the resulting level-1 rough terrain
on the destination hex, and exposes the shared Walk projection's terrain
surcharge, heat, and cost-badge metadata. The companion fixture feeds the same
converted grid into movement commit validation so map preview and commit
acceptance stay aligned without treating the destroyed unit marker as a LOS or
occupancy blocker.

Additional physical-attack target-range pin: MegaMek
`PhysicalAttackAction.java:97-100` rejects physical attacks when effective
distance is greater than 1; `PunchAttackAction.java:196-199` and
`KickAttackAction.java:238-246` add attack-specific elevation gates.
MekStation now rejects direct physical declarations beyond adjacent unit range
with a typed impossible resolution and keeps the map from highlighting those
targets. This slice also adds a shared physical elevation context: punch
legality compares the target base/top span to the attacker's arm level, kick
legality compares the attacker's base level to the target base/top span, and
both command preview rows and direct declarations use the same
`TargetElevationNotInRange` reason. Coverage:
`src/utils/gameplay/physicalAttacks/elevation.ts`,
`src/utils/gameplay/physicalAttacks/restrictions.ts`,
`src/utils/gameplay/gameSessionPhysical.ts`,
`src/components/gameplay/GameplayLayout.commandPreview.ts`,
`src/components/gameplay/PhysicalAttackPanel.tsx`,
`src/utils/gameplay/__tests__/physicalAttacks.test.ts`,
`src/utils/gameplay/__tests__/gameSessionPhysicalRange.test.ts`,
`src/components/gameplay/__tests__/GameplayLayout.commandPreview.test.ts`, and
`src/components/gameplay/__tests__/addInteractiveCombatCoreUI.smoke.test.tsx`.

Additional push target-legality pin: MegaMek
`PushAttackAction.java:158-180` restricts push to Mek attackers and Mek
targets, blocks airborne attackers, flipped arms, missing arms, and arm weapon
fire; `PushAttackAction.java:212-260` also requires same base elevation,
front-hex facing, non-airborne targets, and neither unit prone. MekStation now
models the represented subset: non-Mek attackers/targets, airborne attacker,
prone attacker/target, airborne target, not-directly-ahead target, arm weapon
fire, and same-base elevation all produce typed push restrictions. MegaMek
`PushAttackAction.java:184-186` also requires both arms to be present, so
MekStation now treats represented `left_arm` / `right_arm` destroyed locations
as a `LimbMissing` push restriction in the same projection/commit path. The
same restriction path feeds
physical option rows, command preview, and `declarePhysicalAttack`, so push is
not shown as commit-ready when the engine would reject it. Coverage:
`src/utils/gameplay/physicalAttacks/restrictions.ts`,
`src/utils/gameplay/physicalAttacks/toHit.ts`,
`src/utils/gameplay/physicalAttacks/eligibility.ts`,
`src/utils/gameplay/gameSessionPhysical.ts`,
`src/components/gameplay/GameplayLayout.commandPreview.ts`,
`src/utils/gameplay/__tests__/physicalAttacks.test.ts`,
`src/utils/gameplay/__tests__/gameSessionPhysicalRange.test.ts`, and
`src/components/gameplay/__tests__/GameplayLayout.commandPreview.test.ts`.
Additional represented building-target pin: MegaMek
`PushAttackAction.java:260-265` rejects pushes against targets inside buildings
from attackers outside that building. Encoded terrain can now carry stable
`buildingId` metadata so same-building and different-building push checks are
represented when ids exist, and procedural generated building components now
receive deterministic ids after road carving. The shared terrain context feeds
physical option rows, command preview, player commit, bot/auto physical
declarations, and tactical map terrain/elevation source metadata. Simple
legacy building terrain still falls back to the coarse
outside-attacker/target-in-building gate instead of guessing identity.

Additional LOS/cover pin for this slice: MegaMek `LosEffects.java:1461-1483`
assigns horizontal target cover only for Mek-style targets when the hex
adjacent to the target reaches the target's total height and the attacker is
not higher; `LosEffects.java:915-928` applies the default +1 partial-cover
to-hit modifier. MekStation now consumes that rule in
`src/utils/gameplay/terrainCover.ts`,
`src/utils/gameplay/combatProjection.ts`,
`src/engine/InteractiveSession.actions.ts`, `src/engine/GameEngine.phases.ts`,
and `src/engine/InteractiveSession.ai.ts`, with fixtures in
`src/utils/gameplay/__tests__/terrainCover.test.ts`,
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.combatProjection.test.tsx`,
and `src/engine/__tests__/InteractiveSession.attackProjectionAgreement.scenario.test.ts`.

Additional target-terrain pin: MegaMek `Compute.java:2938-3056` applies
target-hex woods and smoke as target terrain to-hit modifiers, while
`LosEffects.targetCover` / `ComputeTerrainMods.java:168-193` reserve true
partial-cover hit-table behavior for horizontal/elevation cover and partial
water. MekStation now keeps target-hex woods/smoke out of
`targetPartialCover`, adds a separate `Target Terrain` modifier in preview,
interactive attack declaration, AI declaration, and quick-sim attack
resolution, and covers this with terrain-cover, to-hit, UI projection, and
preview/commit agreement fixtures.

Additional partial-water pin: MegaMek `ComputeTerrainMods.java:168-193` grants
partial-water cover only when the represented target is in the matching partial
water depth and has positive unit height, and `WeaponHandler.java:1524-1536` /
`:1644-1649` use the same shallow-water predicate for partial-cover hit
handling. MekStation now treats depth-1 water as true partial cover only for
Mek-style targets in the interactive map and committed attack paths; known
vehicle and battle-armor targets no longer receive a `Partial Cover` modifier
or cover badge simply because their target hex contains water. The combat
projection, command preview, and map overlay now also accept the active target
id so a vehicle selected in a stacked water hex does not inherit Mek-style
partial-water eligibility from a different visible target sharing that hex.

Additional run/walk fallback pin: MegaMek `MoveStep.java:3236-3279` rejects
running into water after the first step unless a represented exemption such as
hover, naval, VTOL, WiGE, pavement/bridge, or fully amphibious movement applies.
MekStation's run overlay can still show a walk-legal destination in green when
the run path is blocked by that rule; the movement plan now commits that
projection as `Walk`, so preview MP/heat/path data and committed engine
resolution agree instead of turning a walk-only green hex into a rejected run.
The tactical-map browser harness now proves that same Run-selected water case:
the deep-water destination renders as primary Walk with MP/terrain/heat
metadata, preserves `run:TerrainBlocked` / `Water blocks ground movement` in
the movement option attributes, shows a non-color `R BLK` badge, and feeds the
same projected path into committed movement validation as `Walk`.

Hover water browser pin: the tactical-map browser harness now includes a hover
vehicle crossing a deep-water hex with smoke layered above it. The map renders
the destination as legal `walk` via `hover`, exposes `mpCost: 1`,
`terrainCost: 0`, `elevationCost: 0`, `heatGenerated: 0`, and preserves
`water:2` plus `smoke:1` terrain metadata. A fixture-level Jest parity test
sends that same one-step path through `validateCommittedMovement`, proving the
browser-visible hover exemption is accepted by the commit gate with matching MP,
heat, and path.

Naval landfall browser pin: the tactical-map browser harness now also includes
a naval vehicle starting on water and attempting to move onto a clear land hex.
The map renders the destination as blocked `walk` via `naval`, exposes
`TerrainBlocked`, `Naval movement requires water terrain`, zero heat, water
origin metadata, clear destination metadata, and a non-color `WTR` invalid
badge. A fixture-level Jest parity test sends the same path through
`validateCommittedMovement`, proving the browser-visible blocked reason matches
the commit gate for naval water-only movement.

Additional UMU/swim water-movement pin: MegaMek
`EntityMovementMode.java:47-67` defines `BIPED_SWIM`, `QUAD_SWIM`, and
`INF_UMU`, with helper predicates at `EntityMovementMode.java:140-154`.
MegaMek `MoveStep.java:2758-2761` skips normal destination terrain cost for
swim movement, and `MoveStep.java:2781-2804` excludes hover, naval, hydrofoil,
submarine, `INF_UMU`, VTOL, `BIPED_SWIM`, `QUAD_SWIM`, and WiGE from extra
water-depth MP costs. `MoveStep.java:3236-3279` also excludes `INF_UMU` from
the run-into-water prohibition. MekStation now maps UMU/biped-swim/quad-swim
motive strings into tactical movement modes, displays UMU badges/readable
labels on the map, removes represented water-depth surcharges for those modes,
and keeps UMU preview/commit behavior aligned for deep-water movement. Frogman
Mek/ProtoMek modifiers and full underwater elevation envelopes remain outside
this slice.

Additional Playtest2 water-movement pin: MegaMek `MoveStep.java:2792-2798`
switches depth-2+ water from the standard +3 MP surcharge to +2 MP when
`OptionsConstants.PLAYTEST_2` is enabled, and `MoveStep.java:3236-3279`
exempts biped/quad/tripod-style movement from the post-first-step run-water
prohibition under the same option. MekStation now applies the represented
`playtest_2` optional rule to non-exempt deep-water movement costs and
Mek-style run-water legality in projection and commit validation while
preserving depth-1, infantry-profile, vehicle, amphibious, frogman, hover,
VTOL, WiGE, naval, swim, and UMU behavior. Coverage lives in
`src/utils/gameplay/movement/terrainRules.ts`,
`src/utils/gameplay/movement/__tests__/reachable.test.ts`, and
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`.

Additional jump-clearance pin: MegaMek `MoveStep.java:523-590` derives jump
elevation from available Jump MP plus the origin level, and
`MoveStep.java:3331-3340` rejects jump movement when a destination step's
effective altitude is above that jump clearance. MekStation now mirrors the
represented subset by checking the straight jump path against base elevation
plus encoded building levels, while keeping ordinary jump terrain MP at 0.
Movement projection and committed movement validation both return the same
typed terrain-blocked reason when a landing is within hex distance but hidden
behind too-tall represented terrain.

Additional unit-height movement pin: MegaMek `Entity.java:2701-2704` defaults
`height()` to 0, `Mek.java:1364-1366` returns 1 for standing Meks and 2 for
standing super-heavy Meks, and `Entity.java:2606-2612` / `:2663-2670` apply
`height() + 1` when checking bridge clearance. MegaMek `Tank.java:804-813`
uses the represented entity height for naval/hydrofoil/submarine bridge
clearance against the water surface or floor. MegaMek `VTOL.java:716-722`,
`SuperHeavyTank.java:335-337`, `LargeSupportTank.java:287-289`,
`SmallCraft.java:881-883`, and `Dropship.java:520-529` define additional
represented heights for non-Mek units: super-heavy VTOLs height 1, normal VTOLs
height 0, super-heavy/large support tanks height 1, grounded small craft height
1, airborne small craft/dropships height 0, grounded spheroid dropships height
9, and grounded aerodyne dropships height 4. MegaMek `LandAirMek.java:1074-1079`
sets LAM height to standing Mek height only in Mek conversion mode and 0 in
AirMek/Fighter modes, while `LandAirMek.java:517-531` maps movement modes to
conversion modes. MegaMek `QuadVee.java:435-440` sets QuadVee vehicle-mode
height to 0 and otherwise delegates to Mek height, while `QuadVee.java:370-384`
maps vehicle/Mek conversion modes. MegaMek `Infantry.java:629-631` returns
unmounted infantry height 0 and mounted infantry height as
`mount.size().height`; `InfantryMount.java:48-50` maps Large beasts to height
0 and Very Large/Monstrous beasts to height 1, with custom/sample mount
identity parsing in `InfantryMount.java:211-257` and sample identities in
`:261-305`. MekStation now imports explicit represented unit-height fields,
derives Mek/super-heavy Mek height from unit type and tonnage when no explicit
field exists, derives the above source-pinned non-Mek heights when the
represented unit identity/state is available, derives LAM/QuadVee
conversion-mode-sensitive heights from represented conversion or movement mode,
derives conventional infantry mount height from represented mount height,
beast size, MegaMek custom mount strings, or MegaMek sample mount identity,
propagates that value through shared movement capability, and keeps naval
bridge-clearance preview/commit validation aligned when imported height changes
the result. At that point, remaining unit-height gaps were fully dynamic
runtime conversion-state and infantry mount/dismount updates after unit import.

2026-05-24 runtime unit-height update: movement capability now preserves
source-backed height profiles for LAM, QuadVee, and conventional infantry
mounts, while live unit state can override height directly or supply runtime
conversion / mount-state fields. Movement projection and committed movement
validation both resolve that runtime height before checking naval, hydrofoil, or
submarine bridge clearance, so a post-import conversion or mount/dismount state
change can alter map legality without rebuilding the session's imported
capability cache. Remaining unit-height gaps are the actual gameplay events/UI
that mutate those runtime conversion and mount-state fields.

2026-05-24 runtime unit-height browser update: the tactical-map browser harness
now renders a naval unit whose live unit state has height 1 crossing a
water/bridge hex whose imported movement capability does not carry height. The
shared movement projection marks the destination non-reachable with
`TerrainBlocked`, `Naval movement lacks bridge clearance`, water/bridge level
metadata, and a non-color invalid badge; the focused parity fixture feeds the
same path into committed movement validation and confirms the rejection reason,
details, MP, and heat match the rendered projection.

2026-05-25 bridge-clearance badge update: bridge-clearance movement failures now
render the specific non-color `BRDG` invalid badge instead of the generic
terrain badge, while preserving the source-backed `TerrainBlocked` code and
`Naval movement lacks bridge clearance` detail used by commit validation.

Additional small-unit movement data pin: MegaMek `Infantry.java:560-568` and
`BattleArmor.java:520-523` return walk MP as base run MP unless optional TacOps
fast infantry movement is enabled. MegaMek `ProtoMek.java:602-606` falls back to
the base `Entity.java:3380-3382` run formula unless a myomer booster applies.
MekStation now preserves explicit canonical run MP where a handler supplied it
and otherwise adapts vehicle `cruiseMP`/`flankMP`, infantry and battle armor
`groundMP`/`jumpMP`, mechanized infantry motive modes, and top-level ProtoMech
MP fields before tactical map projection. Coverage lives in
`src/engine/adapters/CompendiumAdapter.ts` and
`src/engine/__tests__/CompendiumAdapter.test.ts`, with movement projection
regression coverage in `src/utils/gameplay/movement/__tests__/reachable.test.ts`
and `src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`.

Additional movement-heat profile pin: MegaMek `Entity.java:3366-3367`,
`Entity.java:3419-3420`, and `Entity.java:3532-3533` return 0 walking,
running, and jumping heat for the base entity, while `Mek.java:987-989`,
`Mek.java:1034-1037`, and `Mek.java:1281-1301` override that behavior with
engine walk/run/jump heat. MekStation now carries a `movementHeatProfile`
separate from terrain pathing motive mode, so infantry, battle armor,
ProtoMechs, vehicles, and aerospace units can path through represented terrain
without inheriting Mek movement heat from `movementMode: 'walk'`. Coverage lives
in `src/types/gameplay/HexGridInterfaces.ts`,
`src/engine/adapters/CompendiumAdapter.ts`,
`src/utils/gameplay/movement/modifiers.ts`,
`src/utils/gameplay/movement/reachable.ts`,
`src/utils/gameplay/movement/validation.ts`,
`src/engine/InteractiveSession.actions.ts`,
`src/simulation/ai/MoveAI.ts`, `src/components/gameplay/MovementHeatPreview.tsx`,
`src/__tests__/unit/utils/gameplay/movement.test.ts`,
`src/engine/__tests__/CompendiumAdapter.test.ts`,
`src/utils/gameplay/movement/__tests__/reachable.test.ts`, and
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`.

Additional zero-cost elevation badge pin: MegaMek
`MoveStep.java:2727-2734` returns from step-cost accumulation for VTOL and
jumping movement after the base 1 MP step, before terrain/elevation adders.
MekStation already projects those legal vertical changes with
`elevationDelta` and `elevationCost: 0`; the map now renders that as an
explicit `E+0` movement-cost badge alongside the vertical delta instead of
only showing `UP`/`DN`, so players can distinguish "free vertical change for
this motive" from missing cost data. Coverage lives in
`src/components/gameplay/HexMapDisplay/HexCell.movementBadges.tsx` and
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.movementAnimation.test.tsx`.

2026-05-24 browser update: the tactical-map browser harness now includes a
jump-only uphill movement scenario that verifies the rendered top-down movement
cost badge exposes `E+0`, the positive elevation delta, zero terrain cost, and
jump heat metadata for a legal vertical jump.

2026-05-24 VTOL browser update: the tactical-map browser harness now also
includes a VTOL-style selected vehicle scenario that verifies a legal climb over
a tall elevation stack exposes `movementMode: vtol`, `E+0`, the positive
elevation delta, zero terrain cost, and zero movement heat in the rendered
top-down badge metadata. The scenario's range row is now generated by
`deriveMovementRangeHexForDestination` against the harness terrain grid, keeping
the browser proof tied to the shared movement projection path rather than a
hand-authored display-only highlight. A fixture-level Jest parity test now sends
that same projection path through `validateCommittedMovement`, proving the
browser-visible VTOL climb is accepted by the commit gate with matching MP,
movement heat, and path.

2026-05-25 VTOL altitude token pin: represented vehicle combat state now
projects VTOL altitude into vehicle map tokens. The token wrapper exposes
`data-vehicle-altitude`, the accessible label includes the altitude, and the
vehicle renderer shows a visible `ALTn`/`HOV` badge only for VTOL motion so
airborne/hover state is inspectable from the map without side-panel context.
The existing `vtol-elevation-cost` browser scenario now carries altitude 3 and
asserts that the live tactical-map SVG preserves the wrapper metadata, aria
context, and visible `ALT3` vehicle badge while the movement overlay still
shows the rules-backed zero elevation MP climb. The same browser scenario now
toggles into isometric mode and asserts the depth-sorted isometric scene wrapper
also preserves vehicle type, VTOL motion type, and altitude 3 metadata before
checking the nested token badge, keeping the 2.5D stack path inspectable.

Tracked-vehicle browser update: the tactical-map browser harness now pairs the
VTOL proof with a tracked ground-vehicle abrupt-climb scenario. The top-down map
renders the destination elevation label, exposes `movementMode: tracked`,
`TerrainBlocked`, `Elevation change of 2 exceeds Tracked movement limit`,
`elevationDelta: 2`, and `elevationCost: 4`, and shows a non-color `ELEV`
invalid badge. A fixture-level Jest parity test sends the same one-step path
through `validateCommittedMovement`, proving the browser-visible blocked reason
matches the commit gate for the ground-vehicle elevation limit.

Additional absolute elevation-cost pin: MegaMek `MoveStep.java:2816-2841`
prices non-WiGE elevation changes using `Math.abs` of the elevation delta, then
doubles that elevation MP for non-flying infantry and tracked/wheeled/hover
ground vehicles. MegaMek `MoveStep.java:3135-3156` checks both downhill and
uphill changes against the entity's allowed elevation change, with the default
downhill limit delegated through `Entity.java:8688-8694`; `Tank.java:1421-1433`
pins ground-vehicle one-level limits. MekStation now uses absolute elevation
delta for projected ground movement costs, doubles represented infantry and
vehicle elevation MP, and reports over-limit drops with the same explicit
terrain-blocked metadata as climbs. Top-down movement badges also render
downhill steps as a paid positive elevation MP cost (`E+N`) with a separate
down-direction delta (`DN<N>`), so the visual affordance matches the projected
ground rule. Coverage lives in
`src/utils/gameplay/movement/calculations.ts`,
`src/utils/gameplay/movement/terrainRules.ts`,
`src/__tests__/unit/utils/gameplay/movement.test.ts`, and
`src/utils/gameplay/movement/__tests__/reachable.test.ts`; preview-to-commit
agreement coverage lives in
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`; rendered
badge coverage lives in
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.movementAnimation.test.tsx`.

Additional infantry terrain-cost pin: MegaMek `MoveStep.java:2828-2837`
doubles elevation MP for non-flying infantry, and `MoveStep.java:2892-2899`
reduces non-mechanized infantry woods-entry cost by 1 MP while preserving a
minimum 1 MP step cost. MekStation now carries
`movementTerrainProfile: 'infantry'` separately from motive mode so conventional infantry and foot/jump
battle armor can use the represented infantry terrain profile without changing
Mek walking costs or mechanized infantry motive costs. Coverage lives in
`src/types/gameplay/HexGridInterfaces.ts`,
`src/engine/adapters/CompendiumAdapter.ts`,
`src/utils/gameplay/movement/costContext.ts`,
`src/utils/gameplay/movement/calculations.ts`,
`src/__tests__/unit/utils/gameplay/movement.test.ts`,
`src/engine/__tests__/CompendiumAdapter.test.ts`,
`src/utils/gameplay/movement/__tests__/reachable.test.ts`, and
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`.

Additional prone stand-up movement pin: MegaMek `GetUpStep.java:62` charges
normal stand-up as 2 MP, except a unit with `runMP == 1` spends 1 MP.
`MoveStep.java:2021-2026` blocks prone Meks from spending MP on anything except
turning or stand-up before they get up, and `NextStepsAdjacencyMap.java:97-99`
offers `GET_UP` / `CAREFUL_STAND` as the available path step from prone end
states. MegaMek `MovePathHandler.java:2027-2058` resolves the stand-up
piloting check, stops normal movement after a failed normal stand-up attempt,
and leaves failed attempts prone; `CarefulStandStep.java:61-65`,
`MoveStep.java:2219-2238`, `Entity.java:7671-7672`, and
`MovePathHandler.java:1049-1055` source-pin TacOps careful stand as a prone
stand variant that costs the walking allowance when walk MP is above 2,
receives a -2 PSR modifier, and consumes the movement turn rather than pairing
with destination movement. `MoveCommand.java:153-154` is the client command pin
for adding the `CAREFUL_STAND` step when the optional rule is active.
`Entity.java:7803-7830` adds the represented impossible case where a Mek cannot
stand with a destroyed leg plus both arms destroyed, and
`MekWithArms.java:410-430` remains the source pin for optional advanced
arm/quirk/TacOps stand-up modifiers once the necessary unit-state fields exist.
MekStation now
subtracts normal stand-up MP from prone walk/run map projection, charges the
same cost in committed paths, exposes Stand Up only for prone units with enough
heat-reduced walk/run MP, dispatches standalone Stand Up as a zero-hex
rules-backed movement declaration with `standUpAttempt` / `standUpSucceeded`
replay fields, emits the stand-up `PSRTriggered` / `PSRResolved` / `UnitStood`
chain, rejects prone jump attempts until standing in both the map projection and
Jump command availability, marks destroyed-leg-plus-both-arms stand attempts as
impossible before the player commits, and resolves the same stand-up PSR before
committed prone ground movement. A successful stand-up continues to the projected
destination; a failed stand-up records only the stand-up MP/heat, stays at the
origin, locks movement, and remains prone. The map projection now exposes
`standUpRequired`, `standUpMode`, `standUpCost`, stand-up PSR
reason/target/modifier metadata, impossible-stand reasons, and non-color
stand-up badges/tooltips/dock disabled reasons so the player sees the stand
gate before commit. TacOps careful stand now projects as a whole-turn stand,
uses walking MP as the cost when above 2, carries the -2 PSR modifier into
projection/resolution, rejects paired destination movement, emits
`standUpMode: 'careful'`, and has its own dock action. Coverage lives in
`src/types/gameplay/GameSessionMovementEvents.ts`,
`src/utils/gameplay/standUpRules.ts`,
`src/utils/gameplay/movement/standUpProjection.ts`,
`src/utils/gameplay/movement/validation.ts`,
`src/utils/gameplay/movement/reachable.ts`,
`src/utils/gameplay/movement/commitValidation.ts`,
`src/utils/gameplay/gameState/actionLocking.ts`,
`src/engine/InteractiveSession.actions.ts`,
`src/components/gameplay/TacticalActionDock/commands/movementCommands.ts`,
`src/components/gameplay/HexMapDisplay/HexCell.movementBadges.tsx`,
`src/components/gameplay/HexMapDisplay/HexMapDisplay.tooltips.tsx`,
`src/stores/useGameplayStore.combatFlows.ts`,
`src/__tests__/unit/utils/gameplay/movement.test.ts`,
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.movementAnimation.test.tsx`,
`src/utils/gameplay/movement/__tests__/reachable.test.ts`, and
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`.

2026-05-25 stand-up movement browser pin: the tactical-map browser harness now
uses a represented prone Mek with a normal stand-up step before walking two
clear hexes, proving the rendered destination exposes 4 MP total, the reserved
2 MP stand-up cost, PSR TN 5 metadata, heat +1, and a non-color stand-up badge.
A fixture-level Jest parity test feeds the same projected path into
`validateCommittedMovement` and proves the commit gate accepts it with matching
MP, heat, and path.

2026-05-25 impossible stand-up browser pin: the tactical-map browser harness
now also uses a prone Mek with one leg and both arms destroyed, matching the
MegaMek-sourced impossible stand case already represented in movement
projection and engine resolution. The rendered destination is non-reachable,
exposes `InvalidDestination`, preserves the impossible stand-up reason on the
hex and stand-up badge, shows a non-color `STAND` invalid badge, and surfaces
the same reason in the hover explanation before the player commits.

Additional TacOps stand-up modifier pin: MegaMek
`MekWithArms.java:410-430` remains the source anchor for optional arm/quirk
stand-up modifiers. MekStation now preserves represented destroyed-arm,
no/minimal-arms quirk, and side-specific hand/lower/upper/shoulder actuator
state through import and movement projection, then keeps preview and committed
stand-up PSR target numbers aligned. Remaining gaps: special-unit stand-up
exceptions are still not fully modeled.

Additional fog visibility pin: engine attack visibility already passes the
active battle grid into `canPlayerSeeUnit` before accepting an attack
(`src/engine/InteractiveSession.actions.ts:322-326`). Map token construction
now passes the same combat grid into the fog visibility state so LOS-blocking
woods, smoke, buildings, and elevation hide enemy tokens and clear their
target/active-target affordances instead of falling back to an empty clear
grid.

Additional legacy attack-range bypass pin: when the map has a configured
weapon list for the selected unit, `HexMapDisplay` now treats
`deriveCombatRangeHexes` as the attack-highlight source of truth and ignores
raw legacy `attackRange` overlay coordinates. That prevents stale caller-owned
highlight arrays from painting attackable-looking hexes that the shared
projection has already classified as out of range, blocked, empty, or otherwise
not commit-ready. Raw `attackRange` remains a fallback only for legacy callers
without weapon-backed combat projection, and legacy-only fallback hexes retain
their range tint while reporting neutral top-level projection status with
`range-only` combat metadata instead of claiming source-backed legality.

Additional selected-weapon arc-overlay pin: the firing-arc overlay now uses
the selected unit's operational weapon mounting arcs when a weapon list is
configured, matching the same `mountingArc` data consumed by
`deriveCombatRangeHexes` / `weaponCanCoverTargetArc`. Rear-, side-, or
front-mounted selected weapons no longer shade unrelated arcs as tactically
available; weapons without a represented mount keep the legacy all-arc display,
and destroyed-only weapon lists produce no arc shading.

Additional vehicle weapon-mount import pin: MegaMek `Tank.getWeaponArc`
(`Tank.java:1039-1103`) routes vehicle body/front, side, rear, turret, and
sponson mounts into firing arcs, while `Mounted.java:1462-1469` exposes the
sponson turret flag. MekStation now imports represented vehicle weapon
identities from `equipmentId` before falling back to legacy `id`/`name`, carries
single-arc and multi-arc mount coverage through the shared weapon status and
attack declaration shapes, and uses one helper for map projection, AI weapon
filtering, attack planning, and committed attack validation. Focused fixtures
cover rear chassis mounts, left sponson front+left coverage, all-arc turret
coverage, top-down firing-arc overlay narrowing, and preview-to-commit
agreement for represented multi-arc mounts.

2026-05-25 vehicle sponson browser pin: the tactical-map browser harness now
loads a represented vehicle left-sponson weapon with `mountingArcs: [front,
left]` and proves a left-arc target remains attackable in the rendered DOM.
The focused Jest fixture aligns `deriveCombatRangeHexes` with committed
`AttackDeclared` range, selected weapon ids, and to-hit number after the
projection proves the left-side firing arc, while Playwright checks the same
in-arc weapon availability metadata on the hex, combat badge, and arc badge.
This keeps the MegaMek `Tank.getWeaponArc` and `Mounted` source pin visible at
the browser layer instead of only in adapter/projection unit tests.

2026-05-25 locked-turret browser pin: the tactical-map browser harness now
derives a represented single vehicle turret's locked coverage from
`getVehicleWeaponArcs(... turretLocked: true)`, proving that the same turret
that would otherwise cover all chassis arcs collapses to front-only coverage
when locked. The focused Jest fixture aligns the projected `OutOfArc` rejection
with committed `AttackInvalid` details for a clear left-side target, while
Playwright checks the hex, combat badge, invalid badge, arc badge, and
per-weapon blocked reason metadata.

2026-05-25 right-sponson browser pin: the tactical-map browser harness now
mirrors the left-sponson proof with a represented vehicle right-sponson weapon
whose `mountingArcs` are derived from `getVehicleWeaponArcs` as
`[front, right]`. The focused Jest fixture aligns the projected right-side
firing arc with committed `AttackDeclared` range, selected weapon ids, and
to-hit number, while Playwright checks the same in-arc weapon availability
metadata on the right-side hex, combat badge, and arc badge.

2026-05-25 chin-turret pivot browser pin: the existing MegaMek-source-backed
chin turret pivot rule is now carried from represented vehicle combat state and
selected weapon mount metadata into both tactical-map projection and committed
attack declaration. A vehicle with `TurretType.CHIN`, a pivoted turret state,
and a chin-turret weapon now exposes TN5 plus `Chin Turret Pivot +1` on the
left-side target hex, and the focused Jest fixture proves the committed
`AttackDeclared` target number and modifier stack match the projection.
Playwright checks the rendered to-hit metadata, arc badge, and available weapon
state in the browser harness.

2026-05-25 mixed chin/body volley pin: the chin-turret pivot rule now remains
weapon-scoped when a represented vehicle fires a mixed volley. The browser
harness exposes per-weapon target numbers on `weaponRangeOptions`, with the
pivoted chin-turret weapon at TN5 carrying `Chin Turret Pivot +1` and the
left-body weapon at TN4 without that modifier. The committed `AttackDeclared`
event stores those per-weapon target numbers, and `resolveAttack` consumes them
so a roll of 4 misses the chin turret weapon while hitting the body weapon.

Additional selected-weapon extreme-range overlay pin: the firing-arc overlay
now uses represented `ranges.extreme` when present while deriving selected
operational weapon reach. Extreme-range target hexes that combat projection
marks attackable therefore receive matching arc shading instead of appearing
outside the selected weapon's envelope; weapons without represented extreme
range continue to cap the overlay at long range.

Additional battle-armor passenger map pin: mounted BA tokens now have an
explicit `passengerBadge` render hint and, when the host token is present,
render as child badges owned by the host token group instead of standalone
tokens at their source hex. The rules-state relationship remains
`mountedOn`; the badge slot is presentation-only and keeps future transport or
swarm logic from needing a parallel UI-only attachment model. The browser map
harness now proves this ownership in both top-down and isometric projections,
including host map position and BA source-position metadata.

Additional aerospace velocity map pin: aerospace combat state now carries
`currentVelocity`, `nextVelocity`, `airborneState`, and optional `dogfightWith`.
The shared `unitStateToToken` adapter projects `currentVelocity` into
`IAerospaceToken.velocity`, so the tactical-map velocity vector is no longer a
manual token-only hint. The browser map harness proves state-derived altitude
and velocity metadata, altitude badge, and velocity vector in top-down and
isometric projections. The isometric depth-sorted scene wrapper now also
exposes aerospace unit type, altitude, and velocity metadata, keeping airborne
state inspectable at the same wrapper layer that owns depth ordering and
occlusion/highlight behavior. That same scene wrapper now exposes common token
state as well: displayed map position, source game-state position, facing, and
unit type. Last-known contacts therefore reveal the stale display hex and true
source hex separately in the 2.5D ordering layer.

2026-05-25 combat movement modifier browser pin: MegaMek
`ComputeAttackerToHitMods.java:102-103` appends attacker movement via
`Compute.getAttackerMovementModifier`; `Compute.java:2625-2692` source-pins
run +2. MegaMek `ComputeTargetToHitMods.java:198-200` appends target movement
via `Compute.getTargetMovementModifier`; `Compute.java:2766-2904` source-pins
5-6 hexes as +2 TMM. The tactical map harness uses a running attacker and a
target that moved 5 hexes, then renders TN8, Attacker Movement +2, Target
Movement (TMM) +2, the medium laser, and tooltip rows. Jest parity feeds the
same projection into `applyInteractiveSessionAttack` and proves the committed
target number and modifiers match.

2026-05-25 jump combat movement modifier browser pin: MegaMek
`Compute.java:2625-2692` source-pins jumped attacker movement as +3, while
`Compute.java:2766-2904` source-pins jumped target movement as the normal hex
movement TMM plus an additional +1. The tactical map harness now uses a jumped
attacker and a target that jumped 7 hexes, then renders TN11 with Attacker
Movement +3, Target Movement (TMM) +4, the medium laser, and tooltip rows. Jest
parity feeds the same projection into `applyInteractiveSessionAttack` and
proves the committed target number and modifiers match.

2026-05-25 walk combat movement modifier browser pin: MegaMek
`Compute.java:2625-2692` source-pins walked attacker movement as +1, while
`Compute.java:2766-2904` source-pins a target that moved 3-4 hexes as +1 TMM.
The tactical map harness now uses a walking attacker and a target that walked 3
hexes, then renders TN6 with Attacker Movement +1, Target Movement (TMM) +1,
the medium laser, and tooltip rows. Jest parity feeds the same projection into
`applyInteractiveSessionAttack` and proves the committed target number and
modifiers match.

2026-05-25 cumulative woods LOS browser pin: MegaMek `LosEffects.java:797-799`
and `:842-863` source-pin cumulative woods/smoke density blocking once the
total exceeds 2. The tactical map harness now uses two intervening heavy-woods
hexes, renders the second woods hex as the shared `NoLineOfSight` blocker,
exposes woods terrain metadata plus non-color invalid/blocker badges, and Jest
parity proves `deriveCombatRangeHexes` and `applyInteractiveSessionAttack`
agree on `Blocked by heavy woods at (2, 0)`.

2026-05-25 stacked smoke+woods LOS browser pin: MegaMek `LosEffects.java:1423`
explicitly checks smoke and woods together for LOS, and `:842-863` rejects the
combined smoke+woods density when it exceeds 2. The tactical map harness now
uses a single intervening hex containing heavy woods plus light smoke, renders
both terrain layers on the blocker hex, exposes the shared combined
`NoLineOfSight` reason and non-color badges, and Jest parity proves projection
and attack commit validation agree on `Blocked by heavy woods and smoke at (1,
0)`.

2026-05-25 mixed range expected-damage pin: MegaMek range handling remains
per-weapon (`Compute.getRangeMods` / `RangeType`), so MekStation's projection
now computes per-weapon expected damage from each weapon option's own target
number before summing the volley. The tactical-map medium/extreme volley
fixture proves the map exposes Medium Laser TN6 / expected 3.6 damage and
Extreme LRM TN10 / expected 0.85 damage, while the aggregate expected damage is
4.45 instead of incorrectly applying TN6 to the whole 10 listed-damage volley.

2026-05-25 ground-to-air indirect rejection pin: the aerospace deployment
OpenSpec deliberately models airborne aerospace targets as direct-fire-only for
ground attackers. MegaMek's ground-to-air impossibility gates are concentrated
in `ComputeToHitIsImpossible.java:1588-1630`, with indirect-fire legality
handled later in the same resolver family, so this slice treats the OpenSpec
decision as the source-of-truth simplification until the full
`aerospaceCombat.ts` dispatcher lands. The shared MekStation helper now blocks
LRM Indirect mode against airborne aerospace targets, the tactical-map
projection marks the target as `InvalidTarget`, and
`applyInteractiveSessionAttack` emits the matching `AttackInvalid` rejection
instead of allowing a map-only false-positive shot.

2026-05-25 capped isometric stack metadata pin: tall isometric stacks remain a
presentation concern, but they now expose the same effective height produced by
`getIsometricTerrainEffectiveHeight` for occlusion and depth sorting. The map
keeps the readable 8-layer render cap while exposing true effective height,
rendered layer count, cap state, overflow level count, and a visible cap badge
so a level-4 hex with an 8-level building is understandable as effective height
+12 rather than only the eight drawn layers. No movement, combat, LOS,
occlusion, or depth legality is derived from the rendered layer count. The
browser harness now includes `scenario=capped-isometric-stack` to prove the
top-down elevation/building label, isometric true-height metadata, capped stack
badge, and nonblank rendered pixels together.

2026-05-25 movement legend selection pin: the on-map MP legend now reuses the
same selected-unit planned-movement seed path as tactical movement command
payloads when Walk, Run, or Jump is selected. This is a control-surface change
only: movement costs, heat, terrain/elevation legality, jump capability, and
committed movement validation continue to come from the existing source-pinned
movement projection and validation helpers.

2026-05-25 movement legend browser pin: the tactical-map browser harness now
has a stateful `scenario=legend-mode-selection` surface that starts with Run
active, then clicks Jump and Walk directly in the on-map MP legend. The rendered
destination hex updates its movement type, MP cost, terrain/elevation cost, and
heat metadata from the existing derived biped walk/run/jump projection fixtures,
proving the legend control changes the real map overlay rather than only firing
a component callback.

2026-05-25 live movement hook legend pin: focused hook coverage now renders
`useGameMovementPlanning` with a real selected player unit and an
`InteractiveSession` movement capability stub, then invokes the MP legend
callback directly. The hook seeds the same selected-unit planned movement shape
used by command payloads, preserving current position, facing, and movement
type, while a zero-Jump-MP capability leaves Jump inert and marks it
unavailable in legend state. This is still a control-surface proof: terrain,
elevation, heat, and commit legality remain delegated to the existing
source-pinned movement projection and validation helpers.

2026-05-25 occupied destination movement pin: MegaMek
`Compute.stackingViolation` (`Compute.java:436-705`) checks whether entering a
hex creates a stacking violation, and `MoveStep.java:778-787` applies that
ordinary movement check before allowing the step. MekStation's represented
case is intentionally narrower: one selected ground unit attempts to walk into
an adjacent occupied clear hex. The tactical-map browser harness now renders
the destination as non-reachable with `DestinationOccupied`, the details
`Destination hex is occupied`, zero heat, 1 MP, and a non-color `OCC` invalid
badge; focused Jest parity proves `validateCommittedMovement` rejects the same
fixture with matching reason, details, MP cost, and heat. Full MegaMek stacking
exceptions, charge, and DFA remain outside this fixture.

2026-05-25 QuadVee conversion movement pin: MegaMek `QuadVee.java:170-177`
routes vehicle-mode walking MP through cruise MP, `QuadVee.java:263-272`
returns zero jump MP in vehicle mode, `QuadVee.java:431-439` makes vehicle-mode
height 0, and `QuadVee.java:443-448` lowers the max elevation change to 1. The
MekStation runtime movement capability resolver now translates represented
QuadVee vehicle conversion state into tracked/wheeled motive, height 0, and
jump MP 0 before both projection and commit validation. The tactical-map
browser harness proves the same level-2 climb is legal in Mek mode with Walk
MP/elevation/heat metadata, then blocked in tracked vehicle mode with the
`TerrainBlocked` elevation reason, a disabled Jump legend row, and a non-color
`ELEV` invalid badge. Focused Jest parity proves `validateCommittedMovement`
accepts and rejects the paired fixtures with matching MP, heat, path, reason,
and details. Full conversion actions, turn mode, hull-down behavior, and LAM
movement-mode dispatch remain outside this fixture.

2026-05-25 LAM AirMek conversion movement pin: MegaMek
`LandAirMek.java:278-302` routes AirMek walking/running MP through AirMek
cruise/flank, `LandAirMek.java:325-338` derives that cruise/flank profile from
Jump MP times 3 and a rounded 1.5 flank multiplier, `LandAirMek.java:524-571`
maps WiGE movement to AirMek conversion, and `LandAirMek.java:1074-1079` makes
non-Mek conversion height 0. MekStation now translates represented runtime
AirMek conversion into WiGE motive, height 0, and AirMek cruise/flank MP before
both projection and commit validation. The tactical-map browser harness proves
the same route is over-budget in Mek mode with a non-color `NO MP` invalid badge
and legal in AirMek mode with WiGE movement, AirMek MP, zero elevation cost, and
matching commit validation. Fighter/aerodyne mode, AirMek ground-clearance
submodes, conversion action timing, turn mode, and landing/control-roll
behavior remain outside this fixture.

2026-05-25 over-budget movement explanation pin: MegaMek pathfinding exposes
path MP through `MovePath.getMpUsed()` (`MovePath.java:1214-1218`) and filters
one-to-all paths by available MP with `MovePathLengthFilter`
(`ShortestPathFinder.java:96-104`, `MovePathLengthFilter.java:40-49`), while
`MoveStep.java:2046-2074` classifies movement by whether accumulated MP fits
walk/run limits. MekStation now mirrors that distinction in the map preview:
after the normal legal MP-capped path search fails, it runs a diagnostic
terrain-legal path search so passable destinations that merely exceed the MP
budget return `InsufficientMP` with actual path MP, terrain cost, elevation
delta, and elevation cost. Direct terrain blockers, such as tracked/wheeled
abrupt elevation entry, still remain `TerrainBlocked`. Focused Jest coverage
pins the utility behavior and fixture parity; the LAM Mek-mode browser fixture
now renders the over-budget climb as `NO MP` with matching commit-validation
reason, details, MP cost, and heat.

2026-05-25 grounded LAM Fighter conversion movement pin: MegaMek
`LandAirMek.java:365-379` derives Fighter cruise/flank MP from current thrust,
halves that thrust while grounded, and makes grounded Fighter run/flank equal
to walk/cruise; `LandAirMek.java:383-420` sources current thrust from Jump MP
with represented weather/damage gates; `LandAirMek.java:524-571` maps
Aerodyne/Wheeled movement to Fighter conversion; `LandAirMek.java:585-610`
keeps airborne Fighter terrain unrestricted but applies grounded aerospace
prohibitions as wheeled/taxing restrictions; and `LandAirMek.java:1074-1079`
sets non-Mek conversion height to 0. MekStation now translates represented
grounded Fighter conversion into wheeled movement, height 0, no jump movement,
and grounded Fighter MP before projection and commit validation. The
tactical-map browser harness proves a level-2 adjacent climb is blocked with
the same `TerrainBlocked` elevation reason, MP metadata, zero heat on the
rejected step, disabled Jump legend, and matching commit-validation details.
Airborne aerodyne turn/velocity pathing, takeoff/landing sequencing, control
rolls, and conversion action timing remain outside this fixture.

2026-05-25 LAM AirMek movement heat pin: MegaMek `LandAirMek.java:464-481`
routes AirMek VTOL walk/run heat through `getAirMekHeat()`, which adds damaged
coolant heat and rounds `getJumpHeat(mpUsed) / 3.0`; `Mek.java:1281-1302` and
`Engine.java:717-721` show represented standard jump heat uses at least 3 heat
or moved MP, whichever is greater. MekStation now resolves represented AirMek
conversion to an AirMek heat profile so map previews and committed movement
derive walk/run heat from used AirMek movement points rather than generic Mek
walk/run constants. The tactical-map browser harness proves a six-MP AirMek
cruise generates 2 heat and committed validation accepts the same path with
matching MP, path, and heat. Damaged coolant systems, special jump-jet heat
variants, partial-wing heat reduction, and conversion timing remain outside
this fixture.

2026-05-25 non-Mek physical projection pin: MegaMek
`PunchAttackAction.java:138-165` rejects non-Mek punch attempts,
`KickAttackAction.java:161-165` rejects non-Mek kicks,
`ClubAttackAction.java:305-313` rejects non-Mek standard club/melee attacks,
and `DfaAttackAction.java:275-278` rejects infantry-style attackers such as
Battle Armor from DFA. MekStation's shared physical projection now blocks
generic punch, kick, DFA, and mech-melee rows for represented non-Mek attackers
with `AttackerNotMek`, so Battle Armor no longer produces ordinary Mek physical
target highlights while its dedicated LegAttack, SwarmAttack, and Vibroclaw
work remains tracked under `add-battle-armor-combat`.

2026-05-25 infantry/BA charge projection pin: MegaMek
`BattleArmor.java:90` shows Battle Armor extends Infantry, and
`Infantry.java:1027-1030` overrides `canCharge()` to return false. Additional
non-charge-capable represented unit classes include `ProtoMek.java:1014-1016`,
`VTOL.java:138-141`, and `Aero.java:1721-1725`; `Tank.java:1459-1468` preserves
vehicle charge eligibility subject to movement-mode options. MekStation now
whitelists represented charge projection to Mek and vehicle categories, leaves
legacy unknown unit types unchanged, and returns `AttackerCannotCharge` for
Battle Armor so a unit that ran this turn cannot create a generic charge
highlight.

2026-05-25 vehicle charge movement-mode pin: MegaMek `Tank.java:1459-1468`
states tanks can charge except hover vehicles when
`ADVANCED_GROUND_MOVEMENT_NO_HOVER_CHARGE` is enabled, WiGE vehicles, and
stunned tanks; `GameOptions.java:261` shows `no_hover_charge` defaults false.
MekStation now threads attacker motive mode and optional rule keys through the
shared physical projection, command preview, and declaration validation so WiGE
and VTOL charge rows are blocked with `AttackerCannotCharge`, hover charge
remains legal by default, and hover charge is blocked when `no_hover_charge` is
enabled.

2026-05-25 stunned vehicle charge pin: The remaining `Tank.canCharge()` stun
exception is now represented because MekStation vehicle combat state carries
`motive.crewStunnedPhases`. The shared physical projection and declaration
validation derive a vehicle crew-stun flag from live `IUnitGameState`, so a
vehicle that ran this turn but still has stunned crew phases exposes a blocked
charge row and rejects the committed charge with the same
`AttackerCannotCharge` reason.

2026-05-25 LAM charge conversion pin: MegaMek `LandAirMek.java:919-935`
states fighter-mode LAMs cannot make physical attacks except movement-phase
ramming, and `canCharge()` blocks fighter mode plus airborne AirMek mode while
falling back to normal Mek charge rules otherwise. MegaMek
`Entity.java:12004-12022` defines airborne VTOL/WiGE state from VTOL/WiGE
movement mode and elevation above ground/building/bridge level. MekStation now
threads represented runtime `conversionMode` and represented airborne
VTOL/WiGE state into physical charge projection, declaration validation, and
resolution, so grounded AirMek charge remains legal behind the normal run gate
while fighter-mode and airborne AirMek charge rows reject with
`AttackerCannotCharge`.

2026-05-25 LAM fighter physical eligibility pin: MegaMek
`LandAirMek.java:919-925` marks fighter-mode LAMs ineligible for normal
Physical Attack phase attacks, with ramming handled in the movement phase.
MekStation now uses runtime `conversionMode` to block represented fighter-mode
LAM punch, kick, push, DFA, and melee-weapon rows with
`AttackerCannotUsePhysical` while leaving charge on its existing
`AttackerCannotCharge` path and movement-phase ramming out of scope.

2026-05-25 airborne AirMek push pin: MegaMek
`PushAttackAction.java:168-170` documents that LAM AirMeks can only push while
grounded and rejects airborne VTOL/WiGE attackers with "Cannot push while
airborne". MekStation now reuses represented runtime airborne VTOL/WiGE state to
block airborne AirMek push rows and declarations with `AttackerAirborne`, while
grounded AirMek push legality stays on the normal Mek push path.

2026-05-25 combat target-ring projection pin: Token valid-target rings now
consume the same `ICombatRangeHex.validTargetUnitIds` projection that drives
weapon-backed combat hex overlays. This does not add a new tactical rule; it
removes the separate UI-only legality signal by routing token chrome through
the existing source-pinned combat projection contract. Legacy
`IUnitToken.isValidTarget` rings remain only as fallback when no configured
weapon projection data exists for the selected unit.

2026-05-25 isometric target-boost projection pin: Isometric foreground boosts
now use the same combat-projected valid-target ids before honoring legacy
`IUnitToken.isValidTarget` flags. Selected-unit, terrain-occlusion, and
combat-target readability boosts stay intact, but a stale legacy target flag can
no longer pull an unrelated unit forward when weapon-backed combat projection is
active.

2026-05-25 legacy token renderer removal pin: The remaining damage-feedback
smoke coverage now exercises `UnitTokenForType`, allowing the superseded
`HexMapDisplay/UnitToken.tsx` renderer to be removed. This is not a new
BattleTech rule; it removes a stale UI-only token path that read
`IUnitToken.isValidTarget` directly and keeps token feedback coverage on the
production dispatcher used by top-down and isometric map rendering.

2026-05-25 movement elevation-cost label pin: Hex-level movement explanations
now include the projected elevation MP cost alongside MP cost, terrain cost,
elevation delta, and heat. This does not change movement legality; it exposes
the existing rules-backed `IMovementRangeHex.elevationCost` value through the
same top-down/isometric cell label that players and tests use for terrain and
elevation inspection.

2026-05-25 legacy attackRange explanation pin: Legacy raw `attackRange`
fallback hexes already stay neutral/range-only instead of becoming legal combat
projection. Their shared projection explanation now says the highlight is a
legacy fallback only and not weapon-backed, so compatibility range envelopes are
explicitly separated from rules-backed weapon, LOS, cover, and to-hit legality.

2026-05-25 LOS blocker projection status pin: LOS blocker hexes now classify as
standalone `los-blocker` tactical projections when they are not otherwise a
selected, path, movement, or combat-target hex. This does not change LOS
legality; it exposes the existing MegaMek-pinned combat projection blocker
reason through top-level projection intent/status metadata, with blocked LOS
surfaced as blocked and partial-cover LOS surfaced as mixed.

2026-05-25 legacy range fallback badge pin: Legacy raw `attackRange` fallback
hexes now render a compact `RNG` projection badge while keeping neutral
top-level status and `range-only` combat-channel status. This preserves
compatibility for callers without weapon-backed projection but gives the player
a non-color-only marker that the tinted envelope is only a range fallback, not a
rules-backed attack option.

2026-05-25 movement option row invalid metadata pin: Same-hex movement tooltip
rows now expose the engine invalid reason and detail on the blocked option row
itself, not only on aggregate hex and badge metadata. This does not change
movement legality; it keeps Walk/Run/Jump rows individually inspectable when
shared-destination movement projections mix reachable and rejected modes.

2026-05-25 combined tooltip projection explanation pin: Combined movement and
combat hovers now expose the shared projection explanation as both stable
metadata and readable tooltip text. This does not add legality logic; it brings
the multi-surface hover in line with movement-only, combat-only, and terrain
projection context so mixed hovers carry the same rules-backed why string.

2026-05-25 single-surface projection detail pin: Reusable projection context
rows now render the shared projection explanation as visible tooltip text, not
only `data-*` metadata. This keeps movement-only, combat-only, terrain-only,
and unreachable hovers aligned with combined hovers so every projection channel
can show the player the same rules-backed why string without recalculating.

2026-05-25 hex label projection context pin: Rendered hex titles and
accessible labels now carry projection status, channel status, blocked reasons,
and the shared projection explanation from the same per-hex projection used by
badges and tooltips. This does not add legality logic; it makes the hex itself
inspectable as a rules-backed tactical explanation surface.

## Acceptance Gate

Every tactical mechanic that appears as a map highlight must have:

- A MegaMek path/line or official rule citation.
- A MekStation source path that consumes the same rule-backed projection data.
- Golden fixture cases for legal, costly, blocked, and edge-case outcomes.
- Agreement tests proving preview and committed engine resolution match.

Until those exist, the UI may show experimental previews, but the end-state
claim should remain "source-pinning in progress" rather than "rules complete."
