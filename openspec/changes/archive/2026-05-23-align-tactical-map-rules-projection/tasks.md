# Tasks: Align Tactical Map Rules Projection

## 1. OpenSpec and source-truth scaffolding

- [x] Create active OpenSpec change `align-tactical-map-rules-projection`.
- [x] Record source-truth policy: official BattleTech first, MegaMek tactical oracle, MekHQ campaign/scenario only.
- [x] Add tactical-map rules-projection proposal, design, and spec delta.
- [x] Keep this task list updated as game-logic and feature work lands.

## 2. Combat highlight agreement

- [x] Pin fog visibility grid mismatch with focused tests: hidden/last-known targets clear valid/active target state.
- [x] Pin weapon-backed combat projection so stale raw `attackRange` cannot override configured weapons.
- [x] Pin selected-weapon firing-arc overlay so rear-mounted weapons shade rear arcs and destroyed-only weapon lists hide arc shading.
- [x] Add combat projection fixtures for range bands, LOS/cover invalid reasons, ammo/heat projection, and multi-weapon volley display.
- [x] Source-check and fixture special combat cases against BattleTech/MegaMek: C3, indirect fire handoff, underwater/torpedo restrictions, minimum/short/medium/long/extreme range policy, and physical attack target legality.
  - [x] Weapon-backed map projection now preserves represented extreme range and agrees with committed engine attacks for extreme bracket/to-hit.
  - [x] Minimum/short/medium/long/extreme range policy is source-pinned against MegaMek range brackets and committed to-hit modifiers, including ground-to-ground minimum-range penalties and airborne/aerospace minimum-range exemption.
  - [x] Underwater and torpedo attack legality now source-pins represented underwater-target blocking, torpedo-only water targets, torpedo whole-line water checks, and preview/commit invalid reason agreement.
  - [x] C3 network spotter range now source-pins preview/commit agreement for represented direct attacks, including the C3-improved range bracket and spotter metadata while preserving indirect-fire separation.
  - [x] Indirect-fire spotter handoff now source-pins represented spotter movement penalties: run/jump spotters remain legal with MegaMek-style +2/+3 movement adds, infantry/BA spotters ignore the movement add, and map preview agrees with committed attack declaration.
  - [x] Physical attack target range now agrees between map highlights and committed declarations: non-adjacent unit targets are not highlighted and direct commits resolve as impossible.
  - [x] Physical punch/kick elevation legality now agrees between command preview rows and committed declarations, using MegaMek-style target vertical spans.
  - [x] Physical push target legality now agrees between command preview rows and committed declarations for represented unit type, facing, prone, and same-elevation gates.
  - [x] Physical push missing-arm legality now agrees between command preview rows and committed declarations using represented destroyed arm locations.
  - [x] Physical push building-target legality now agrees between command preview rows and committed declarations for the represented outside-attacker/target-in-building case.

## 3. Movement highlight agreement

