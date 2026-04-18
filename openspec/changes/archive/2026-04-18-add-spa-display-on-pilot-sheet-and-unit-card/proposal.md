# Change: Add SPA Display on Pilot Sheet and Unit Card

## Why

Once a pilot owns SPAs (via the editor change), players expect to see them
anywhere the pilot is surfaced: the in-game pilot-mech unit card shown on
the tactical map, the pilot detail sheet, and the printable record sheet
exported via the `RecordSheetService`. Right now, the SPA picker and
editor drop abilities onto the pilot record, but nothing reads them back
in the player-facing chrome. This change closes the loop by rendering
SPA badges with category color, hover tooltips showing full descriptions,
and a dedicated SPA section on the printed record sheet.

Phase 5 runs in parallel with Phases 1, 2, and 3. This change is
presentational — it reads the existing pilot record and extends the
record-sheet export pipeline. It does not change engine behaviour and
will not conflict with Lane A/B/C engine work.

## What Changes

- Add SPA badges to `PilotSection` in `PilotMechCard` — rendered as
  compact pills with category color, displayName, designation (when
  present), and a hover tooltip showing full description and source.
- Add a "Special Abilities" section to the pilot detail page next to the
  career stats — expanded form of the same badges, grouped by category.
- Extend `RecordSheetService` so PDF output includes a Special Abilities
  section below the pilot block, listing each SPA with displayName,
  designation, and a truncated one-line description.
- Add a shared `SPABadge` component under `src/components/spa/SPABadge/`
  used by the unit card, the pilot sheet, and the record-sheet preview.

## Dependencies

- **Requires**: `add-spa-picker-component` (provides catalog lookup
  utilities reused in the badge), `add-pilot-spa-editor-integration`
  (populates the pilot's `abilities` array in the first place),
  existing `RecordSheetService` at `src/services/printing/`.
- **Related**: can land in parallel with Phases 1/2/3.
- **Required By**: `add-spa-designation-persistence` (the display
  surfaces here are what make persisted designation visible).

## Impact

- Affected specs: `spa-ui` (MODIFIED — adds badge and record-sheet
  display requirements), `pilot-system` (MODIFIED — pilot sheet SHALL
  render abilities), `record-sheet-export` (MODIFIED — PDF/SVG output
  SHALL include the abilities section).
- Affected code: `src/components/pilot-mech-card/PilotSection.tsx`
  (adds badge row), `src/pages/gameplay/pilots/[id].tsx` (adds expanded
  section alongside existing stats), `src/services/printing/
RecordSheetService.ts` + `svgRecordSheetRenderer/` (render the new
  section), new `src/components/spa/SPABadge/SPABadge.tsx`.
- Non-goals: in-game gameplay use of SPAs (combat layer already wired
  in Phase 0), persisted designation types beyond what the pilot record
  currently carries (handled by `add-spa-designation-persistence`).
- Database: no schema change.
