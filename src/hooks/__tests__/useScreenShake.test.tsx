import { act, renderHook } from '@testing-library/react';

import type { IDamageAppliedPayload, IGameEvent } from '@/types/gameplay';

import {
  SCREEN_SHAKE_DURATION_MS,
  screenShakeIntensityForDamage,
  useScreenShake,
} from '@/hooks/useScreenShake';
import { GameEventType, GamePhase } from '@/types/gameplay';

function buildDamageEvent(
  id: string,
  payload: IDamageAppliedPayload,
  sequence = 1,
): IGameEvent {
  return {
    id,
    gameId: 'g1',
    sequence,
    timestamp: `2026-01-01T00:00:0${sequence}.000Z`,
    type: GameEventType.DamageApplied,
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
    location: 'center_torso',
    damage: 12,
    armorRemaining: 8,
    structureRemaining: 12,
    locationDestroyed: false,
    ...overrides,
  };
}

describe('useScreenShake', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('scales heavy-hit damage linearly and clamps at 8px', () => {
    expect(screenShakeIntensityForDamage(9)).toBe(0);
    expect(screenShakeIntensityForDamage(10)).toBe(4);
    expect(screenShakeIntensityForDamage(15)).toBe(6);
    expect(screenShakeIntensityForDamage(20)).toBe(8);
    expect(screenShakeIntensityForDamage(25)).toBe(8);
  });

  it('subscribes to explicit DamageApplied event arrays', () => {
    const events: readonly IGameEvent[] = [
      buildDamageEvent('d1', damagePayload({ damage: 20 })),
    ];

    const { result } = renderHook(() =>
      useScreenShake({
        events,
        prefersReducedMotion: false,
        random: () => 1,
      }),
    );

    expect(result.current.transform).toBe('translate3d(8px, 8px, 0)');
    expect(result.current.style.transform).toBe('translate3d(8px, 8px, 0)');
    expect(result.current.liveMessage).toBe('heavy hit');
    expect(result.current.isShaking).toBe(true);

    act(() => {
      jest.advanceTimersByTime(SCREEN_SHAKE_DURATION_MS);
    });

    expect(result.current.transform).toBe('translate3d(0px, 0px, 0)');
    expect(result.current.liveMessage).toBe('');
    expect(result.current.isShaking).toBe(false);
  });

  it('ignores DamageApplied events below the heavy-hit threshold', () => {
    const events: readonly IGameEvent[] = [
      buildDamageEvent('d-small', damagePayload({ damage: 6 })),
    ];

    const { result } = renderHook(() =>
      useScreenShake({
        events,
        prefersReducedMotion: false,
        random: () => 1,
      }),
    );

    expect(result.current.transform).toBe('translate3d(0px, 0px, 0)');
    expect(result.current.liveMessage).toBe('');
  });

  it('halves reduced-motion shakes and skips tiny manual shakes', () => {
    const { result } = renderHook(() =>
      useScreenShake({
        prefersReducedMotion: true,
        random: () => 1,
      }),
    );

    act(() => {
      result.current.shake(3, SCREEN_SHAKE_DURATION_MS);
    });

    expect(result.current.transform).toBe('translate3d(0px, 0px, 0)');
    expect(result.current.liveMessage).toBe('');

    act(() => {
      result.current.shake(8, SCREEN_SHAKE_DURATION_MS);
    });

    expect(result.current.transform).toBe('translate3d(4px, 4px, 0)');
    expect(result.current.liveMessage).toBe('heavy hit');
  });
});
