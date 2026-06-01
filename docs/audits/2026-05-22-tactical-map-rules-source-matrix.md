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

2026-05-26 movement-row correction: the movement table row is cumulative and
its older final sentence about frogman/swim, optional infantry pavement-bonus,
unit-height, and runtime conversion-state gaps is superseded by later
source-pinned fixtures and OpenSpec deltas. The current movement headline gaps
are remaining airborne LAM Fighter/AirMek submodes and broader external oracle
differential fixtures. Represented LAM AirMek-to-Mek conversion sequencing is
covered by `pin-lam-airmek-mek-conversion-steps`, and AirMek-to-Mek conversion
now clears represented AirMek WiGE elevation in line with MegaMek
`MovePath.java:1699-1712` automatic landing behavior via
`pin-lam-airmek-mek-automatic-landing`. AirMek Descend actions that land at
altitude 0 now carry MegaMek `LandAirMek.java:789-847`
landing-control required/not-required context via
`pin-airmek-landing-control-context`, and required damaged landings now queue a
canonical AirMek landing PSR via `queue-airmek-landing-psr`, then resolve that
landing check in the same movement command via `resolve-airmek-landing-psr`.
Short-distance automatic WiGE landing for represented positive-altitude WiGE
vehicles, Glider ProtoMeks, and LAM AirMeks is now covered by
`auto-land-short-wige-movement`, source-pinned to MegaMek
`MovePath.java:1689-1738`, and replays through the same runtime movement-state
channel used by altitude controls. The represented already-moved distance and
UP/HOVER-style exemptions from the same MegaMek helper are now covered by
`pin-wige-hover-distance-exemptions`, so the map no longer shows a `LAND`
consequence or runtime landing patch when those source guards apply.
Represented WiGE building-top climb cost is now covered by
`pin-wige-building-climb-cost`, source-pinned to MegaMek
`MoveStep.java:2844-2864`: the shared movement-cost helper adds the +2 MP
climb-mode surcharge when entering a higher represented building ceiling while
leaving the separate cliff behavior to explicit edge metadata. Directional
sheer-cliff movement is now covered by
`pin-directional-cliff-movement-metadata`, source-pinned to MegaMek
`Hex.java:744-750` and `MoveStep.java:2858-2864` / `:3159-3178`: encoded
cliff-top exits add the WiGE +1 MP ascent surcharge and block represented
tracked/wheeled/hover vehicle ascent when no pavement/road surface cancels the
cliff effect, without inferring cliffs from ordinary elevation deltas.
Imported MegaMek board cliff metadata is covered by
`import-megamek-cliff-top-exits`, source-pinned to MegaMek
`Terrain.java:103-119`, `Terrain.java:302`, `Terrains.java:147-150`, and
`Board.java:537-602`: `.board` `cliff_top:1:<exitMask>` entries now import as
`cliffTopExits` only for in-board 1- or 2-level drops, so real map data drives
the same movement projection instead of relying on hand-authored fixtures.
Large MegaMek board labels are covered by
`import-large-megamek-board-coordinates`, source-pinned to MegaMek
`Coords.java:510-514`, `Board.java:1062-1063`, and real
`170x120 Fort David.board` labels such as `10412`, `10016`, and `104120`:
the parser now splits two-or-more digit column/row components against declared
board dimensions so large-board terrain, elevation, and cliff metadata reaches
the same tactical projection path instead of failing the old fixed-four-digit
guard.
The follow-on `audit-megamek-board-import-corpus` verifier now makes that import
claim repeatable against a local MegaMek board checkout. Its first local run
found ambiguous labels such as `10101` on `170x120 Fort David.board`; MekStation
now uses MegaMek row order to disambiguate those labels, matching
`Board.java:1062-1063`. The verified local corpus run parsed all 2,386 boards
under `E:\Projects\megamek\megamek\data\boards` with 0 failures, covering
3,638,056 hex rows, 382,251 large-coordinate rows, and 5,253 `cliff_top` rows.
The follow-on `surface-cliff-exits-map-context` slice exposes represented
`cliffTopExits` on hex metadata, terrain labels, terrain/elevation source
details, and terrain hover context so the map explains directional cliff edges
from imported terrain instead of hiding them inside movement-only diagnostics.
The `surface-movement-option-source-details` slice expands the shared movement
source reference so same-hex walk/run/jump options carry their reachable or
blocked state, MP cost, terrain and elevation costs, heat, and blocked reason
directly in `movement:megamek` projection metadata instead of only in visible
badges/tooltips.
The `source-movement-reach-badge` slice pins the normal reachable movement
badge to that same source-backed path, so the standing MP badge now exposes
`movement:megamek` source refs, MegaMek rule refs, and projection explanation
metadata before hover path preview replaces it.
The `source-movement-step-cost-badge` slice extends that provenance to the
separate terrain/elevation step-cost marker, so visible `T+`/`E+`/`UP`/`DN`
cost labels also identify their shared `movement:megamek` source and rule
references.
The `source-hover-path-preview-badge` slice keeps the hovered path MP badge on
that same source-backed path: hovering a reachable destination now preserves
terrain/elevation cost, heat, `movement:megamek` source refs, and MegaMek rule
refs on the preview badge instead of thinning the displayed commit preview to
MP and movement type only.
Replayable gameplay events for runtime movement state are covered by
`apply-runtime-movement-state-events`; player-facing tactical command controls
for represented conversion and infantry mount-state changes are covered by
`wire-runtime-movement-state-controls`.

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

2026-05-31 vehicle damage dispatch pin: represented vehicle targets now seed a
`combatState.kind === "vehicle"` envelope and committed session attacks route
vehicle hits through the vehicle hit-location and damage pipeline instead of
the generic Mek damage path. Focused fixtures cover normal vehicle Front damage,
hull-down turret fixed-location hits without consuming location dice, and VTOL
rotor damage emitting crash and immobilization events. Remaining vehicle combat
trust gaps are dual-turret split representation, cargo import parity, and
broader MegaMek differential sweeps.

2026-05-31 vehicle critical dispatch pin: MegaMek
`TWGameManager.java:21257-21294` rolls vehicle criticals through
`criticalTank(...)` after qualifying vehicle hits, and `Tank.java:1800-2025` /
`VTOL.java:398-608` select location-sensitive critical effects such as crew,
weapon, cargo, sensor/stabilizer, engine, fuel-tank, ammo, turret, and rotor
results. MekStation now dispatches represented vehicle TAC and structure-exposing
session weapon hits through MegaMek-aligned location-sensitive Tank/VTOL critical
tables for front, rear, side/body, turret, and VTOL rotor hits. It emits
replay-visible critical/crew-stun/component/ammo/destruction/turret/rotor events
where MekStation has represented state, and mirrors engine, driver, commander,
pilot/copilot, crew-kill, fuel-tank, ammo-explosion, turret, and rotor effects
into the vehicle combat-state envelope. Remaining vehicle critical trust gaps
are cargo import parity, dual-turret split critical resolution, and external
differential sweeps.

