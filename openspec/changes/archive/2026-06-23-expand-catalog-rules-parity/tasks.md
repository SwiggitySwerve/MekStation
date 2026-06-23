## 1. Baseline and Inventory

- [x] 1.1 Capture current `npm.cmd run validate:combat:gaps -- --format=summary` output and identify target refs for this wave.
- [x] 1.2 Inspect `battlemechCombatCatalog.*` fragments and current support maps to avoid duplicating existing covered rows.
- [x] 1.3 Identify official ranged weapon, ammunition, physical weapon, and special-family rows still relying on partial/helper/unsupported support.

## 2. Catalog Classification Contract

- [x] 2.1 Confirm the typed catalog parity classification helper covers integrated, partial, helper-only, modifier-only, unsupported, and out-of-scope rows.
- [x] 2.2 Confirm tests prove every targeted official row is classified exactly once.
- [x] 2.3 Confirm no-fallback assertions prevent synthetic/static equipment rows from counting as official support.

## 3. Equipment and Ammunition Mapping

- [x] 3.1 Confirm official equipment catalog load tests cover ranged weapons, ammunition, and physical weapons.
- [x] 3.2 Confirm ammunition compatibility tests cover special ammo families including Artemis, NARC, Streak, LB-X, RAC, UAC, AMS, and MML-style rows.
- [x] 3.3 Ensure unmapped official ammo rows remain explicit unresolved or out-of-scope gaps.

## 4. Ranged Weapon Rules Parity

- [x] 4.1 Confirm focused tests cover UAC, RAC, and LB-X catalog-driven modes and heat/damage/range behavior.
- [x] 4.2 Confirm focused tests cover Streak, Artemis, NARC, TAG, AMS, cluster, and MML-style behavior classification.
- [x] 4.3 Confirm combat validation support rows and source refs are current for proven special-family behavior.

## 5. Physical Weapon Rules Parity

- [x] 5.1 Confirm official physical weapon catalog tests cover standalone runtime attacks.
- [x] 5.2 Confirm modifier-only classification tests prevent claws/talons-style equipment from becoming selectable attack support.
- [x] 5.3 Keep unsupported or construction-only physical rows explicit in the gap inventory.

## 6. Known-Limitations and Gap Gates

- [x] 6.1 Confirm tests prove targeted catalog failures are not hidden by broad `knownLimitations` suppression.
- [x] 6.2 Add `validate:combat:gaps` expectation flags for rows closed by this wave and rows that must remain explicit.
- [x] 6.3 Confirm no gap evidence text or source refs required row changes because unresolved gap inventory is zero.

## 7. Validation and Archive

- [x] 7.1 Run focused catalog parity Jest fragments touched by this wave.
- [x] 7.2 Run `npm.cmd run validate:combat:gaps`, `npm.cmd run validate:combat`, `npm.cmd run verify:rules`, `npm.cmd run typecheck`, `npm.cmd run format:check`, and `git diff --check`.
- [x] 7.3 Run `openspec.cmd validate expand-catalog-rules-parity --strict`.
- [x] 7.4 Sync specs, archive the change, and rerun `openspec.cmd validate --all --strict`.
- [ ] 7.5 Commit with Lore trailers, open a PR, wait for CI, merge, reset to `origin/main`, and prune local branch state.
