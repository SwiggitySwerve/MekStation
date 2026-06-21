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
});
