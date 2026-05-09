# Problems — link-encounters-to-replays

Problems encountered + how they were resolved. New entries at top.

## [2026-05-08] PR1 — auto-format hook reformatted edits

**Problem**: oxfmt re-formatted several files immediately after Edit calls (single-quote → consistent reflow, import-group rearrangement). `format:check` flagged 7 files as needing reformat after the initial Edit batch.

**Resolution**: Ran `npm run format` once at the end of the implementation phase to flip everything to canonical. Re-ran `format:check`, `typecheck`, and the focused tests — all clean. Lesson: don't trust per-Edit formatting; always run `npm run format` once before commit, even if individual edits looked clean.
