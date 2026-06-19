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
  buildFakeInteractiveSession,
  buildSession,
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
describe('usePhysicalAttackPlanStore', () => {
  beforeEach(() => {
    usePhysicalAttackPlanStore.getState().clearPhysicalAttackPlan();
  });

  it('starts with an empty plan', () => {
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });

  it('setPhysicalAttackTarget updates targetUnitId', () => {
    usePhysicalAttackPlanStore.getState().setPhysicalAttackTarget('defender');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.targetUnitId,
    ).toBe('defender');
  });

  it('setPhysicalAttackType updates attackType and limb', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackType('kick', 'leftLeg');
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: 'kick',
      limb: 'leftLeg',
      twoHandedZweihander: false,
    });
  });

  it('setPhysicalAttackType stores the selected physical limb', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackType('punch', 'rightArm');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'punch',
      limb: 'rightArm',
    });
  });

  it('clearPhysicalAttackPlan resets target + type', () => {
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('punch');
    store.clearPhysicalAttackPlan();
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });

  it('commitPhysicalAttack returns null when target / type are missing', () => {
    const fakeSession = buildFakeInteractiveSession();
    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
    });
    expect(next).toBeNull();
  });

  it('commitPhysicalAttack emits a PhysicalAttackDeclared event onto the session', () => {
    const fakeSession = buildFakeInteractiveSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('punch');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
      hexesMoved: 0,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackerId).toBe('attacker');
    expect(payload.targetId).toBe('defender');
    expect(payload.attackType).toBe('punch');
    expect(payload.limb).toBe('rightArm');
  });

  it('commitPhysicalAttack emits explicit two-handed Zweihander state', () => {
    const fakeSession = buildFakeInteractiveSession(
      buildSession({ attackerAbilities: ['zweihander'] }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('punch');
    store.setPhysicalAttackTwoHandedZweihander(true);

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
      hexesMoved: 0,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('punch');
    expect(payload.twoHandedZweihander).toBe(true);
  });

  it('commitPhysicalAttack emits selected iNARC pod identity for Brush-Off', () => {
    const selectedINarcPod = {
      teamId: GameSide.Player,
      podType: 'ecm' as const,
      location: 'left_torso' as const,
    };
    const fakeSession = buildFakeInteractiveSession(
      buildSession({ defenderINarcPods: [selectedINarcPod] }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackINarcPod(selectedINarcPod);
    store.setPhysicalAttackType('brush-off');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
      hexesMoved: 0,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('brush-off');
    expect(payload.selectedINarcPod).toEqual(selectedINarcPod);
  });

  it('commitPhysicalAttack infers run-gated charge legality from attacker movement state', () => {
    const fakeSession = buildFakeInteractiveSession(
      buildSession({ attackerMovementThisTurn: MovementType.Run }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('charge');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
      hexesMoved: 3,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('charge');
  });

  it('commitPhysicalAttack clears the plan after a successful commit', () => {
    const fakeSession = buildFakeInteractiveSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('kick');
    usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fakeSession,
      attackerId: 'attacker',
      attackerPiloting: 4,
    });

    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
      twoHandedZweihander: false,
    });
  });
});
