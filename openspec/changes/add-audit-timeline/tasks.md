# Tasks: Audit Timeline

## 1. Core Hooks

- [ ] 1.1 Create `useEventTimeline(filters)` hook - paginated event loading
- [ ] 1.2 Create `useStateDiff(seqA, seqB)` hook - compute state differences
- [ ] 1.3 Create `useCausalityChain(eventId)` hook - traverse causedBy links
- [ ] 1.4 Create `useReplayPlayer(gameId)` hook - playback state machine

## 2. Timeline View Components

- [ ] 2.1 Create `EventTimelineItem` component - single event display
- [ ] 2.2 Create `EventTimeline` component - virtualized list of events
- [ ] 2.3 Create `TimelineFilters` component - category, type, context filters
- [ ] 2.4 Create `TimelineSearch` component - full-text event search
- [ ] 2.5 Create `TimelineDatePicker` component - date range selection
- [ ] 2.6 Add "Load More" / infinite scroll pagination

## 3. Diff View Components

- [ ] 3.1 Create `CheckpointSelector` component - pick two points to compare
- [ ] 3.2 Create `StateDiffPanel` component - side-by-side state display
- [ ] 3.3 Create `DiffHighlight` component - highlight changed values
- [ ] 3.4 Create `NestedDiff` component - expandable nested object diffs
- [ ] 3.5 Add "before/after mission N" quick selectors

## 4. Query Builder Components

- [ ] 4.1 Create `QueryBuilder` component - visual query construction
- [ ] 4.2 Create `FilterChip` component - active filter display
- [ ] 4.3 Create `SavedQueries` component - save/load query presets
- [ ] 4.4 Create `QueryResults` component - display matching events
- [ ] 4.5 Add export button (JSON, CSV)

## 5. Replay Player Components

- [ ] 5.1 Create `ReplayControls` component - play/pause/step-forward/step-back
- [ ] 5.2 Create `ReplayTimeline` component - scrubber bar with event markers
- [ ] 5.3 Create `ReplaySpeedSelector` component - 0.5x, 1x, 2x, 4x
- [ ] 5.4 Create `ReplayEventOverlay` component - show current event description
- [ ] 5.5 Integrate with `GameplayLayout` for hex map + record sheet display
- [ ] 5.6 Add keyboard shortcuts (space=play/pause, arrows=step)

## 6. Causality Graph Components

- [ ] 6.1 Create `CausalityGraph` component - DAG visualization
- [ ] 6.2 Create `CausalityNode` component - single event node
- [ ] 6.3 Create `CausalityEdge` component - relationship arrow
- [ ] 6.4 Implement DAG layout algorithm (hierarchical left-to-right)
- [ ] 6.5 Add zoom/pan controls
- [ ] 6.6 Add "Why?" button on state values to open causality view

## 7. Page Integration

- [ ] 7.1 Create `/audit/timeline` page - standalone timeline browser
- [ ] 7.2 Add "History" tab to `CampaignDetailPage`
- [ ] 7.3 Add "Career" tab to `PilotDetailPage` - pilot's event history
- [ ] 7.4 Add "Replay" button to completed game detail
- [ ] 7.5 Add "Audit Log" to settings/admin area

## 8. Analytics Views

- [ ] 8.1 Create `PilotStatsCard` component - aggregated pilot statistics
- [ ] 8.2 Create `CampaignStatsCard` component - campaign statistics
- [ ] 8.3 Create `EventTypeChart` component - event distribution pie/bar chart
- [ ] 8.4 Create `ActivityHeatmap` component - events over time

## 9. Export & Sharing

- [ ] 9.1 Implement JSON export of filtered events
- [ ] 9.2 Implement CSV export for spreadsheet analysis
- [ ] 9.3 Add "Share Replay" - generate shareable replay link
- [ ] 9.4 Add "Verification Report" - exportable integrity proof

## 10. Testing

- [ ] 10.1 Unit tests for timeline hooks
- [ ] 10.2 Unit tests for diff computation
- [ ] 10.3 Unit tests for causality traversal
- [ ] 10.4 Component tests for timeline rendering
- [ ] 10.5 Component tests for replay controls
- [ ] 10.6 E2E test for full replay flow
- [ ] 10.7 E2E test for query builder