2026-05-31 vehicle critical target-equipment availability pin: MegaMek Tank /
VTOL critical selection checks whether the struck location has an available
weapon before accepting weapon-jam or weapon-destroyed criticals, checks mounted
weapon presence before accepting stabilizer criticals, and checks loaded cargo
before accepting cargo hits. MekStation now carries optional
`vehicleInit.criticalAvailability` metadata, seeds initial target weapon mount
locations separately from live weapon availability, and feeds that metadata into
committed session vehicle critical fallthrough. Unknown cargo facts stay
optimistic until source-backed import exists.

2026-05-31 vehicle critical runtime equipment-state pin: MegaMek falls through
later vehicle critical entries after represented weapon and stabilizer outcomes
are already applied. MekStation now records represented vehicle weapon-jam,
weapon-destroyed, stabilizer, and flight-stabilizer critical outcomes by struck
location in derived component damage, carries known target weapon counts in
`vehicleInit.criticalAvailability`, and reduces later committed vehicle critical
availability from that runtime state. Unknown weapon counts remain optimistic.
Remaining vehicle critical trust gaps are cargo import parity, dual-turret split
critical resolution, and external differential sweeps.

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
metadata, invalid combat badge, accessible reason context, and committed
`AttackInvalid` event all agree that the shot stays blocked by LOS with no
indirect-fire basis, no indirect badge, no spotter event, and no NARC override
event. The blocked reason now explicitly states that TAG is nullified by ECM
and semi-guided indirect fire is unavailable. Source cross-check: MegaMek
`ComputeToHit.java:1524-1535` applies the semi-guided indirect modifier only
when `Compute.isTargetTagged(target, game)` succeeds, `ComputeTerrainMods.java:134-140`
uses the same tagged-target gate for ignoring target terrain, and
`ComputeECM.java:84-89` is the target/flight-path ECM helper MekStation mirrors
through represented `ecmProtected` target status.

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
click-button rotation; broader pointer/gesture coverage was still outside the
browser harness until the pointer/mobile smoke pin below.

2026-05-25 isometric reset-heading pin: the reset-view control now restores
pan, zoom, and the isometric camera heading together, and focused component
coverage asserts projection-layer rotation metadata, visible heading metadata,
the canonical transform, and unchanged axial clicks after reset.

2026-05-26 isometric pointer/mobile smoke pin: the tactical-map browser
harness now runs the isometric scene in a touch-capable mobile viewport and
verifies mouse pan, touch pan, pinch-zoom, and touch-tapped camera rotation
keep the same `shared-tactical-map-projection` layer, presentation-only camera
control provenance, and active occluder highlight metadata. Remaining
isometric interaction gaps are broader mobile gesture-matrix and occlusion
interaction sweeps beyond this smoke harness.

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

2026-05-25 ground-to-air agreement correction: the focused
`InteractiveSession.attackProjectionAgreement` minimum-range aerospace case now
asserts both sides of the active OpenSpec rule: no `Minimum Range` modifier is
projected or committed against an airborne aerospace target, and the low-tier
`Ground-to-air altitude` modifier is projected and committed. This keeps the
agreement suite aligned with the existing browser/fixture altitude proof instead
of expecting a ground-only base TN.

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

2026-05-31 infantry mount-state height precedence: the runtime movement
capability resolver now applies `infantryMounted: false` as height 0 before any
stale live `unitHeight`, matching MegaMek `Infantry.java:629-631` where height
is 0 when no mount is present and otherwise comes from `mount.size().height`
(`InfantryMount.java:48-50`). Focused movement projection and commit
validation fixtures prove a mounted-height state blocks height-sensitive bridge
clearance while the dismounted runtime state clears that block, with matching
MP, heat, path, and rejection details. Remaining infantry mount gaps are the
gameplay event/UI paths that mutate `infantryMounted`/`infantryMountHeight` and
broader oracle sweeps, not the projection/commit height precedence.

2026-05-31 ProtoMek Glider altitude-control update: MegaMek
`Entity.java:2561-2569` caps ProtoMek WiGE climb at current hex level + 12, and
`ProtoMek.java:947-952` calls out Glider elevation-down handling for airborne
WiGE-like altitude. MekStation now exposes represented ProtoMek Glider altitude
to movement commands, dispatches replayable `protoAltitude` runtime state
through the shared altitude-control step/MP reserve, blocks positive-altitude
Glider ground projection as WiGE altitude-control-owned, and caps Climb
availability at altitude 12. LAM AirMek +25 altitude controls are now handled
by the follow-on `gate-lam-airmek-wige-altitude-ceiling` slice; full airborne
pathing remains follow-up work.

2026-05-31 LAM AirMek WiGE altitude ceiling pin: MegaMek
`Entity.java:2561-2573` gives LandAirMek WiGE movement a current-hex-level +25
ceiling, while ordinary WiGE vehicles remain at level +1 and ProtoMeks remain
at level +12. `Entity.java:2426-2518` drives DOWN availability through the
same WIGE/VTOL elevation gate and lets WIGE descend to the current hex level
over water. `LandAirMek.java:1806-1812` explicitly separates aerospace
altitude from ground-map elevation. MekStation now tracks represented AirMek
WiGE elevation in `lamAirMekAltitude`, exposes Climb/Descend controls in
AirMek mode, dispatches replayable altitude-control MP reserves, caps Climb at
25, and marks positive-elevation AirMek ground projection as altitude-control
owned. Represented short-distance automatic WiGE landing is covered by
`auto-land-short-wige-movement`; full hover/takeoff/landing sequencing and
broader elevated AirMek/WiGE pathing remain follow-up work.

2026-05-31 LAM AirMek landing-control context pin: MegaMek
`LandAirMek.java:789-847` requires an AirMek landing control roll only when
effective gyro damage, a destroyed leg, upper/lower/foot actuator damage, or
TacOps-enabled hip actuator damage is present. The first heavy-duty gyro hit is
ignored for this gate, and MegaMek `OptionsConstants.java:460` /
`GameOptions.java:240` identify `tacops_leg_damage` as disabled by default.
MekStation now annotates final AirMek Descend-to-0 runtime events with
landing-control required/not-required metadata, modifier totals, readable
damage details, and an event-log explanation. `queue-airmek-landing-psr` now
converts required landing metadata into a canonical `airmek_landing`
`PSRTriggered` event, with landing-specific modifiers so generic gyro/actuator
PSR modifiers do not double-count the source-backed landing check.
`resolve-airmek-landing-psr` now resolves the landing roll immediately in
movement-command order and emits `PSRResolved`, `UnitFell`, and `PilotHit` on
failed represented descents. `use-airmek-landing-fall-tonnage` now carries
adapted catalog tonnage into the interactive-session resolver map so failed
AirMek landing falls scale the `UnitFell` damage by the moved unit instead of a
placeholder. `apply-airmek-landing-fall-clusters` now applies those represented
fall clusters through movement-phase `DamageApplied` events, so replay reduces
armor/internal state after a failed AirMek landing. Broader crash extras such as
`fanout-airmek-landing-destruction` now emits movement-phase
`LocationDestroyed`, `TransferDamage`, and `UnitDestroyed` lifecycle events when
those fall clusters destroy locations or the unit.
`resolve-airmek-landing-crash-crits` now routes structure-exposing landing fall
clusters through the shared critical-hit resolver and emits movement-phase
`CriticalHit`, `CriticalHitResolved`, and `ComponentDestroyed` follow-through
events. Short-distance forced landing from represented higher WiGE elevations is
covered by `auto-land-short-wige-movement`; represented already-moved distance
and hover-style exemptions are covered by
`pin-wige-hover-distance-exemptions`; finer-grained hover/takeoff direction
state remains follow-up work.

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

