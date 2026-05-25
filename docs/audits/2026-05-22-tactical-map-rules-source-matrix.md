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

2026-05-24 isometric browser update: the tactical-map browser harness now places
opposing tall elevation stacks around an active target and verifies that camera
rotation moves the active occluder metadata and highlight to the stack that is
actually in front for that view. Remaining isometric browser gaps are broader
interaction sweeps beyond the smoke harness, such as repeated rotation cycles
and mobile/pointer gesture coverage.

2026-05-24 top-down movement browser update: the tactical-map browser harness
now renders a single highlighted destination with walk, run, and jump options
and verifies the combined badge metadata for option costs, terrain costs,
elevation costs, and heat. Remaining browser movement gaps are broad path-shape
and invalid-destination sweeps beyond the smoke harness.

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

2026-05-24 movement gap update: the movement row's older frogman/swim and
TacOps infantry pavement-bonus gaps are closed by the current
`tactical-map-interface` spec and fixtures. Remaining movement oracle gaps are
now narrower: dynamic runtime conversion-state changes after import,
infantry mount/dismount updates after import, and a broader external oracle
differential fixture matrix across movement profiles.

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
models the represented subset: non-Mek attackers/targets, prone attacker/target,
airborne target, not-directly-ahead target, arm weapon fire, and same-base
elevation all produce typed push restrictions. MegaMek
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
the result. Remaining unit-height gaps are fully dynamic runtime
conversion-state and infantry mount/dismount updates after unit import.

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
isometric projections.

## Acceptance Gate

Every tactical mechanic that appears as a map highlight must have:

- A MegaMek path/line or official rule citation.
- A MekStation source path that consumes the same rule-backed projection data.
- Golden fixture cases for legal, costly, blocked, and edge-case outcomes.
- Agreement tests proving preview and committed engine resolution match.

Until those exist, the UI may show experimental previews, but the end-state
claim should remain "source-pinning in progress" rather than "rules complete."
