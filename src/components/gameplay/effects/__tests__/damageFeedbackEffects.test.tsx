import { act, render, screen, within } from '@testing-library/react';
import React from 'react';

import type {
  ArmorPipState,
  BipedPipLocation,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  ILocationDestroyedPayload,
  IUnitDestroyedPayload,
  IUnitToken,
  PipLocationState,
} from '@/types/gameplay';

import {
  effectAnchorForLocation,
  type EffectLocation,
} from '@/components/gameplay/effects/damageEffectHelpers';
import { DebrisCloud } from '@/components/gameplay/effects/DebrisCloud';
import { EngineFire } from '@/components/gameplay/effects/EngineFire';
import { HitLocationFlash } from '@/components/gameplay/effects/HitLocationFlash';
import {
  DamageEffectDefinitions,
  PersistentEffectsLayer,
} from '@/components/gameplay/effects/PersistentEffectsLayer';
import { SmokePuff } from '@/components/gameplay/effects/SmokePuff';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { TokenUnitType } from '@/types/gameplay';
import { Facing, GameEventType, GamePhase, GameSide } from '@/types/gameplay';

interface DamageAppliedPayloadWithTransfer extends IDamageAppliedPayload {
  readonly fromLocation: string;
  readonly toLocation: string;
}

function svgRender(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<svg>{ui}</svg>);
}

function buildEvent(
  id: string,
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id,
    gameId: 'g1',
    sequence,
    timestamp: `2026-01-01T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload,
  };
}

function damagePayload(
  overrides: Partial<IDamageAppliedPayload> = {},
): IDamageAppliedPayload {
  return {
    unitId: 'u1',
    location: 'right_arm',
    damage: 7,
    armorRemaining: 3,
    structureRemaining: 8,
    locationDestroyed: false,
    ...overrides,
  };
}

function locationDestroyedPayload(
  overrides: Partial<ILocationDestroyedPayload> = {},
): ILocationDestroyedPayload {
  return {
    unitId: 'u1',
    location: 'left_arm',
    ...overrides,
  };
}

function engineCritPayload(
  overrides: Partial<ICriticalHitResolvedPayload> = {},
): ICriticalHitResolvedPayload {
  return {
    unitId: 'u1',
    location: 'center_torso',
    slotIndex: 3,
    componentType: 'engine',
    componentName: 'Fusion Engine',
    effect: 'engine_hit',
    destroyed: false,
    ...overrides,
  };
}

function unitDestroyedPayload(
  overrides: Partial<IUnitDestroyedPayload> = {},
): IUnitDestroyedPayload {
  return {
    unitId: 'u1',
    cause: 'damage',
    ...overrides,
  };
}

function token(overrides: Partial<IUnitToken> = {}): IUnitToken {
  // Default to the Mech variant — discriminated union narrowing is preserved
  // when overrides supply a different unitType (cast at the boundary because
  // TS can't statically verify the merged literal matches a single variant).
  return {
    unitId: 'u1',
    name: 'Atlas',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'ATL',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function uniformBipedLocations(
  state: PipLocationState,
): Record<BipedPipLocation, PipLocationState> {
  return {
    head: state,
    centerTorso: state,
    leftTorso: state,
    rightTorso: state,
    leftArm: state,
    rightArm: state,
    leftLeg: state,
    rightLeg: state,
  };
}

function armorStateWithDestroyed(location: BipedPipLocation): ArmorPipState {
  return {
    archetype: 'humanoid',
    locations: {
      ...uniformBipedLocations('full'),
      [location]: 'destroyed',
    },
  };
}

function expectedSmokeTransform(
  position: IUnitToken['position'],
  location: EffectLocation,
): string {
  const pixel = hexToPixel(position);
  const anchor = effectAnchorForLocation(location);
  return `translate(${pixel.x + anchor.x}, ${pixel.y + anchor.y}) scale(1)`;
}

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