2026-05-31 WiGE altitude token pin: MegaMek `Entity.java:12004-12022`
treats VTOL and WiGE movement as the same airborne-state family when
elevation/clearance makes them airborne, `MovementDisplay.java:2276-2291`
switches airborne entities to altitude controls, and `MovePath.java:1689-1741`
models airborne WiGE hover/landing behavior from that state. MekStation now
projects represented WiGE altitude into vehicle map tokens, renders the same
visible `ALTn`/`HOV` non-color badge used by VTOL tokens, and preserves WiGE
altitude in top-down wrapper metadata, accessible labels, and isometric scene
token metadata. Ground-only vehicle motives still suppress altitude chrome.

2026-05-31 airborne vehicle state-mismatch guard: MegaMek
`Entity.java:12004-12022` keys airborne VTOL/WiGE state to VTOL or WiGE motive
plus positive elevation, and `MovePath.java:1699-1741` uses airborne WiGE
state for automatic landing/hover handling. MekStation now fails closed from
represented vehicle combat-state motion type when altitude is positive, even
if the movement capability still reports an ordinary ground motive. Preview and
commit validation now share the same altitude-control blocked reason for stale
VTOL/WiGE capability data while preserving landed altitude-zero behavior.

2026-05-31 altitude-control context pin: the same MegaMek airborne-state pins,
plus `MovementDisplay.java:2276-2291` routing airborne entities through altitude
controls, now drive blocked movement projection context as well as the rejection
reason. MekStation blocked VTOL/WiGE ground projections now carry
altitude-control required, represented control mode, and represented altitude
through top-down hex metadata, movement badges, invalid badges, accessible
labels, tooltip reason rows, and same-hex option metadata. This is explanatory
context only; full airborne altitude pathing, VTOL landing, hover, takeoff,
and non-represented airborne paths remain follow-ups.
Represented short-distance WiGE auto-landing is covered separately by
`auto-land-short-wige-movement`.

2026-05-31 VTOL/WiGE altitude-control command pin: MegaMek
`MovementDisplay.java:5268-5286` handles raise/lower controls by adding UP/DOWN
movement steps, while `Entity.java:2433-2540` gates whether the unit can move up
or down at the current position. MekStation now exposes movement-phase
Climb/Descend commands for represented VTOL/WiGE vehicle combat state, dispatches
them through `RuntimeMovementStateChanged` with source
`altitude_control_action`, and replays the result into the vehicle combat-state
altitude consumed by map projection. Current command bounds are conservative:
VTOL altitude can climb toward MegaMek's 50-elevation ceiling, while ordinary
WiGE climb caps at altitude 1 until building/bridge/proto/LAM-specific altitude
gates are modeled.

2026-05-31 altitude-control MP reserve pin: MegaMek `MoveStep.java:2645-2729`
initializes movement steps to 1 MP and preserves that default for VTOL UP/DOWN
steps, while `MovementDisplay.java:5268-5286` appends those steps for
Climb/Descend. MekStation now records altitude-control step count and MP on the
runtime altitude action, replays it as pending unit movement state, adds it to
projected movement costs and remaining budget, carries the metadata through
top-down badges/tooltips/shared projection explanations, consumes the same
reserve during committed movement validation, and clears the reserve when the
movement declaration replays. Full airborne pathing, hover/takeoff/landing
sequencing and advanced WiGE subtype altitude ceilings remain follow-ups;
represented short-distance WiGE auto-landing is covered by
`auto-land-short-wige-movement`.

2026-05-31 altitude-control clearance gate pin: MegaMek
`Entity.java:2433-2497` derives minimum descent altitude from water, woods
foliage, bridge decks, and building roofs, `Entity.java:2504-2540` derives
maximum climb altitude including VTOL under-bridge clearance and ordinary WiGE
building-top clearance, and `MovementDisplay.java:2276-2291` enables Climb /
Descend from those predicates. MekStation command availability now consumes the
selected unit's encoded terrain, map elevation, and represented unit height to
disable misleading altitude controls before dispatch while preserving the same
replayable altitude-control event and MP reserve for legal commands. Remaining
altitude-control gaps are full airborne pathing, hover/takeoff/landing
sequencing and LAM/ProtoMek-specific WiGE ceilings; represented short-distance
WiGE auto-landing is covered by `auto-land-short-wige-movement`.

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
chain for PSR-required stand-up attempts, rejects prone jump attempts until
standing in both the map projection and Jump command availability, marks
destroyed-leg-plus-both-arms stand attempts as impossible before the player
commits, and resolves the same stand-up PSR before committed prone ground
movement. A successful stand-up continues to the projected destination; a failed
stand-up records only the stand-up MP/heat, stays at the origin, locks movement,
and remains prone. The map projection now exposes
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

2026-05-26 quad stand-up no-PSR pin: MegaMek `Entity.java:7566-7568`
defaults `needsRollToStand()` to true, `QuadMek.java:452-453` overrides it so
intact quads return false when `countBadLegs() == 0`, and
`Entity.java:7824-7828` converts `!needsRollToStand() && !isGyroDestroyed()`
into automatic stand-up success because the unit has all four legs. MekStation
now imports ordinary `Quad` / `Quad Omnimech` configurations as a represented
quad stand-up leg profile, treats both MegaMek legacy quad leg locations
(`left_arm`, `right_arm`, `left_leg`, `right_leg`) and MekStation quad labels
(`front_left_leg`, `front_right_leg`, `rear_left_leg`, `rear_right_leg`, plus
FLL/FRL/RLL/RRL) as leg-damage blockers for the automatic success, projects an
intact quad stand-up as normal stand-up MP with `standUpPsrRequired=false`, and
surfaces the no-PSR reason through hex metadata, badges, tooltip rows, and the
shared tactical projection explanation. Commit resolution now uses the same
projection: intact quad stand-up emits `UnitStood` without consuming dice or
emitting `PSRTriggered` / `PSRResolved`, while damaged quad-leg cases remain on
the normal stand-up PSR path. Focused coverage lives in
`src/utils/gameplay/movement/__tests__/reachable.test.ts`,
`src/engine/__tests__/CompendiumAdapter.test.ts`,
`src/engine/__tests__/InteractiveSession.movement.scenario.test.ts`, and
`src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.movementAnimation.test.tsx`.
Remaining gaps: QuadVee conversion-mode stand-up exceptions and destroyed-gyro
stand-up cleanup still need dedicated source-backed passes.

