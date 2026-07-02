/**
 * Vibro-claw command equipment-reality gating — battle-armor-combat
 * "Vibroclaw Attack": "UI MUST hide the vibroclaw action button when the
 * squad's vibroClaws === 0" (per `wire-vibroclaw-attack-dispatch`). The
 * builder drops the command entirely; it is never rendered-but-disabled.
 */
import type { ITacticalCommandContext } from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import { buildPhysicalAttackCommands } from '../physicalAttackCommands';

function ctx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'squad-1',
    selectedUnitId: 'squad-1',
    targetUnitId: 'mech-1',
    hoveredHex: null,
    phase: GamePhase.PhysicalAttack,
    canAct: true,
    ...overrides,
  } as ITacticalCommandContext;
}

describe('vibro-claw command gating', () => {
  it('renders the command only for a squad that mounts claws', () => {
    const ids = buildPhysicalAttackCommands(
      ctx({ activeUnitVibroClawCount: 2 }),
    ).map((command) => command.id);
    expect(ids).toContain('physical.vibro-claw');
  });

  it('hides the command for a clawless squad (vibroClaws === 0)', () => {
    const ids = buildPhysicalAttackCommands(
      ctx({ activeUnitVibroClawCount: 0 }),
    ).map((command) => command.id);
    expect(ids).not.toContain('physical.vibro-claw');
  });

  it('hides the command for legacy contexts without the flag', () => {
    const withoutFlag = buildPhysicalAttackCommands(ctx()).map(
      (command) => command.id,
    );
    expect(withoutFlag).not.toContain('physical.vibro-claw');

    const noCtx = buildPhysicalAttackCommands().map((command) => command.id);
    expect(noCtx).not.toContain('physical.vibro-claw');
  });

  it('commits the vibro-claw declaration action id with the target', () => {
    const command = buildPhysicalAttackCommands(
      ctx({ activeUnitVibroClawCount: 1 }),
    ).find((candidate) => candidate.id === 'physical.vibro-claw');
    expect(command).toBeDefined();
    const commit = command!.commit(ctx({ activeUnitVibroClawCount: 1 }));
    expect(commit).toMatchObject({
      actionId: 'vibro-claw-attack',
      payload: { targetUnitId: 'mech-1' },
    });
  });
});
