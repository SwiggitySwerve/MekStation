/**
 * Perf P5: how many whole-map combat projections one weapon-attack selection
 * costs on the play page. The selection is the store's token click (its
 * target gate) followed by the GameplayLayout render (token target ids, the
 * shared tactical frame, HexMapDisplay). Choosing a target is a store update
 * and a re-render.
 */
import type { IGameSession } from '@/types/gameplay';

import { InteractivePhase } from '@/stores/useGameplayStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { handleInteractiveTokenClickLogic } from '@/stores/useGameplayStore.helpers';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection.rangeHex';

import * as H from './addInteractiveCombatCoreUI.smoke.test-helpers';

jest.mock('@/utils/gameplay/combatProjection.rangeHex', () => {
  const actual = jest.requireActual(
    '@/utils/gameplay/combatProjection.rangeHex',
  );
  return {
    ...actual,
    deriveCombatRangeHexes: jest.fn(actual.deriveCombatRangeHexes),
  };
});

const coreProjection = deriveCombatRangeHexes as jest.MockedFunction<
  typeof deriveCombatRangeHexes
>;

function callCounts(mapHexes: number): {
  readonly wholeMap: number;
  readonly partial: number;
} {
  const sizes = coreProjection.mock.calls.map(([input]) => input.hexes.length);
  return {
    wholeMap: sizes.filter((size) => size === mapHexes).length,
    partial: sizes.filter((size) => size < mapHexes).length,
  };
}

function storeTokenClick(
  session: IGameSession,
  interactiveSession: ReturnType<typeof H.createInteractiveSessionStub>,
  unitWeapons: ReturnType<typeof H.createDemoWeapons>,
): readonly string[] {
  let storeState = {
    ui: { selectedUnitId: null as string | null },
    session,
    unitWeapons,
    validTargetIds: [] as readonly string[],
  };
  handleInteractiveTokenClickLogic(
    'unit-player-1',
    InteractivePhase.SelectUnit,
    interactiveSession,
    (() => storeState) as never,
    ((update: (state: typeof storeState) => Partial<typeof storeState>) => {
      storeState = { ...storeState, ...update(storeState) };
    }) as never,
    { selectUnitForMovement: jest.fn(), selectAttackTarget: jest.fn() },
  );
  return storeState.validTargetIds;
}

describe('GameplayLayout whole-map combat projection calls per selection (perf P5)', () => {
  afterEach(() => {
    H.act(() => {
      useGameplayStore.setState((state) => ({
        attackPlan: { ...state.attackPlan, targetUnitId: null },
      }));
    });
  });

  it('projects the whole map once for a selection and not again for a target', () => {
    const session = H.createWeaponPhaseSession(2);
    const grid = H.createMinimalGrid(session.config.mapRadius);
    const mapHexes = grid.hexes.size;
    const interactiveSession = {
      ...H.createInteractiveSessionStub(session, grid),
      getState: () => session.currentState,
    } as unknown as ReturnType<typeof H.createInteractiveSessionStub>;
    const unitWeapons = {
      ...H.createDemoWeapons(),
      'unit-player-1': [H.createSmallLaser()],
    };

    const view = H.renderLayout({
      session,
      selectedUnitId: null,
      unitWeapons,
      interactiveSession,
    });
    coreProjection.mockClear();

    // 1. Select the attacker: the store's click gate, then the render.
    const storeTargetIds = storeTokenClick(
      session,
      interactiveSession,
      unitWeapons,
    );
    view.rerender(
      <H.GameplayLayout
        session={session}
        selectedUnitId="unit-player-1"
        onUnitSelect={jest.fn()}
        onAction={jest.fn()}
        isPlayerTurn={true}
        unitWeapons={unitWeapons}
        maxArmor={H.createDemoMaxArmor()}
        maxStructure={H.createDemoMaxStructure()}
        pilotNames={H.createDemoPilotNames()}
        heatSinks={H.createDemoHeatSinks()}
        unitSpas={H.createDemoUnitSpas()}
        interactiveSession={interactiveSession}
        playerSide={H.GameSide.Player}
      />,
    );
    const selection = callCounts(mapHexes);

    // 2. Choose the target.
    coreProjection.mockClear();
    H.act(() => {
      useGameplayStore.setState((state) => ({
        attackPlan: { ...state.attackPlan, targetUnitId: 'unit-opponent-1' },
      }));
    });
    const target = callCounts(mapHexes);

    // eslint-disable-next-line no-console
    console.log(
      `P5 call counts (map ${mapHexes} hexes): selection ${JSON.stringify(selection)}, ` +
        `target ${JSON.stringify(target)}, store target ids ${JSON.stringify(storeTargetIds)}`,
    );
    expect(storeTargetIds).toEqual(['unit-opponent-1']);
    expect(selection).toEqual({ wholeMap: 1, partial: 0 });
    expect(target.wholeMap).toBe(0);
  });
});
