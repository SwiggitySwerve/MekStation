import * as H from './addPhysicalAttackPhaseUI.smoke.test-helpers';

const {
  ActuatorType,
  EMPTY_DAMAGE,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PhysicalAttackForecastModal,
  PhysicalAttackTypePicker,
  React,
  buildAttackInput,
  fireEvent,
  render,
  screen,
  usePhysicalAttackPlanStore,
  withActuator,
} = H;

type IComponentDamageState = H.IComponentDamageState;
type IGameSession = H.IGameSession;
type IINarcPodState = H.IINarcPodState;
type IPhysicalAttackDeclaredPayload = H.IPhysicalAttackDeclaredPayload;
type IPhysicalAttackInput = H.IPhysicalAttackInput;
type InteractiveSession = H.InteractiveSession;
type PhysicalAttackType = H.PhysicalAttackType;
describe('getEligiblePhysicalAttacks', () => {
  const { getEligiblePhysicalAttacks } =
    // Inline require: the test suite already mocks zustand stores up top
    // and we want the projection under test without re-plumbing imports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@/utils/gameplay/physicalAttacks/eligibility');

  function makeUnit(
    id: string,
    side: import('@/types/gameplay').GameSide,
    q: number,
    r: number,
  ): import('@/types/gameplay').IUnitGameState {
    return {
      id,
      side,
      position: { q, r },
      facing: 0 as unknown as import('@/types/gameplay').Facing,
      heat: 0,
      movementThisTurn:
        'Walk' as unknown as import('@/types/gameplay').MovementType,
      hexesMovedThisTurn: 0,
      armor: {},
      structure: {},
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      lockState: 'Unlocked' as unknown as import('@/types/gameplay').LockState,
      componentDamage: EMPTY_DAMAGE,
      prone: false,
    };
  }

  const baseContext = {
    attackerTonnage: 65,
    attackerPilotingSkill: 4,
    targetTonnage: 65,
  };

  it('returns an empty list when the target is non-adjacent', () => {
    const attacker = makeUnit('a', GameSide.Player, 0, 0);
    const target = makeUnit('b', GameSide.Opponent, 3, 3);
    const options = getEligiblePhysicalAttacks(attacker, target, baseContext);
    expect(options).toEqual([]);
  });

  it('emits punch + kick + charge + dfa + push for an adjacent target', () => {
    const attacker = makeUnit('a', GameSide.Player, 0, 0);
    const target = makeUnit('b', GameSide.Opponent, 1, 0);
    const options = getEligiblePhysicalAttacks(attacker, target, baseContext);
    const types = options.map(
      (o: { attackType: PhysicalAttackType }) => o.attackType,
    );
    expect(types).toContain('punch');
    expect(types).toContain('kick');
    expect(types).toContain('charge');
    expect(types).toContain('dfa');
    expect(types).toContain('push');
  });

  it('marks charge row as restricted when the attacker did not run this turn', () => {
    const attacker = makeUnit('a', GameSide.Player, 0, 0);
    const target = makeUnit('b', GameSide.Opponent, 1, 0);
    const options = getEligiblePhysicalAttacks(attacker, target, {
      ...baseContext,
      attackerRanThisTurn: false,
    });
    const chargeRow = options.find(
      (o: { attackType: string }) => o.attackType === 'charge',
    ) as { restrictionsFailed: readonly string[] } | undefined;
    expect(chargeRow).toBeDefined();
    expect(chargeRow!.restrictionsFailed).toContain('NoRunThisTurn');
  });

  it('marks charge row eligible when the caller projects a run this turn', () => {
    const attacker = makeUnit('a', GameSide.Player, 0, 0);
    const target = makeUnit('b', GameSide.Opponent, 1, 0);
    const options = getEligiblePhysicalAttacks(attacker, target, {
      ...baseContext,
      attackerRanThisTurn: true,
    });
    const chargeRow = options.find(
      (o: { attackType: string }) => o.attackType === 'charge',
    ) as { restrictionsFailed: readonly string[] } | undefined;
    expect(chargeRow).toBeDefined();
    expect(chargeRow!.restrictionsFailed).not.toContain('NoRunThisTurn');
  });

  it('marks DFA row eligible when the caller projects a jump this turn', () => {
    const attacker = makeUnit('a', GameSide.Player, 0, 0);
    const target = makeUnit('b', GameSide.Opponent, 1, 0);
    const options = getEligiblePhysicalAttacks(attacker, target, {
      ...baseContext,
      attackerJumpedThisTurn: true,
    });
    const dfaRow = options.find(
      (o: { attackType: string }) => o.attackType === 'dfa',
    ) as { restrictionsFailed: readonly string[] } | undefined;
    expect(dfaRow).toBeDefined();
    expect(dfaRow!.restrictionsFailed).not.toContain('NoJumpThisTurn');
  });
});
