# Read-only encounter audit and cleanup guide

Open a backup/copy using SQLite read-only mode (`file:<absolute-db-path>?mode=ro`).
Do not run write statements or enable an automatic repair on application startup.
No live database was audited or modified by this change.

## Inventory query

```sql
SELECT id, name, status, game_session_id, created_at, updated_at,
  CASE
    WHEN status NOT IN ('draft', 'ready', 'launched', 'completed')
      THEN 'unknown status'
    WHEN status IN ('draft', 'ready') AND game_session_id IS NOT NULL
      THEN 'editable status retains game linkage'
    WHEN status IN ('launched', 'completed')
      AND (game_session_id IS NULL OR trim(game_session_id) = '')
      THEN 'game status lacks linkage'
    ELSE 'compare linked game history'
  END AS review_reason
FROM encounters
ORDER BY status, updated_at, id;

SELECT game_session_id, count(*) AS encounter_count
FROM encounters
WHERE game_session_id IS NOT NULL
GROUP BY game_session_id
HAVING count(*) > 1;
```

A status alone cannot prove whether a game ended. Compare the linked game ID
against available replay/match history: GameCreated must identify the encounter,
every event must identify the same game, and the ordered log must end with
GameEnded. A replay-index entry alone is insufficient terminal evidence.

## Document-only cleanup

Record encounter ID, stored status/linkage, history location, terminal evidence
(or its absence) and a proposed resolution in an audit document. Retain the
original values. Do not edit the database as part of this lane.

- Launched plus matching terminal history: flag as historical completion debt.
  A valid replay retry may now complete a correctly linked row; this change does
  not scan/backfill it automatically.
- Draft/Ready plus an old game ID: flag stale linkage. New lifecycle writes reject
  adoption/reassignment. A separately reviewed repair must decide whether the
  row represents history or a reusable draft.
- Draft/Ready with no linkage but a matching old skirmish replay: flag missing
  linkage. Do not silently attach it from a submitted completion request.
- Launched/Completed with no game ID, duplicate links, unknown statuses, or
  contradictory history: preserve the row and flag for manual investigation.
- Completed with lost force references stays Completed. Future last-force
  cascades on Launched rows clear both status and session linkage atomically.

The UI/read APIs continue returning stored rows without rewriting them. No table,
column, CHECK constraint, event payload or replay format is changed.
