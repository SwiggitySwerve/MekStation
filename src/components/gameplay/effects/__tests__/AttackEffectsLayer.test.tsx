import { act, render, screen } from '@testing-library/react';

import type {
  IDamageAppliedPayload,
  IGameEvent,
  IHexCoordinate,
  IUnitToken,
} from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { REDUCED_MOTION_QUERY } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  TokenUnitType,
} from '@/types/gameplay';
import {
  ATTACK_EFFECT_COLORS,
  type AttackWeaponEffectPayload,
} from '@/utils/effects/weaponEffectMap';

import { AttackEffectsLayer } from '../AttackEffectsLayer';
import { HitLocationFlash } from '../HitLocationFlash';
import {
  AttackEffectDefs,
  AttackEffectStyles,
  ImpactFlash,
  LaserBeam,
  MissileTrail,
  Shockwave,
  Tracer,
} from '../primitives';

type AttackLayerTestPayload = AttackWeaponEffectPayload & {
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly projectilesHit?: number;
  readonly projectilesMissed?: number;
};

function setReducedMotion(matches: boolean): void {
  const matchMedia = window.matchMedia as jest.MockedFunction<
    typeof window.matchMedia
  >;
  matchMedia.mockImplementation(
    (query: string): MediaQueryList => ({
      matches: query === REDUCED_MOTION_QUERY ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
      addListener: () => undefined,
      removeListener: () => undefined,
    }),
  );
}

function makeToken(
  unitId: string,
  position: IHexCoordinate,
  overrides: Partial<IUnitToken> = {},
): IUnitToken {
  return {
    unitId,
    name: unitId,
    side: GameSide.Player,
    position,
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: unitId.toUpperCase(),
    unitType: TokenUnitType.Mech,
    ...overrides,
  };
}

function makeAttackEvent(
  id: string,
  overrides: Partial<AttackLayerTestPayload>,
): IGameEvent {
  const payload: AttackLayerTestPayload = {
    attackerId: 'attacker',
    targetId: 'target',
    weaponId: 'weapon',
    roll: 8,
    toHitNumber: 7,
    hit: true,
    ...overrides,
  };

  return {
    id,
    gameId: 'game',
    sequence: 1,
    timestamp: '2026-04-30T00:00:00.000Z',
    type: GameEventType.AttackResolved,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: payload.attackerId,
    payload,
  };
}

function makeDamageEvent(
  id: string,
  payload: IDamageAppliedPayload,
  sequence = 2,
): IGameEvent {
  return {
    id,
    gameId: 'game',
    sequence,
    timestamp: '2026-04-30T00:00:01.000Z',
    type: GameEventType.DamageApplied,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    actorId: payload.sourceUnitId ?? payload.unitId,
    payload,
  };
}

function renderLayer(event: IGameEvent): void {
  render(
    <svg>
      <AttackEffectsLayer
        mapId="map-1"
        events={[event]}
        tokens={[
          makeToken('attacker', { q: 0, r: 0 }),
          makeToken('target', { q: 1, r: 0 }, { side: GameSide.Opponent }),
        ]}
      />
    </svg>,
  );
}

function attributeNumber(element: Element, name: string): number {
  const value = element.getAttribute(name);
  if (value === null) throw new Error(`Missing attribute ${name}`);
  return Number(value);
}

