# Tasks: Audit Timeline

## 1. Core Hooks

- [x] 1.1 Create `useEventTimeline(filters)` hook - paginated event loading
- [x] 1.2 Create `useStateDiff(seqA, seqB)` hook - compute state differences
- [x] 1.3 Create `useCausalityChain(eventId)` hook - traverse causedBy links
- [x] 1.4 Create `useReplayPlayer(gameId)` hook - playback state machine

## 2. Timeline View Components

- [x] 2.1 Create `EventTimelineItem` component - single event display
- [x] 2.2 Create `EventTimeline` component - virtualized list of events
- [x] 2.3 Create `TimelineFilters` component - category, type, context filters
- [x] 2.4 Create `TimelineSearch` component - full-text event search
- [x] 2.5 Create `TimelineDatePicker` component - date range selection
- [x] 2.6 Add "Load More" / infinite scroll pagination

## 3. Diff View Components

- [x] 3.1 Create `CheckpointSelector` component - pick two points to compare
- [x] 3.2 Create `StateDiffPanel` component - side-by-side state display
- [x] 3.3 Create `DiffHighlight` component - highlight changed values
- [x] 3.4 Create `NestedDiff` component - expandable nested object diffs
- [ ] 3.5 Add "before/after mission N" quick selectors (deferred - requires mission context)

## 4. Query Builder Components

- [x] 4.1 Create `QueryBuilder` component - visual query construction
- [x] 4.2 Create `FilterChip` component - active filter display
- [x] 4.3 Create `SavedQueries` component - save/load query presets
- [x] 4.4 Create `QueryResults` component - display matching events
- [x] 4.5 Add export button (JSON, CSV)

## 5. Replay Player Components

- [x] 5.1 Create `ReplayControls` component - play/pause/step-forward/step-back
- [x] 5.2 Create `ReplayTimeline` component - scrubber bar with event markers
- [x] 5.3 Create `ReplaySpeedSelector` component - 0.5x, 1x, 2x, 4x
- [x] 5.4 Create `ReplayEventOverlay` component - show current event description
- [ ] 5.5 Integrate with `GameplayLayout` for hex map + record sheet display (deferred - requires gameplay integration)
- [x] 5.6 Add keyboard shortcuts (space=play/pause, arrows=step)

## 6. Causality Graph Components

- [x] 6.1 Create `CausalityGraph` component - DAG visualization
- [x] 6.2 Create `CausalityNode` component - single event node
- [x] 6.3 Create `CausalityEdge` component - relationship arrow
- [x] 6.4 Implement DAG layout algorithm (hierarchical left-to-right)
- [x] 6.5 Add zoom/pan controls
- [x] 6.6 Add "Why?" button on state values to open causality view

## 7. Page Integration

- [x] 7.1 Create `/audit/timeline` page - standalone timeline browser
- [ ] 7.2 Add "History" tab to `ForceDetailPage` (deferred - requires campaign/force context in events)
- [x] 7.3 Add "Career" tab to `PilotDetailPage` - pilot's event history
- [x] 7.4 Add "Replay" button to completed game detail
- [x] 7.5 Add "Audit Log" to settings page

## 8. Analytics Views (Deferred)

- [ ] 8.1 Create `PilotStatsCard` component - aggregated pilot statistics
- [ ] 8.2 Create `CampaignStatsCard` component - campaign statistics
- [ ] 8.3 Create `EventTypeChart` component - event distribution pie/bar chart
- [ ] 8.4 Create `ActivityHeatmap` component - events over time

## 9. Export & Sharing

- [x] 9.1 Implement JSON export of filtered events (via ExportButton)
- [x] 9.2 Implement CSV export for spreadsheet analysis (via ExportButton)
- [ ] 9.3 Add "Share Replay" - generate shareable replay link (deferred)
- [ ] 9.4 Add "Verification Report" - exportable integrity proof (deferred)

## 10. Testing

- [x] 10.1 Unit tests for timeline hooks (16 tests)
- [x] 10.2 Unit tests for diff computation (19 tests)
- [x] 10.3 Unit tests for causality traversal (18 tests)
- [x] 10.4 Unit tests for replay player hooks (20 tests)
- [ ] 10.5 Component tests for timeline rendering (deferred)
- [ ] 10.6 Component tests for replay controls (deferred)
- [ ] 10.7 E2E test for full replay flow (deferred)
- [ ] 10.8 E2E test for query builder (deferred)
