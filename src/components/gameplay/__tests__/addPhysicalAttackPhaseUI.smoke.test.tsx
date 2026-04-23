/**
 * Per-change smoke test for add-physical-attack-phase-ui.
 *
 * Covers:
 *  - PhysicalAttackTypePicker: renders rows for the standard attack
 *    types and disables them when the matching restriction helper
 *    rejects the input (destroyed shoulder, hip damaged, weapons fired
 *    from arm, etc.). onSelect fires with the right type for enabled
 *    rows and is suppressed for disabled ones.
 *  - PhysicalAttackForecastModal: renders the TN, modifier list,
 *    expected damage, and hit-table label for an allowed attack;
 *    surfaces the restriction reason when the attack is blocked;
 *    Confirm / Back buttons fire the right callbacks.
 *  - usePhysicalAttackPlanStore: setPhysicalAttackTarget /
 *    setPhysicalAttackType / clearPhysicalAttackPlan update the store,
 *    and commitPhysicalAttack pushes a `PhysicalAttackDeclared` event
 *    onto the underlying session.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/tasks.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type { InteractiveSession } from '@/engine/GameEngine';
import type {
  IPhysicalAttackInput,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { PhysicalAttackForecastModal } from '@/components/gameplay/PhysicalAttackForecastModal';
import { PhysicalAttackTypePicker } from '@/components/gameplay/PhysicalAttackTypePicker';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDamageState,
  type IGameSession,
  type IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const EMPTY_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

function withActuator(
  actuator: ActuatorType,
  base: IComponentDamageState = EMPTY_DAMAGE,
): IComponentDamageState {
  return { ...base, actuators: { ...base.actuators, [actuator]: true } };
}

function buildAttackInput(
  attackType: PhysicalAttackType,
  overrides: Partial<IPhysicalAttackInput> = {},
): IPhysicalAttackInput {
  return {
    attackerTonnage: 50,
    pilotingSkill: 4,
    componentDamage: EMPTY_DAMAGE,
    attackType,
    heat: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PhysicalAttackTypePicker
// ---------------------------------------------------------------------------

describe('PhysicalAttackTypePicker', () => {
  it('renders rows for punch / kick / charge / dfa by default', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-row-punch')).toBeInTheDocument();
    expect(screen.getByTestId('physical-attack-row-kick')).toBeInTheDocument();
    expect(
      screen.getByTestId('physical-attack-row-charge'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('physical-attack-row-dfa')).toBeInTheDocument();
  });

  it('renders melee-weapon rows only for equipped weapons', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        meleeWeaponsEquipped={['hatchet']}
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-row-hatchet'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('physical-attack-row-sword'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('physical-attack-row-mace'),
    ).not.toBeInTheDocument();
  });

  it('disables Punch when the shoulder is destroyed', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.SHOULDER)}
        onSelect={jest.fn()}
      />,
    );
    const button = screen.getByTestId('physical-attack-button-punch');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('physical-attack-row-punch')).toHaveAttribute(
      'data-disabled',
      'true',
    );
  });

  it('disables Kick when the hip is destroyed', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.HIP)}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toBeDisabled();
  });

  it('disables Kick while prone', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        attackerProne={true}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toBeDisabled();
  });

  it('disables Punch when both arms fired weapons this turn', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        weaponsFiredFromLeftArm={['med-laser']}
        weaponsFiredFromRightArm={['ac20']}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-punch')).toBeDisabled();
  });

  it('keeps Punch enabled when only ONE arm fired', () => {
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        weaponsFiredFromLeftArm={['med-laser']}
        weaponsFiredFromRightArm={[]}
        onSelect={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-button-punch'),
    ).not.toBeDisabled();
  });

  it('marks the selected button with aria-checked=true', () => {
    render(
      <PhysicalAttackTypePicker
        selected={'kick'}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-attack-button-kick')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('physical-attack-button-punch')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('fires onSelect with the chosen type when an enabled row is clicked', () => {
    const onSelect = jest.fn();
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={EMPTY_DAMAGE}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-attack-button-kick'));
    expect(onSelect).toHaveBeenCalledWith('kick');
  });

  it('does not fire onSelect when a disabled row is clicked', () => {
    const onSelect = jest.fn();
    render(
      <PhysicalAttackTypePicker
        selected={null}
        attackerTonnage={50}
        pilotingSkill={4}
        componentDamage={withActuator(ActuatorType.HIP)}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-attack-button-kick'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PhysicalAttackForecastModal
// ---------------------------------------------------------------------------

describe('PhysicalAttackForecastModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <PhysicalAttackForecastModal
        open={false}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows TN + probability + expected damage for an allowed punch', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-attack-forecast-modal'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('physical-forecast-tn')).toHaveTextContent(
      /TN \d/,
    );
    expect(screen.getByTestId('physical-forecast-prob')).toHaveTextContent(
      /%$/,
    );
    expect(screen.getByTestId('physical-forecast-damage')).toBeInTheDocument();
    expect(screen.getByTestId('physical-forecast-hit-table')).toHaveTextContent(
      /Punch table/,
    );
  });

  it('renders the kick hit-table label for kicks', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('kick')}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId('physical-forecast-hit-table')).toHaveTextContent(
      /Kick table/,
    );
  });

  it('shows the restriction reason when the attack is blocked', () => {
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch', {
          componentDamage: withActuator(ActuatorType.SHOULDER),
        })}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('physical-forecast-restriction'),
    ).toHaveTextContent(/shoulder/i);
    expect(
      screen.getByTestId('physical-forecast-confirm-button'),
    ).toBeDisabled();
  });

  it('fires onConfirm when Confirm Attack is pressed', () => {
    const onConfirm = jest.fn();
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-forecast-confirm-button'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when Back is pressed', () => {
    const onClose = jest.fn();
    render(
      <PhysicalAttackForecastModal
        open={true}
        attackInput={buildAttackInput('punch')}
        onConfirm={jest.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('physical-forecast-back-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// usePhysicalAttackPlanStore
// ---------------------------------------------------------------------------

/**
 * Minimal `IGameSession` snapshot the fake `InteractiveSession` returns
 * from `getSession()`. The only field `declarePhysicalAttack` needs to
 * see is `currentState.units[attackerId]` so it can read heat / prone /
 * componentDamage. Everything else is filler.
 */