2026-05-26 destroyed-gyro stand-up pin: MegaMek `Mek.java:5637-5644`
classifies a standard gyro as destroyed after more than one gyro hit, and
`Entity.java:7599-7612` returns `TargetRoll.AUTOMATIC_FAIL` with reason
`Gyro destroyed` for fall-capable units with a destroyed gyro. Movement step
validation is stricter for prone Meks: `MoveStep.java:2186-2194` says a prone
Mek with a destroyed gyro can only turn one hex side or eject, making ordinary
`GET_UP` / ground movement illegal before the stand-up attempt can become a
rollable action. MekStation now treats represented `gyroHits >= 2` as
`Cannot stand with a destroyed gyro` in the shared stand-up projection, blocks
reachable ground destinations with that reason before commit, and resolves any
committed stand-up attempt as an impossible automatic failure at the origin
without rolling dice or emitting `UnitStood`. Remaining gaps: special
conversion/motive exceptions still need dedicated source-backed passes.

2026-05-26 heavy-duty gyro stand-up threshold pin: MegaMek
`Mek.java:5637-5644` keeps heavy-duty gyros alive at two hits by returning
destroyed only when `getGyroHits() > 2`, `Mek.java:5959-5967` reports three
hits to destroy under normal heavy-duty rules, and `Mek.java:3327-3346` applies
the represented heavy-duty gyro PSR modifiers of +1 for one hit and +3 for two
hits. MekStation now preserves represented gyro type from compendium/unit data
into runtime unit state, treats a two-hit heavy-duty gyro stand-up as rollable
with the represented +3 modifier, keeps movement projection and committed PSR
resolution on the same finite target number, and blocks a three-hit heavy-duty
gyro stand-up with `Cannot stand with a destroyed gyro`. Remaining gaps:
special conversion/motive exceptions still need dedicated source-backed passes.

2026-05-26 Playtest3 heavy-duty gyro stand-up pin: MegaMek
`OptionsConstants.java:543-545` names the `playtest_3` option,
`Mek.java:5959-5967` raises the heavy-duty gyro destroyed threshold to four hits
when that option is enabled, and `Mek.java:3327-3338` uses Playtest3
heavy-duty gyro PSR modifiers of +1, +2, and +3 for one, two, and three hits.
MekStation now routes represented optional rules into the shared gyro helper,
keeps three-hit Playtest3 heavy-duty gyro stand-up projection rollable with a
finite +3 PSR, keeps committed movement on the same finite target, and blocks
four-hit Playtest3 heavy-duty gyro stand-up as `Cannot stand with a destroyed
gyro`. Remaining gaps: special conversion/motive exceptions still need
dedicated source-backed passes.

2026-05-26 destroyed-gyro non-tracked movement pin: MegaMek
`MoveStep.java:2186-2206` rejects movement for a non-prone unit with a
destroyed gyro when it tries to spend non-tracked/non-wheeled MP, while keeping
tracked/wheeled exceptions for tracked Meks and represented QuadVee vehicle
mode. `MoveStep.java:2186-2188` still keeps prone destroyed-gyro Meks limited
to turning/ejection, and `QuadVee.java:401-404` explains that QuadVees do not
fall from failed PSRs while in vehicle mode. MekStation now applies the same
destroyed-gyro helper used by stand-up projection to standing movement
projection, including represented heavy-duty and Playtest3 thresholds, blocks
ordinary walk/run/jump destinations with `Destroyed gyro only permits tracked
or wheeled movement`, and preserves tracked/wheeled movement as reachable and
committable when terrain and MP allow it. Remaining special conversion gaps are
in-progress LAM/QuadVee conversion cancellation state, while the remaining
hull-down gaps are fortified-side-table behavior, QuadVee vehicle-mode details,
and punch/club hit-table nuances until the later hull-down pins retire them;
they are not the basic destroyed-gyro non-tracked movement gate.

2026-05-26 hull-down target projection pin: MegaMek
`ComputeTerrainMods.java:215-218` adds a +2 hull-down modifier for a
hull-down Mek target only when LOS/terrain cover is present, and
`ComputeToHitIsImpossible.java:630-634` keeps leg-mounted weapon restrictions
as a separate attacker-side gate. MekStation now represents `hullDown` on game
unit state, threads it through tactical combat projection, committed attack
declaration, and quick-sim to-hit context, and exposes the hull-down flag,
modifier, and reason through map hex attributes, cover-overlay metadata, and
hover cover context. This target-side pin left attacker-side action handling to
the follow-up pin below; target to-hit preview/commit agreement is no longer a
known hull-down gap.

2026-05-26 hull-down attacker action pin: MegaMek
`ComputeToHitIsImpossible.java:629-634` rejects hull-down Mek leg-mounted
weapon fire, and `KickAttackAction.java:269-270` rejects kicks by a hull-down
attacker with "Attacker is hull down." MekStation now carries weapon mount
locations from UI status, fixtures, compendium import, and runner hydration into
commit weapon shapes; tactical combat projection, interactive commit, bot
commit, and quick-sim attack loops all exclude hull-down leg-mounted weapons
with a matching invalid reason. Physical attack projections and physical commit
validation now block kick rows/commands while hull-down. Remaining hull-down
gaps are vehicle/QuadVee fortified-hex side-table handling and punch/club
hull-down hit-table nuances, not attacker leg-weapon or kick preview/commit
agreement.

2026-05-31 hull-down physical hit-table pin: MegaMek
`PunchAttackAction.java:344-365` switches a hull-down attacker's punch to the
kick hit table when the target base is at the attacker's arm level, while
`ClubAttackAction.java:561-580` applies the kick hit table to hull-down
club-style attacks against Mek targets unless the target is a converted
QuadVee. MekStation now selects that physical hit table in the shared physical
projection/damage helper, surfaces it through physical option rows and forecast
damage, persists it on `PhysicalAttackDeclared`, and makes the later resolver
prefer the declared table so target-specific elevation context cannot drift out
before hit-location resolution. At this pin, the remaining hull-down gaps were
vehicle/QuadVee fortified-side-table behavior and QuadVee vehicle-mode
side-table details, not punch/club hit-table preview/commit agreement.

2026-05-31 hull-down vehicle side-table pin: MegaMek `Tank.java:155-164`
maps side-table directions to fixed vehicle locations, `Tank.java:1123-1156`
routes hull-down tank hits from the protected move direction or either side to
the turret when available, otherwise to the incoming fixed side, and
`Tank.java:2861-2870` records backed-into-hull-down status from backward
movement. `QuadVee.java:545-551` uses fortified-hex hull-down gating while in
vehicle mode and otherwise falls back to Mek hull-down behavior. MekStation now
applies that fixed-location behavior in the vehicle hit-location primitive,
records `hullDownEnteredBackwards` from movement step chains, avoids consuming
normal table dice for protected hull-down hits, and leaves exposed opposite
arcs on the ordinary vehicle/VTOL table. Session-level vehicle damage and
location-sensitive critical dispatch have since landed; the remaining
follow-up is dual-turret split locations beyond the current generic `turret`
abstraction.

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
submodes, turn mode, landing/control-roll behavior, and broader conversion
oracle sweeps remain outside this fixture.

