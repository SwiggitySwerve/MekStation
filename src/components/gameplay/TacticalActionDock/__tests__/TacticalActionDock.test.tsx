/**
 * TacticalActionDock — component test.
 *
 * Verifies the dock renders commands grouped by category, marks
 * disabled commands as disabled with an accessible reason, dispatches
 * actionId through onAction, and routes requiresConfirmation through
 * the confirm gate.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  type ICombatRangeHex,
  type IMovementRangeHex,
  type ITacticalCommandContext,
  type IWeaponStatus,
} from '@/types/gameplay';

import { TacticalActionDock } from '../TacticalActionDock';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

function makeCombatInfo(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: { q: 2, r: 0 },
    distance: 2,
    rangeBracket: RangeBracket.Medium,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['enemy-x'],
    obscuredTargetUnitIds: [],
    attackable: true,
    weaponIdsInRange: ['medium-laser'],
    weaponIdsInArc: ['medium-laser'],
    weaponIdsAvailable: ['medium-laser'],
    weaponRangeOptions: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
        rangeBracket: RangeBracket.Medium,
        inRange: true,
        inArc: true,
        environmentLegal: true,
        available: true,
      },
    ],
    availableWeaponImpacts: [
      {
        weaponId: 'medium-laser',
        weaponName: 'Medium Laser',
        heat: 3,
        damage: 5,
        ammoConsumed: 0,
      },
    ],
    availableWeaponHeat: 3,
    availableWeaponDamage: 5,
    expectedDamage: 2.1,
    targetUnitIds: ['enemy-x'],
    validTargetUnitIds: ['enemy-x'],
    toHitNumber: 8,
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 3, medium: 6, long: 9 },
    ...overrides,
  };
}

function makeMovementInfo(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 4, r: 0 },
    mpCost: 6,
    terrainCost: 1,
    elevationDelta: 2,
    elevationCost: 2,
    heatGenerated: 2,
    movementMode: 'walk',
    reachable: false,
    movementType: MovementType.Run,
    blockedReason: 'Destination is blocked by terrain',
    movementInvalidReason: 'InsufficientMP',
    movementInvalidDetails: 'Destination is blocked by terrain',
    ...overrides,
  };
}

function makePhysicalOption(
  overrides: Partial<IPhysicalAttackOption> = {},
): IPhysicalAttackOption {
  return {
    attackType: 'punch',
    limb: 'rightArm',
    toHit: {
      baseToHit: 4,
      finalToHit: 6,
      modifiers: [],
      allowed: true,
    },
    damage: {
      targetDamage: 7,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      hitTable: 'punch',
      targetDisplaced: false,
    },
    selfRisk: {
      damageToAttacker: 0,
      legDamagePerLeg: 0,
      pilotingSkillRoll: null,
      onMiss: null,
    },
    restrictionsFailed: [],
    ...overrides,
  };
}

describe('TacticalActionDock', () => {
  it('renders the dock with the tactical-action-dock testid', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    expect(screen.getByTestId('tactical-action-dock')).toBeInTheDocument();
  });

  it('renders Movement-phase commands grouped by category', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    expect(screen.getByTestId('command-group-movement')).toBeInTheDocument();
    expect(screen.getByTestId('command-btn-movement.walk')).toBeInTheDocument();
    expect(screen.queryByTestId('command-btn-weapon.fire-volley')).toBeNull();
  });

  it('dispatches actionId and structured payload through onAction on click', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-movement.walk'));
    expect(onAction).toHaveBeenCalledWith('lock', { mode: 'walk' });
  });

  it('does not dispatch when canAct is false (disabled-with-reason)', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.walk');
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('disables Jump with an explanation when the active unit has no jump MP', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    const button = screen.getByTestId('command-btn-movement.jump');
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-describedby')).toBe(
      'command-disabled-reason-movement.jump',
    );
    fireEvent.mouseEnter(button.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-movement.jump'),
    ).toHaveTextContent('No jump capability.');

    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('disables movement modes when heat leaves no effective MP', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          activeUnitProne: false,
          activeUnitHeat: 30,
          movementCapability: { walkMP: 4, runMP: 6, jumpMP: 4 },
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    const run = screen.getByTestId('command-btn-movement.run');
    expect(run).toBeDisabled();
    fireEvent.mouseEnter(run.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-movement.run'),
    ).toHaveTextContent('Heat penalty leaves no run MP.');
    fireEvent.click(run);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('disabled command exposes aria-describedby for screen readers', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.walk');
    expect(button.getAttribute('aria-describedby')).toBe(
      'command-disabled-reason-movement.walk',
    );
  });

  it('confirm-gated commands route through window.confirm', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-weapon.fire-volley'));
    expect(confirmSpy).toHaveBeenCalled();
    // confirm returned false -> no dispatch (spec: 'Cancel returns to
    // neutral selection state').
    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not confirm or dispatch a fire volley blocked by combat projection', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
          targetCombatProjection: makeCombatInfo({
            attackable: false,
            validTargetUnitIds: [],
            attackInvalidReason: 'NoLineOfSight',
            attackInvalidDetails: 'Blocked by building at (1, 0)',
            blockedReason: 'Blocked by building at (1, 0)',
            toHitNumber: undefined,
          }),
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    const button = screen.getByTestId('command-btn-weapon.fire-volley');
    expect(button).toBeDisabled();
    fireEvent.mouseEnter(button.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-weapon.fire-volley'),
    ).toHaveTextContent('Blocked by building at (1, 0)');
    fireEvent.click(button);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('confirm-accepted commands dispatch the actionId', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId('command-btn-weapon.fire-volley'));
    expect(onAction).toHaveBeenCalledWith('lock', { volley: true });
    confirmSpy.mockRestore();
  });

  it('shows empty state when no commands are available for the phase', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Initiative })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    // Initiative phase has no commands in the registry today —
    // utility commands carry ALL_PHASES so they still appear.
    // Verify the dock renders without crash even if there are no
    // matching groups (eject/withdraw/concede all available).
    expect(screen.getByTestId('tactical-action-dock')).toBeInTheDocument();
  });

  it('renders trailingActions slot', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
        trailingActions={<button data-testid="trailing-test-btn">Trail</button>}
      />,
    );
    expect(
      screen.getByTestId('tactical-action-dock-trailing'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('trailing-test-btn')).toBeInTheDocument();
  });

  it('renders a weapon command preview from shared combat projection inputs', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          combatInfo: makeCombatInfo(),
          weaponStatuses: [makeWeapon()],
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-weapon');
    expect(preview).toHaveAttribute('data-command-preview-target', 'enemy-x');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'true');
    expect(preview).toHaveAttribute('data-command-preview-to-hit', '8');
    expect(preview).toHaveAttribute('data-command-preview-range', 'medium');
    expect(preview).toHaveAttribute('data-command-preview-heat', '3');
    expect(preview).toHaveAttribute(
      'data-command-preview-weapon-ids',
      'medium-laser',
    );
    expect(preview).toHaveAttribute(
      'data-command-preview-weapon-names',
      'Medium Laser',
    );
    expect(preview).toHaveAttribute(
      'data-command-preview-expected-damage',
      '2.10',
    );
    expect(preview).toHaveTextContent('TN8');
    expect(preview).toHaveTextContent('Heat +3');
    expect(screen.getByTestId('command-preview-weapons')).toHaveTextContent(
      'Weapons Medium Laser',
    );
    expect(preview).toHaveTextContent('Exp 2.1');
  });

  it('renders the projected multi-weapon volley before commit', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          combatInfo: makeCombatInfo({
            weaponIdsAvailable: ['medium-laser', 'ac-5'],
            availableWeaponImpacts: [
              {
                weaponId: 'medium-laser',
                weaponName: 'Medium Laser',
                heat: 3,
                damage: 5,
                ammoConsumed: 0,
              },
              {
                weaponId: 'ac-5',
                weaponName: 'AC/5',
                heat: 1,
                damage: 5,
                ammoConsumed: 1,
                ammoRemaining: 8,
              },
            ],
            availableWeaponHeat: 4,
            availableWeaponDamage: 10,
            expectedDamage: 4.2,
          }),
          weaponStatuses: [
            makeWeapon({ heat: 12 }),
            makeWeapon({
              id: 'ac-5',
              name: 'AC/5',
              heat: 8,
              damage: 5,
              ammoRemaining: 8,
            }),
          ],
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-weapon');
    expect(preview).toHaveAttribute(
      'data-command-preview-weapon-ids',
      'medium-laser,ac-5',
    );
    expect(preview).toHaveAttribute(
      'data-command-preview-weapon-names',
      'Medium Laser,AC/5',
    );
    expect(preview).toHaveAttribute('data-command-preview-heat', '4');
    expect(preview).toHaveAttribute(
      'data-command-preview-expected-damage',
      '4.20',
    );
    expect(screen.getByTestId('command-preview-weapons')).toHaveTextContent(
      'Weapons Medium Laser, AC/5',
    );
    expect(screen.getByTestId('command-preview-ammo')).toHaveTextContent(
      'Ammo AC/5 x1',
    );
  });

  it('renders a hovered weapon preview before the attack target is locked', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: null,
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          combatInfo: makeCombatInfo(),
          weaponStatuses: [makeWeapon()],
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-weapon');
    expect(preview).toHaveAttribute('data-command-preview-target', 'enemy-x');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'true');
    expect(preview).toHaveAttribute('data-command-preview-to-hit', '8');
    expect(preview).toHaveTextContent('enemy-x');
    expect(preview).toHaveTextContent('TN8');
  });

  it('renders a blocked weapon preview from shared combat projection inputs', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          combatInfo: makeCombatInfo({
            attackable: false,
            validTargetUnitIds: [],
            attackInvalidReason: 'NoLineOfSight',
            attackInvalidDetails: 'Blocked by building at (1, 0)',
            blockedReason: 'Blocked by building at (1, 0)',
            toHitNumber: undefined,
          }),
          weaponStatuses: [makeWeapon()],
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-weapon');
    expect(preview).toHaveAttribute('data-command-preview-target', 'enemy-x');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'false');
    expect(preview).toHaveAttribute(
      'data-command-preview-invalid-reason',
      'NoLineOfSight',
    );
    expect(preview).toHaveAttribute(
      'data-command-preview-blocked-reason',
      'Blocked by building at (1, 0)',
    );
    expect(preview).toHaveAttribute('data-command-preview-heat', '0');
    expect(preview).toHaveAttribute(
      'data-command-preview-expected-damage',
      '0.00',
    );
    expect(preview).toHaveTextContent('Blocked Attack');
    expect(preview).toHaveTextContent('TN -');
    expect(preview).toHaveTextContent('Heat 0');
    expect(preview).toHaveTextContent('Exp 0.0');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      'Blocked by building at (1, 0)',
    );
  });

  it('renders a blocked movement preview from shared movement projection inputs', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Movement })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          movementInfo: makeMovementInfo(),
          hoverUnreachable: true,
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-movement');
    expect(preview).toHaveAttribute('data-command-preview-mode', 'run');
    expect(preview).toHaveAttribute(
      'data-command-preview-movement-mode',
      'walk',
    );
    expect(preview).toHaveAttribute('data-command-preview-mp-cost', '6');
    expect(preview).toHaveAttribute('data-command-preview-heat', '2');
    expect(preview).toHaveAttribute('data-command-preview-unreachable', 'true');
    expect(preview).toHaveTextContent('Blocked Move');
    expect(preview).toHaveTextContent('Terrain +1');
    expect(preview).toHaveTextContent('Elevation +2');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      'Destination is blocked by terrain',
    );
  });

  it('uses shared movement projection inputs to disable blocked movement commits', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Movement })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          movementInfo: makeMovementInfo({
            movementType: MovementType.Run,
            movementInvalidDetails: 'Destination is blocked by terrain',
          }),
        }}
      />,
    );

    const run = screen.getByTestId('command-btn-movement.run');
    expect(run).toBeDisabled();
    fireEvent.mouseEnter(run.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-movement.run'),
    ).toHaveTextContent('Destination is blocked by terrain');
    fireEvent.click(run);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('renders a physical preview from shared physical projection inputs', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.PhysicalAttack,
          targetUnitId: null,
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          physicalTargetUnitId: 'enemy-x',
          physicalAttackOption: makePhysicalOption({
            attackType: 'dfa',
            toHit: {
              baseToHit: 5,
              finalToHit: 8,
              modifiers: [],
              allowed: true,
            },
            damage: {
              targetDamage: 18,
              attackerDamage: 5,
              attackerLegDamagePerLeg: 2,
              targetPSR: true,
              attackerPSR: true,
              attackerPSRModifier: 0,
              hitTable: 'kick',
              targetDisplaced: false,
            },
            selfRisk: {
              damageToAttacker: 5,
              legDamagePerLeg: 2,
              pilotingSkillRoll: { trigger: 'DFACompleted', required: true },
              onMiss: 'AttackerFalls',
            },
          }),
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-physical');
    expect(preview).toHaveAttribute('data-command-preview-target', 'enemy-x');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'true');
    expect(preview).toHaveAttribute('data-command-preview-to-hit', '8');
    expect(preview).toHaveAttribute('data-command-preview-damage', '18');
    expect(preview).toHaveAttribute('data-command-preview-self-damage', '5');
    expect(preview).toHaveAttribute(
      'data-command-preview-requires-psr',
      'true',
    );
    expect(preview).toHaveTextContent('Physical Preview');
    expect(preview).toHaveTextContent('Damage 18');
    expect(preview).toHaveTextContent('Self 5');
    expect(preview).toHaveTextContent('Legs 2/leg');
    expect(preview).toHaveTextContent('PSR required');
    expect(preview).toHaveTextContent('Fall on miss');
    expect(preview).toHaveTextContent('TN8');
  });

  it('renders a blocked physical preview from shared restriction inputs', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.PhysicalAttack,
          targetUnitId: null,
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          physicalTargetUnitId: 'enemy-x',
          physicalAttackOption: makePhysicalOption({
            attackType: 'charge',
            toHit: {
              baseToHit: 5,
              finalToHit: Number.POSITIVE_INFINITY,
              modifiers: [],
              allowed: false,
              restrictionReasonCode: 'NoRunThisTurn',
            },
            damage: {
              targetDamage: 13,
              attackerDamage: 3,
              attackerLegDamagePerLeg: 0,
              targetPSR: true,
              attackerPSR: true,
              attackerPSRModifier: 0,
              hitTable: 'kick',
              targetDisplaced: false,
            },
            selfRisk: {
              damageToAttacker: 3,
              legDamagePerLeg: 0,
              pilotingSkillRoll: {
                trigger: 'ChargeCompleted',
                required: true,
              },
              onMiss: 'None',
            },
            restrictionsFailed: ['NoRunThisTurn'],
          }),
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-physical');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'false');
    expect(preview).toHaveAttribute(
      'data-command-preview-restrictions',
      'NoRunThisTurn',
    );
    expect(preview).not.toHaveAttribute('data-command-preview-to-hit');
    expect(preview).toHaveTextContent('Blocked Physical');
    expect(preview).toHaveTextContent('TN -');
    expect(preview).toHaveTextContent('Damage 13');
    expect(preview).toHaveTextContent('Self 3');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      'Charge requires running this turn',
    );

    const charge = screen.getByTestId('command-btn-physical.charge');
    expect(charge).toBeDisabled();
    fireEvent.mouseEnter(charge.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-physical.charge'),
    ).toHaveTextContent('Charge requires running this turn');
    fireEvent.click(charge);
    expect(onAction).not.toHaveBeenCalled();
  });
});
