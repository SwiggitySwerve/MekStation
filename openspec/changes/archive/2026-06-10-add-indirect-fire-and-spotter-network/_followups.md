# Follow-ups: Indirect Fire and Spotter Network

Date: 2026-05-23

## Arrow IV / Artillery Change

Future Arrow IV and artillery work should be opened as a separate OpenSpec change, tentatively `add-arrow-iv-artillery`.

Use MegaMek and canon artillery rules as the source-of-truth baseline before implementation. Relevant MegaMek anchors to inspect include:

- `ArtilleryWeaponIndirectFireHandler.java`
- `Compute.scatter` and related artillery deviation logic
- Arrow IV weapon, ammo, homing, and TAG handlers
- TacOps artillery and counter-battery rule paths represented in MegaMek

The separate change should cover:

- Artillery declaration and flight-time behavior, if represented in MekStation.
- Scatter/deviation, including impact resolution when the intended target hex is missed.
- Ammo type handling for standard, homing, smoke, FASCAM, and other supported artillery ammunition as MekStation grows to represent them.
- TAG, semi-guided, and homing interactions distinct from ordinary LRM indirect fire.
- Area damage and target-in-hex effects.
- Counter-battery observation and event-log evidence, if represented.
- Aerospace/off-board artillery boundaries.
- Replay/event payloads and UI overlays that distinguish artillery templates from weapon-row Direct/Indirect mode toggles.

Do not fold Arrow IV or artillery scatter into the current LRM/Mek Mortar indirect-fire path. The current path is intentionally scoped to direct weapon attack declaration with spotter, Forward Observer, and beacon-based indirect-fire modifiers.

## Other Deferred / Archive Notes

- Manual browser playtest has not been completed in this slice. The current manual checklist lives in `playtest-notes.md`.
- Archive this change only after PR review/merge or after an explicit user instruction to archive.