2026-05-31 LAM AirMek-to-Mek conversion sequencing pin: MegaMek
`MovePath.java:1047-1053` documents that LAMs converting from AirMek to Biped
mode require two convert commands, `MovementDisplay.java:5691-5712` adds one
`CONVERT_MODE` command and then adds a second when the final conversion mode
still does not match the requested end mode, and `ConvertModeStep.java:52-68`
keeps LAM conversion MP at 0 while only QuadVees pay conversion cost. MekStation
now emits two zero-cost conversion steps when tactical commands convert a
represented LAM from AirMek back to Mek, carries those pending steps into
movement projection, and serializes two replayable `convertMode` movement-event
steps before path movement. Airborne AirMek/WiGE pathing, bimodal import
differentiation, and broad conversion oracle sweeps remain follow-ups.

2026-05-31 conversion-step explanation surface pin: Pending conversion
step/cost metadata now survives same-hex movement-option summarization and is
exposed in top-down hex attributes, movement badge metadata/title text,
projection overlay attributes, movement option rows, and movement hover tooltip
rows. This keeps the map's explanation layer aligned with the runtime
conversion command and event sequence above instead of hiding conversion work in
projection-only fields.

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

2026-05-26 airborne LAM Fighter ground-projection guard: MegaMek
`LandAirMek.java:365-379` distinguishes grounded Fighter taxi MP from airborne
Fighter thrust/flank MP, `LandAirMek.java:585-610` treats airborne Fighter
terrain entry as unrestricted aerospace flight while applying wheeled/taxing
prohibitions only to grounded aerospace, and `LandAirMek.java:1806-1814` keeps
airborne altitude separate from ground elevation by returning a sentinel
elevation for flying aeros. MekStation now resolves represented airborne LAM
Fighter MP from Fighter thrust but blocks the ground movement projection with a
player-visible aerospace-flight reason rather than falling back to imported Mek
walk/run/jump movement. Browser and commit-validation fixtures prove the same
`InvalidDestination` details, disabled Jump legend, zero rejected-step heat, and
`AERO` invalid badge. Full airborne aerospace flight pathing remains tracked
under the aerospace movement follow-ups.

2026-05-31 airborne LAM AirMek ground-projection guard: MegaMek
`MovementDisplay.java:2276-2291` uses altitude controls when an entity is
airborne and handles grounded WiGE/LAM elevation controls separately,
`MovePath.java:1689-1741` distinguishes airborne WiGE/LAM hover and landing
behavior from normal ground movement, and `Entity.java:12004-12022` defines
airborne VTOL/WiGE state from VTOL/WiGE motive, elevation, and
building/bridge clearance. MekStation now keeps represented airborne LAM
AirMek capability resolution on AirMek WiGE MP/heat/height, but blocks the
ground movement projection with a player-visible airborne-WiGE reason rather
than presenting grounded WiGE movement as legal. Browser and
commit-validation fixtures prove the same `InvalidDestination` details,
zero rejected-step heat, and AirMek MP legend. Full airborne AirMek/WiGE
altitude pathing, hover/takeoff/landing sequencing, velocity/turn behavior,
control rolls, and broader external oracle sweeps remain follow-ups.

2026-05-31 airborne VTOL/WiGE ground-projection guard: MegaMek
`Entity.java:12004-12022` defines airborne VTOL/WiGE state from VTOL/WiGE
motive, elevation, and building/bridge clearance, `MovementDisplay.java:2276-2291`
switches airborne entities to altitude controls instead of ordinary elevation
controls, and `MovePath.java:1689-1741` represents airborne WiGE landing/hover
behavior separately from normal ground movement. MekStation now blocks
represented altitude-positive VTOL/WiGE ground projection with an explicit
altitude-control reason while preserving landed/hover VTOL/WiGE terrain and
elevation projection. Focused projection and commit-validation tests prove the
same `InvalidDestination` details and zero rejected-step heat. The blocked
projection now also surfaces represented altitude-control mode and altitude in
top-down hex metadata, movement badges, invalid badges, accessible labels,
tooltip reason rows, and same-hex option metadata via
`surface-airborne-altitude-control-context`. Full airborne VTOL/WiGE altitude
pathing, hover/takeoff/landing sequencing, clearance, and broad oracle sweeps
remain follow-ups. Represented short-distance WiGE auto-landing is covered by
`auto-land-short-wige-movement`, and the represented prior-distance plus
hover-style exemptions for that auto-landing helper are covered by
`pin-wige-hover-distance-exemptions`. Basic Climb/Descend runtime
altitude-control commands now exist via `wire-vtol-wige-altitude-controls`, but
full UP/DOWN MP accounting and terrain-clearance-specific gates remain pending.

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

2026-05-25 isometric scene explanation pin: Isometric scene hex wrappers now
carry the shared projection explanation, source references, and a readable
title/accessible label before rendering the nested hex cell. This does not
change depth sorting or legality; it keeps the rotatable 2.5D scene wrapper
inspectable from the same per-hex projection as top-down cells and tooltips.

2026-05-25 isometric scene token context pin: Isometric scene token wrappers
now carry a readable title/accessible label summarizing the represented token
state used by the nested renderer: displayed map hex, source hex, facing, unit
type, aerospace altitude/velocity, VTOL/WiGE altitude, fog/last-known state,
combat-projection target state, and terrain-occlusion foreground boost/reason.
This does not add or change tactical legality; it keeps the depth-sorted 2.5D
wrapper inspectable from existing projection, visibility, and unit-state data.

2026-05-26 multi-occluder token summary pin: Isometric terrain occlusion still
comes from the presentation-only terrain/elevation projection, but scene token
wrappers now preserve every active occluder hex, effective elevation, and
reason when more than one tall layer may hide the same unit. The previous
single representative occluder metadata remains for compact compatibility,
while aggregate metadata and the nested token visibility reason keep the
secondary blocker visible to tests and player-facing inspection.

2026-05-25 LOS overlay combat projection context pin: The hover LOS overlay now
receives the hovered `ICombatRangeHex` and exposes projection LOS state, range,
distance, target ids, blocker hex, blocker kind, terrain, and blocker reason on
the overlay group, LOS line, and LOS state badge. This does not change LOS
geometry or attack legality; it ties the visible LOS overlay to the same
rules-backed combat projection evidence used by hex badges and hovers.

2026-05-25 movement cost overlay projection context pin: Movement cost overlay
markers now preserve generic terrain movement cost context while also exposing
the selected unit's shared movement projection when available: movement type,
movement mode, reachability, MP, terrain cost, elevation delta/cost, heat, and
blocked/invalid reasons. This does not change movement legality; it makes the
terrain-cost overlay another rules-backed inspection surface instead of a
terrain-only island.

