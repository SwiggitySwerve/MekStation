# Tasks: Add Movement Interpolation Animations

## 1. Movement Event Schema

- [ ] 1.1 Ensure `MovementCommitted` event carries full path (array of
      axial coordinates) plus MP mode (walk | run | jump)
- [ ] 1.2 If event currently only stores destination, migrate: compute
      path on commit and embed in payload
- [ ] 1.3 Backfill logic for older event streams (replay uses instant
      fallback)
- [ ] 1.4 Unit tests for path serialization

## 2. Animation Queue Store

- [ ] 2.1 Create `src/stores/useAnimationQueue.ts`
- [ ] 2.2 Methods: `enqueue(animation)`, `onComplete(callback)`,
      `isActive`
- [ ] 2.3 Session phase advancement reads `isActive` and waits until
      queue drains
- [ ] 2.4 Queue is FIFO per map; concurrent per-unit animations allowed
      only when animations do not overlap hexes
- [ ] 2.5 Unit tests for queue ordering

## 3. Movement Tween Hook

- [ ] 3.1 Create `useMovementTween(path, mode, onDone)` hook
- [ ] 3.2 Walk: 300ms per hex segment, linear easing
- [ ] 3.3 Run: 180ms per hex segment, linear easing
- [ ] 3.4 Jump: single 600ms tween from start to destination with a
      parabolic y offset (peak at 20% of jump distance, min 24px lift)
- [ ] 3.5 Expose current interpolated `{x, y, facing, scale}` for the
      token renderer
- [ ] 3.6 Call `onDone` when the tween completes

## 4. Token Renderer Integration

- [ ] 4.1 `UnitToken.tsx` consumes tween output and renders the token
      at the interpolated position
- [ ] 4.2 Facing rotates over the path duration (ease-in-out) to the
      final committed facing
- [ ] 4.3 Token pulls itself to the top of the z-order while animating
- [ ] 4.4 Animation cleanly removes itself on unmount

## 5. Phase Advancement Gate

- [ ] 5.1 Hook `useGameplayStore` phase advancement behind
      `useAnimationQueue.isActive`
- [ ] 5.2 When animations are pending, phase advancement is deferred
- [ ] 5.3 On `prefers-reduced-motion`, the gate is bypassed (instant
      teleport, instant advancement)
- [ ] 5.4 Integration test: two units move sequentially; second move
      waits for first animation to finish

## 6. Reduced Motion Fallback

- [ ] 6.1 Detect `window.matchMedia('(prefers-reduced-motion: reduce)')`
- [ ] 6.2 When reduced motion is enabled, `useMovementTween` returns
      the final position immediately and calls `onDone` synchronously
- [ ] 6.3 Jump arc flattens to a straight snap
- [ ] 6.4 Unit test: reduced-motion mode fires `onDone` within one tick

## 7. Jump Arc Visual

- [ ] 7.1 During a jump tween, draw a faint arc indicator from start
      to destination for the duration of the animation
- [ ] 7.2 Arc fades in during the first 100ms, fades out in the last
      100ms
- [ ] 7.3 Arc color uses the jump-MP color (blue) to reinforce mode
- [ ] 7.4 Arc respects reduced motion (hidden when enabled)

## 8. Event Log Sync

- [ ] 8.1 Event log entries remain synchronized with animation
      completion — a `MovementResolved` log line appears when the
      tween calls `onDone`
- [ ] 8.2 Heat / PSR events that fire from movement are held until
      tween completes, then flushed
- [ ] 8.3 Integration test: heat entry in log appears after animation
      settles, not before

## 9. Performance

- [ ] 9.1 Tween uses `requestAnimationFrame`, not `setInterval`
- [ ] 9.2 Tween cancellations on unmount are leak-free
- [ ] 9.3 Profile: 4 simultaneous tweens should stay above 55 FPS on a
      30x30 map

## 10. Tests

- [ ] 10.1 Unit test: `useMovementTween` walk covers 3 hexes in
      ~900ms +/- frame tolerance
- [ ] 10.2 Unit test: run mode completes in ~540ms for 3 hexes
- [ ] 10.3 Unit test: jump tween y offset peaks near the midpoint
- [ ] 10.4 Unit test: reduced-motion mode skips timing
- [ ] 10.5 Integration test: committing a 4-hex walk produces a tween
      that holds phase advancement, then releases

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `tactical-map-interface` delta has a
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `movement-system` delta has a scenario
- [ ] 11.3 `openspec validate add-movement-interpolation-animations
--strict` passes clean
