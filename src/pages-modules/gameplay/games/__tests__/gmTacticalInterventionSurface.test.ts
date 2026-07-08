import { act, renderHook } from '@testing-library/react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type {
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { createDemoSession } from '@/__fixtures__/gameplay';
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

  it('commits appliable combat corrections through the live engine seam', () => {
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
      advancePhase: jest.fn(),
      applyCorrectedState: jest.fn((state) => {
        engineSession = {
          ...engineSession,
          currentState: state,
        };
      }),
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

    const preview = result.current!.preview({
      commandId: 'gm.set-position-facing',
      command: makeCommand('gm.set-position-facing'),
      ctx: {
        ...makeCtx(),
        hoveredHex: { q: 2, r: 2 },
      },
    });

    expect(preview.status).toBe('ready');

    act(() => {
      const approval = result.current!.approve?.(preview);
      expect(approval).toMatchObject({
        status: 'approved',
        appended: true,
      });
    });

    expect(interactiveSession.applyCorrectedState).toHaveBeenCalledWith(
      expect.objectContaining({
        units: expect.objectContaining({
          'unit-player-1': expect.objectContaining({
            position: { q: 2, r: 2 },
          }),
        }),
      }),
    );
    expect(interactiveSession.advancePhase).not.toHaveBeenCalled();
    expect(setSession).toHaveBeenCalledWith(
      expect.objectContaining({
        currentState: expect.objectContaining({
          units: expect.objectContaining({
            'unit-player-1': expect.objectContaining({
              position: { q: 2, r: 2 },
            }),
          }),
        }),
      }),
    );
  });

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
