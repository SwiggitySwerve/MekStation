/**
 * Tests for useActivationFocusRequest
 *
 * Covers the 2 spec scenarios from
 * openspec/changes/add-tactical-turn-order-and-phase-rail/specs/
 *   game-session-management/spec.md "Activation Focus Requests":
 *   1. "Active unit emits focus request"
 *   2. "Replay focus follows cursor"
 *
 * The hook reads `useGameplayStore.session` + the shell context's
 * activeUnit/inspectedUnit/shellMode. Tests mount the hook inside a
 * <TacticalCommandShell> so the shell context is available, then
 * mutate the gameplay store + the shell state to assert the emitted
 * IFocusRequest.
 */

import { render } from '@testing-library/react';
import { type ReactElement, type ReactNode, useEffect } from 'react';

import type { IGameSession } from '@/types/gameplay/GameSessionStateTypes';

import {
  TacticalCommandShell,
  useTacticalShell,
} from '@/components/gameplay/TacticalCommandShell';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionCoreTypes';

import {
  useActivationFocusRequest,
  type IFocusRequest,
} from '../useActivationFocusRequest';

// =============================================================================
// Test Helpers
// =============================================================================

function buildSession(activeUnitId: string): IGameSession {
  return {
    id: 'test-session',
    units: [
      { id: 'p1', side: GameSide.Player, name: 'P', unitRef: 'P-1' },
      { id: 'o1', side: GameSide.Opponent, name: 'O', unitRef: 'O-1' },
    ],
    currentState: {
      phase: GamePhase.Movement,
      turn: 1,
      firstMover: GameSide.Player,
      activationIndex: 0,
      units: {
        p1: {
          id: 'p1',
          side: GameSide.Player,
          position: { q: 2, r: -1 },
          lockState: LockState.Pending,
        },
        o1: {
          id: 'o1',
          side: GameSide.Opponent,
          position: { q: 5, r: 3 },
          lockState: LockState.Pending,
        },
      },
    },
  } as unknown as IGameSession;
}

/**
 * Capture-renderer that exposes the hook's value to the test scope
 * via a ref callback. Mounted inside a <TacticalCommandShell> to make
 * the shell context available.
 */
interface CaptureProps {
  onValue: (value: IFocusRequest | null) => void;
  shellMode?: 'combat' | 'replay';
  initialActiveUnit?: string | null;
  initialInspectedUnit?: string | null;
}

function FocusCapture({
  onValue,
}: {
  onValue: (v: IFocusRequest | null) => void;
}): ReactElement {
  const value = useActivationFocusRequest();
  // Block body so useEffect returns undefined (not the push() return value),
  // otherwise React tries to call the truthy return as a destructor.
  useEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return <></>;
}

function ShellSeed({
  activeUnit,
  inspectedUnit,
  shellMode,
  children,
}: {
  activeUnit: string | null;
  inspectedUnit: string | null;
  shellMode: 'combat' | 'replay';
  children: ReactNode;
}): ReactElement {
  const { updateState } = useTacticalShell();
  useEffect(() => {
    // Sync shellMode into state too — the TacticalCommandShell prop
    // sets the context.shellMode but createDefaultShellState seeds
    // state.shellMode = 'combat'. The hook reads state.shellMode, so
    // we drive it explicitly here. (Tracked: shell foundation should
    // probably auto-sync these — out of scope for PR-E.)
    updateState({ activeUnit, inspectedUnit, shellMode });
  }, [activeUnit, inspectedUnit, shellMode, updateState]);
  return <>{children}</>;
}

function renderHookInShell({
  onValue,
  shellMode = 'combat',
  initialActiveUnit = null,
  initialInspectedUnit = null,
}: CaptureProps) {
  return render(
    <TacticalCommandShell
      viewerPlayerId="test-viewer"
      shellMode={shellMode}
      sessionId="test-session"
    >
      <ShellSeed
        activeUnit={initialActiveUnit}
        inspectedUnit={initialInspectedUnit}
        shellMode={shellMode}
      >
        <FocusCapture onValue={onValue} />
      </ShellSeed>
    </TacticalCommandShell>,
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('useActivationFocusRequest', () => {
  afterEach(() => {
    useGameplayStore.setState({ session: null });
  });

  // -------------------------------------------------------------------------
  // Spec: "Active unit emits focus request"
  // -------------------------------------------------------------------------
  it('emits a focus request with unitId + axial coord when activeUnit is set', () => {
    useGameplayStore.setState({ session: buildSession('p1') });
    const captured: Array<IFocusRequest | null> = [];

    renderHookInShell({
      onValue: (v) => captured.push(v),
      initialActiveUnit: 'p1',
    });

    const last = captured[captured.length - 1];
    expect(last).not.toBeNull();
    expect(last?.unitId).toBe('p1');
    // p1's position is { q: 2, r: -1 }
    expect(last?.axialCoord).toBe('2,-1');
  });

  it('returns null when no active unit', () => {
    useGameplayStore.setState({ session: buildSession('p1') });
    const captured: Array<IFocusRequest | null> = [];

    renderHookInShell({
      onValue: (v) => captured.push(v),
      initialActiveUnit: null,
    });

    expect(captured[captured.length - 1]).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Spec: "Replay focus follows cursor" — replay shellMode reads
  // inspectedUnit (cursor) instead of live activeUnit.
  // -------------------------------------------------------------------------
  it('follows inspectedUnit (cursor) in replay mode', () => {
    useGameplayStore.setState({ session: buildSession('p1') });
    const captured: Array<IFocusRequest | null> = [];

    renderHookInShell({
      onValue: (v) => captured.push(v),
      shellMode: 'replay',
      initialActiveUnit: 'p1', // live engine active
      initialInspectedUnit: 'o1', // replay cursor — should win
    });

    const last = captured[captured.length - 1];
    expect(last?.unitId).toBe('o1');
    // o1's position is { q: 5, r: 3 }
    expect(last?.axialCoord).toBe('5,3');
  });
});
