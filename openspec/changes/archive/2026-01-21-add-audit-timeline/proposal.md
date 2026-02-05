# Change: Add Audit Timeline

## Why

With the unified event store capturing all state changes, users need ways to view and navigate this history. The audit timeline provides multiple views for different use cases:

- Timeline feed for narrative/storytelling
- Diff view for debugging
- Query interface for analytics
- Replay player for game review

## What Changes

- Add timeline view component (chronological event feed)
- Add diff view component (compare two states)
- Add event query builder UI
- Add replay player with scrubbing
- Add causality graph visualization
- Integrate views into existing pages

## Dependencies

- `add-unified-event-store` - Event data source
- Existing gameplay UI components

## Impact

- Affected specs: `audit-timeline` (new capability)
- Affected code: `src/components/audit/`, `src/pages/audit/`
- New pages: Audit timeline, campaign history, pilot career
- UI components for timeline, diff, replay

## Success Criteria

- [ ] View chronological event timeline with filtering
- [ ] Compare any two states side-by-side
- [ ] Search events by type, actor, time
- [ ] Replay games with play/pause/scrub
- [ ] Trace causality chains visually
