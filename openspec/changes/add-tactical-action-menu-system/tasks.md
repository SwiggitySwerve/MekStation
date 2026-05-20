## 1. Command Model

- [ ] 1.1 Define tactical command ids, categories, availability result, disabled reason, preview, and commit contracts
- [ ] 1.2 Add adapters for movement, facing, weapon attack, physical attack, heat/end, utility, and GM/referee command families

## 2. UI Surfaces

- [ ] 2.1 Build action dock command groups for current phase and active unit
- [ ] 2.2 Add token and hex context menus powered by the same command registry
- [ ] 2.3 Add command tooltips, disabled reasons, and confirmation/cancel controls

## 3. Preview Integration

- [ ] 3.1 Connect movement previews to path/facing overlays
- [ ] 3.2 Connect weapon and physical attack previews to to-hit, heat, ammo, range, and damage displays

## 4. Verification

- [ ] 4.1 Unit tests for command availability and disabled reasons by phase
- [ ] 4.2 Component tests for dock/context menu parity
- [ ] 4.3 E2E test for move preview cancel, move commit, attack preview, attack commit, and end phase warning
