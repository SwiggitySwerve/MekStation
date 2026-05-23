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
- [ ] Source-check and fixture special combat cases against BattleTech/MegaMek: C3, indirect fire handoff, underwater/torpedo restrictions, minimum/short/medium/long/extreme range policy, and physical attack target legality.
  - [x] Weapon-backed map projection now preserves represented extreme range and agrees with committed engine attacks for extreme bracket/to-hit.
  - [x] Physical attack target range now agrees between map highlights and committed declarations: non-adjacent unit targets are not highlighted and direct commits resolve as impossible.
  - [x] Physical punch/kick elevation legality now agrees between command preview rows and committed declarations, using MegaMek-style target vertical spans.
  - [x] Physical push target legality now agrees between command preview rows and committed declarations for represented unit type, facing, prone, and same-elevation gates.
  - [x] Physical push missing-arm legality now agrees between command preview rows and committed declarations using represented destroyed arm locations.
  - [x] Physical push building-target legality now agrees between command preview rows and committed declarations for the represented outside-attacker/target-in-building case.

## 3. Movement highlight agreement

- [x] Audit current movement overlay data flow and identify any UI-local legality or cost calculations.
- [x] Add preview-vs-commit fixtures for walking, running, jumping, facing, elevation changes, terrain costs, and blocked elevation/terrain.
- [ ] Source-check unit-type edge cases against BattleTech/MegaMek: ground vehicles, VTOL/hover, infantry, battle armor, ProtoMechs, prone/standing, water, pavement/roads, and jump landing restrictions.
  - [x] Ground vehicles, VTOL/hover, water, pavement/roads, and jump landing restrictions have source-pinned projection/commit fixtures.
  - [x] Adapter preserves generated vehicle cruise/flank MP, infantry and battle armor ground/jump MP, mechanized infantry motive modes, and explicit ProtoMech run MP before map projection.
  - [x] Normal prone stand-up MP is source-pinned into walk/run projection, heat-reduced Stand Up command availability, prone Jump command blocking, standalone Stand Up command dispatch, commit validation, PSR success/failure event outcomes, moving-after-stand PSR gating, destroyed-leg-plus-both-arms impossible stand gates, represented PSR modifier details, map/dock stand-up badges/tooltips/reasons, and post-move prone state clearing.
  - [x] TacOps careful stand now has source-pinned projection/commit coverage: whole-turn walk-MP cost when walk MP is above 2, -2 stand-up PSR modifier, rejected paired destination movement, `standUpMode: 'careful'` event metadata, and a dedicated dock action.
  - [x] Represented Infantry, Battle Armor, ProtoMech, vehicle, and aerospace movement now separates pathing motive mode from Mek-style movement heat, so walk-like non-Mek movement projects and commits 0 movement heat.
  - [ ] Add remaining optional arm/quirk/TacOps stand-up modifiers not represented by current unit state, infantry-specific terrain/heat rules, UMU/frogman/swim movement, and special ProtoMech/Battle Armor movement fixtures.
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
- [ ] Archive the change only after movement, combat, terrain/elevation, fog, and isometric acceptance cases are implemented and passing.
