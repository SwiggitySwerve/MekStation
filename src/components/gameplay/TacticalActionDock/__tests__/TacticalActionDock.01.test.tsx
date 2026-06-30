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

    expect(confirmSpy).toHaveBeenCalledWith('Confirm: Concede?');
    expect(onAction).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(concede);
    confirmSpy.mockRestore();
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
});
