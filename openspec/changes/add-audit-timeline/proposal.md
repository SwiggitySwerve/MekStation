# Change: Add Audit Timeline

## Why

With the unified event store capturing all state changes, users need ways to **view, navigate, and understand** this history. Different use cases need different views:

- **Debugging**: "What happened? Show me the events leading to this state"
- **Storytelling**: "Show my pilot's career as a narrative timeline"
- **Verification**: "Prove this campaign wasn't tampered with"
- **Analytics**: "How many kills does this pilot have across all campaigns?"
- **Time Travel**: "Let me go back to turn 3 and see what I could have done differently"

The audit timeline provides multiple view modes for these use cases.

## What Changes

- Add **Timeline View** - chronological event feed with filtering
- Add **Diff View** - compare any two states side-by-side
- Add **Query Builder** - search/filter events with saved queries
- Add **Replay Player** - animated game playback with scrubbing
- Add **Causality Graph** - visualize cause-effect chains
- Integrate views into campaign, pilot, and game detail pages

## Dependencies

- `add-unified-event-store` - Event data source (REQUIRED)
- Existing gameplay UI components for replay integration

## Impact

- Affected specs: `audit-timeline` (new capability)
- Affected code: `src/components/audit/`, `src/hooks/useAuditTimeline.ts`
- New pages: `/audit/timeline`, integrated tabs on existing pages
- Performance: Virtualized lists for large event sets

## Success Criteria

- [ ] View chronological event timeline with category/type filtering
- [ ] Compare any two checkpoint states side-by-side
- [ ] Search events by type, actor, time range, content
- [ ] Replay completed games with play/pause/step/scrub
- [ ] Visualize causality chains as interactive graph
- [ ] Export event data as JSON for external analysis
