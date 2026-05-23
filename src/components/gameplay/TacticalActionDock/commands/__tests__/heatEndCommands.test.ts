/**
 * Heat / End-phase command family tests.
 *
 * Verifies the spec's `End phase distinguishes no-op from unresolved
 * actions` scenario — end-phase carries `requiresConfirmation: true`
 * so the host confirm step can intercept and route to the unresolved-
 * action warning.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildHeatEndCommands } from '../heatEndCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.WeaponAttack,
    canAct: true,
    ...overrides,
  };
}

describe('heatEndCommands', () => {
  const commands = buildHeatEndCommands();

  it('exposes heat.continue + heat-end.end-phase + heat-end.next-turn', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'heat.continue',
      'heat-end.end-phase',
      'heat-end.next-turn',
    ]);
  });

  it('end-phase requires confirmation per spec', () => {
    const endPhase = commands.find((c) => c.id === 'heat-end.end-phase')!;
    expect(endPhase.requiresConfirmation).toBe(true);
  });

  it('end-phase applies during Movement, WeaponAttack, PhysicalAttack', () => {
    const endPhase = commands.find((c) => c.id === 'heat-end.end-phase')!;
    expect(endPhase.phaseConstraints).toContain(GamePhase.Movement);
    expect(endPhase.phaseConstraints).toContain(GamePhase.WeaponAttack);
    expect(endPhase.phaseConstraints).toContain(GamePhase.PhysicalAttack);
  });

  it('heat-continue applies only to Heat phase', () => {
    const cont = commands.find((c) => c.id === 'heat.continue')!;
    expect(cont.phaseConstraints).toEqual([GamePhase.Heat]);
  });

  it('heat-continue commits the existing authoritative continue action', () => {
    const cont = commands.find((c) => c.id === 'heat.continue')!;
    expect(cont.commit(makeCtx({ phase: GamePhase.Heat }))).toEqual({
      actionId: 'continue',
      payload: {},
    });
  });

  it('end-phase is disabled-with-reason when canAct is false', () => {
    const endPhase = commands.find((c) => c.id === 'heat-end.end-phase')!;
    const result = endPhase.availability(makeCtx({ canAct: false }));
    expect(result.available).toBe(false);
  });
});
