# Tasks: Add BattleMech Combat Validation Suite

## 1. OpenSpec + catalog workflow

- [x] 1.1 Create active OpenSpec change for combat validation suite headway.
- [x] 1.2 Add catalog contract requirement for combat actions, modifiers, legality gates, and unsupported gaps.
- [x] 1.3 Keep `docs/audits/2026-05-22-combat-validation-source-truth.md` updated as source-truth audit evidence.
- [x] 1.4 Add OpenSpec validation to routine combat feature verification.

## 2. Physical attack legality gates

- [x] 2.1 Catalog physical core actions: punch, kick, club, charge, push, death from above, and physical weapons.
- [x] 2.2 Integrate push no-arms quirk, same-elevation, attacker-not-prone, target-not-prone, destination-valid, and target-directly-ahead gates.
- [x] 2.3 Integrate DFA attacker-not-prone gate on top of existing jump requirement.
- [x] 2.4 Cover integrated gates through helper, event-sourced session, runner, and catalog contract tests.
- [x] 2.5 Integrate shared adjacent-range gate for helper, event-sourced declaration, and runner physical target selection.
- [x] 2.6 Integrate shared self-target gate for helper and event-sourced declaration paths.
- [x] 2.7 Integrate shared friendly-target gate for helper, event-sourced declaration, and runner physical target selection.
- [x] 2.8 Integrate shared target-exists gate for helper, event-sourced declaration, and stale declaration resolution paths.
- [x] 2.9 Integrate shared target-not-destroyed gate for helper, event-sourced declaration, stale declaration resolution, and runner physical target selection.
- [x] 2.10 Integrate push arm-fired weapon gate for helper, event-sourced declaration, and runner resolution through hydrated weapon mount locations while preserving conservative rejection for unknown fired weapon ids.
- [x] 2.11 Integrate push both-arms-present gate for helper, eligibility, event-sourced declaration, and runner resolution through unit destroyed-location state.
- [x] 2.12 Integrate push attacker/target Mek unit-type gates for helper, eligibility, event-sourced declaration, and runner resolution through explicit combat unit-type state.
- [x] 2.13 Integrate charge standing-Mek target gate for helper, eligibility, event-sourced declaration, and runner resolution through target unit type and prone state.
- [x] 2.14 Integrate charge elevation-overlap gate for helper, eligibility, event-sourced declaration, and runner resolution through source-backed BattleMech height/elevation band checks.
- [x] 2.15 Integrate DFA infantry-family attacker gate for helper, eligibility, event-sourced declaration, and runner resolution through explicit combat unit-type state.
- [x] 2.16 Integrate non-Mek charge target-class gate for helper, eligibility, event-sourced declaration, and runner resolution through Infantry/Battle Armor/ProtoMech unit-type checks.
- [x] 2.17 Integrate charge target movement-complete/immobile gate for helper, eligibility, event-sourced declaration/resolution, and runner post-movement resolution through source-backed target movement-complete checks.
- [x] 2.18 Integrate push quad BattleMech rejection for helper, eligibility, event-sourced declaration, and runner resolution through optional combat chassis state.
- [x] 2.19 Integrate push rear-flipped-arm rejection for helper, eligibility, event-sourced declaration, and runner resolution through optional combat arm-posture state.
- [x] 2.20 Integrate shared transported-passenger target rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat transport state.
- [x] 2.21 Integrate shared swarming-target rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat swarm state.
- [x] 2.22 Integrate shared evading-attacker rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat evasion state.
- [x] 2.23 Integrate shared target-making-DFA rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat DFA lifecycle state.
- [x] 2.24 Integrate shared building-occupancy rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat building state.
- [x] 2.25 Integrate shared airborne-target rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat airborne state.
- [x] 2.26 Integrate push airborne-attacker rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat airborne state.
- [x] 2.27 Integrate shared loading/unloading-cargo attacker rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat cargo-interaction state.
- [x] 2.28 Integrate shared same-board rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat board identity.
- [x] 2.29 Integrate charge/DFA displacement-state rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat displacement lifecycle state.
- [x] 2.30 Integrate push displacement-state and counter-push rejection for helper, eligibility, event-sourced declaration/resolution, and runner resolution through optional combat displacement lifecycle ownership state.
- [x] 2.31 Integrate DFA target movement-complete/immobile gate for helper, eligibility, and event-sourced declaration/resolution while preserving runner physical resolution as post-movement complete.
- [ ] 2.32 Implement remaining physical unsupported gaps: remaining target class restrictions, full displacement-chain consequences, forbidden terrain displacement, and pilot skill roll fallout.
- [x] 2.32.1 Add helper-level target object gates for invalid physical hex targets and push building/fuel-tank rejection while leaving runtime non-unit target commands explicit out of scope.
- [x] 2.32.2 Add helper-level DFA VTOL/WIGE elevation-reach gate while leaving runtime VTOL/WIGE motion-state hydration explicit out of scope.
- [x] 2.32.3 Add helper-level DFA mechanical jump booster rejection while leaving runtime movement-step hydration explicit out of scope.
- [x] 2.32.4 Add helper-level charge/DFA building and fuel-tank target rejection while leaving gun-emplacement automatic-success semantics explicit out of scope.
- [x] 2.32.5 Integrate source-backed retractable blade damage, to-hit, optional extended-mode legality, runtime intent/wire validation, and runner resolution while leaving physical weapon mode hydration explicit out of scope.
- [x] 2.32.6 Add source-backed talon kick/DFA damage modifiers through explicit combat state/context while leaving mounted-equipment hydration and non-biped talon locations explicit out of scope.
- [x] 2.32.7 Hydrate biped BattleMech talon leg state from catalog critical slots so source-backed talon kick/DFA modifiers apply to real unit data, while leaving destroyed/missing/breached talon lifecycle and non-biped talon behavior explicit out of scope.
- [x] 2.32.8 Add source-backed claw punch damage/to-hit modifiers through explicit combat state/context plus catalog arm critical-slot hydration, while keeping claws non-selectable and destroyed/missing/breached claw lifecycle explicit out of scope.
- [x] 2.32.9 Add source-backed flail and wrecking-ball runtime attacks with constant damage, to-hit modifiers, intent/wire support, runner coverage, and catalog boundary updates while leaving full mounted physical-weapon lifecycle explicit out of scope.
- [x] 2.32.10 Add source-backed gun-emplacement automatic-success outcomes for punch, kick, DFA, and runtime melee physical attacks, including runner/event metadata, while initially leaving non-unit building/fuel-tank target resolution and BattleMech charge gun-emplacement target-class rejection explicit.
- [x] 2.32.11 Add source-backed BattleMech displacement elevation-cap checks for push/charge/DFA displacement helpers, event-sourced resolution, and runner resolution while leaving domino-chain, friendly-avoidance, and DropShip-radius displacement edges explicit.
- [x] 2.32.12 Refresh runner physical-phase grid occupancy after displacement payloads so later same-phase displacement legality sees newly occupied hexes, while leaving domino-chain, friendly-avoidance, and DropShip-radius displacement edges explicit.
- [x] 2.32.13 Add source-backed BattleMech charge gun-emplacement target-class rejection coverage through helper, eligibility, event-sourced declaration, and runner resolution inputs while preserving gun-emplacement automatic-hit coverage for punch, kick, DFA, and melee.