describe('attack effect primitives', () => {
  beforeEach(() => setReducedMotion(false));

  it('render stable SVG test ids with pointer-events disabled and transform/opacity animations', () => {
    render(
      <svg>
        <AttackEffectStyles />
        <AttackEffectDefs />
        <LaserBeam
          start={{ x: 0, y: 0 }}
          end={{ x: 80, y: 0 }}
          color="#22c55e"
          testId="primitive-laser"
          reducedMotion={false}
        />
        <MissileTrail
          start={{ x: 0, y: 10 }}
          end={{ x: 80, y: 10 }}
          color="#facc15"
          testId="primitive-missile"
          reducedMotion={false}
        />
        <Tracer
          start={{ x: 0, y: 20 }}
          end={{ x: 80, y: 20 }}
          color="#22d3ee"
          testId="primitive-tracer"
          reducedMotion={false}
        />
        <Shockwave
          center={{ x: 40, y: 40 }}
          color="#ffffff"
          testId="primitive-shockwave"
          reducedMotion={false}
        />
        <ImpactFlash
          center={{ x: 60, y: 60 }}
          color="#ffffff"
          testId="primitive-impact"
          reducedMotion={false}
        />
      </svg>,
    );

    for (const testId of [
      'primitive-laser',
      'primitive-missile',
      'primitive-tracer',
      'primitive-shockwave',
      'primitive-impact',
    ]) {
      const primitive = screen.getByTestId(testId);
      expect(primitive).toHaveAttribute('pointer-events', 'none');
      const animated = primitive.querySelector('g[style]');
      if (!animated) throw new Error(`Missing animated group for ${testId}`);
      const style = animated.getAttribute('style') ?? '';
      expect(style).toContain('animation-name:');
      expect(style).not.toMatch(/stroke-dashoffset|left|top|width|height/i);
    }
  });
});

