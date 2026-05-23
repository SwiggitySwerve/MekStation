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

## 3. Full combat validation catalog

- [ ] 3.1 Expand weapon attack action coverage across every weapon family and ammo family.
- [x] 3.1.1 Cross-link every ammunition compatibility support row into the official-ammo requirement checklist.
- [x] 3.1.2 Integrate TAG and standard NARC `DesignatorMarkerApplied` replay state through reducer tests, validation catalog rows, and OpenSpec coverage while leaving iNARC pod variants helper-only.
- [ ] 3.2 Expand movement validation coverage for terrain costs, disallowed terrain, facing changes, prone/stand-up, jumping, and movement damage.
- [x] 3.2.1 Cross-link movement, terrain, LOS, attack-modifier, heat, and PSR support rows into movement/terrain requirement checklists.
- [ ] 3.3 Expand heat validation coverage for buildup, dissipation, shutdown, ammo explosions, pilot damage, and heat-driven modifiers.
- [x] 3.3.1 Cross-link every heat rule support row into heat generation, dissipation, and lifecycle requirement checklists.
- [ ] 3.4 Expand to-hit validation coverage for range, movement, terrain, pilot skills, special abilities, quirks, sensors, prone state, and indirect fire.
- [x] 3.4.1 Add support-matrix tests that separate runner-integrated to-hit modifiers from helper-only modifier math.
- [x] 3.4.2 Cross-link pilot skill, SPA, canonical SPA, quirk, and pilot modifier resolver support rows into pilot/SPAs/quirks requirement checklists.
- [x] 3.4.3 Cross-link range bracket, attack invalidation, invalid target state, invalid side-effect, and to-hit modifier support rows into range/invalidation/to-hit requirement checklists.
- [x] 3.4.4 Integrate source-backed DFA Infantry/Battle Armor target-class to-hit modifiers through helper, eligibility, event-sourced declaration, and runner resolution.
- [x] 3.4.5 Integrate source-backed DFA attacker-minus-target piloting skill differential through helper, eligibility, event-sourced declaration, and runner resolution.
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
