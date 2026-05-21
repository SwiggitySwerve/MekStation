## 1. Command Model

- [x] 1.1 Define tactical command ids, categories, availability result, disabled reason, preview, and commit contracts
- [x] 1.2 Add adapters for movement, facing, weapon attack, physical attack, heat/end, utility, and GM/referee command families

## 2. UI Surfaces

- [x] 2.1 Build action dock command groups for current phase and active unit
- [x] 2.2 Add token and hex context menus powered by the same command registry
- [x] 2.3 Add command tooltips, disabled reasons, and confirmation/cancel controls

## 3. Preview Integration

- [x] 3.1 Connect movement previews to path/facing overlays
- [x] 3.2 Connect weapon and physical attack previews to to-hit, heat, ammo, range, and damage displays
  > Weapon `toHit` + range band wired from the existing `hitChance` surface; physical attack `kind` + attack-type plumbed. Heat cost / ammo usage / expected damage / physical to-hit / self-damage / PSR-flag fields are STUBBED with `// TODO(wave-7.3)` markers awaiting the lens-feed-replay engine projection landing in Phase 7.3.

## 4. Verification

- [x] 4.1 Unit tests for command availability and disabled reasons by phase
- [x] 4.2 Component tests for dock/context menu parity
- [x] 4.3 E2E test for move preview cancel, move commit, attack preview, attack commit, and end phase warning