## 3. Full combat validation catalog

- [ ] 3.1 Expand weapon attack action coverage across every weapon family and ammo family.
- [x] 3.1.1 Cross-link every ammunition compatibility support row into the official-ammo requirement checklist.
- [x] 3.1.2 Integrate TAG and standard NARC `DesignatorMarkerApplied` replay state through reducer tests, validation catalog rows, and OpenSpec coverage while leaving iNARC pod variants helper-only.
- [x] 3.1.3 Integrate source-backed iNARC Homing marker state, direct NARC-compatible missile cluster modifier consumption, runner to-hit modifier consumption, and replay coverage while leaving ECM/Haywire/Nemesis pod effects helper-only.
- [x] 3.1.4 Integrate source-backed iNARC Haywire attacker to-hit modifier consumption and replay coverage while leaving remaining ECM/Nemesis pod effects helper-only.
- [x] 3.1.5 Integrate source-backed selected-ammo iNARC pod variant attachment for Homing, ECM, Haywire, and Nemesis while leaving remaining ECM/Nemesis pod effects helper-only.
- [x] 3.1.6 Integrate source-backed attacker iNARC ECM flight-path suppression for Artemis IV/prototype IV/V cluster guidance as part of incremental iNARC ECM coverage.
- [x] 3.1.7 Integrate source-backed iNARC Nemesis redirect for direct confusable missile attacks against friendly intervening Nemesis pod carriers while leaving remaining iNARC ECM helper work explicit.
- [x] 3.1.8 Integrate source-backed helper-level iNARC ECM C3 disruption while leaving automatic C3 network formation and remaining sensor effects explicit.
- [ ] 3.2 Expand movement validation coverage for terrain costs, disallowed terrain, facing changes, prone/stand-up, jumping, and movement damage.
- [x] 3.2.1 Cross-link movement, terrain, LOS, attack-modifier, heat, and PSR support rows into movement/terrain requirement checklists.
- [x] 3.2.2 Integrate source-backed active TSM movement speed into runner movement validation while leaving MASC, supercharger, and then-unsupported partial-wing movement behavior explicit.
- [x] 3.2.3 Integrate source-backed Partial Wing jump MP and jump-heat behavior through explicit runner movement capability state while leaving atmosphere and damaged critical-slot refinements explicit.
- [ ] 3.3 Expand heat validation coverage for buildup, dissipation, shutdown, ammo explosions, pilot damage, and heat-driven modifiers.
- [x] 3.3.1 Cross-link every heat rule support row into heat generation, dissipation, and lifecycle requirement checklists.
- [ ] 3.4 Expand to-hit validation coverage for range, movement, terrain, pilot skills, special abilities, quirks, sensors, prone state, and indirect fire.
- [x] 3.4.1 Add support-matrix tests that separate runner-integrated to-hit modifiers from helper-only modifier math.
- [x] 3.4.2 Cross-link pilot skill, SPA, canonical SPA, quirk, and pilot modifier resolver support rows into pilot/SPAs/quirks requirement checklists.
- [x] 3.4.3 Cross-link range bracket, attack invalidation, invalid target state, invalid side-effect, and to-hit modifier support rows into range/invalidation/to-hit requirement checklists.
- [x] 3.4.4 Integrate source-backed DFA Infantry/Battle Armor target-class to-hit modifiers through helper, eligibility, event-sourced declaration, and runner resolution.
- [x] 3.4.5 Integrate source-backed DFA attacker-minus-target piloting skill differential through helper, eligibility, event-sourced declaration, and runner resolution.
- [x] 3.4.6 Integrate explicit runner C3 network state consumption for direct weapon attack to-hit while leaving automatic C3 equipment/network formation and C3 spotter LOS hydration explicit.
- [x] 3.4.7 Align hull-down to-hit with MegaMek's +2 terrain modifier and thread explicit runner hull-down state into weapon attack declaration and hit-location resolution.
- [x] 3.4.8 Integrate source-backed Dodge Maneuver target to-hit gating through canonical SPA ids, explicit target dodging state, and explicit non-Mek target exclusion.
- [ ] 3.5 Expand lifecycle coverage for destruction, ejection, withdrawal, terminal events, turn-rotation removal, and targetability.
- [x] 3.5.1 Cross-link damage, destruction-cause, critical-effect, pilot-damage, PSR-resolution, PSR-trigger, and critical-slot hydration support rows into damage/death/PSR requirement checklists.
- [x] 3.5.2 Cross-link lifecycle, parity, event-stream, and validation-scope support rows into lifecycle/scope requirement checklists.
- [x] 3.5.3 Integrate source-backed DFA impossible-displacement destruction through helper, event-sourced resolution, runner resolution, and destruction-cause catalog coverage.
- [x] 3.5.4 Integrate source-backed successful-DFA attacker PSR +4 through helper, event-sourced resolution, runner resolution, PSR catalog, and audit coverage.
- [x] 3.5.5 Integrate source-backed missed-DFA immediate fall damage/prone timing through helper, event-sourced resolution, runner resolution, event catalog, and audit coverage.
- [x] 3.5.6 Integrate source-backed missed-DFA fall pilot-damage avoidance through helper, event-sourced resolution, runner resolution, pilot-damage catalog, and audit coverage.
- [x] 3.5.7 Integrate source-backed blocked successful-charge displacement no-op/no-PSR semantics through helper, event-sourced resolution, runner resolution, catalog, and audit coverage.
- [x] 3.5.8 Integrate ejected-target physical targetability removal/rejection through helper, eligibility, event-sourced declaration/resolution, runner target selection, catalog, and audit coverage.
- [x] 3.5.9 Integrate retreated-target physical targetability removal/rejection through helper, eligibility, event-sourced declaration/resolution, runner target selection, catalog, and audit coverage.

