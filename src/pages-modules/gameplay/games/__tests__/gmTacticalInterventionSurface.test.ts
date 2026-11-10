import { act, renderHook } from '@testing-library/react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { createDemoSession } from '@/__fixtures__/gameplay';
import { ActionLedger } from '@/lib/interventions/ActionLedger';
import { InterventionLedger } from '@/lib/interventions/InterventionLedger';
import { GamePhase } from '@/types/gameplay';

import {
  resolveGameSessionShellMode,
  useGmTacticalInterventionSurface,
} from '../gmTacticalInterventionSurface';

function makeCtx(phase = GamePhase.Movement): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-player-1',
    selectedUnitId: 'unit-player-1',
    targetUnitId: null,
    hoveredHex: null,
    phase,
    canAct: true,
  };
}

function makeCommand(id = 'gm.advance-phase'): ITacticalCommand {
  return {
    id,
    category: 'gm',
    label: 'Advance Phase (GM)',
    phaseConstraints: [GamePhase.Movement],
    requiresConfirmation: true,
    undoable: false,
    availability: () => ({ available: true }),
    commit: () => ({ actionId: 'gm-intervention.preview' }),
  };
}

describe('gmTacticalInterventionSurface', () => {
  it('resolves GM shell mode from route query flags', () => {
    expect(resolveGameSessionShellMode({ mode: 'gm' })).toBe('gm');
    expect(resolveGameSessionShellMode({ gm: '1' })).toBe('gm');
    expect(resolveGameSessionShellMode({ gm: 'true' })).toBe('gm');
    expect(resolveGameSessionShellMode({ mode: 'combat' })).toBe('combat');
  });

  it('blocks a tactical preview after state changes without calling the live engine', () => {
    const base = createDemoSession();
    let session = {
      ...base,
      currentState: { ...base.currentState, phase: GamePhase.Movement },
    };
    const advancePhase = jest.fn();
    const applyCorrectedState = jest.fn();
    const setSession = jest.fn();
    const interactiveSession = {
      advancePhase,
      applyCorrectedState,
      getSession: () => session,
    } as unknown as InteractiveSession;
    const { result, rerender } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session,
        interactiveSession,
        setSession,
      }),
    );
    const preview = result.current!.preview({
      commandId: 'gm.advance-phase',
      command: makeCommand(),
      ctx: makeCtx(),
    });
    expect(preview.status).toBe('ready');
    session = {
      ...session,
      currentState: {
        ...session.currentState,
        activationIndex: session.currentState.activationIndex + 1,
      },
    };
    rerender();
    act(() => {
      expect(result.current!.approve?.(preview)).toMatchObject({
        status: 'blocked',
        appended: false,
      });
    });
    expect(advancePhase).not.toHaveBeenCalled();
    expect(applyCorrectedState).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(result.current?.playerLog).toEqual([]);
  });

  it('approves a live tactical GM preview through the combat ledgers and public log', () => {
    const session = createDemoSession();
    const movementSession = {
      ...session,
      currentState: {
        ...session.currentState,
        phase: GamePhase.Movement,
      },
    };
    const setSession = jest.fn();
    let engineSession = movementSession;
    const interactiveSession = {
      advancePhase: jest.fn(() => {
        engineSession = {
          ...engineSession,
          currentState: {
            ...engineSession.currentState,
            phase: GamePhase.WeaponAttack,
          },
        };
      }),
      applyCorrectedState: jest.fn(),
      getSession: () => engineSession,
    } as unknown as InteractiveSession;
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session: movementSession,
        interactiveSession,
        setSession,
      }),
    );

    const surface = result.current;
    expect(surface).toBeDefined();

    const preview = surface!.preview({
      commandId: 'gm.advance-phase',
      command: makeCommand(),
      ctx: makeCtx(),
    });

    expect(preview.status).toBe('ready');
    expect(preview.publicEffect?.summary).toContain('phase');
    expect(preview.privateMetadata?.reason).toContain('phase correction');

    act(() => {
      const approval = surface!.approve?.(preview);
      expect(approval).toMatchObject({
        status: 'approved',
        appended: true,
      });
    });

    expect(interactiveSession.advancePhase).toHaveBeenCalledTimes(1);
    expect(interactiveSession.applyCorrectedState).not.toHaveBeenCalled();
    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        currentState: expect.objectContaining({
          phase: GamePhase.WeaponAttack,
        }),
      }),
    );
    expect(result.current?.playerLog).toHaveLength(1);
    expect(result.current?.playerLog?.[0]).toMatchObject({
      domain: 'combat',
      status: 'approved',
      publicEffect: expect.objectContaining({
        changedStateRefs: expect.arrayContaining([
          `game:${movementSession.id}`,
          `game:${movementSession.id}:turn-order`,
        ]),
      }),
    });
    expect(JSON.stringify(result.current?.playerLog)).not.toContain(
      preview.privateMetadata?.reason,
    );
  });

  // @spec openspec/changes/disable-gm-non-event-corrections/specs/gm-tactical-command-surface/spec.md - Interim correction approval
  it.each([
    'gm.set-position-facing',
    'gm.set-damage',
    'gm.set-heat-ammo',
    'gm.set-initiative',
    'gm.set-lifecycle',
    'gm.set-objective',
  ] as const)(
    'blocks %s, including stale ready previews, without mutation or records',
    (commandId) => {
      const session = createDemoSession();
      const before = JSON.parse(JSON.stringify(session.currentState));
      const interventionAppend = jest.spyOn(
        InterventionLedger.prototype,
        'appendApprovedRecord',
      );
      const actionAppend = jest.spyOn(
        ActionLedger.prototype,
        'appendGmInterventionRecord',
      );
      const setSession = jest.fn();
      const interactiveSession = {
        advancePhase: jest.fn(),
        applyCorrectedState: jest.fn(),
        getSession: () => session,
      } as unknown as InteractiveSession;
      const { result } = renderHook(() =>
        useGmTacticalInterventionSurface({
          enabled: true,
          session,
          interactiveSession,
          setSession,
        }),
      );
      const preview = result.current!.preview({
        commandId,
        command: makeCommand(commandId),
        ctx: { ...makeCtx(), hoveredHex: { q: 2, r: 2 } },
      });
      const reason =
        'Corrections are temporarily unavailable: the next game action would discard them until correction events are implemented.';
      expect(preview).toMatchObject({ status: 'blocked', reason });
      for (const candidate of [
        preview,
        { ...preview, status: 'ready' as const },
      ]) {
        act(() => {
          expect(result.current!.approve?.(candidate)).toEqual({
            status: 'blocked',
            appended: false,
            reason,
          });
        });
      }
      expect(session.currentState).toEqual(before);
      expect(interventionAppend).not.toHaveBeenCalled();
      expect(actionAppend).not.toHaveBeenCalled();
      interventionAppend.mockRestore();
      actionAppend.mockRestore();
      expect(interactiveSession.applyCorrectedState).not.toHaveBeenCalled();
      expect(interactiveSession.advancePhase).not.toHaveBeenCalled();
      expect(setSession).not.toHaveBeenCalled();
      expect(result.current?.playerLog).toEqual([]);
    },
  );

  it('blocks an unrecognized ready preview instead of falling back to the correction setter', () => {
    const session = createDemoSession();
    const applyCorrectedState = jest.fn();
    const advancePhase = jest.fn();
    const setSession = jest.fn();
    const interactiveSession = {
      applyCorrectedState,
      advancePhase,
      getSession: () => session,
    } as unknown as InteractiveSession;
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session,
        interactiveSession,
        setSession,
      }),
    );
    const preview = result.current!.preview({
      commandId: 'gm.advance-phase',
      command: makeCommand(),
      ctx: makeCtx(),
    });
    act(() => {
      expect(
        result.current!.approve?.({
          ...preview,
          status: 'ready',
          interventionId: 'unrecognized',
        }),
      ).toMatchObject({ status: 'blocked', appended: false });
    });
    expect(applyCorrectedState).not.toHaveBeenCalled();
    expect(advancePhase).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(result.current?.playerLog).toEqual([]);
  });

  it('records nothing when the live engine refuses the approved correction (S14)', () => {
    const session = createDemoSession();
    const movementSession = {
      ...session,
      currentState: { ...session.currentState, phase: GamePhase.Movement },
    };
    const setSession = jest.fn();
    let engineActive = false;
    const interactiveSession = {
      advancePhase: jest.fn(() => {
        if (!engineActive) throw new Error('Game is not active');
      }),
      applyCorrectedState: jest.fn(),
      getSession: () => movementSession,
    } as unknown as InteractiveSession;
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session: movementSession,
        interactiveSession,
        setSession,
      }),
    );
    const preview = result.current!.preview({
      commandId: 'gm.advance-phase',
      command: makeCommand(),
      ctx: makeCtx(),
    });

    let refused: unknown;
    act(() => {
      refused = result.current!.approve?.(preview);
    });

    expect(refused).toMatchObject({
      status: 'blocked',
      appended: false,
      reason: expect.stringContaining('Game is not active'),
    });
    expect(setSession).not.toHaveBeenCalled();
    expect(result.current?.playerLog).toHaveLength(0);

    // The refusal left no record behind, so the same preview still approves
    // once the engine accepts it.
    engineActive = true;
    let approved: unknown;
    act(() => {
      approved = result.current!.approve?.(preview);
    });

    expect(approved).toMatchObject({ status: 'approved', appended: true });
    expect(result.current?.playerLog).toHaveLength(1);
  });

  it('applies one tactical preview to the engine once, however often it is approved (S14)', () => {
    const session = createDemoSession();
    const movementSession = {
      ...session,
      currentState: { ...session.currentState, phase: GamePhase.Movement },
    };
    const interactiveSession = {
      advancePhase: jest.fn(),
      applyCorrectedState: jest.fn(),
      getSession: () => movementSession,
    } as unknown as InteractiveSession;
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session: movementSession,
        interactiveSession,
        setSession: jest.fn(),
      }),
    );
    const preview = result.current!.preview({
      commandId: 'gm.advance-phase',
      command: makeCommand(),
      ctx: makeCtx(),
    });

    const approvals: unknown[] = [];
    act(() => {
      approvals.push(result.current!.approve?.(preview));
    });
    act(() => {
      approvals.push(result.current!.approve?.(preview));
    });

    expect(approvals[0]).toMatchObject({ status: 'approved' });
    expect(approvals[1]).toMatchObject({ status: 'blocked', appended: false });
    expect(interactiveSession.advancePhase).toHaveBeenCalledTimes(1);
    expect(interactiveSession.applyCorrectedState).not.toHaveBeenCalled();
    expect(result.current?.playerLog).toHaveLength(1);
  });

  it.each([
    [
      'gm.correct-attack',
      'Attack-resolution corrections are not yet appliable to the live session without new resolution semantics.',
    ],
    [
      'gm.reload-unit',
      'Unit reload corrections require session-unit replacement semantics and are deferred from the tactical live-session commit seam.',
    ],
    [
      'gm.grant-resource',
      'Resource grants target the campaign economy domain and are deferred from the tactical live-session commit seam.',
    ],
  ] as const)(
    'preserves the live-session refusal for %s',
    (commandId, reason) => {
      const session = createDemoSession();
      const applyCorrectedState = jest.fn();
      const advancePhase = jest.fn();
      const setSession = jest.fn();
      const interactiveSession = {
        applyCorrectedState,
        advancePhase,
        getSession: () => session,
      } as unknown as InteractiveSession;
      const { result } = renderHook(() =>
        useGmTacticalInterventionSurface({
          enabled: true,
          session,
          interactiveSession,
          setSession,
        }),
      );
      const preview = result.current!.preview({
        commandId,
        command: makeCommand(commandId),
        ctx: makeCtx(),
      });
      act(() => {
        expect(
          result.current!.approve?.({ ...preview, status: 'ready' }),
        ).toEqual({ status: 'unsupported', appended: false, reason });
      });
      expect(applyCorrectedState).not.toHaveBeenCalled();
      expect(advancePhase).not.toHaveBeenCalled();
      expect(setSession).not.toHaveBeenCalled();
      expect(result.current?.playerLog).toEqual([]);
    },
  );

  it('returns explicit deferred approval for tactical resource grants without appending', () => {
    const session = createDemoSession();
    const setSession = jest.fn();
    const interactiveSession = {
      advancePhase: jest.fn(),
      applyCorrectedState: jest.fn(),
      getSession: () => session,
    } as unknown as InteractiveSession;
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session,
        interactiveSession,
        setSession,
      }),
    );

    const preview = result.current!.preview({
      commandId: 'gm.grant-resource',
      command: makeCommand('gm.grant-resource'),
      ctx: makeCtx(),
    });

    expect(preview.status).toBe('deferred');

    act(() => {
      const approval = result.current!.approve?.(preview);
      expect(approval).toMatchObject({
        status: 'deferred',
        appended: false,
      });
    });

    expect(interactiveSession.advancePhase).not.toHaveBeenCalled();
    expect(interactiveSession.applyCorrectedState).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(result.current?.playerLog).toHaveLength(0);
  });
});