2026-05-25 firing arc overlay combat projection context pin: Shaded firing-arc
overlay hexes now carry the selected unit's shared combat projection context
when available: projection firing arc, range bracket, distance, in-range/in-arc
state, attackability, target ids, valid target ids, and weapon availability.
This does not change arc geometry or attack legality; it keeps arc shading tied
to the same MegaMek-source-pinned range/arc projection evidence already used by
hex combat badges and attack commands.

2026-05-25 cover overlay combat projection context pin: Cover overlay markers
now carry the selected unit's shared combat target-cover projection when
available: projected cover level, target partial-cover state, cover modifier,
reason, target ids, and valid target ids. Projection-derived horizontal
building/elevation cover can now render a cover marker even when the target hex
terrain alone has no cover marker. This does not change target-cover rules or
attack resolution; it makes the visible cover overlay inspect the same
MegaMek-source-pinned `getTargetCoverInfo` path used by combat projection and
commit previews.

2026-05-25 sensor ring visibility source context pin: Sensor rings now expose
their range, rendered radius, displayed map hex, source unit hex, fog status,
and whether the ring was placed from the current or last-known token position.
This does not change fog, sensor, LOS, or attack legality; it makes the
visibility affordance inspectable so last-known contacts can be understood as
stale display-position rings with a separate represented source position.

2026-05-25 legacy range visual demotion pin: Legacy raw `attackRange` fallback
hexes now use a neutral fill, dashed outline, and explicit `legacy-range`
overlay metadata instead of the same attack-range fill used by weapon-backed
combat projection. This does not change attack legality; it keeps compatibility
range envelopes visible while preventing them from visually claiming the same
status as rules-backed valid attacks.

2026-05-25 overlay projection context pin: Rendered hex overlay paths now carry
the shared projection status, movement/combat channel status, blocked reasons,
source references, explanation, and accessible label that explain why the
highlight exists. This does not change movement, combat, LOS, or terrain
legality; it makes the visible highlight itself inspectable instead of requiring
tests or assistive tooling to climb to the parent hex group for the rules-backed
evidence.

2026-05-25 overlay toggle projection context pin: Movement, cover, firing arc,
and LOS overlay toggles now expose their typed map-layer id, visibility state,
shared tactical projection source, projection channel, and rules surface in
their control metadata and accessible labels. This does not change any
movement/combat legality or layer defaults; it makes the control that reveals a
highlight inspectable from the same projection vocabulary as the rendered hex
overlay.

2026-05-25 out-of-ammo browser projection pin: MegaMek
`ComputeToHitIsImpossible` rejects ammo-using attacks when the linked ammo is
absent or has zero usable shots, and `Mounted.isCrippled` treats ammo weapons
without remaining linked ammo as crippled. The tactical-map browser harness now
renders `scenario=out-of-ammo` with a dry AC/5 selected and proves the target
hex is blocked with `OutOfAmmo`, no available weapons, an `AMMO` invalid badge,
and a hover reason matching attack-resolution details. This does not change
ammo accounting or resolution; it pins the rendered map evidence to the same
projection/engine rejection already covered by focused agreement tests.

2026-05-25 dry-weapon option projection pin: Dry selected weapons now remain in
the tactical-map per-weapon option metadata with their actual range bracket and
a blocked ammo reason. This keeps range inspection intact for the selected AC/5
while preserving `OutOfAmmo` as the aggregate target rejection and leaving
attack resolution unchanged.

2026-05-25 terrain/elevation label projection pin: Top-down and isometric
terrain/elevation labels now expose the shared tactical projection source, the
`terrain-elevation` channel, the `terrain-elevation` rules surface, per-hex
projection intent/status, and the filtered terrain/elevation source reference.
Focused component and browser smoke coverage prove readable labels preserve
represented feature levels, water depths, smoke/fire intensities, and elevation
instead of becoming type-only decoration.

2026-05-25 projection camera control context pin: The top-down/isometric
projection toggle now exposes the shared tactical projection source, view-mode
channel, presentation rules surface, current/target projection modes, and
current isometric heading. Isometric rotate controls expose the same projection
source plus the isometric-camera channel, current heading, and next heading, so
browser and accessibility checks can connect camera actions to the presentation
state that reveals stacked terrain and occluded units.

2026-05-31 isometric touch camera gesture pin: Isometric mode now maps a
two-finger twist on the map surface to the same discrete 60-degree camera
heading state used by button and keyboard rotation, while preserving
single-touch pan and two-finger pinch zoom. The focused map surface exposes the
shared tactical projection source, isometric-camera channel, presentation
rules surface, and touch-rotation control contract so browser and accessibility
checks can verify mobile rotation without recalculating movement, combat, LOS,
terrain, elevation, or visibility state.

2026-05-31 isometric occlusion rotation sweep pin: Rendered isometric scene
tokens, tall-hex occluder highlights, and elevation stacks now expose the
camera rotation step that produced terrain-occlusion metadata. Focused render
coverage rotates the camera 180 degrees with a unit between opposite tall
elevations and verifies that the active occluder retargets to the new foreground
hex while the old occluder highlight disappears. This keeps occlusion
readability tied to the same presentation-only camera state as the shared
tactical projection, without changing movement, combat, LOS, terrain,
elevation, or visibility rules.

2026-05-25 tactical projection rule-reference metadata pin: Tactical projection
source references now also carry rule-reference metadata for terrain/elevation,
movement, combat, LOS blocker, and legacy attack-range fallback channels.
Rendered hexes, overlays, projection badges, terrain/elevation labels, tooltip
containers, and isometric scene wrappers expose those formatted rule references
beside the existing source metadata. This does not change legality; it keeps
tests and accessibility inspection tied to the MegaMek-or-MekStation source
surface that justifies each highlight.

2026-05-25 movement option rule-reference context pin: Per-mode Walk/Run/Jump
movement option rows in movement and combined tactical hovers now expose the
movement-channel source references and MegaMek rule references from the shared
per-hex tactical projection. This does not change movement legality, MP costs,
heat, terrain, elevation, or blocked reasons; it makes each individual option
row inspectable without relying on aggregate hex metadata.

2026-05-25 combat weapon option rule-reference context pin: Per-weapon combat
option rows in combat and combined tactical hovers now expose combat-channel
source references and MegaMek rule references from the shared per-hex tactical
projection. This does not change weapon range, arc, environment, availability,
to-hit, expected damage, or attack validation behavior; it makes each weapon row
inspectable without relying on aggregate combat hex metadata.

2026-05-25 combat to-hit modifier rule-reference context pin: Combat to-hit
modifier rows in combat and combined tactical hovers now expose combat-channel
source references and MegaMek rule references from the shared per-hex tactical
projection. This does not change target-number calculation, modifier values,
modifier sources, attack validation, or attack resolution; it makes each
modifier row inspectable without relying on aggregate combat hex metadata.

