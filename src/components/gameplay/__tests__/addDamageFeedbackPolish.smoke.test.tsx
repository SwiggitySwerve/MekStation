/**
 * Per-change smoke test for the second pass of add-damage-feedback-ui
 * (the "polish" batch — CritHitOverlay, PilotWoundFlash,
 * DamageFloater, and the head-hit / pilot-killed / pilot-unconscious
 * formatters).
 *
 * Asserts:
 *  - CritHitOverlay renders a burst with both a color AND the ⚠ glyph
 *    when `critCount` flips from 0 → 1
 *  - PilotWoundFlash renders the yellow Z badge when `unconscious`
 *  - PilotWoundFlash renders the "PILOT KILLED" banner when `killed`
 *  - DamageFloater renders an entry per id, with armor / structure
 *    color variants
 *  - UnitTokenComponent wires DamageApplied / CriticalHitResolved /
 *    PilotHit / UnitDestroyed events from its `events` prop into the
 *    overlay state (subscription smoke test)
 *  - Every damage-related overlay reinforces color with a shape /
 *    glyph (colorblind safety per task 9.1, 9.2, 9.3, 9.5)
 *  - Head-hit / pilot-killed / pilot-unconscious formatters return
 *    typed entries with the right emphasis bucket + persistent flag
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 3, § 5, § 6, § 7, § 8, § 9
 */

import { act, render, screen, within } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import type {
  IDamageAppliedPayload,
  IGameEvent,
  IPilotHitPayload,
} from '@/types/gameplay';

import { CritHitOverlay } from '@/components/gameplay/CritHitOverlay';
import {
  formatHeadHitEntry,
  formatPilotKilledEntry,
  formatPilotUnconsciousEntry,
  isHeadHit,
  isPilotKilled,
  isPilotUnconscious,
} from '@/components/gameplay/damageFeedback';
import {
  DamageFloater,
  type DamageFloaterEntry,
} from '@/components/gameplay/DamageFloater';
import { UnitTokenComponent } from '@/components/gameplay/HexMapDisplay/UnitToken';
import { PilotWoundFlash } from '@/components/gameplay/PilotWoundFlash';
import { Facing, GameEventType, GamePhase, GameSide } from '@/types/gameplay';

// Mock haptics so ArmorPip / token-internal hooks don't crash in jsdom.
jest.mock('@/hooks/useHaptics', () => ({
  useHaptics: () => ({
    vibrate: jest.fn(),
    vibrateCustom: jest.fn(),
    cancel: jest.fn(),
    isSupported: false,
  }),
}));

// Helper: wrap an SVG-fragment component in an <svg> root so jsdom
// renders it. Tests that target SVG `<g>` children need this.
function svgRender(node: React.ReactElement): ReturnType<typeof render> {
  return render(<svg>{node}</svg>);
}

// Helper: build a minimal IGameEvent with the given type + payload.
function buildEvent<TType extends GameEventType>(
  id: string,
  type: TType,
  payload: unknown,
  sequence: number,
): IGameEvent {
  return {
    id,
    gameId: 'g1',
    sequence,
    timestamp: new Date(2026, 0, 1, 12, 0, 0, sequence).toISOString(),
    type,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload: payload as IGameEvent['payload'],
  };
}

// =============================================================================
// CritHitOverlay
// =============================================================================

describe('CritHitOverlay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing when critCount is zero', () => {
    svgRender(<CritHitOverlay critCount={0} />);
    expect(screen.queryByTestId('crit-hit-overlay')).not.toBeInTheDocument();
  });

  it('renders a burst with both color AND the ⚠ glyph when critCount > 0', () => {
    svgRender(<CritHitOverlay critCount={1} />);
    // Drain the initial scheduling tick so the burst becomes active.
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const overlay = screen.getByTestId('crit-hit-overlay');
    expect(overlay).toBeInTheDocument();
    // Colorblind safety: every burst has the ⚠ glyph alongside color.
    const glyph = within(overlay).getByTestId('crit-hit-glyph');
    expect(glyph.textContent).toBe('⚠');
  });

  it('auto-clears the burst after the 600ms animation window', () => {
    svgRender(<CritHitOverlay critCount={1} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('crit-hit-overlay')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.queryByTestId('crit-hit-overlay')).not.toBeInTheDocument();
  });

  it('queues stacked crits with a 50ms stagger (no concurrent bursts on same token)', () => {
    const { rerender } = svgRender(<CritHitOverlay critCount={0} />);
    rerender(
      <svg>
        <CritHitOverlay critCount={2} />
      </svg>,
    );
    // First burst flushes immediately; second burst is queued behind
    // a 50ms stagger.
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getAllByTestId('crit-hit-burst').length).toBe(1);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getAllByTestId('crit-hit-burst').length).toBe(2);
  });

  it('overlay group is pointer-events: none so clicks pass through', () => {
    svgRender(<CritHitOverlay critCount={1} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const overlay = screen.getByTestId('crit-hit-overlay');
    expect(overlay.getAttribute('pointer-events')).toBe('none');
  });
});

