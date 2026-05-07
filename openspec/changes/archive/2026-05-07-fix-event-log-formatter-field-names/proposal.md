# Fix readable event-log formatter field-name mismatches

## Why

The CLI swarm runner now writes a per-encounter NDJSON event log (`add-always-on-event-log`, archived 2026-05-07). The Python companion formatter at `.claude/format-event-log.py` produces a `*.readable.txt` file for human inspection. When we ran the most recent simulation (`sim-46.jsonl`, 746 events, 43 turns, 2 kills) through the formatter, the readable file showed many empty fields: `from=-`, `roll=-`, `armor_after=-`, `hexesMoved=-`, etc.

Investigation traced the root cause: the formatter reads field names that don't match the canonical names emitted by the engine. The data IS in the JSONL — the formatter just looks for it under the wrong keys.

A second issue: the prior version of the formatter lived at `.claude/format-event-log.py`, which is gitignored — it would not survive a fresh clone. This change moves the file to `scripts/format-event-log.py` (alongside the other tracked Python utilities like `scripts/megameklab-conversion/*.py`) and force-adds it past the `scripts/` ignore rule, matching the existing convention for Python tooling that should be version-controlled.

## What

This change is **Python-only**. It corrects the field-name reads in `scripts/format-event-log.py` so the readable companion file accurately reflects the engine's emitted payloads, and moves the file from the gitignored `.claude/` location into the tracked `scripts/` directory. It also adds a small `coord_to_board_label(coord)` helper that renders `IHexCoordinate` values as MegaMek-standard 4-digit `NNNN` notation (e.g. `0405`) instead of raw axial `(q, r)` pairs — every BattleTech tool / rulebook / MegaMek board file uses the 4-digit form, so the readable output becomes immediately recognizable.

No engine changes. No type-system changes. No effect on the NDJSON wire format. The formatter is a developer-debug companion utility; correcting it is purely a "what humans see when they read the file" fix.

## Impact

- **Affected specs**: `quick-session` — adds a new requirement covering the readable-companion formatter contract (canonical field reads + hex coordinate rendering).
- **Affected code**: `scripts/format-event-log.py` (NEW location; old `.claude/format-event-log.py` was never tracked).
- **Risk**: zero. The script is a one-shot debug tool with no runtime consumers; correcting the reads cannot break anything that previously worked because nothing previously worked here in the first place.
- **Visible improvement**: spot-check any `sim-N.readable.txt` produced after the fix — every move/attack/damage/PSR/heat/ammo line now shows the actual values instead of `-`.

## Out of scope

- Engine schema changes (handled in PR B).
- Movement enrichment (`hexesMoved`, `straightHexes`, `turningMpCost`, `netDisplacement`, `steps`) — handled in PR C.
- Searchable-frame columnar layout rewrite — handled in PR D.
- Structured PSR reason enum — handled in PR E.