function buildSession(): IGameSession {
  return {
    id: 'fake-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'fake-session',
      status: 'active',
      turn: 1,
      phase: GamePhase.PhysicalAttack,
      activationIndex: 0,
      units: {
        attacker: {
          id: 'attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'walk',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
        },
        defender: {
          id: 'defender',
          side: GameSide.Opponent,
          position: { q: 1, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: 'walk',
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
        },
      },
      turnEvents: [],
    },
  } as unknown as IGameSession;
}

function buildFakeInteractiveSession(): InteractiveSession {
  let session = buildSession();
  return {
    getSession: () => session,
    getState: () => session.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
    applyMovement: () => undefined,
    applyAttack: () => undefined,
    // Allow tests to replace the snapshot if they need to.
    __setSession: (s: IGameSession) => {
      session = s;
    },
  } as unknown as InteractiveSession;
}

describe('usePhysicalAttackPlanStore', () => {
  beforeEach(() => {
    usePhysicalAttackPlanStore.getState().clearPhysicalAttackPlan();
  });

  it('starts with an empty plan', () => {
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
    });
  });

  it('setPhysicalAttackTarget updates targetUnitId', () => {
    usePhysicalAttackPlanStore.getState().setPhysicalAttackTarget('defender');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.targetUnitId,
    ).toBe('defender');
  });

  it('setPhysicalAttackType updates attackType', () => {
    usePhysicalAttackPlanStore.getState().setPhysicalAttackType('kick');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.attackType,
    ).toBe('kick');
  });

  it('clearPhysicalAttackPlan resets target + type', () => {
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('defender');
    store.setPhysicalAttackType('punch');
    store.clearPhysicalAttackPlan();
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
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
    });
  });
});

// ---------------------------------------------------------------------------
// getEligiblePhysicalAttacks projection
// ---------------------------------------------------------------------------
//
// Covers `add-physical-attack-phase-ui` task 3.1-3.4 + `physical-attack-system`
// delta "UI-Facing Eligibility Projection". Exercises the adjacency gate,
// per-row shape, and restriction surfacing.

