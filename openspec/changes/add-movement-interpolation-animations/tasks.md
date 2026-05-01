# Tasks: Add Movement Interpolation Animations

## 1. Movement Event Schema

- [x] 1.1 Ensure `MovementCommitted` event carries full path (array of
      axial coordinates) plus MP mode (walk | run | jump)
- [x] 1.2 If event currently only stores destination, migrate: compute
      path on commit and embed in payload
- [x] 1.3 Backfill logic for older event streams (replay uses instant
      fallback)
- [x] 1.4 Unit tests for path serialization

## 2. Animation Queue Store

- [x] 2.1 Create `src/stores/useAnimationQueue.ts`
- [x] 2.2 Methods: `enqueue(animation)`, `onComplete(callback)`,
      `isActive`
- [x] 2.3 Session phase advancement reads `isActive` and waits until
      queue drains
- [x] 2.4 Queue is FIFO per map; concurrent per-unit animations allowed
      only when animations do not overlap hexes
- [x] 2.5 Unit tests for queue ordering

## 3. Movement Tween Hook

- [x] 3.1 Create `useMovementTween(path, mode, onDone)` hook
- [x] 3.2 Walk: 300ms per hex segment, linear easing
- [x] 3.3 Run: 180ms per hex segment, linear easing
- [x] 3.4 Jump: single 600ms tween from start to destination with a
      parabolic y offset (peak at 20% of jump distance, min 24px lift)
- [x] 3.5 Expose current interpolated `{x, y, facing, scale}` for the
      token renderer
- [x] 3.6 Call `onDone` when the tween completes

## 4. Token Renderer Integration

- [x] 4.1 `UnitToken.tsx` consumes tween output and renders the token
      at the interpolated position
- [x] 4.2 Facing rotates over the path duration (ease-in-out) to the
      final committed facing
- [x] 4.3 Token pulls itself to the top of the z-order while animating
- [x] 4.4 Animation cleanly removes itself on unmount

## 5. Phase Advancement Gate

- [x] 5.1 Hook `useGameplayStore` phase advancement behind
      `useAnimationQueue.isActive`
- [x] 5.2 When animations are pending, phase advancement is deferred
- [x] 5.3 On `prefers-reduced-motion`, the gate is bypassed (instant
      teleport, instant advancement)
- [x] 5.4 Integration test: two units move sequentially; second move
      waits for first animation to finish

## 6. Reduced Motion Fallback

- [x] 6.1 Detect `window.matchMedia('(prefers-reduced-motion: reduce)')`
- [x] 6.2 When reduced motion is enabled, `useMovementTween` returns
      the final position immediately and calls `onDone` synchronously
- [x] 6.3 Jump arc flattens to a straight snap
- [x] 6.4 Unit test: reduced-motion mode fires `onDone` within one tick

## 7. Jump Arc Visual

- [x] 7.1 During a jump tween, draw a faint arc indicator from start
      to destination for the duration of the animation
- [x] 7.2 Arc fades in during the first 100ms, fades out in the last
      100ms
- [x] 7.3 Arc color uses the jump-MP color (blue) to reinforce mode
- [x] 7.4 Arc respects reduced motion (hidden when enabled)

## 8. Event Log Sync

- [x] 8.1 Event log entries remain synchronized with animation
      completion — a `MovementResolved` log line appears when the
      tween calls `onDone`
- [x] 8.2 Heat / PSR events that fire from movement are held until
      tween completes, then flushed
- [x] 8.3 Integration test: heat entry in log appears after animation
      settles, not before

## 9. Performance

- [x] 9.1 Tween uses `requestAnimationFrame`, not `setInterval`
- [x] 9.2 Tween cancellations on unmount are leak-free
- [x] 9.3 Profile: 4 simultaneous tweens should stay above 55 FPS on a
      30x30 map

## 10. Tests

- [x] 10.1 Unit test: `useMovementTween` walk covers 3 hexes in
      ~900ms +/- frame tolerance
- [x] 10.2 Unit test: run mode completes in ~540ms for 3 hexes
- [x] 10.3 Unit test: jump tween y offset peaks near the midpoint
- [x] 10.4 Unit test: reduced-motion mode skips timing
- [x] 10.5 Integration test: committing a 4-hex walk produces a tween
      that holds phase advancement, then releases

## 11. Spec Compliance

- [x] 11.1 Every requirement in `tactical-map-interface` delta has a
      GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `movement-system` delta has a scenario
- [x] 11.3 `openspec validate add-movement-interpolation-animations
--strict` passes clean
