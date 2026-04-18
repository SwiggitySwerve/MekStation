# Tasks: Add Skirmish Setup UI

## 1. Pre-battle Page Scaffold

- [x] 1.1 Route `/gameplay/encounters/[id]/pre-battle` renders a dedicated
      setup layout (not the combat layout)
- [x] 1.2 Load the existing encounter via `useEncounterStore.getEncounter`
      and short-circuit with a 404 placeholder if not found
- [ ] 1.3 Page has a single submit affordance "Launch Skirmish" that stays
      disabled until config validates

## 2. Per-side Unit Picker

- [ ] 2.1 Each side (Player, Opponent) exposes exactly two unit slots
- [ ] 2.2 Clicking a slot opens a searchable picker populated from the
      active unit vault
- [ ] 2.3 Picker filters duplicate selections within a side (no same mech
      twice on one team)
- [ ] 2.4 Selected unit displays designation, tonnage, BV, chassis silhouette

## 3. Per-side Pilot Picker

- [ ] 3.1 Each unit slot exposes a linked pilot slot
- [ ] 3.2 Pilot picker lists saved pilots with Gunnery/Piloting shown
- [ ] 3.3 Assigning a pilot already on another unit moves them, not
      duplicates
- [ ] 3.4 Launch is blocked until all four units have pilots

## 4. Map Radius Selection

- [x] 4.1 Radius control presents discrete options (5, 8, 12, 17) with live
      hex-count labels
- [ ] 4.2 Changing radius updates the map preview immediately
- [ ] 4.3 Default radius is 8 hexes (standard BattleTech battlefield)

## 5. Terrain Preset Selection

- [x] 5.1 Preset selector lists at least four presets: Open, Woods, Urban,
      Mountains
- [ ] 5.2 Selecting a preset loads its terrain map into the preview
- [ ] 5.3 Legend renders next to the preview showing each terrain color
- [x] 5.4 Custom terrain is explicitly marked out of scope and hidden

## 6. Deployment Zones

- [ ] 6.1 Each side has a deployment zone highlighted on the preview
- [ ] 6.2 Zone overlays use side colors (blue=Player, red=Opponent) at
      reduced opacity
- [ ] 6.3 Zones are determined by preset + radius (no free placement yet)
- [ ] 6.4 Hovering a zone shows a tooltip with hex count and side name

## 7. Launch Handshake

- [ ] 7.1 Clicking "Launch Skirmish" invokes the existing
      `preBattleSessionBuilder` with the collected config
- [ ] 7.2 The helper produces an `InteractiveSession` and a session id
- [ ] 7.3 On success, navigate to `/gameplay/games/[id]`
- [ ] 7.4 On failure, display a toast and leave the user on the setup
      screen with their selections intact

## 8. Validation Surface

- [ ] 8.1 Validation errors surface inline next to the offending field
- [ ] 8.2 "Launch Skirmish" tooltip explains why it's disabled when config
      is incomplete
- [ ] 8.3 Encounter already in `launched` or `completed` state prevents
      re-launch with a friendly message

## 9. Spec Compliance

- [x] 9.1 All new requirements in `game-session-management` spec delta have
      at least one GIVEN/WHEN/THEN scenario
- [x] 9.2 All new requirements in `tactical-map-interface` spec delta have
      at least one GIVEN/WHEN/THEN scenario
- [x] 9.3 Run `openspec validate add-skirmish-setup-ui --strict` clean

## 10. Tests

- [ ] 10.1 Unit test: launching with missing pilot blocks submission
- [ ] 10.2 Unit test: radius change recalculates hex count in preview
- [ ] 10.3 Unit test: same pilot assigned to two units moves rather than
      duplicates
- [ ] 10.4 Integration test: full happy-path (pick units, pilots, preset,
      radius, launch) produces a live session id
