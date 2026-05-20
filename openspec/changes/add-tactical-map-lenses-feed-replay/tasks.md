## 1. Lens Model

- [ ] 1.1 Define tactical lens presets mapped to map layer ids and intensity defaults
- [ ] 1.2 Add lens state selectors for movement, attack, intel, terrain, objective, and survival views

## 2. Pins and Minimap

- [ ] 2.1 Add tactical pin model with coordinate, label, category, scope, and created turn/phase
- [ ] 2.2 Render pins on map and minimap with layer visibility controls
- [ ] 2.3 Add GM/public/side/local pin projection behavior

## 3. Feed and Replay

- [ ] 3.1 Add feed row map-focus handlers and event priority grouping
- [ ] 3.2 Add replay timeline controls synchronized with map, rail, inspectors, and feed
- [ ] 3.3 Persist or derive replay map terrain/elevation/objective source

## 4. Verification

- [ ] 4.1 Unit tests for lens-to-layer mapping and feed priority
- [ ] 4.2 Component tests for pin visibility and feed row focus
- [ ] 4.3 Replay test proving non-clear terrain map restores without placeholder fallback