// =============================================================================
// PilotWoundFlash
// =============================================================================

describe('PilotWoundFlash', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing when there is no hit, unconscious, or killed state', () => {
    svgRender(<PilotWoundFlash hitCount={0} />);
    expect(screen.queryByTestId('pilot-wound-flash')).not.toBeInTheDocument();
  });

  it('flashes the yellow pulse ring when hitCount increments', () => {
    const { rerender } = svgRender(<PilotWoundFlash hitCount={0} />);
    rerender(
      <svg>
        <PilotWoundFlash hitCount={1} />
      </svg>,
    );
    expect(screen.getByTestId('pilot-wound-pulse')).toBeInTheDocument();
    // Pulse auto-clears after 800ms.
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId('pilot-wound-pulse')).not.toBeInTheDocument();
  });

  it('renders the persistent Unconscious badge with a Z glyph (colorblind safety)', () => {
    svgRender(<PilotWoundFlash hitCount={0} unconscious />);
    const badge = screen.getByTestId('pilot-unconscious-badge');
    expect(badge).toBeInTheDocument();
    const glyph = within(badge).getByTestId('pilot-unconscious-glyph');
    // Both color (fill on circle) AND the Z shape are rendered.
    expect(glyph.textContent).toBe('Z');
  });

  it('renders the PILOT KILLED banner when killed=true (takes precedence over unconscious)', () => {
    svgRender(<PilotWoundFlash hitCount={0} unconscious killed />);
    const banner = screen.getByTestId('pilot-killed-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('PILOT KILLED');
    // The ✕ glyph reinforces the red color (colorblind safety).
    expect(banner.textContent).toContain('✕');
    // Unconscious badge is suppressed when killed.
    expect(
      screen.queryByTestId('pilot-unconscious-badge'),
    ).not.toBeInTheDocument();
  });

  it('overlay group is pointer-events: none', () => {
    svgRender(<PilotWoundFlash hitCount={0} unconscious />);
    const wrapper = screen.getByTestId('pilot-wound-flash');
    expect(wrapper.getAttribute('pointer-events')).toBe('none');
  });
});

// =============================================================================
// DamageFloater
// =============================================================================

describe('DamageFloater', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing when entries is empty', () => {
    svgRender(<DamageFloater entries={[]} />);
    expect(screen.queryByTestId('damage-floater')).not.toBeInTheDocument();
  });

  it('renders an entry per damage event with the negative amount', () => {
    const entries: readonly DamageFloaterEntry[] = [
      { id: 'd1', amount: 12, variant: 'armor' },
    ];
    svgRender(<DamageFloater entries={entries} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const wrap = screen.getByTestId('damage-floater');
    expect(wrap).toBeInTheDocument();
    const entry = within(wrap).getByTestId('damage-floater-entry');
    expect(entry.getAttribute('data-variant')).toBe('armor');
    expect(entry.textContent).toContain('-12');
  });

  it('uses a structure variant for armor=0 hits (darker red/orange)', () => {
    const entries: readonly DamageFloaterEntry[] = [
      { id: 'd2', amount: 5, variant: 'structure' },
    ];
    svgRender(<DamageFloater entries={entries} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const entry = screen.getByTestId('damage-floater-entry');
    expect(entry.getAttribute('data-variant')).toBe('structure');
  });

  it('staggers multi-hit cluster damage by 50ms per entry', () => {
    const entries: readonly DamageFloaterEntry[] = [
      { id: 'c1', amount: 2 },
      { id: 'c2', amount: 2 },
      { id: 'c3', amount: 2 },
    ];
    svgRender(<DamageFloater entries={entries} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getAllByTestId('damage-floater-entry').length).toBe(1);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getAllByTestId('damage-floater-entry').length).toBe(2);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getAllByTestId('damage-floater-entry').length).toBe(3);
  });

  it('floater group is pointer-events: none so clicks pass through', () => {
    const entries: readonly DamageFloaterEntry[] = [{ id: 'd3', amount: 3 }];
    svgRender(<DamageFloater entries={entries} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const wrap = screen.getByTestId('damage-floater');
    expect(wrap.getAttribute('pointer-events')).toBe('none');
  });
});

