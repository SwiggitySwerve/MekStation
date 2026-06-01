/**
 * useReplayMovementAnimations — side-effect adapter that drives
 * `useAnimationQueue` from a replay event log + scrubber cursor.
 *
 * Per `add-replay-step-and-effect-animations` (tactical-map-interface
 * delta — "Replay Movement Step Animation Playback"). Pairs with the
 * pure `useHexMapStateFromEvents` projection: that reducer keeps token
 * positions correct at every cursor; THIS hook makes the visual
 * transition between cursors animate the way the live-play renderer
 * animates (300 ms / hex walk, 180 ms / hex run, 600 ms parabolic jump
 * arc — all owned by the renderer side of `useAnimationQueue`).
 *
 * Design contract (per design.md D1-D6):
 *
 *   - **D1 / D2 — adapter, not reducer mutation.** This hook is the
 *     side-effect side of replay; the projection hook stays pure. The
 *     two share the `events` input but never the same store.
 *   - **D3 — cursor-rewind reset.** When `currentSequence` decreases
 *     between renders, `useAnimationQueue.getState().reset()` flushes
 *     the queue BEFORE we re-walk forward to the new cursor. Stale
 *     walks cannot finish on top of new state.
 *   - **D6 — `mapId` collision avoidance.** Caller passes a stable
 *     `mapId` (e.g. `'replay'` / `'quickgame-replay'`) so a co-mounted
 *     live-play surface can never block on (or be blocked by) replay
 *     animations.
 *
 * Each `IMovementStep` shape maps as follows:
 *
 *   - `forward` / `lateral` → movement animation with a 2-entry path
 *     (`from` → `to`) and a `MovementAnimationMode` derived from the
 *     parent payload's `movementType`.
 *   - `jump` → movement animation with a 2-entry path and
 *     `MovementAnimationMode.Jump`. The renderer's existing parabolic
 *     arc takes over.
 *   - `turn` → movement animation carrying only `initialFacing` /
 *     `finalFacing`. The renderer treats this as a facing-only tween.
 *   - `standUp` / `convertMode` / `altitudeControl` / `goProne` /
 *     `chargeDeclared` / `dfaDeclared` /
 *     `shakeOffSwarm` → skipped (state transitions handled by the
 *     existing token-renderer pose state).
 *
 * Legacy fallback (per spec scenario "Legacy event without steps falls
 * back to instant snap"): when `payload.steps` is undefined, enqueue a
 * single 2-entry `[from, to]` walk-mode animation so the visual jump
 * still uses the existing path-tween rather than appearing instantly.
 *
 * Reduced-motion fallback (per spec scenario "Reduced-motion skips
 * per-step enqueue entirely"): when `usePrefersReducedMotion()` is
 * `true`, the hook performs a no-op for every step. Token positions
 * still update via the pure reducer's `acc.position = payload.to`
 * branch.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { useEffect, useRef } from 'react';

import type {
  IGameEvent,
  IMovementDeclaredPayload,
  IMovementStep,
  MovementAnimationMode,
} from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { Facing, GameEventType, MovementType } from '@/types/gameplay';

// =============================================================================
// Public types
// =============================================================================

/**
 * Options for the replay movement-animation adapter.
 */