2026-05-25 combat weapon impact rule-reference context pin: Per-weapon combat
impact rows in combat and combined tactical hovers now expose combat-channel
source references and MegaMek rule references from the shared per-hex tactical
projection. This does not change weapon heat, listed damage, ammo consumption,
expected damage, attack validation, or attack resolution; it makes each
heat/damage/ammo row inspectable without relying on aggregate combat hex
metadata.

2026-05-25 combat LOS context rule-reference pin: Combat LOS context rows in
combat and combined tactical hovers now expose source references and MegaMek
rule references from the shared per-hex tactical projection while identifying
the row as a line-of-sight rules surface. This does not change LOS state,
blocker selection, terrain/elevation blocker reasoning, target legality,
attack validation, or attack resolution; it makes the visible blocker
explanation inspectable without relying on aggregate combat hex metadata.

2026-05-25 combat C3 context rule-reference pin: Combat C3 context rows in
combat and combined tactical hovers now expose combat-channel source references
and MegaMek rule references from the shared per-hex tactical projection. This
does not change C3 network membership, spotter choice, effective range, target
numbers, modifier values, attack validation, or attack resolution; it makes the
visible C3 range-benefit explanation inspectable without relying on aggregate
combat hex metadata.

2026-05-25 combat environment context rule-reference pin: Combat environment
context rows in combat and combined tactical hovers now expose an
environment-specific source reference from the shared per-hex tactical
projection. A browser harness scenario now covers underwater environment
restrictions with a non-torpedo weapon blocked and a torpedo weapon legal. This
does not change underwater legality, torpedo path legality, target legality,
attack validation, or attack resolution; it makes the visible environment
restriction explanation inspectable without relying on aggregate combat hex
metadata.

2026-05-25 combat visibility context rule-reference pin: Combat visibility
context rows in combat and combined tactical hovers now expose combat-channel
source references and MegaMek rule references from the shared per-hex tactical
projection while also pinning the projected visibility state plus visible and
obscured target IDs. Browser coverage now asserts the same source-backed row for
mixed visible/hidden/last-known contacts. This does not change fog visibility,
target legality, LOS classification, attack validation, or attack resolution;
it makes the visible target-visibility explanation inspectable without relying
on aggregate combat hex metadata.

2026-05-25 combat cover context rule-reference pin: Combat cover context rows in
combat and combined tactical hovers now expose combat-channel source references
and MegaMek rule references from the shared per-hex tactical projection while
pinning the projected cover level, cover modifier, partial-cover flag, and cover
reason. This does not change cover classification, target numbers, LOS
classification, target legality, attack validation, or attack resolution; it
makes the visible cover explanation inspectable without relying on aggregate
combat hex metadata.

2026-05-25 combat minimum-range context rule-reference pin: Combat
minimum-range context rows in combat and combined tactical hovers now expose
combat-channel source references and MegaMek rule references from the shared
per-hex tactical projection while pinning the projected penalty, affected weapon
IDs, and reason. This does not change minimum-range penalty calculation, range
bands, target numbers, target legality, attack validation, or attack
resolution; it makes the visible minimum-range explanation inspectable without
relying on aggregate combat hex metadata.

2026-05-25 combat indirect-fire context rule-reference pin: Combat
indirect-fire context rows in combat and combined tactical hovers now expose
combat-channel source references and MegaMek rule references from the shared
per-hex tactical projection while pinning indirect-fire availability, spotter,
basis, to-hit penalty, spotter gunnery, spotter skill modifier, Forward Observer
cancellation, cancelled penalty, and reason when represented. This does not
change indirect-fire eligibility, spotter election, penalty arithmetic, LOS
rules, target legality, attack validation, or attack resolution; it makes the
visible indirect-fire explanation inspectable without relying on aggregate
combat hex metadata.

2026-05-25 movement reason context rule-reference pin: Movement blocked-reason
rows in movement and combined tactical hovers now expose movement-channel source
references and MegaMek rule references from the shared per-hex tactical
projection while pinning reachability, movement type, movement mode, blocked
reason, engine invalid reason, engine invalid details, and displayed reason.
This does not change movement reachability, MP costs, terrain/elevation costs,
heat, pathfinding, commit validation, or movement resolution; it makes the
visible movement rejection explanation inspectable without relying on aggregate
movement hex metadata.

2026-05-25 movement cost context rule-reference pin: Movement terrain-cost,
elevation-cost, heat, and path rows in movement and combined tactical hovers now
expose movement-channel source references and MegaMek rule references from the
shared per-hex tactical projection while pinning movement type, movement mode,
reachability, MP cost, terrain cost, elevation delta/cost, heat generated, and
path coordinates when represented. This does not change movement reachability,
MP costs, terrain/elevation costs, heat, pathfinding, commit validation, or
movement resolution; it makes the visible movement cost explanation inspectable
without relying on aggregate movement hex metadata.

2026-05-25 movement stand-up context rule-reference pin: Movement stand-up cost,
stand-up PSR, and stand-up modifier rows in movement and combined tactical
hovers now expose movement-channel source references and stand-up-specific
MegaMek rule references from the shared per-hex tactical projection while
pinning stand-up mode, cost, PSR requirement, PSR reason, finite target number,
modifier, impossible reason, and modifier details when represented. This does
not change stand-up MP cost, PSR target computation, modifier computation,
movement reachability, commit validation, or movement resolution; it makes the
visible stand-up movement explanation inspectable without relying on aggregate
movement hex metadata.

2026-05-25 terrain/elevation hover context rule-reference pin: Terrain and
elevation rows in terrain-only, unreachable, movement-only, combat-only, and
combined tactical hovers now expose terrain/elevation-channel source references
and rule references from the shared per-hex tactical projection while pinning
primary terrain, feature levels, elevation, projection intent/status, and
terrain source detail. This does not change terrain generation, terrain labels,
elevation labels, movement reachability, combat legality, LOS classification,
attack validation, or movement/attack resolution; it makes the visible
terrain/elevation explanation inspectable without relying on aggregate
projection metadata.

2026-05-25 combat reason context rule-reference pin: Generic combat reason rows
in combat and combined tactical hovers now expose combat-channel source
references and MegaMek rule references from the shared per-hex tactical
projection while pinning attackability, target IDs, range bracket, distance, LOS
state, firing arc, blocked reason, invalid reason/details, visibility reason,
LOS blocker reason, to-hit reason, indirect-fire reason, cover reason, and the
displayed reason. This does not change range classification, target validity,
LOS classification, to-hit modifiers, weapon option filtering, fog visibility,
attack validation, or attack resolution; it makes the visible final combat
reason inspectable without relying on aggregate combat metadata.

2026-05-25 combat targeting context rule-reference pin: Combat range and
geometry rows in combat and combined tactical hovers now expose combat-channel
source references and MegaMek rule references from the shared per-hex tactical
projection while pinning target presence, attackability, target IDs, valid target
IDs, range bracket, distance, in-range state, in-arc state, LOS state, firing
arc, weapons in range, weapons in arc, and weapons available. This does not
change range classification, firing arc classification, LOS classification,
target validity, weapon option filtering, attack validation, or attack
resolution; it makes range/arc/LOS targeting context inspectable without
relying on aggregate combat metadata.

