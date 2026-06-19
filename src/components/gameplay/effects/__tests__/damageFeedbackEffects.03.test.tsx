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
describe('damage feedback battlefield integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(1);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('triggers shake and CT flash for a non-lethal 25 damage center-torso hit', () => {
    const damageEvent = buildEvent(
      'ct-hit-25',
      GameEventType.DamageApplied,
      damagePayload({
        location: 'CT',
        damage: 25,
        armorRemaining: 75,
        structureRemaining: 16,
        locationDestroyed: false,
      }),
    );
    const mapToken = token({
      armorPipState: {
        archetype: 'humanoid',
        locations: uniformBipedLocations('full'),
      },
    });
    const events = [damageEvent] as const;

    render(
      <HexMapDisplay
        radius={2}
        tokens={[mapToken]}
        events={events}
        selectedHex={null}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByTestId('hex-map-container')).toHaveAttribute(
      'data-screen-shake-transform',
      'translate3d(8px, 8px, 0)',
    );
    expect(screen.getByTestId('hex-map-container')).toHaveAttribute(
      'data-screen-shake-active',
      'true',
    );
    expect(
      screen.getByTestId('hit-location-flash-u1-centerTorso'),
    ).toBeInTheDocument();
    expect(
      events.some(
        (event) =>
          event.type === GameEventType.UnitDestroyed ||
          event.type === GameEventType.LocationDestroyed,
      ),
    ).toBe(false);
  });
});
