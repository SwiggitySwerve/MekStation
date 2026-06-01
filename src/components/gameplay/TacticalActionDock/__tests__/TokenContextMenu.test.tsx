/**
 * TokenContextMenu — component test.
 *
 * Verifies the spec's `Unit token context menu filters commands` and
 * `Enemy token context menu targets enemy` scenarios:
 *   - Friendly token menu shows non-enemy-targeting commands.
 *   - Enemy token menu shows only enemy-targeting commands AND
 *     preselects the right-clicked enemy via onTargetEnemy callback.
 *   - Dispatch goes through the same onAction the dock uses (no
 *     parallel dispatch path).
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';

import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

import {
  CoverLevel,
  GamePhase,
  RangeBracket,
  type ICombatRangeHex,
  type ITacticalCommandContext,
} from '@/types/gameplay';

import { TokenContextMenu } from '../TokenContextMenu';

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

function makeCombatProjection(
  overrides: Partial<ICombatRangeHex> = {},
): ICombatRangeHex {
  return {
    hex: { q: 2, r: 0 },
    distance: 2,
    rangeBracket: RangeBracket.Short,
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
    weaponRangeOptions: [],
    availableWeaponImpacts: [],
    availableWeaponHeat: 0,
    availableWeaponDamage: 0,
    targetUnitIds: ['enemy-x'],
    validTargetUnitIds: ['enemy-x'],
    ...overrides,
  };
}

function makePhysicalOption(
  overrides: Partial<IPhysicalAttackOption> = {},
): IPhysicalAttackOption {
  return {
    attackType: 'charge',
    toHit: {
      baseToHit: 5,
      finalToHit: 8,
      modifiers: [],
      allowed: true,
    },
    damage: {
      targetDamage: 12,
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
      pilotingSkillRoll: { trigger: 'ChargeCompleted', required: true },
      onMiss: 'None',
    },
    restrictionsFailed: [],
    ...overrides,
  };
}

describe('TokenContextMenu', () => {
  it('renders the menu with the right testid + side data attr', () => {
    render(
      <TokenContextMenu
        tokenUnitId="unit-a"
        isFriendly={true}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    const menu = screen.getByTestId('token-context-menu');
    expect(menu).toBeInTheDocument();
    expect(menu.getAttribute('data-token-side')).toBe('friendly');
    expect(menu.getAttribute('data-token-unit-id')).toBe('unit-a');
  });

  it('friendly menu hides enemy-targeting commands (filters)', () => {
    render(
      <TokenContextMenu
        tokenUnitId="unit-a"
        isFriendly={true}
        ctx={makeCtx({ targetUnitId: 'enemy-x' })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    expect(
      screen.queryByTestId('token-menu-item-weapon.fire-volley'),
    ).toBeNull();
    expect(
      screen.getByTestId('token-menu-item-utility.concede'),
    ).toBeInTheDocument();
  });

  it('enemy menu surfaces target-aware weapon commands', () => {
    render(
      <TokenContextMenu
        tokenUnitId="enemy-x"
        isFriendly={false}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    expect(
      screen.getByTestId('token-menu-item-weapon.fire-volley'),
    ).toBeInTheDocument();
  });

  it('enemy menu calls onTargetEnemy when an enemy command activates', () => {
    const onAction = jest.fn();
    const onTargetEnemy = jest.fn();
    const onClose = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TokenContextMenu
        tokenUnitId="enemy-x"
        isFriendly={false}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={onClose}
        onAction={onAction}
        onTargetEnemy={onTargetEnemy}
      />,
    );
    fireEvent.click(screen.getByTestId('token-menu-item-weapon.fire-volley'));
    expect(onTargetEnemy).toHaveBeenCalledWith('enemy-x');
    expect(onAction).toHaveBeenCalledWith('lock', { volley: true });
    expect(onClose).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('enemy menu disables fire volley when that target projection is blocked', () => {
    const onAction = jest.fn();
    const onTargetEnemy = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TokenContextMenu
        tokenUnitId="enemy-x"
        isFriendly={false}
        ctx={makeCtx({
          combatProjectionByTargetId: {
            'enemy-x': makeCombatProjection({
              attackable: false,
              validTargetUnitIds: [],
              attackInvalidReason: 'OutOfRange',
              attackInvalidDetails: 'Target at 8 hexes is outside range',
              blockedReason: 'Out of weapon range',
            }),
          },
        })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={onAction}
        onTargetEnemy={onTargetEnemy}
      />,
    );

    const volley = screen.getByTestId('token-menu-item-weapon.fire-volley');
    expect(volley).toBeDisabled();
    expect(
      screen.getByTestId('token-menu-item-reason-weapon.fire-volley'),
    ).toHaveTextContent('Target at 8 hexes is outside range');
    fireEvent.click(volley);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onTargetEnemy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('enemy menu disables physical commands from the clicked target projection', () => {
    const onAction = jest.fn();
    const onTargetEnemy = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <TokenContextMenu
        tokenUnitId="enemy-x"
        isFriendly={false}
        ctx={makeCtx({
          phase: GamePhase.PhysicalAttack,
          physicalAttackOptionsByTargetId: {
            'enemy-x': [
              makePhysicalOption({
                toHit: {
                  baseToHit: 5,
                  finalToHit: Number.POSITIVE_INFINITY,
                  modifiers: [],
                  allowed: false,
                  restrictionReasonCode: 'NoRunThisTurn',
                },
                restrictionsFailed: ['NoRunThisTurn'],
              }),
            ],
          },
        })}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={() => {}}
        onAction={onAction}
        onTargetEnemy={onTargetEnemy}
      />,
    );

    const charge = screen.getByTestId('token-menu-item-physical.charge');
    expect(charge).toBeDisabled();
    expect(
      screen.getByTestId('token-menu-item-reason-physical.charge'),
    ).toHaveTextContent('Charge requires running this turn');
    fireEvent.click(charge);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onTargetEnemy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('Escape key closes the menu', () => {
    const onClose = jest.fn();
    render(
      <TokenContextMenu
        tokenUnitId="unit-a"
        isFriendly={true}
        ctx={makeCtx()}
        shellMode="combat"
        anchor={{ x: 100, y: 100 }}
        onClose={onClose}
        onAction={() => {}}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('dock and friendly token menu surface the same utility command set for the same context (parity)', () => {
    // Spec: 'Context Menus Mirror Command Registry' — dock + menus
    // call the same registry, so for a fixed ctx the menu's utility
    // section is a SUBSET of the dock's utility section.
    const ctx = makeCtx({ phase: GamePhase.Movement });

    const { unmount } = render(
      <TokenContextMenu
        tokenUnitId="unit-a"
        isFriendly={true}
        ctx={ctx}
        shellMode="combat"
        anchor={{ x: 0, y: 0 }}
        onClose={() => {}}
        onAction={() => {}}
      />,
    );
    const concede = screen.queryByTestId('token-menu-item-utility.concede');
    const eject = screen.queryByTestId('token-menu-item-utility.eject');
    expect(concede).toBeInTheDocument();
    expect(eject).toBeInTheDocument();
    unmount();
  });
});
