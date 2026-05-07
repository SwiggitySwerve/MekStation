# Tasks — add-replay-timeline-markers

## 1. Authoring

- [x] 1.1 Author `proposal.md`
- [x] 1.2 Author spec delta for `combat-analytics` (1 ADDED + 1 MODIFIED requirement)
- [x] 1.3 Author `tasks.md`
- [x] 1.4 `npx openspec validate add-replay-timeline-markers --strict` clean

## 2. Reducer arm — ComponentDestroyed + CriticalHitResolved → armorPipState

- [x] 2.1 Modify `src/hooks/replay/useHexMapStateFromEvents.ts`:
  - Extend `UnitAccumulator` with optional `armorPipState` field (Mech-only)
  - Add `applyComponentDestroyed(acc, event, locationDestroyedSet)` helper:
    - Init `armorPipState` lazily on first damage with archetype derived from `unit.unitType` / `isQuad` / `isLAM` and all locations set to `'full'`
    - Mutate the affected location: `'full' → 'partial'` if external; `'full' | 'partial' → 'structure'` if internal component; `→ 'destroyed'` if `LocationDestroyed` has fired
    - Internal-component allowlist: `engine`, `gyro`, `weapon`, `actuator`, `heat_sink`, `cockpit`, `sensor`, `life_support`, `jump_jet`, `ammo`
  - Wire `case GameEventType.ComponentDestroyed` and `case GameEventType.CriticalHitResolved` in the reducer switch
  - Skip non-Mech units silently (no throw, no mutation)
  - Surface `armorPipState` only on the public Mech token projection

## 3. Marker components

- [x] 3.1 Create `src/components/audit/replay/KeyMomentMarkers.tsx`:
  - Props: `{ events, minSequence, maxSequence, onSeek, className? }`
  - Filter via `EventLogQuery.from(events)` (or inline filter for the 5 types if Query has no `.ofType()` overload covering all)
  - Map color: red / orange / purple / yellow / gray
  - Click → `onSeek((sequence - minSeq) / (maxSeq - minSeq))`
- [x] 3.2 Create `src/components/audit/replay/PhaseChangeMarkers.tsx`:
  - Props: same shape
  - Filter for `TurnStarted` + `PhaseChanged`
  - Render dotted vertical line + hover tooltip "Turn N — <phase>"

## 4. Wire into ReplayTimeline

- [x] 4.1 Modify `src/components/audit/replay/ReplayTimeline.tsx`:
  - Add optional `keyMoments?: readonly IGameEvent[]` and `phaseChanges?: readonly IGameEvent[]` props
  - Compose `<KeyMomentMarkers>` and `<PhaseChangeMarkers>` as overlays above the existing track when the props are present
  - Forward the existing seek callback to overlays
  - Existing audit markers continue to render unchanged
- [x] 4.2 Modify `src/components/audit/replay/index.ts` — re-export `KeyMomentMarkers` and `PhaseChangeMarkers`

## 5. Wire into existing replay surfaces

- [x] 5.1 Modify `src/pages/gameplay/games/[id]/replay.tsx`:
  - Pass `uploadedEvents` (when in upload mode) to `<ReplayTimeline keyMoments phaseChanges>`
- [x] 5.2 Modify `src/components/quickgame/QuickGameReplayPanel.tsx`:
  - Pass `events` to `<ReplayTimeline keyMoments phaseChanges>`

## 6. Tests

- [x] 6.1 Create `src/components/audit/replay/__tests__/KeyMomentMarkers.test.tsx`:
  - Position test: 2 markers at correct relative positions
  - Color test: marker color matches event type
  - Click test: `onSeek` called with expected position
  - Empty-log test: no badges render
- [x] 6.2 Create `src/components/audit/replay/__tests__/PhaseChangeMarkers.test.tsx`:
  - Position + count test for `TurnStarted` + `PhaseChanged`
  - Tooltip-on-hover smoke test
  - Empty-log test
- [x] 6.3 Modify `src/hooks/replay/__tests__/useHexMapStateFromEvents.test.ts`:
  - Scenario: ComponentDestroyed populates Mech `armorPipState` (humanoid + quad)
  - Scenario: First external-component event transitions `full → partial`
  - Scenario: Internal-component event transitions to `structure`
  - Scenario: LocationDestroyed + ComponentDestroyed transitions to `destroyed`
  - Scenario: ComponentDestroyed on a Vehicle is a no-op (no throw, no `armorPipState`)
  - Scenario: CriticalHitResolved follows same logic

## 7. Verification

- [x] 7.1 `npx tsc --noEmit` clean
- [x] 7.2 `npx oxlint src/hooks/replay/ src/components/audit/replay/` clean (no new errors)
- [x] 7.3 `npx jest --testPathPattern="(KeyMomentMarkers|PhaseChangeMarkers|useHexMapStateFromEvents)"` green
- [x] 7.4 `npx openspec validate add-replay-timeline-markers --strict` clean
- [ ] 7.5 Smoke: load the standalone replay page with an NDJSON; verify red badges at unit-destroyed events, orange at crits, dotted lines at turn boundaries; click a badge → scrubber seeks; mech tokens render damage progression on the hex map

## 8. PR

- [ ] 8.1 Commit (`feat(replay): add key-moment timeline markers + ComponentDestroyed armorPipState arm`)
- [ ] 8.2 Push branch `replay-viewer/pr-a3-timeline-markers`
- [ ] 8.3 Open PR targeting `main`
- [ ] 8.4 CI green
- [ ] 8.5 Merge (squash, delete branch)

## 9. Archive

- [ ] 9.1 `openspec archive add-replay-timeline-markers`
- [ ] 9.2 Verify `combat-analytics` source-of-truth absorbed both deltas
