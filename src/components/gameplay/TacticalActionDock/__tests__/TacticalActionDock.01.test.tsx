import { within } from '@testing-library/react';

import * as H from './TacticalActionDock.test-helpers';

const {
  CoverLevel,
  GamePhase,
  MovementType,
  RangeBracket,
  TacticalActionDock,
  fireEvent,
  makeCombatInfo,
  makeCtx,
  makeMovementInfo,
  makePhysicalOption,
  makeWeapon,
  render,
  screen,
} = H;

type ICombatRangeHex = H.ICombatRangeHex;
type IMovementRangeHex = H.IMovementRangeHex;
type IPhysicalAttackOption = H.IPhysicalAttackOption;
type ITacticalCommandContext = H.ITacticalCommandContext;
type IWeaponStatus = H.IWeaponStatus;
describe('TacticalActionDock', () => {
  it('opens an app dialog for End Phase without invoking native confirmation', () => {
    const onAction = jest.fn();
    const nativeConfirm = jest
      .spyOn(window, 'confirm')
      .mockImplementation(() => {
        throw new Error('Native confirmation must not block tactical commands');
      });
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.WeaponAttack })}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByTestId('command-btn-heat-end.end-phase'));

    expect(screen.getByRole('dialog', { name: 'End Phase?' })).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });
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
    // tactical-movement-intent-composer: Walk/Run/Sprint/Jump verbs are removed;
    // Evade remains as a Posture Action in the movement command group.
    expect(
      screen.getByTestId('command-btn-movement.evade'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('command-btn-movement.walk')).toBeNull();
    expect(screen.queryByTestId('command-btn-movement.run')).toBeNull();
    expect(screen.queryByTestId('command-btn-movement.jump')).toBeNull();
    expect(screen.queryByTestId('command-btn-weapon.fire-volley')).toBeNull();
  });

  it('keeps movement and facing hotkeys unique in the visible command set', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    expect(screen.getByTestId('command-btn-movement.evade')).toHaveTextContent(
      '(E)',
    );
    expect(
      screen.getByTestId('command-btn-facing.rotate-right'),
    ).toHaveTextContent('(D)');
  });

  it('separates dangerous utility actions with a danger contract', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    expect(screen.getByTestId('command-group-utility-danger')).toBeVisible();
    for (const commandId of [
      'utility.eject',
      'utility.withdraw',
      'utility.concede',
    ]) {
      const button = screen.getByTestId(`command-btn-${commandId}`);
      expect(button).toHaveAttribute('data-command-danger', 'true');
      expect(button).toHaveAccessibleName(/requires confirmation/i);
    }
  });

  it('returns focus to a dangerous command when confirmation is cancelled', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );

    const concede = screen.getByTestId('command-btn-utility.concede');
    fireEvent.focus(concede);
    fireEvent.click(concede);

    expect(screen.getByRole('dialog', { name: 'Concede?' })).toBeVisible();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^Cancel$/,
      }),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(concede);
    confirmSpy.mockRestore();
  });

  it('dispatches actionId and structured payload through onAction on click', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ activeUnitProne: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    // Evade is the surviving movement-verb (Posture Action) on the dock.
    fireEvent.click(screen.getByTestId('command-btn-movement.evade'));
    expect(onAction).toHaveBeenCalledWith('lock', { mode: 'evade' });
  });

  it('does not dispatch when canAct is false (disabled-with-reason)', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false, activeUnitProne: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.evade');
    expect(button).toBeDisabled();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('disabled command exposes aria-describedby for screen readers', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ canAct: false, activeUnitProne: false })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const button = screen.getByTestId('command-btn-movement.evade');
    expect(button.getAttribute('aria-describedby')).toBe(
      'command-disabled-reason-movement.evade',
    );
  });

  it('cancelled app confirmation leaves the volley uncommitted', () => {
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
    expect(screen.getByRole('dialog', { name: 'Fire Volley?' })).toBeVisible();
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^Cancel$/,
      }),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
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
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm Fire Volley' }),
    );
    expect(onAction).toHaveBeenCalledWith('lock', { volley: true });
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it.each([
    ['eject', 'Eject'],
    ['withdraw', 'Withdraw'],
    ['concede', 'Concede'],
  ])('requires explicit approval exactly once for %s', (actionId, label) => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByTestId(`command-btn-utility.${actionId}`));
    expect(screen.getByRole('dialog', { name: `${label}?` })).toBeVisible();
    expect(onAction).not.toHaveBeenCalled();
    const approve = screen.getByRole('button', { name: `Confirm ${label}` });

    fireEvent.click(approve);
    fireEvent.click(approve);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(actionId, {});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['eject', 'Eject'],
    ['withdraw', 'Withdraw'],
  ])('cancellation leaves %s uncommitted', (actionId, label) => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const trigger = screen.getByTestId(`command-btn-utility.${actionId}`);
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: `${label}?` })).toBeVisible();

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^Cancel$/,
      }),
    );

    expect(onAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it.each(['Escape', 'backdrop', 'close'])(
    '%s dismisses without committing',
    (method) => {
      const onAction = jest.fn();
      render(
        <TacticalActionDock
          ctx={makeCtx()}
          shellMode="combat"
          onAction={onAction}
        />,
      );
      const trigger = screen.getByTestId('command-btn-utility.concede');
      fireEvent.click(trigger);
      const dialog = screen.getByRole('dialog', { name: 'Concede?' });

      if (method === 'Escape') fireEvent.keyDown(document, { key: 'Escape' });
      else if (method === 'backdrop') {
        const backdrop = dialog.parentElement;
        if (!backdrop) throw new Error('Dialog backdrop is missing');
        fireEvent.click(backdrop);
      } else
        fireEvent.click(
          within(dialog).getByRole('button', { name: 'Close dialog' }),
        );

      expect(onAction).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(trigger);
    },
  );

  it('renders the Initiative begin-round command and dispatches it', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Initiative })}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    expect(screen.getByTestId('tactical-action-dock')).toBeInTheDocument();
    const button = screen.getByTestId('command-btn-heat-end.begin-round');
    expect(button).toHaveTextContent('Roll Initiative & Begin');
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledWith('begin-round', {});
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

  it('can hide a registry command when a trailing action owns it', () => {
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={makeCtx()}
        shellMode="combat"
        onAction={onAction}
        suppressCommandIds={['utility.concede']}
        trailingActions={<button data-testid="concede-button">Concede</button>}
      />,
    );

    expect(screen.queryByTestId('command-btn-utility.concede')).toBeNull();
    expect(screen.getByTestId('command-btn-utility.eject')).toBeInTheDocument();
    expect(screen.getByTestId('concede-button')).toBeInTheDocument();
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
});
