import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import { GamePhase, GameSide, type IUnitGameState } from '@/types/gameplay';

import { buildTacticalActionContext } from '../GameplayLayout.actionContext';
import { buildCommandRegistry } from '../TacticalActionDock/useCommandRegistry';

function contextFor(patch: Partial<IUnitGameState>) {
  return buildTacticalActionContext({
    selectedUnitId: 'p1',
    selectedUnit: {
      ...createMinimalUnitState('p1', GameSide.Player, { q: 0, r: 0 }),
      ...patch,
    },
    canAct: true,
    phase: GamePhase.Movement,
    activeTargetId: null,
    commandPreviewInputs: {},
    movementProjectionByHex: {},
    physicalAttackTargetId: null,
    physicalAttackOptionsByTargetId: {},
    selectedUnitMapHex: null,
    plannedMovement: null,
    selectedStandUpImpossibleReason: undefined,
    selectedMovementCapability: null,
  });
}

describe('local selected-unit action eligibility', () => {
  it.each([
    { hasEjected: true },
    { destroyed: true },
    { hasRetreated: true },
    { shutdown: true },
    { pilotConscious: false },
  ])('does not offer actions for an ineligible selection: %j', (patch) => {
    const context = contextFor(patch);
    expect(context.activeUnitId).toBeNull();
    expect(context.canAct).toBe(true);
    const commands = buildCommandRegistry(context, 'combat');
    expect(
      commands
        .find((command) => command.id === 'movement.evade')
        ?.availability(context).available,
    ).toBe(false);
    expect(
      commands
        .find((command) => command.id === 'utility.eject')
        ?.availability(context).available,
    ).toBe(false);
    expect(
      commands
        .find((command) => command.id === 'heat-end.end-phase')
        ?.availability(context).available,
    ).toBe(true);
  });

  it('keeps prone units eligible to attempt standing', () => {
    expect(contextFor({ prone: true }).activeUnitId).toBe('p1');
  });
});
