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
describe('PersistentEffectsLayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('projects smoke and engine fire from supplied tokens and events', () => {
    const mapToken = token({
      position: { q: 1, r: 0 },
      armorPipState: armorStateWithDestroyed('rightLeg'),
    });
    const events: readonly IGameEvent[] = [
      buildEvent(
        'left-arm-destroyed',
        GameEventType.LocationDestroyed,
        locationDestroyedPayload({ location: 'left_arm' }),
      ),
      buildEvent(
        'engine',
        GameEventType.CriticalHitResolved,
        engineCritPayload(),
        2,
      ),
    ];

    svgRender(
      <PersistentEffectsLayer
        tokens={[mapToken]}
        events={events}
        prefersReducedMotion={false}
      />,
    );

    const leftArmSmoke = screen.getByTestId('smoke-puff-u1-leftArm');
    expect(leftArmSmoke).toHaveAttribute(
      'transform',
      expectedSmokeTransform(mapToken.position, 'leftArm'),
    );
    expect(screen.getByTestId('smoke-puff-u1-rightLeg')).toBeInTheDocument();
    expect(screen.getByTestId('engine-fire-u1')).toHaveAttribute(
      'data-intensity',
      '1',
    );
  });

  it('renders wreck badge and replaces live smoke/fire with one wreck smoke stream', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'left-arm-destroyed',
        GameEventType.LocationDestroyed,
        locationDestroyedPayload({ location: 'left_arm' }),
      ),
      buildEvent(
        'engine',
        GameEventType.CriticalHitResolved,
        engineCritPayload(),
        2,
      ),
      buildEvent(
        'destroyed',
        GameEventType.UnitDestroyed,
        unitDestroyedPayload(),
        3,
      ),
    ];

    svgRender(
      <PersistentEffectsLayer
        tokens={[token()]}
        events={events}
        prefersReducedMotion={false}
      />,
    );

    expect(
      screen.queryByTestId('smoke-puff-u1-leftArm'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('engine-fire-u1')).not.toBeInTheDocument();
    expect(screen.getByTestId('wreck-smoke-u1')).toBeInTheDocument();
    expect(screen.getByTestId('wreck-silhouette-u1')).toHaveAttribute(
      'opacity',
      '0.5',
    );
    expect(screen.getByTestId('wreck-badge-u1')).toHaveTextContent('WRECK');
    expect(screen.getByTestId('debris-cloud-u1')).toBeInTheDocument();
  });

  it('reduced motion removes smoke and fire animation definitions', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'left-arm-destroyed',
        GameEventType.LocationDestroyed,
        locationDestroyedPayload({ location: 'left_arm' }),
      ),
      buildEvent(
        'engine',
        GameEventType.CriticalHitResolved,
        engineCritPayload(),
        2,
      ),
    ];

    const { container } = svgRender(
      <PersistentEffectsLayer
        tokens={[token()]}
        events={events}
        prefersReducedMotion
      />,
    );

    expect(container.querySelector('animate')).toBeNull();
  });

  it('smoke and fire titles are available inside the layer', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'left-arm-destroyed',
        GameEventType.LocationDestroyed,
        locationDestroyedPayload({ location: 'left_arm' }),
      ),
      buildEvent(
        'engine',
        GameEventType.CriticalHitResolved,
        engineCritPayload(),
        2,
      ),
    ];

    const { container } = svgRender(
      <PersistentEffectsLayer
        tokens={[token()]}
        events={events}
        prefersReducedMotion
      />,
    );
    const titles = Array.from(container.querySelectorAll('title')).map(
      (title) => title.textContent,
    );

    expect(titles).toContain('Smoke venting from Left Arm on u1');
    expect(titles).toContain('Engine fire on u1, intensity 1');
    expect(
      within(screen.getByTestId('persistent-effects-layer')).getByTestId(
        'damage-effect-definitions',
      ),
    ).toBeInTheDocument();
  });
});