// =============================================================================
// UnitTokenComponent — event subscription smoke test
// =============================================================================

describe('UnitTokenComponent — events prop wires overlays', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const baseToken = {
    unitId: 'u1',
    name: 'Atlas',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'ATL',
  };

  it('renders a damage floater when a DamageApplied event for this unit is in the log', () => {
    const damagePayload: IDamageAppliedPayload = {
      unitId: 'u1',
      location: 'right_arm',
      damage: 7,
      armorRemaining: 3,
      structureRemaining: 8,
      locationDestroyed: false,
    };
    const events: readonly IGameEvent[] = [
      buildEvent('e-d1', GameEventType.DamageApplied, damagePayload, 1),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('damage-floater')).toBeInTheDocument();
    expect(screen.getByTestId('damage-floater-entry').textContent).toContain(
      '-7',
    );
  });

  it('renders the CritHitOverlay when CriticalHitResolved fires for this unit', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'e-c1',
        GameEventType.CriticalHitResolved,
        {
          unitId: 'u1',
          location: 'center_torso',
          slotIndex: 3,
          componentType: 'engine',
          componentName: 'Fusion Engine',
          effect: 'engine_hit',
          destroyed: false,
        },
        1,
      ),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('crit-hit-overlay')).toBeInTheDocument();
  });

  it('renders the Unconscious badge when PilotHit with consciousnessCheckPassed=false', () => {
    const payload: IPilotHitPayload = {
      unitId: 'u1',
      wounds: 1,
      totalWounds: 3,
      source: 'head_hit',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: false,
    };
    const events: readonly IGameEvent[] = [
      buildEvent('e-p1', GameEventType.PilotHit, payload, 1),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    expect(screen.getByTestId('pilot-unconscious-badge')).toBeInTheDocument();
  });

  it('renders the PILOT KILLED banner when PilotHit reports 6+ wounds', () => {
    const payload: IPilotHitPayload = {
      unitId: 'u1',
      wounds: 1,
      totalWounds: 6,
      source: 'head_hit',
      consciousnessCheckRequired: false,
    };
    const events: readonly IGameEvent[] = [
      buildEvent('e-p2', GameEventType.PilotHit, payload, 1),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    expect(screen.getByTestId('pilot-killed-banner')).toBeInTheDocument();
  });

  it('renders the destroyed-unit ✕ overlay when a UnitDestroyed event fires', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'e-x1',
        GameEventType.UnitDestroyed,
        { unitId: 'u1', cause: 'damage' },
        1,
      ),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('ignores events for OTHER units (no overlay leakage)', () => {
    const events: readonly IGameEvent[] = [
      buildEvent(
        'e-c-other',
        GameEventType.CriticalHitResolved,
        {
          unitId: 'u2',
          location: 'left_arm',
          slotIndex: 1,
          componentType: 'weapon',
          componentName: 'Medium Laser',
          effect: 'destroyed',
          destroyed: true,
        },
        1,
      ),
    ];
    svgRender(
      <UnitTokenComponent
        token={baseToken}
        onClick={jest.fn()}
        events={events}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.queryByTestId('crit-hit-overlay')).not.toBeInTheDocument();
  });

  it('still renders the legacy ✕ overlay when token.isDestroyed is true (no events)', () => {
    svgRender(
      <UnitTokenComponent
        token={{ ...baseToken, isDestroyed: true }}
        onClick={jest.fn()}
      />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });
});

// =============================================================================
// damageFeedback — head-hit + pilot-killed + pilot-unconscious formatters
// =============================================================================

describe('damageFeedback — head-hit / pilot formatters', () => {
  const resolveName = (id: string) =>
    ({ u1: 'Atlas', u2: 'Marauder' })[id] ?? id;

  it('isHeadHit detects head locations regardless of casing', () => {
    expect(
      isHeadHit({
        unitId: 'u1',
        location: 'head',
        damage: 5,
        armorRemaining: 4,
        structureRemaining: 3,
        locationDestroyed: false,
      }),
    ).toBe(true);
    expect(
      isHeadHit({
        unitId: 'u1',
        location: 'HEAD',
        damage: 5,
        armorRemaining: 4,
        structureRemaining: 3,
        locationDestroyed: false,
      }),
    ).toBe(true);
    expect(
      isHeadHit({
        unitId: 'u1',
        location: 'right_arm',
        damage: 5,
        armorRemaining: 4,
        structureRemaining: 3,
        locationDestroyed: false,
      }),
    ).toBe(false);
  });

  it('formatHeadHitEntry returns a head-hit entry with ⚠ + tooltip', () => {
    const entry = formatHeadHitEntry(
      {
        unitId: 'u1',
        location: 'head',
        damage: 5,
        armorRemaining: 4,
        structureRemaining: 3,
        locationDestroyed: false,
      },
      resolveName,
    );
    expect(entry.emphasis).toBe('head-hit');
    expect(entry.text).toContain('⚠');
    expect(entry.text).toContain('Atlas');
    expect(entry.text).toContain('Head');
    expect(entry.text).toContain('pilot takes 1 hit');
    expect(entry.tooltip).toBe('Pilot must roll consciousness');
    expect(entry.persistent).toBe(false);
  });

  it('isPilotKilled flips at 6+ wounds', () => {
    expect(
      isPilotKilled({
        unitId: 'u1',
        wounds: 1,
        totalWounds: 5,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      }),
    ).toBe(false);
    expect(
      isPilotKilled({
        unitId: 'u1',
        wounds: 1,
        totalWounds: 6,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      }),
    ).toBe(true);
  });

  it('formatPilotKilledEntry returns a persistent killed entry with ✕', () => {
    const entry = formatPilotKilledEntry(
      {
        unitId: 'u1',
        wounds: 1,
        totalWounds: 6,
        source: 'head_hit',
        consciousnessCheckRequired: false,
      },
      resolveName,
    );
    expect(entry.emphasis).toBe('pilot-killed');
    expect(entry.text).toContain('✕');
    expect(entry.text).toContain('PILOT KILLED');
    expect(entry.persistent).toBe(true);
  });

  it('isPilotUnconscious detects failed consciousness check (alive)', () => {
    expect(
      isPilotUnconscious({
        unitId: 'u1',
        wounds: 1,
        totalWounds: 3,
        source: 'head_hit',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      }),
    ).toBe(true);
    // Killed pilots are NOT also unconscious — kill takes precedence.
    expect(
      isPilotUnconscious({
        unitId: 'u1',
        wounds: 1,
        totalWounds: 6,
        source: 'head_hit',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      }),
    ).toBe(false);
  });

  it('formatPilotUnconsciousEntry returns a yellow Z glyph entry', () => {
    const entry = formatPilotUnconsciousEntry(
      {
        unitId: 'u1',
        wounds: 1,
        totalWounds: 3,
        source: 'head_hit',
        consciousnessCheckRequired: true,
        consciousnessCheckPassed: false,
      },
      resolveName,
    );
    expect(entry.emphasis).toBe('pilot-unconscious');
    expect(entry.text.startsWith('Z ')).toBe(true);
    expect(entry.text).toContain('PILOT UNCONSCIOUS');
    expect(entry.persistent).toBe(false);
  });
});

// =============================================================================
// Colorblind safety — every damage visual carries BOTH color AND a glyph
// =============================================================================

describe('Colorblind safety — color + glyph reinforcement', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('CritHitOverlay renders a ⚠ glyph alongside its color burst', () => {
    svgRender(<CritHitOverlay critCount={1} />);
    act(() => {
      jest.advanceTimersByTime(0);
    });
    const glyph = screen.getByTestId('crit-hit-glyph');
    expect(glyph.textContent).toBe('⚠');
  });

  it('Unconscious badge renders a Z glyph alongside its yellow color', () => {
    svgRender(<PilotWoundFlash hitCount={0} unconscious />);
    expect(screen.getByTestId('pilot-unconscious-glyph').textContent).toBe('Z');
  });

  it('Pilot killed banner renders a ✕ glyph alongside its red color', () => {
    svgRender(<PilotWoundFlash hitCount={0} killed />);
    expect(screen.getByTestId('pilot-killed-banner').textContent).toContain(
      '✕',
    );
  });
});