describe('AttackEffectsLayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useAnimationQueue.getState().reset();
    setReducedMotion(false);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    useAnimationQueue.getState().reset();
    jest.useRealTimers();
  });

  it('renders a hit as a full-opacity beam ending at the target plus an impact flash', () => {
    renderLayer(makeAttackEvent('hit', { weaponName: 'PPC', hit: true }));

    const eventGroup = screen.getByTestId('attack-effect-event-hit');
    expect(eventGroup).toHaveAttribute('data-category', 'energy');
    expect(eventGroup).toHaveAttribute('data-primitive', 'laser');

    const beam = screen.getByTestId('attack-effect-laser-hit-hit-0');
    expect(beam).toHaveAttribute('opacity', '1');
    expect(beam).toHaveAttribute(
      'data-color',
      ATTACK_EFFECT_COLORS.energyGreen,
    );

    const target = hexToPixel({ q: 1, r: 0 });
    const instance = screen.getByTestId('attack-effect-instance-hit-hit-0');
    expect(attributeNumber(instance, 'data-end-x')).toBeCloseTo(target.x);
    expect(attributeNumber(instance, 'data-end-y')).toBeCloseTo(target.y);
    expect(
      screen.getByTestId('attack-effect-impact-flash-hit'),
    ).toHaveAttribute('data-duration-ms', '150');
  });

  it('queues attack effects and completes the queue entry after the effect finishes', () => {
    renderLayer(makeAttackEvent('queued-ppc', { weaponName: 'PPC', hit: true }));

    expect(useAnimationQueue.getState().active).toEqual([
      expect.objectContaining({
        id: 'attack-effect:map-1:queued-ppc',
        kind: 'effect',
        mapId: 'map-1',
      }),
    ]);
    expect(useAnimationQueue.getState().isActive).toBe(true);

    act(() => {
      jest.advanceTimersByTime(549);
    });
    expect(useAnimationQueue.getState().isActive).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(useAnimationQueue.getState().isActive).toBe(false);
  });

  it('coordinates damage pip flash with the queued impact flash timing', () => {
    const attack = makeAttackEvent('ppc-sync', {
      weaponName: 'PPC',
      hit: true,
    });
    const damage = makeDamageEvent('damage-sync', {
      unitId: 'target',
      location: 'CT',
      damage: 5,
      armorRemaining: 15,
      structureRemaining: 16,
      locationDestroyed: false,
      sourceUnitId: 'attacker',
      attackId: attack.id,
    });

    render(
      <svg>
        <AttackEffectsLayer
          mapId="map-1"
          events={[attack, damage]}
          tokens={[
            makeToken('attacker', { q: 0, r: 0 }),
            makeToken('target', { q: 1, r: 0 }, { side: GameSide.Opponent }),
          ]}
        />
        <HitLocationFlash unitId="target" events={[attack, damage]} />
      </svg>,
    );

    expect(
      screen.getByTestId('attack-effect-impact-flash-ppc-sync'),
    ).toHaveAttribute('data-delay-ms', '400');
    expect(
      screen.queryByTestId('hit-location-flash-target-centerTorso'),
    ).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(
      screen.queryByTestId('hit-location-flash-target-centerTorso'),
    ).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(
      screen.getByTestId('hit-location-flash-target-centerTorso'),
    ).toHaveAttribute('data-start-delay-ms', '400');
  });

  it('renders a PPC hit as a green laser beam with impact flash within 600ms', () => {
    renderLayer(makeAttackEvent('ppc-hit', { weaponName: 'PPC', hit: true }));

    const beam = screen.getByTestId('attack-effect-laser-ppc-hit-hit-0');
    expect(beam).toHaveAttribute('data-color', ATTACK_EFFECT_COLORS.energyGreen);

    const flash = screen.getByTestId('attack-effect-impact-flash-ppc-hit');
    expect(Number(flash.getAttribute('data-delay-ms'))).toBeLessThanOrEqual(
      600,
    );
  });

  it('renders an LRM-20 hit as 20 staggered missile trails', () => {
    renderLayer(
      makeAttackEvent('lrm20-hit', {
        weaponName: 'LRM-20',
        hit: true,
      }),
    );

    const trails = screen.getAllByTestId(
      /^attack-effect-missile-lrm20-hit-hit-/,
    );
    expect(trails).toHaveLength(20);
    trails.forEach((trail, index) => {
      expect(trail).toHaveAttribute('data-stagger-index', String(index));
      expect(trail).toHaveAttribute('data-delay-ms', String(index * 30));
    });
  });

  it('renders a miss faded past the target and suppresses the impact flash', () => {
    renderLayer(
      makeAttackEvent('miss', {
        weaponName: 'Medium Laser',
        hit: false,
      }),
    );

    const beam = screen.getByTestId('attack-effect-laser-miss-miss-0');
    expect(beam).toHaveAttribute('opacity', '0.4');
    expect(screen.queryByTestId('attack-effect-impact-flash-miss')).toBeNull();

    const overshoot = hexToPixel({ q: 2, r: 0 });
    const instance = screen.getByTestId('attack-effect-instance-miss-miss-0');
    expect(attributeNumber(instance, 'data-end-x')).toBeCloseTo(overshoot.x);
    expect(attributeNumber(instance, 'data-end-y')).toBeCloseTo(overshoot.y);
  });

  it('renders partial cluster hits as solid hit trails and faded miss trails', () => {
    renderLayer(
      makeAttackEvent('cluster', {
        weaponName: 'LRM-20',
        hit: true,
        projectilesHit: 8,
      }),
    );

    expect(
      screen.getAllByTestId(/^attack-effect-missile-cluster-hit-/),
    ).toHaveLength(8);
    expect(
      screen.getAllByTestId(/^attack-effect-missile-cluster-miss-/),
    ).toHaveLength(12);

    const firstMiss = screen.getByTestId(
      'attack-effect-missile-cluster-miss-8',
    );
    expect(firstMiss).toHaveAttribute('opacity', '0.4');
    expect(firstMiss).toHaveAttribute('data-projectile-count', '20');
    expect(firstMiss).toHaveAttribute('data-stagger-ms', '30');
    expect(firstMiss).toHaveAttribute('data-delay-ms', '240');
    expect(
      screen.getByTestId('attack-effect-impact-flash-cluster'),
    ).toBeInTheDocument();
  });

  it('collapses reduced motion to one connecting line and a dimmed flash', () => {
    setReducedMotion(true);

    renderLayer(
      makeAttackEvent('reduced', {
        weaponName: 'LRM-20',
        hit: true,
      }),
    );

    expect(
      screen.getByTestId('attack-effect-reduced-line-reduced'),
    ).toHaveAttribute('data-duration-ms', '300');
    expect(screen.queryByTestId(/^attack-effect-missile-reduced-/)).toBeNull();

    const flash = screen.getByTestId('attack-effect-impact-flash-reduced');
    expect(flash).toHaveAttribute('data-duration-ms', '80');
    expect(flash).toHaveAttribute('opacity', '0.5');
  });
});
