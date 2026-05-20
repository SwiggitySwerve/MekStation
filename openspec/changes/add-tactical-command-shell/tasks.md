## 1. Shell Contract

- [ ] 1.1 Define `ITacticalShellState`, shell modes, slot ids, and primary-home mapping in gameplay UI types
- [ ] 1.2 Add a shell slot registry that maps phase, actions, inspectors, lenses, event feed, minimap, and replay controls to owners

## 2. Layout Composition

- [ ] 2.1 Create a tactical command shell component around the existing map without wrapping the map in a card
- [ ] 2.2 Move phase banner, action panel, minimap, inspector, and event feed into named slots
- [ ] 2.3 Add pinned/collapsed tray behavior with persistence scoped to the current match

## 3. Mode Integration

- [ ] 3.1 Render combat, replay, spectator, and GM/referee shell modes from the same slot contract
- [ ] 3.2 Disable private commands in spectator mode while preserving public map and feed tools

## 4. Verification

- [ ] 4.1 Component tests for slot ownership, pinned tray persistence, and mode switching
- [ ] 4.2 Playwright screenshot checks at desktop, tablet, and mobile widths proving map remains dominant
- [ ] 4.3 Accessibility check that focus order follows top band, map, action dock, side trays, then feed
