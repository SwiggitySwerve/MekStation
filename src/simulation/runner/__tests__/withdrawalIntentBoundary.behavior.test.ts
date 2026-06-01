import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import {
  toServerIntent,
  withdrawIntent,
} from '@/lib/multiplayer/gameIntentMap';
import { GAME_INTENT_TYPES, GamePhase } from '@/types/gameplay';
import { IntentPayloadSchema } from '@/types/multiplayer/Protocol';

import {
  COMBAT_COMMAND_ACTION_SUPPORT,
  COMBAT_DIRECT_UI_ACTION_SUPPORT,
} from '../CombatActionSupport';
import { BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT } from '../CombatValidationRequirementSupport';

describe('withdrawal command intent boundary', () => {
  it('distinguishes the helper-only command from the integrated edge-picking control', () => {
    const withdrawCommand = buildUtilityCommands().find(
      (command) => command.id === 'utility.withdraw',
    );

    expect(withdrawCommand).toBeDefined();
    expect(
      withdrawCommand?.availability({
        activeUnitId: 'player-1',
        selectedUnitId: 'player-1',
        targetUnitId: null,
        hoveredHex: null,
        phase: GamePhase.Movement,
        canAct: true,
      }),
    ).toEqual({ available: true });
    expect(withdrawCommand?.commit({} as never)).toEqual({
      actionId: 'withdraw',
      payload: {},
    });

    expect(GAME_INTENT_TYPES).toContain('withdraw');
    expect(
      toServerIntent(
        withdrawIntent('player-peer', { unitId: 'player-1', edge: 'north' }),
      ),
    ).toEqual({
      kind: 'Withdraw',
      unitId: 'player-1',
      edge: 'north',
    });
    expect(
      IntentPayloadSchema.safeParse({
        kind: 'Withdraw',
        unitId: 'player-1',
        edge: 'north',
      }).success,
    ).toBe(true);

    expect(COMBAT_COMMAND_ACTION_SUPPORT['utility.withdraw']).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('superseded by the integrated'),
    });
    expect(
      COMBAT_DIRECT_UI_ACTION_SUPPORT['utility.withdraw-control'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('WithdrawControl collects'),
    });
    expect(
      BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT['retreat-withdrawal'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('edge-selecting WithdrawControl'),
    });
  });
});