export interface IUseReplayMovementAnimationsOptions {
  /**
   * Stable identifier for the replay surface. Must NOT collide with a
   * live-play `mapId` if both surfaces are co-mounted. Common values:
   * `'replay'` (standalone replay route) and `'quickgame-replay'`
   * (results-page replay tab).
   */
  readonly mapId: string;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Drive `useAnimationQueue` from a replay event log + scrubber cursor.
 *
 * Returns `void` — all output is the side-effect of mutating the
 * animation queue store. Components mount this hook alongside
 * `useHexMapStateFromEvents` to compose the visual replay surface.
 *
 * @example
 * ```tsx
 * const replay = useSharedReplayPlayer({ gameId, events });
 * const hexMap = useHexMapStateFromEvents(events, replay.currentSequence);
 * useReplayMovementAnimations(events, replay.currentSequence, {
 *   mapId: 'quickgame-replay',
 * });
 * ```
 */
export function useReplayMovementAnimations(
  events: readonly IGameEvent[],
  currentSequence: number,
  opts: IUseReplayMovementAnimationsOptions,
): void {
  const reducedMotion = usePrefersReducedMotion();
  // Track the previous cursor so we can detect rewind vs forward
  // advance. Initialized to `-1` so the very first render walks every
  // event with `sequence <= currentSequence` (matching the projection
  // hook's "walk-from-zero on every render" contract for the visual
  // queue's first fill).
  const prevCursorRef = useRef<number>(-1);

  useEffect(() => {
    // Reduced-motion bypass — token positions still update via the
    // pure projection hook; we just don't animate the transition.
    if (reducedMotion) {
      prevCursorRef.current = currentSequence;
      return;
    }

    const prev = prevCursorRef.current;
    const next = currentSequence;

    // Rewind branch (D3): flush in-flight + queued animations so a
    // stale walk cannot finish on top of the new scrub position.
    // After flush, fall through to the forward branch with `prev = -1`
    // so any backfill animation for the new cursor still plays — but
    // in practice rewinds are usually multi-event jumps and we rely on
    // the projection hook to ground-truth token positions; the queue
    // simply restarts clean.
    if (next < prev) {
      useAnimationQueue.getState().reset();
      prevCursorRef.current = next;
      return;
    }

    // No-op when the cursor didn't actually move.
    if (next === prev) return;

    // Forward branch — enqueue every `MovementDeclared` event whose
    // sequence is strictly greater than `prev` and ≤ `next`. We process
    // events in commit order so the queue's per-unit overlap detection
    // serializes step animations correctly.
    for (const event of events) {
      if (event.type !== GameEventType.MovementDeclared) continue;
      if (event.sequence <= prev) continue;
      if (event.sequence > next) break;

      const payload = event.payload as IMovementDeclaredPayload;
      enqueueMovementForEvent(event, payload, opts.mapId);
    }

    prevCursorRef.current = next;
    // We deliberately exclude `events` from the dep array — the events
    // list is a stable reference per replay session (uploaded log or
    // session log), and including it would cause spurious re-fires on
    // unrelated parent re-renders that pass a fresh array literal.
    // `currentSequence` is the only value that should retrigger the
    // walk. Same for `opts.mapId` and `reducedMotion`, which are stable
    // across the life of the surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSequence, opts.mapId, reducedMotion]);
}

// =============================================================================
// Per-event enqueue
// =============================================================================

/**
 * Enqueue the right number of movement animations for a single
 * `MovementDeclared` event. Consumes the step chain when present;
 * falls back to a single instant-snap animation for legacy events.
 */
function enqueueMovementForEvent(
  event: IGameEvent,
  payload: IMovementDeclaredPayload,
  mapId: string,
): void {
  const enqueue = useAnimationQueue.getState().enqueue;

  // Legacy fallback (per spec scenario "Legacy event without steps
  // falls back to instant snap"). Synthesizes a single walk-mode
  // animation from `from` → `to` so the renderer's path-tween plays
  // even without step decomposition.
  if (payload.steps === undefined || payload.steps.length === 0) {
    const mode = movementAnimationModeForType(payload.movementType);
    enqueue({
      id: `replay-movement-${event.id}-fallback`,
      mapId,
      unitId: payload.unitId,
      kind: 'movement',
      path: [payload.from, payload.to],
      occupiedHexes: [payload.from, payload.to],
      ...(mode !== null ? { mode } : {}),
      finalFacing: payload.facing,
      eventSequence: event.sequence,
    });
    return;
  }

  // Step-chain path — one animation per actionable step in commit
  // order. We intentionally walk by index so the discriminated-union
  // narrowing on `step.kind` stays readable.
  let runningFacing: Facing | undefined;
  for (const step of payload.steps) {
    const animation = animationForStep(
      step,
      payload,
      event,
      mapId,
      runningFacing,
    );
    if (animation === null) continue;

    // Update the running facing so subsequent `turn` steps emit
    // correct `initialFacing` / `finalFacing` pairs even when chained.
    if (animation.finalFacing !== undefined) {
      runningFacing = animation.finalFacing;
    }

    enqueue(animation);
  }
}

// =============================================================================
// Step → animation translation
// =============================================================================

/**
 * Translate a single `IMovementStep` into the matching
 * `TacticalAnimation` payload for `useAnimationQueue.enqueue`. Returns
 * `null` for steps that should not produce a queue entry (state-
 * transition kinds like `standUp` / `convertMode` / `altitudeControl` /
 * `hullDown` / `goProne` / charge / DFA / swarm).
 */
function animationForStep(
  step: IMovementStep,
  payload: IMovementDeclaredPayload,
  event: IGameEvent,
  mapId: string,
  runningFacing: Facing | undefined,
): {
  readonly id: string;
  readonly mapId: string;
  readonly unitId: string;
  readonly kind: 'movement';
  readonly path?: readonly [
    IMovementDeclaredPayload['from'],
    IMovementDeclaredPayload['to'],
  ];
  readonly occupiedHexes?: readonly [
    IMovementDeclaredPayload['from'],
    IMovementDeclaredPayload['to'],
  ];
  readonly mode?: MovementAnimationMode;
  readonly initialFacing?: Facing;
  readonly finalFacing?: Facing;
  readonly eventSequence: number;
} | null {
  const baseId = `replay-movement-${event.id}-${step.index}`;

  switch (step.kind) {
    case 'forward':
    case 'lateral': {
      const mode = movementAnimationModeForType(payload.movementType);
      return {
        id: baseId,
        mapId,
        unitId: payload.unitId,
        kind: 'movement',
        path: [step.from, step.to],
        occupiedHexes: [step.from, step.to],
        ...(mode !== null ? { mode } : {}),
        eventSequence: event.sequence,
      };
    }
    case 'jump': {
      // Jump steps always use the jump-arc renderer regardless of the
      // parent payload's `movementType`. In practice the runner emits
      // `movementType: Jump` for any payload containing a jump step,
      // but this preserves the contract even if the payload is
      // mislabeled.
      return {
        id: baseId,
        mapId,
        unitId: payload.unitId,
        kind: 'movement',
        path: [step.from, step.to],
        occupiedHexes: [step.from, step.to],
        mode: MovementType.Jump,
        eventSequence: event.sequence,
      };
    }
    case 'turn': {
      // Turn steps carry only facing — no `path`. The renderer's
      // existing facing-tween consumes `initialFacing` / `finalFacing`
      // and rotates the token in place.
      return {
        id: baseId,
        mapId,
        unitId: payload.unitId,
        kind: 'movement',
        initialFacing: runningFacing ?? step.fromFacing,
        finalFacing: step.toFacing,
        eventSequence: event.sequence,
      };
    }
    // State-transition steps — handled by the token renderer's pose
    // state (prone / standing / charging / DFA / swarm), not by an
    // interpolated tween. Skip silently per the spec contract.
    case 'standUp':
    case 'convertMode':
    case 'altitudeControl':
    case 'hullDown':
    case 'goProne':
    case 'chargeDeclared':
    case 'dfaDeclared':
    case 'shakeOffSwarm':
      return null;
  }
}

/**
 * Translate a parent `MovementType` into the queue's narrower
 * `MovementAnimationMode`. Returns `null` for `Stationary` (which
 * should not appear in a real replay anyway) so the caller can omit
 * the field.
 */
function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  switch (movementType) {
    case MovementType.Walk:
    case MovementType.Run:
    case MovementType.Jump:
      return movementType;
    case MovementType.Stationary:
    default:
      return null;
  }
}
