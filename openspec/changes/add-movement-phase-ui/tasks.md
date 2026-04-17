# Tasks: Add Movement Phase UI

## 1. Movement Planning State

- [ ] 1.1 Extend `useGameplayStore` with `plannedMovement: {unitId,
destination, path, mpType, facing} | null`
- [ ] 1.2 Add selector `getPlannedMovement(unitId)` returning the plan or
      `null`
- [ ] 1.3 Clearing plan on phase change or deselect

## 2. Reachable Hex Derivation

- [ ] 2.1 On Player-side selection during Movement phase, compute reachable
      hexes for walk MP, run MP, and jump MP using existing pathfinder
- [ ] 2.2 Memoize per selected unit; invalidate on unit facing or
      destination change
- [ ] 2.3 Expose as `IReachableHex[]` with `{hex, mpCost, mpType,
reachable}`

## 3. Reachable Overlay Rendering

- [ ] 3.1 Render overlay tiles over reachable hexes
- [ ] 3.2 Walk-range tiles use green (`#bbf7d0`)
- [ ] 3.3 Run-range tiles use yellow (`#fef08a`)
- [ ] 3.4 Jump-range tiles use blue (`#bfdbfe`) with distinct pattern
- [ ] 3.5 Each tile shows its MP cost as small text

## 4. Path Preview on Hover

- [ ] 4.1 Hovering a reachable hex triggers pathfind from current unit
      position to that hex
- [ ] 4.2 Path hexes highlighted with a yellow tint
- [ ] 4.3 Cumulative MP cost displayed at the destination hex
- [ ] 4.4 Hovering an unreachable hex shows a red "Unreachable" tooltip

## 5. Destination Commit

- [ ] 5.1 Clicking a reachable hex commits the destination in
      `plannedMovement`
- [ ] 5.2 Path preview becomes the locked-in path
- [ ] 5.3 Clicking a different reachable hex replaces the plan

## 6. Facing Picker

- [ ] 6.1 Once a destination is committed, a facing picker appears over
      the destination hex
- [ ] 6.2 Picker shows six arrow buttons (one per `Facing` value)
- [ ] 6.3 Clicking an arrow sets `plannedMovement.facing`
- [ ] 6.4 Default facing is the travel direction of the last path segment

## 7. MP Type Switcher

- [ ] 7.1 Action panel shows MP type buttons: Walk, Run, Jump
- [ ] 7.2 Switching MP type re-derives reachable hexes and clears the
      current path if the destination is no longer reachable
- [ ] 7.3 Units that can't jump have the Jump button disabled

## 8. Move Commit Button

- [ ] 8.1 "Commit Move" button appears in the action panel once a plan is
      valid (destination + facing chosen)
- [ ] 8.2 Clicking dispatches `MovementLocked` event via the session
- [ ] 8.3 Unit token animates from origin to destination along the planned
      path
- [ ] 8.4 After animation, plan is cleared and selection moves to the next
      unit owed a lock

## 9. Movement Heat Preview

- [ ] 9.1 Action panel shows "Heat this turn: +X" below the MP type
      buttons
- [ ] 9.2 Walk=+1, Run=+2, Jump=max(3, jumpMP) per canonical rules
- [ ] 9.3 Value updates live as MP type changes

## 10. Phase Boundary Behavior

- [ ] 10.1 Movement UI only renders during `GamePhase.Movement`
- [ ] 10.2 Opponent-controlled units never show a reachable overlay
      (player can't plan opponent moves)
- [ ] 10.3 When phase exits Movement, all planned-move state is cleared

## 11. Tests

- [ ] 11.1 Unit test: reachable hex derivation matches pathfinder output
      for a standard mech with 5 walk MP
- [ ] 11.2 Unit test: switching from walk to run expands the overlay
- [ ] 11.3 Integration test: select → pick hex → pick facing → commit
      appends a `MovementLocked` event
- [ ] 11.4 Integration test: clicking unreachable hex does not commit a
      plan

## 12. Spec Compliance

- [ ] 12.1 Every requirement in `movement-system` delta has at least one
      scenario
- [ ] 12.2 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [ ] 12.3 `openspec validate add-movement-phase-ui --strict` passes clean