## 4. Source-truth cross-checks

- [x] 4.1 Cross-check current physical legality gates against MegaMek behavior notes.
- [x] 4.2 Add source anchors for remaining physical gaps before marking them integrated.
- [ ] 4.3 Cross-check weapon, heat, movement, SPA, quirk, and lifecycle rows against rulebook/MegaMek/MekHQ references before implementation claims.
- [x] 4.3.1 Add structured MegaMek source anchors for heat-induced ammo explosion threshold and ammo-bin selection behavior.
- [x] 4.3.2 Add structured MegaMek source anchors for ejection original-unit removal and post-battle ejected-count behavior.
- [x] 4.3.3 Add structured MegaMek source anchors for TAG and NARC marker application, TAG turn clearing, and iNARC variant scope.
- [x] 4.3.4 Add structured MegaMek source anchors for ECM suite and active-probe hydration rows used by Artemis ECM countering.
- [x] 4.3.5 Add structured MegaMek source anchors for Artemis cluster, indirect-fire, ECM, and stealth suppression rows.
- [x] 4.3.6 Add structured MegaMek source anchors for secondary-target, Multi-Tasker, local Multi-Target, and called-shot modifier boundaries.
- [x] 4.3.7 Add structured MegaMek source anchors for active TSM walk/run movement validation.
- [x] 4.3.8 Add structured MegaMek source anchors for Dodge Maneuver target to-hit modifier gating.
- [x] 4.3.9 Add structured MegaMek source anchors for Partial Wing jump movement and heat behavior.
