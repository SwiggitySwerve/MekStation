# Tactical Command Interface Research

Date: 2026-05-20

## Research Basis

- Civilization VI keeps the map as the primary workspace and wraps it with a top information band, side tray menus, minimap, action panel, notifications, leader/opponent access, Civilopedia/help, and main menu access.
- Civilization VI interface options expose user-tunable combat speed, movement speed, auto unit cycling, minimap size, touch tooltip delay, zoom speed, and camera movement friction.
- Civilization VI map play distinguishes visible, revealed, and unknown knowledge states; visible tiles show units and current details, revealed tiles retain remembered terrain/permanent features, and unknown tiles hide content.
- MekStation already has specs for tactical map rendering, fog-of-war, replay library, mobile interaction, accessibility, game session management, combat resolution, movement, weapons, physical attacks, heat, and minimap.

## Design Premises

- The combat map is the product surface; panels exist to explain and command the map, not to replace it.
- Every mid-combat fact maps to exactly one primary home and may have secondary peek surfaces.
- Desktop gets persistent border UI; tablet gets collapsible edge trays; phone gets a map-first stack with one bottom sheet open at a time.
- Opponent information is a game-master/match configuration concern, not a one-off component prop.
- Menus use icon-first Civ-like chrome, but BattleTech rules remain engine-owned and axial/top-down.

## Coverage Map

| Surface | Follow-on change |
| --- | --- |
| Main map viewport, border slots, top status, left/right/bottom trays | `add-tactical-command-shell` |
| Unit actions, command menus, disabled reasons, order review | `add-tactical-action-menu-system` |
| Initiative, phases, active unit queue, activation auto-centering | `add-tactical-turn-order-and-phase-rail` |
| Exact/rough/hidden opponent state, GM presets, redaction | `add-configurable-opponent-intel-ui` |
| Own and target unit inspectors, record sheets, damage/heat/ammo drawers | `add-tactical-unit-inspector-drawers` |
| Map lenses, pins, minimap controls, event feed, replay controls | `add-tactical-map-lenses-feed-replay` |
| Desktop/tablet/mobile breakpoints, touch, keyboard, screen reader, reduced motion | `add-responsive-tactical-hud-accessibility` |

## Revisit Triggers

- If the same information appears as a primary element in two panels, consolidate before implementation.
- If mobile requires hiding the map to issue common commands, the layout has failed.
- If opponent intel is implemented in UI without event/state redaction, pause and fix the data contract first.
- If a feature cannot be tested at desktop, tablet, and phone widths, it is not ready for the tactical shell.

## Sources

- Civilization VI owner manual, interface and fog-of-war sections: https://manualzz.com/doc/72610330/2k-civilization-vi-owner-manual
- Civilization VI interface guide, HUD element taxonomy: https://www.gamepressure.com/sidmeierscivilization6/interface/ze92ba
- Existing MekStation OpenSpec specs: `tactical-map-interface`, `fog-of-war`, `replay-library`, `mobile-interaction-patterns`, `accessibility-system`, `game-session-management`
