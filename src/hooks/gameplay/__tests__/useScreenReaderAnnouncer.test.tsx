/**
 * Tests for useScreenReaderAnnouncer
 *
 * Covers §3.2 screen reader live region behaviour per:
 *   openspec/changes/add-responsive-tactical-hud-accessibility/specs/
 *     accessibility-system/spec.md
 *
 * Strategy:
 *   - The hook writes to DOM nodes via refs. Tests mount a real DOM node, attach
 *     the ref, then assert on `textContent` after calling `announce`.
 *   - Phase and active-unit auto-announcement is tested by seeding
 *     useGameplayStore with session fixtures and observing the polite region.
 *   - Promise.resolve microtask flush is needed because `announce` clears then
 *     sets textContent asynchronously across a microtask boundary.
 */

import { act, renderHook } from "@testing-library/react";

import type { IGameSession } from "@/types/gameplay/GameSessionStateTypes";

import { createMinimalUnitState } from "@/simulation/runner/SimulationRunnerSupport";
import { useGameplayStore } from "@/stores/useGameplayStore";
import {
  GamePhase,
  GameSide,
  LockState,
} from "@/types/gameplay/GameSessionCoreTypes";

import { useScreenReaderAnnouncer } from "../useScreenReaderAnnouncer";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a minimal IGameSession fixture matching the shape usePhaseQueueProjection
 * expects: `session.units` is an IGameUnit array; `session.currentState` holds
 * `phase`, `turn`, `firstMover`, `activationIndex`, and the `units` state record.
 */
function buildSession(phase: GamePhase): IGameSession {
  const playerUnit = {
    id: "p1",
    side: GameSide.Player,
    name: "P1",
    unitRef: "P-1",
  };
  const opponentUnit = {
    id: "o1",
    side: GameSide.Opponent,
    name: "O1",
    unitRef: "O-1",
  };
  return {
    id: "test-session",
    units: [playerUnit, opponentUnit],
    currentState: {
      phase,
      turn: 1,
      firstMover: GameSide.Player,
      activationIndex: 0,
      units: {
        p1: {
          ...createMinimalUnitState("p1", GameSide.Player, { q: 0, r: 0 }),
          lockState: LockState.Resolved,
        },
        o1: {
          ...createMinimalUnitState("o1", GameSide.Opponent, { q: 1, r: 0 }),
          lockState: LockState.Resolved,
        },
      },
    },
  } as unknown as IGameSession;
}

/** Flush all pending microtasks (used after announce() clears then sets textContent). */
async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  useGameplayStore.setState({ session: null });
});

// =============================================================================
// Imperative announce()
// =============================================================================

describe("useScreenReaderAnnouncer — announce()", () => {
  it("writes message to polite node for default priority", async () => {
    const politeNode = document.createElement("div");
    const { result } = renderHook(() => useScreenReaderAnnouncer());

    // Attach the ref manually (simulates what TacticalLiveRegion does).
    // @ts-expect-error — assigning to read-only ref.current in test
    result.current.politeRef.current = politeNode;

    act(() => result.current.announce("Movement phase"));
    await flushMicrotasks();

    expect(politeNode.textContent).toBe("Movement phase");
  });

  it("writes message to assertive node for assertive priority", async () => {
    const assertiveNode = document.createElement("div");
    const { result } = renderHook(() => useScreenReaderAnnouncer());

    // @ts-expect-error — assigning to read-only ref.current in test
    result.current.assertiveRef.current = assertiveNode;

    act(() => result.current.announce("Critical hit!", "assertive"));
    await flushMicrotasks();

    expect(assertiveNode.textContent).toBe("Critical hit!");
  });

  it("clears textContent before setting to force re-announcement of same text", async () => {
    const politeNode = document.createElement("div");
    politeNode.textContent = "Movement phase";
    const { result } = renderHook(() => useScreenReaderAnnouncer());

    // @ts-expect-error — assigning to read-only ref.current in test
    result.current.politeRef.current = politeNode;

    // Announce same text again — should still update.
    act(() => result.current.announce("Movement phase"));
    // At this point textContent is '' (cleared synchronously).
    expect(politeNode.textContent).toBe("");
    await flushMicrotasks();
    expect(politeNode.textContent).toBe("Movement phase");
  });

  it("does nothing when ref node is not yet attached", () => {
    const { result } = renderHook(() => useScreenReaderAnnouncer());
    // politeRef.current is null — should not throw.
    expect(() => {
      act(() => result.current.announce("test"));
    }).not.toThrow();
  });
});

// =============================================================================
// Auto-announcement: phase changes
// =============================================================================

describe("useScreenReaderAnnouncer — auto phase announcements", () => {
  it("announces phase transition when phase changes", async () => {
    const politeNode = document.createElement("div");

    // Seed initial session in Movement phase.
    useGameplayStore.setState({
      session: buildSession(GamePhase.Movement),
    });

    const { result, rerender } = renderHook(() => useScreenReaderAnnouncer());

    // @ts-expect-error — assigning to read-only ref.current in test
    result.current.politeRef.current = politeNode;

    // Transition to WeaponAttack phase.
    act(() => {
      useGameplayStore.setState({
        session: buildSession(GamePhase.WeaponAttack),
      });
    });
    rerender();
    await flushMicrotasks();

    expect(politeNode.textContent).toBe("Weapon attack phase");
  });
});
