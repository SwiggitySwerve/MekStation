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
