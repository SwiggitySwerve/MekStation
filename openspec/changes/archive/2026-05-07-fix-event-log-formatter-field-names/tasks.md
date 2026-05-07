# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md
- [x] 1.2 Author quick-session spec delta with the formatter contract requirement and seven coverage scenarios

## 2. Implementation

- [x] 2.1 Move formatter from gitignored `.claude/format-event-log.py` to tracked `scripts/format-event-log.py`
- [x] 2.2 Add `coord_to_board_label(coord)` helper (axial `(q, r)` → offset `(col, row)` → 4-digit `NNNN`)
- [x] 2.3 Fix `movement_declared` branch — read `from` / `to` (`IHexCoordinate` dicts), render via `coord_to_board_label`; read `mpUsed`; render `hexesMoved` as `-` until PR C lands
- [x] 2.4 Fix `attack_resolved` branch — read `roll` not `rolled2d6`; read `toHitNumber` not `rolledTN`
- [x] 2.5 Fix `damage_applied` branch — read `armorRemaining` not `armorAfter`; read `structureRemaining` not `structureAfter`
- [x] 2.6 Fix `psr_resolved` branch — read `roll` not `rolled2d6`
- [x] 2.7 Fix `heat_dissipated` branch — read `breakdown.baseDissipation` instead of nonexistent `heatSinkCount`
- [x] 2.8 Fix `ammo_consumed` branch — read `binId` not `ammoBinId`; read `roundsConsumed` not `amount`
- [x] 2.9 Fix `ammo_explosion` branch — read `binId` not `ammoBinId`
- [x] 2.10 Fix `turn_ended` branch — read `turn` from envelope (`e['turn']`) not from payload
- [x] 2.11 Verify pilot_hit branch already reads `totalWounds` correctly
- [x] 2.12 Re-run formatter on `simulation-reports/games/2026-05-07T00-40-00-129Z/sim-46.jsonl` and spot-check 6 representative event types — every line shows real values, no `-` placeholders for fields that are populated in JSONL

## 3. Validation

- [x] 3.1 Run `npx openspec validate fix-event-log-formatter-field-names --strict` — clean
- [x] 3.2 Diff the regenerated `sim-46.readable.txt` against the prior version — `from=-`, `roll=-`, `armor_after=-`, `struct_after=-`, `sinks=-`, `bin=-` placeholders gone

## 4. PR

- [ ] 4.1 Commit on branch `event-log/pr-a-formatter-bugs` (force-add `scripts/format-event-log.py` past gitignore)
- [ ] 4.2 Open PR against `main` with title `fix(event-log-formatter): correct field-name reads + add MegaMek 4-digit hex labels`
- [ ] 4.3 Wait for CI green
- [ ] 4.4 Merge with `--squash --delete-branch`

## 5. Archive

- [ ] 5.1 After merge, run `npx openspec archive fix-event-log-formatter-field-names --yes` — clean
- [ ] 5.2 Open archive PR; merge
