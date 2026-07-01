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

  it('commits a legal weapon preview through the same shared combat projection', () => {
    const onAction = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const combatInfo = makeCombatInfo({
      targetUnitIds: ['enemy-x'],
      validTargetUnitIds: ['enemy-x'],
      availableWeaponHeat: 3,
      expectedDamage: 2.1,
    });

    render(
      <TacticalActionDock
        ctx={makeCtx({
          phase: GamePhase.WeaponAttack,
          targetUnitId: 'enemy-x',
        })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          combatInfo,
          weaponStatuses: [makeWeapon()],
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-weapon');
    expect(preview).toHaveAttribute('data-command-preview-target', 'enemy-x');
    expect(preview).toHaveAttribute('data-command-preview-attackable', 'true');
    expect(preview).toHaveAttribute('data-command-preview-heat', '3');

    fireEvent.click(screen.getByTestId('command-btn-weapon.fire-volley'));

    expect(confirmSpy).toHaveBeenCalledWith('Confirm: Fire Volley?');
    expect(onAction).toHaveBeenCalledWith('lock', { volley: true });
    confirmSpy.mockRestore();
  });

  it('rejects a blocked weapon commit with the same reason shown in preview', () => {
    const onAction = jest.fn();
    const blockedReason = 'Blocked by building at (1, 0)';

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
            attackInvalidDetails: blockedReason,
            blockedReason,
            toHitNumber: undefined,
          }),
          weaponStatuses: [makeWeapon()],
        }}
      />,
    );

    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      blockedReason,
    );

    const fireVolley = screen.getByTestId('command-btn-weapon.fire-volley');
    expect(fireVolley).toBeDisabled();
    fireEvent.mouseEnter(fireVolley.parentElement!);
    expect(
      screen.getByTestId('command-disabled-reason-weapon.fire-volley'),
    ).toHaveTextContent(blockedReason);
    fireEvent.click(fireVolley);

    expect(onAction).not.toHaveBeenCalled();
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
    expect(preview).toHaveAttribute('data-command-preview-turning-cost', '1');
    expect(preview).toHaveAttribute('data-command-preview-unreachable', 'true');
    expect(preview).toHaveTextContent('Blocked Move');
    expect(preview).toHaveTextContent('Terrain +1');
    expect(preview).toHaveTextContent('Turning +1');
    expect(preview).toHaveTextContent('Elevation +2');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      'Destination is blocked by terrain',
    );
  });

  // tactical-movement-intent-composer: the informational movement PREVIEW panel
  // still renders from the shared projection, but COMMIT is owned by the
  // composer's explicit Lock-In, not a dock movement-verb button. The dock no
  // longer surfaces a run/walk/jump commit button.
  it('renders the legal movement preview panel from the shared projected mode', () => {
    const onAction = jest.fn();

    render(
      <TacticalActionDock
        ctx={makeCtx({ phase: GamePhase.Movement })}
        shellMode="combat"
        onAction={onAction}
        previewInputs={{
          movementInfo: makeMovementInfo({
            mpCost: 4,
            reachable: true,
            movementType: MovementType.Run,
            movementMode: 'run',
            terrainCost: 1,
            turningCost: 0,
            elevationDelta: 0,
            elevationCost: 0,
            heatGenerated: 2,
            blockedReason: undefined,
            movementInvalidReason: undefined,
            movementInvalidDetails: undefined,
          }),
        }}
      />,
    );

    const preview = screen.getByTestId('command-preview-movement');
    expect(preview).toHaveAttribute('data-command-preview-mode', 'run');
    expect(preview).toHaveAttribute('data-command-preview-mp-cost', '4');
    expect(preview).toHaveAttribute(
      'data-command-preview-unreachable',
      'false',
    );
    // No dock movement-verb commit buttons exist anymore.
    expect(screen.queryByTestId('command-btn-movement.run')).toBeNull();
    expect(screen.queryByTestId('command-btn-movement.walk')).toBeNull();
  });

  it('surfaces a blocked movement preview reason from the shared projection', () => {
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

    const preview = screen.getByTestId('command-preview-movement');
    expect(preview).toHaveAttribute('data-command-preview-unreachable', 'true');
    expect(screen.getByTestId('command-preview-reason')).toHaveTextContent(
      'Destination is blocked by terrain',
    );
    // The composer Lock-In owns commit; the dock has no run commit button.
    expect(screen.queryByTestId('command-btn-movement.run')).toBeNull();
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
});
