import * as H from './damageFeedbackEffects.test-helpers';

const {
  DamageEffectDefinitions,
  DebrisCloud,
  EngineFire,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  HexMapDisplay,
  HitLocationFlash,
  PersistentEffectsLayer,
  React,
  SmokePuff,
  TokenUnitType,
  act,
  armorStateWithDestroyed,
  buildEvent,
  damagePayload,
  effectAnchorForLocation,
  engineCritPayload,
  expectedSmokeTransform,
  hexToPixel,
  locationDestroyedPayload,
  render,
  screen,
  svgRender,
  token,
  uniformBipedLocations,
  unitDestroyedPayload,
  within,
} = H;

type ArmorPipState = H.ArmorPipState;
type BipedPipLocation = H.BipedPipLocation;
type DamageAppliedPayloadWithTransfer = H.DamageAppliedPayloadWithTransfer;
type EffectLocation = H.EffectLocation;
type ICriticalHitResolvedPayload = H.ICriticalHitResolvedPayload;
type IDamageAppliedPayload = H.IDamageAppliedPayload;
type IGameEvent = H.IGameEvent;
type ILocationDestroyedPayload = H.ILocationDestroyedPayload;
type IUnitDestroyedPayload = H.IUnitDestroyedPayload;
type IUnitToken = H.IUnitToken;
type PipLocationState = H.PipLocationState;
describe('damage feedback effects primitives', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('HitLocationFlash targets only the damaged pip group', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'damage-right-arm',
        GameEventType.DamageApplied,
        damagePayload({ location: 'RA' }),
      ),
    ];

    svgRender(
      <HitLocationFlash
        unitId="u1"
        events={events}
        prefersReducedMotion={false}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });

    const flash = screen.getByTestId('hit-location-flash-u1-rightArm');
    expect(flash).toHaveAttribute('data-location', 'rightArm');
    expect(flash).toHaveAttribute('pointer-events', 'none');
    expect(
      screen.queryByTestId('hit-location-flash-u1-leftArm'),
    ).not.toBeInTheDocument();
  });

  it('HitLocationFlash sequences transferred damage from source to destination', () => {
    const payload: DamageAppliedPayloadWithTransfer = {
      ...damagePayload({ location: 'right_torso' }),
      fromLocation: 'left_arm',
      toLocation: 'right_torso',
    };
    const events: readonly IGameEvent[] = [
      buildEvent('transfer-hit', GameEventType.DamageApplied, payload),
    ];

    svgRender(
      <HitLocationFlash
        unitId="u1"
        events={events}
        prefersReducedMotion={false}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('hit-location-flash-u1-leftArm')).toBeVisible();
    expect(
      screen.queryByTestId('hit-location-flash-u1-rightTorso'),
    ).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(
      screen.getByTestId('hit-location-flash-u1-rightTorso'),
    ).toBeVisible();
  });

  it('SmokePuff is pointer-safe and exposes an accessibility title', () => {
    const { container } = svgRender(
      <>
        <DamageEffectDefinitions />
        <SmokePuff unitId="u1" location="left_arm" prefersReducedMotion />
      </>,
    );

    const smoke = screen.getByTestId('smoke-puff-u1-leftArm');
    expect(smoke).toHaveAttribute('pointer-events', 'none');
    expect(smoke).toHaveAttribute('data-reduced-motion', 'true');
    expect(container.querySelector('title')?.textContent).toBe(
      'Smoke venting from Left Arm on u1',
    );
  });

  it('SmokePuff can project LocationDestroyed events without global state', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'right-leg-destroyed',
        GameEventType.LocationDestroyed,
        locationDestroyedPayload({ location: 'right_leg' }),
      ),
    ];

    svgRender(
      <>
        <DamageEffectDefinitions />
        <SmokePuff unitId="u1" events={events} prefersReducedMotion />
      </>,
    );

    expect(screen.getByTestId('smoke-puff-u1-rightLeg')).toBeInTheDocument();
  });

  it('EngineFire counts engine CriticalHitResolved events for intensity', () => {
    const events: readonly IGameEvent[] = [
      buildEvent('engine-type', GameEventType.CriticalHitResolved, {
        ...engineCritPayload({ componentType: 'ENGINE' }),
      }),
      buildEvent(
        'engine-name',
        GameEventType.CriticalHitResolved,
        engineCritPayload({
          componentType: 'weapon',
          componentName: 'Fusion Engine Slot',
        }),
        2,
      ),
      buildEvent(
        'gyro',
        GameEventType.CriticalHitResolved,
        engineCritPayload({
          componentType: 'gyro',
          componentName: 'Gyro',
        }),
        3,
      ),
    ];

    const { container } = svgRender(
      <>
        <DamageEffectDefinitions />
        <EngineFire unitId="u1" events={events} prefersReducedMotion />
      </>,
    );

    const fire = screen.getByTestId('engine-fire-u1');
    expect(fire).toHaveAttribute('data-intensity', '2');
    expect(fire).toHaveAttribute('pointer-events', 'none');
    expect(container.querySelector('title')?.textContent).toBe(
      'Engine fire on u1, intensity 2',
    );
  });

  it('DebrisCloud plays for UnitDestroyed and clears after 800ms', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'destroyed',
        GameEventType.UnitDestroyed,
        unitDestroyedPayload(),
      ),
    ];

    svgRender(
      <DebrisCloud unitId="u1" events={events} prefersReducedMotion={false} />,
    );

    expect(screen.getByTestId('debris-cloud-u1')).toHaveAttribute(
      'data-duration-ms',
      '800',
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.queryByTestId('debris-cloud-u1')).not.toBeInTheDocument();
  });

  it('reduced-motion debris collapses to a static frame', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'destroyed',
        GameEventType.UnitDestroyed,
        unitDestroyedPayload(),
      ),
    ];

    const { container } = svgRender(
      <DebrisCloud unitId="u1" events={events} prefersReducedMotion />,
    );

    expect(screen.getByTestId('debris-cloud-u1')).toHaveAttribute(
      'data-duration-ms',
      '80',
    );
    expect(container.querySelector('animate')).toBeNull();
  });
});