- [x] Audit current movement overlay data flow and identify any UI-local legality or cost calculations.
- [x] Add preview-vs-commit fixtures for walking, running, jumping, facing, elevation changes, terrain costs, and blocked elevation/terrain.
- [x] Source-check unit-type edge cases against BattleTech/MegaMek: ground vehicles, VTOL/hover, infantry, battle armor, ProtoMechs, prone/standing, water, pavement/roads, and jump landing restrictions.
  - [x] Ground vehicles, VTOL/hover, water, pavement/roads, and jump landing restrictions have source-pinned projection/commit fixtures.
  - [x] Adapter preserves generated vehicle cruise/flank MP, infantry and battle armor ground/jump MP, mechanized infantry motive modes, and explicit ProtoMech run MP before map projection.
  - [x] Normal prone stand-up MP is source-pinned into walk/run projection, heat-reduced Stand Up command availability, prone Jump command blocking, standalone Stand Up command dispatch, commit validation, PSR success/failure event outcomes, moving-after-stand PSR gating, destroyed-leg-plus-both-arms impossible stand gates, represented PSR modifier details, map/dock stand-up badges/tooltips/reasons, and post-move prone state clearing.
  - [x] TacOps careful stand now has source-pinned projection/commit coverage: whole-turn walk-MP cost when walk MP is above 2, -2 stand-up PSR modifier, rejected paired destination movement, `standUpMode: 'careful'` event metadata, and a dedicated dock action.
  - [x] Represented Infantry, Battle Armor, ProtoMech, vehicle, and aerospace movement now separates pathing motive mode from Mek-style movement heat, so walk-like non-Mek movement projects and commits 0 movement heat.
  - [x] Represented non-mechanized Infantry and Battle Armor terrain profiles now source-pin doubled elevation MP and the woods-entry discount into projection/commit agreement.
  - [x] Represented UMU, biped-swim, and quad-swim movement modes now source-pin water-depth MP exemptions, with UMU run-into-water preview/commit agreement.
  - [x] Represented biped-swim and quad-swim movement now source-pins underwater movement against MegaMek: swim destinations require water terrain, represented ground-elevation rises do not add MP while swimming, and flat UMU swim heat is exposed in preview and commit.
  - [x] Represented Frogman movement now source-pins the MegaMek depth-2+ water surcharge reduction and keeps preview/commit MP and heat aligned.
  - [x] Special ProtoMech and Battle Armor movement fixtures now prove represented explicit ProtoMech run MP and Battle Armor VTOL/no-heat movement stay aligned between preview and commit.
  - [x] Represented TacOps Fast Infantry Movement now source-pins MegaMek Infantry/BattleArmor run-MP fallback and keeps fast infantry run preview/commit movement aligned.
  - [x] Represented TacOps Attempting to Stand destroyed-arm modifiers now source-pin MegaMek's +2 per destroyed arm and keep preview/commit PSR target numbers aligned.
  - [x] Represented no/minimal-arms stand-up quirk now source-pins MegaMek's +2 modifier and override of TacOps arm checks through adapter, preview, and commit coverage.
  - [x] Represented side-specific arm-actuator TacOps stand-up modifiers now source-pin MegaMek's first failed hand/lower/upper/shoulder actuator per arm and keep preview/commit PSR target numbers aligned.
  - [x] Adapter source fields now preserve represented TacOps stand-up arm-actuator data from nested/flat movement source fields into shared movement capability.
  - [x] Represented Playtest2 trying-to-stand now source-pins MegaMek's optional `playtest_2` -1 stand-up PSR modifier and keeps preview/commit target numbers aligned.
  - [x] Represented TacOps Infantry Pavement Bonus now source-pins MegaMek's optional `tacops_inf_pave_bonus` gate for motorized/tracked/wheeled/hover infantry and keeps preview/commit road-bonus movement aligned.
- [x] Ensure highlighted walk/run/jump ranges expose MP cost, heat, elevation delta, terrain reason, and invalid reason.

## 4. Terrain and elevation readability

- [x] Ensure top-down hexes expose terrain type and readable elevation number at all playable zoom levels.
- [x] Verify overlay stacking keeps terrain, elevation, movement, path, LOS, cover, firing arcs, fog, and tokens legible.
- [x] Add visual/browser checks for Antiyoy-like top-down clarity adapted to BattleTech terrain/elevation data.

## 5. Isometric map functionality

- [x] Ensure isometric mode consumes the same projection data as top-down mode.
- [x] Add stacked elevation/layer rendering tests or visual checks.
- [x] Add camera rotation controls for isometric battlefield inspection.
- [x] Add occlusion aids so units behind high terrain can still be selected, highlighted, and inspected.
- [x] Add top-down/isometric parity fixtures for the same tactical state.

## 6. Verification and archive readiness

- [x] Run `npx.cmd openspec validate align-tactical-map-rules-projection --strict`.
- [x] Run focused tactical-map tests for changed projection behavior.
- [x] Run `npm.cmd run typecheck`.
- [x] Run `npx.cmd oxlint`.
- [x] Run visual/browser verification for top-down and isometric mode before archive.
- [x] Archive the change only after movement, combat, terrain/elevation, fog, and isometric acceptance cases are implemented and passing.
