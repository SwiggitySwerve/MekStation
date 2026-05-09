# Issues — link-encounters-to-replays

Open issues / questions encountered. New entries at top.

## [2026-05-08] PR1 — none

PR1 shipped without surfacing any blockers. The exhaustiveness guard in `ReplayLibraryPage.tsx` was anticipated and stubbed; the `_exhaustive: never = source` guard in `backfill-scan.ts` was anticipated and the matching `buildEncounterEntry` case added.