describe('getEligiblePhysicalAttacks', () => {
  const { getEligiblePhysicalAttacks } =
    // Inline require: the test suite already mocks zustand stores up top
    // and we want the projection under test without re-plumbing imports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@/utils/gameplay/physicalAttacks/eligibility');

  function makeUnit(
    id: string,
    side: GameSide,
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
});

// ---------------------------------------------------------------------------
// PhysicalAttackIntentArrow — visual smoke
// ---------------------------------------------------------------------------

describe('PhysicalAttackIntentArrow', () => {
  // Inline require so the module isn't hoisted above the jest.mock calls
  // earlier in the file (Zustand + catalog mocks).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    PhysicalAttackIntentArrow,
  } = require('@/components/gameplay/overlays/PhysicalAttackIntentArrow');

  it('renders the charge variant arrow', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="charge"
          side={GameSide.Player}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-charge')).toBeInTheDocument();
  });

  it('renders the DFA variant arrow (dashed arc)', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="dfa"
          side={GameSide.Player}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-dfa')).toBeInTheDocument();
  });

  it('renders the push ghost-hex with invalid marker when flagged', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="push"
          pushDestination={{ q: 2, r: 0 }}
          pushDestinationValid={false}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-push')).toBeInTheDocument();
    expect(screen.getByTestId('intent-arrow-push-invalid')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Task 10.6: Accessibility — simulated-deuteranopia distinguishes variants
  // -------------------------------------------------------------------------
  //
  // We can't run a real color-transform in jsdom, but the spec (task 9.1 +
  // scenario "DFA intent arrow is dashed arc") requires each variant to
  // carry a SHAPE signal in addition to hue — so a deuteranopia user who
  // loses the red/green channel still distinguishes charge (solid line)
  // from DFA (dashed arc) from push (dashed polygon + optional "X"
  // overlay). The deuteranopia guarantee reduces to: the three SVG
  // subtrees use structurally different shape primitives + dash patterns.
  //
  // This snapshot locks in those structural differences. If a future
  // refactor collapses them into a single shape with only color-based
  // differentiation, the snapshot diffs will catch it immediately.
  describe('deuteranopia: shape carries the variant signal', () => {
    it('charge renders a solid <line> with no strokeDasharray', () => {
      const { container } = render(
        <svg data-testid="charge-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="charge"
            side={GameSide.Player}
          />
        </svg>,
      );
      const line = container.querySelector('line');
      expect(line).not.toBeNull();
      // Charge MUST be solid — no dash pattern.
      expect(line?.getAttribute('stroke-dasharray')).toBeNull();
      // And MUST NOT render an arc <path> (would collide with DFA).
      expect(container.querySelector('path[stroke-dasharray]')).toBeNull();
      expect(container.firstChild).toMatchSnapshot('charge-shape');
    });

    it('DFA renders a dashed <path> arc — distinguishable by shape', () => {
      const { container } = render(
        <svg data-testid="dfa-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="dfa"
            side={GameSide.Player}
          />
        </svg>,
      );
      const arc = container.querySelector('path[stroke-dasharray]');
      expect(arc).not.toBeNull();
      // Dash pattern MUST be present — this is the shape-carried signal
      // that survives a red/green channel loss.
      expect(arc?.getAttribute('stroke-dasharray')).toMatch(/\d+,\d+/);
      // Path must contain a quadratic control ("Q") — the arc lift.
      expect(arc?.getAttribute('d')).toMatch(/Q/);
      expect(container.firstChild).toMatchSnapshot('dfa-shape');
    });

    it('push renders a dashed polygon (not a line/arc)', () => {
      const { container } = render(
        <svg data-testid="push-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="push"
            pushDestination={{ q: 2, r: 0 }}
            pushDestinationValid={true}
          />
        </svg>,
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).not.toBeNull();
      expect(polygon?.getAttribute('stroke-dasharray')).toMatch(/\d+,\d+/);
      // Must NOT also render a line / arc (would confuse with the other
      // two variants under deuteranopia).
      expect(container.querySelector('line')).toBeNull();
      expect(container.querySelector('path[stroke-dasharray]')).toBeNull();
      expect(container.firstChild).toMatchSnapshot('push-shape');
    });

    it('three variants render structurally distinct SVG subtrees', () => {
      // End-to-end sanity: render all three, extract their shape
      // fingerprints, and assert each is unique. Covers the spec
      // scenario "DFA intent arrow is dashed arc — distinguishable
      // from charge under simulated deuteranopia" end-to-end.
      const { container: chargeC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="charge"
            side={GameSide.Player}
          />
        </svg>,
      );
      const { container: dfaC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="dfa"
            side={GameSide.Player}
          />
        </svg>,
      );
      const { container: pushC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="push"
            pushDestination={{ q: 2, r: 0 }}
          />
        </svg>,
      );

      function shapeFingerprint(c: HTMLElement): string {
        // Canonical shape signature: primitive tag + dash pattern. Hue
        // is intentionally excluded so the fingerprint survives the
        // deuteranopia channel loss.
        const parts: string[] = [];
        c.querySelectorAll('line,path,polygon').forEach((el) => {
          parts.push(
            `${el.tagName.toLowerCase()}:${el.getAttribute('stroke-dasharray') ?? 'solid'}`,
          );
        });
        return parts.join('|');
      }

      const chargeFp = shapeFingerprint(chargeC);
      const dfaFp = shapeFingerprint(dfaC);
      const pushFp = shapeFingerprint(pushC);

      expect(chargeFp).not.toBe(dfaFp);
      expect(dfaFp).not.toBe(pushFp);
      expect(chargeFp).not.toBe(pushFp);
    });
  });
});