2026-05-26 runtime movement action agreement pin: Available movement actions now
resolve the same runtime movement capability used by map movement projection and
commit validation before deriving legal destinations. Focused engine coverage
imports a LAM in Mek mode, changes its runtime state to AirMek after session
creation, and proves the AirMek-reachable destination appears in
`getAvailableActions()` before the same path commits with matching MP cost,
heat, and movement event path. This narrows the movement-oracle gap for
runtime conversion changes after import; remaining LAM airborne Fighter/AirMek
ground-clearance submodes, infantry mount/dismount
oracle sweeps, and broader external oracle comparisons remain follow-up work.

2026-05-26 runtime movement commit side-effect pin: Interactive movement
commit now resolves runtime movement capability before validation, stand-up
PSR projection, failed stand-up fallback declaration, heat, and emitted movement
event costs. Focused movement-scenario coverage changes a LAM to AirMek mode
after import and proves a careful-stand projection's AirMek stand-up MP is the
same MP recorded when the stand-up PSR fails. This keeps commit side effects on
the same runtime capability path as movement highlights and available-action
gating; airborne Fighter/AirMek submode coverage and broader external oracle
sweeps remain follow-up work.

2026-05-31 infantry mounted-height precedence pin: movement runtime capability
now resolves live infantry dismount state before stale `unitHeight` values, so
source-pinned unmounted infantry height 0 feeds the same projection and commit
validation path as imported mounted height. The new fixture narrows the
infantry mount follow-up to gameplay events/UI that actually toggle mount
state, plus broad external oracle comparisons.

2026-05-26 underwater weapon environment source pin: Combat environment source
metadata now points underwater/torpedo restriction explanations at MegaMek
`ComputeToHit.java:340-346`, `ComputeToHitIsImpossible.java:543-555`,
`ComputeTerrainMods.java:167-188`, and `FiringArcSpriteHandler.java:570-575`.
Focused combat hover coverage now proves non-torpedo underwater target
restrictions and torpedo water-line failures expose MegaMek-backed source/rule
references instead of the prior pending MekStation-only helper label. This does
not add new underwater range math, surface naval hit-table expansion, or an
official rulebook citation beyond the local MegaMek oracle pin.

2026-05-26 hull-down vehicle front-weapon pin: MegaMek
`ComputeToHitIsImpossible.java:637-643` blocks hull-down `Tank` attackers from
firing front-mounted weapons unless the attack is indirect and returns the
`WeaponAttackAction.FrontBlockedByTerrain` message (`Nearby terrain blocks
front weapons.`). MekStation now preserves vehicle mount metadata from live
weapon status into attack-planning weapons and uses the shared hull-down
restriction helper in combat projection, interactive attack commits, bot attack
commits, and quick-sim weapon loops. Focused projection and interactive
agreement tests prove direct front-mounted hull-down vehicle weapons are blocked
before declaration while front-mounted indirect LRM fire remains available.
Session-level vehicle damage, location-sensitive critical dispatch, represented
ammo/engine/crew/turret/rotor critical availability fallthrough, and initial
target weapon-location availability have since landed; dual-turret split
locations, cargo import parity, and dual-turret split identity remain follow-up
work.

2026-05-31 hull-down movement-exit projection pin: MegaMek `GetUpStep.java`
sets `GET_UP` MP to 2, or 1 when run MP is only 1, and `MoveStep.java:2021-2034`
keeps prone/hull-down Meks from spending ordinary movement until a permitted
`GET_UP`/posture step clears the state at `MoveStep.java:2544-2546`.
MekStation now subtracts the same exit cost from hull-down ground movement
projection, blocks direct hull-down jump commands with the same "stand before
jumping" posture boundary, exposes `hullDownExitRequired`/cost through map
labels, badges, context rows, and DOM metadata, and records
`hullDownExitAttempt` on committed movement so replay clears `hullDown`
without emitting prone stand-up PSR or `UnitStood` events. Remaining hull-down
movement gaps are full vehicle damage-dispatch wiring, not the fixed vehicle
side-table primitive named above.

2026-05-31 hull-down go-prone projection pin: MegaMek `GoProneStep.java`
charges 1 MP only when the unit is not already hull-down, `MoveStep.java:2167-2168`
keeps going prone from hull-down legal at 0 MP, and
`MoveStep.java:2547-2549` applies `GO_PRONE` by setting prone true and
clearing hull-down. MekStation now exposes a Movement-phase Go Prone command
for standing hull-down Mek-style units, rejects non-hull-down/already-prone and
non-Mek-style attempts, records same-hex stationary `MovementDeclared`
metadata with `goProneAttempt` and a 0 MP `goProne` step, and replays the event
by clearing hull-down and setting prone before movement locks. Remaining
hull-down movement gaps are full vehicle damage-dispatch wiring, not the fixed
vehicle side-table primitive named above.

2026-05-31 hull-down entry projection pin: MegaMek `HullDownStep.java`
sets standing `HULL_DOWN` MP to 2, `MoveStep.java:2378-2395` rejects existing
hull-down, non-Mek/non-Tank, stuck, vehicle-mode units outside fortified
terrain, and Meks with destroyed gyros, and `MoveStep.java:2547-2549` applies
`HULL_DOWN` by clearing prone and setting hull-down. MekStation now exposes a
Movement-phase Hull Down command for standing Mek-style units, rejects
already-hull-down, non-Mek-style, insufficient-MP, and destroyed-gyro attempts,
records same-hex walking `MovementDeclared` metadata with
`hullDownEntryAttempt` and a 2 MP `hullDown` step, and replays the event by
setting hull-down before movement locks. Remaining hull-down movement gaps are
full vehicle damage-dispatch wiring, not the fixed vehicle side-table primitive
named above.

2026-05-31 prone hull-down entry-cost pin: MegaMek `HullDownStep.java:61-82`
sets prone Mek `HULL_DOWN` MP to 1 plus non-hip leg actuator crits, plus one
more MP for hip crits, and adds 99 MP when a required biped/quad support
location is bad before `MoveStep.java:2547-2549` clears prone and sets
hull-down. MekStation now preserves actuator critical hits by combat location,
allows prone Mek-style Hull Down commands, prices the same-hex walking
declaration from represented per-location leg/support actuator and hip damage,
rejects destroyed support locations with a 99 MP impossible-cost invalid event,
and replays the declaration by clearing prone and setting hull-down without a
stand-up PSR or `UnitStood` event. Remaining hull-down movement gaps are full
vehicle damage-dispatch wiring, not the fixed vehicle side-table primitive named
above.

## Acceptance Gate

Every tactical mechanic that appears as a map highlight must have:

- A MegaMek path/line or official rule citation.
- A MekStation source path that consumes the same rule-backed projection data.
- Golden fixture cases for legal, costly, blocked, and edge-case outcomes.
- Agreement tests proving preview and committed engine resolution match.

Until those exist, the UI may show experimental previews, but the end-state
claim should remain "source-pinning in progress" rather than "rules complete."
