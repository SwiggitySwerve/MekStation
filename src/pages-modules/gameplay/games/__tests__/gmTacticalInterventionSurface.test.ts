import { act, renderHook } from '@testing-library/react';

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

function makeCommand(): ITacticalCommand {
  return {
    id: 'gm.advance-phase',
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
    const { result } = renderHook(() =>
      useGmTacticalInterventionSurface({
        enabled: true,
        session: movementSession,
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
      surface!.approve?.(preview);
    });

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
});
