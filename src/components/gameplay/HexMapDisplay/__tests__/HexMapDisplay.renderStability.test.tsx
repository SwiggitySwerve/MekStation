/**
 * Render-stability + native-listener tests for HexMapDisplay.
 *
 * Audit 2026-06-09 G cluster (remediation W5.1a):
 *
 *  - Inline arrow props (`onClick={() => …}`) defeated `HexCell`'s
 *    React.memo, so every camera pan/zoom event re-rendered the whole
 *    hex grid. The cell handlers must be referentially stable.
 *
 *  - Two parallel hooks computed `deriveIsometricTerrainOcclusionInfo`
 *    with identical inputs — the occlusion sweep must run once per
 *    input change, not twice.
 *
 *  - `e.preventDefault()` inside React `onWheel`/`onTouchMove` props is
 *    a no-op: React attaches those listeners passively at the root.
 *    The map must register non-passive NATIVE listeners on the SVG so
 *    wheel-zoom / touch-pan can actually cancel page scrolling.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { GameSide, TokenUnitType, type IUnitToken } from '@/types/gameplay';

import type { MapInteractionState } from '../useMapInteraction';

import { deriveIsometricTerrainOcclusionInfo } from '../projection';

// Counts every render that makes it PAST the memo boundary. The wrapper
// is itself memoized with default shallow-prop comparison, so the count
// only increases when HexMapDisplay hands the cell a fresh prop identity
// — exactly the defect under test.
const mockHexCellRenderCount = {
  byKey: new Map<string, number>(),
  count: 0,
};

function resetMockHexCellRenderCount(): void {
  mockHexCellRenderCount.count = 0;
  mockHexCellRenderCount.byKey.clear();
}

function hexRenderCountsSince(
  before: ReadonlyMap<string, number>,
): readonly string[] {
  return Array.from(mockHexCellRenderCount.byKey.entries())
    .filter(([key, count]) => count > (before.get(key) ?? 0))
    .map(([key]) => key)
    .sort();
}

jest.mock('../HexCell', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  const actual = jest.requireActual('../HexCell');
  const CountedHexCell = ReactActual.memo(function CountedHexCell(
    props: Record<string, unknown>,
  ) {
    const hex = props.hex as { q: number; r: number };
    const key = `${hex.q},${hex.r}`;
    mockHexCellRenderCount.count += 1;
    mockHexCellRenderCount.byKey.set(
      key,
      (mockHexCellRenderCount.byKey.get(key) ?? 0) + 1,
    );
    return ReactActual.createElement(actual.HexCell, props);
  });
  return { ...actual, HexCell: CountedHexCell };
});

jest.mock('../projection', () => {
  const actual = jest.requireActual('../projection');
  return {
    ...actual,
    deriveIsometricTerrainOcclusionInfo: jest.fn(
      actual.deriveIsometricTerrainOcclusionInfo,
    ),
  };
});

jest.mock('@/utils/gameplay/tacticalMapProjection', () => {
  const actual = jest.requireActual('@/utils/gameplay/tacticalMapProjection');
  return {
    ...actual,
    buildTacticalMapHexProjectionLookup: jest.fn(
      actual.buildTacticalMapHexProjectionLookup,
    ),
  };
});

// Import AFTER the mocks so HexMapDisplay picks up the counted cell and
// the spied projection/occlusion sweeps.
// eslint-disable-next-line import/first
import { buildTacticalMapHexProjectionLookup } from '@/utils/gameplay/tacticalMapProjection';

// eslint-disable-next-line import/first
import { HexMapDisplay } from '../HexMapDisplay';

beforeEach(() => {
  resetMockHexCellRenderCount();
  (
    buildTacticalMapHexProjectionLookup as jest.MockedFunction<
      typeof buildTacticalMapHexProjectionLookup
    >
  ).mockClear();
});

function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'unit-1',
    name: 'Test Mech',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: 0,
    isSelected: false,
    isValidTarget: false,
    isActiveTarget: false,
    isDestroyed: false,
    designation: 'TM',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

describe('HexCell memo stability across camera events', () => {
  it('does not re-render hex cells when the camera pans', () => {
    let interaction: MapInteractionState | null = null;
    render(
      <HexMapDisplay
        radius={2}
        tokens={[makeToken()]}
        selectedHex={null}
        onInteractionReady={(state) => {
          interaction = state;
        }}
      />,
    );
    expect(interaction).not.toBeNull();

    const before = mockHexCellRenderCount.count;
    expect(before).toBeGreaterThan(0);

    act(() => {
      interaction!.panBy(15, -10);
    });
    act(() => {
      interaction!.zoomTo(1.3);
    });

    // The grid geometry did not change — memoized cells must be skipped.
    expect(mockHexCellRenderCount.count).toBe(before);
  });

  it('re-renders only the exited and entered hexes when hover moves on a large map', () => {
    render(<HexMapDisplay radius={18} tokens={[]} selectedHex={null} />);

    const firstHoverTarget = screen.getByTestId('hex-0-0');
    const secondHoverTarget = screen.getByTestId('hex-1-0');

    act(() => {
      fireEvent.mouseEnter(firstHoverTarget);
    });
    const countsAfterFirstHover = new Map(mockHexCellRenderCount.byKey);

    act(() => {
      fireEvent.mouseEnter(secondHoverTarget);
    });

    expect(hexRenderCountsSince(countsAfterFirstHover)).toEqual(['0,0', '1,0']);
    expect(screen.queryByTestId('hex-overlay-0-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('hex-overlay-1-0')).toHaveAttribute(
      'data-hex-overlay-kind',
      'hover',
    );
  });

  it('keeps the tactical projection lookup stable across pure hover moves', () => {
    const projectionBuilder =
      buildTacticalMapHexProjectionLookup as jest.MockedFunction<
        typeof buildTacticalMapHexProjectionLookup
      >;

    render(<HexMapDisplay radius={18} tokens={[]} selectedHex={null} />);

    expect(projectionBuilder).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.mouseEnter(screen.getByTestId('hex-0-0'));
    });
    act(() => {
      fireEvent.mouseEnter(screen.getByTestId('hex-1-0'));
    });

    expect(projectionBuilder).toHaveBeenCalledTimes(1);
  });
});

describe('isometric occlusion sweep consolidation', () => {
  it('runs deriveIsometricTerrainOcclusionInfo once per render pass', () => {
    const spy = deriveIsometricTerrainOcclusionInfo as jest.Mock;
    spy.mockClear();

    render(
      <HexMapDisplay
        radius={2}
        tokens={[makeToken()]}
        selectedHex={null}
        projectionMode="isometric2d"
      />,
    );

    // Identical inputs must be swept exactly once — the by-unit map and
    // the info list are both derived from that single sweep.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('non-passive native wheel/touch listeners', () => {
  it('cancels the default scroll on wheel events over the map', () => {
    let interaction: MapInteractionState | null = null;
    render(
      <HexMapDisplay
        radius={2}
        tokens={[]}
        selectedHex={null}
        onInteractionReady={(state) => {
          interaction = state;
        }}
      />,
    );
    const svg = screen.getByTestId('hex-grid');

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
      clientX: 10,
      clientY: 10,
    });
    act(() => {
      svg.dispatchEvent(wheelEvent);
    });

    // preventDefault must take effect — only a non-passive listener can
    // cancel the page scroll that would otherwise accompany the zoom.
    expect(wheelEvent.defaultPrevented).toBe(true);
    // And the zoom handler genuinely ran (deltaY > 0 zooms out).
    expect(interaction!.zoom).toBeLessThan(1);
  });

  it('cancels the default scroll on touchmove events over the map', () => {
    render(<HexMapDisplay radius={2} tokens={[]} selectedHex={null} />);
    const svg = screen.getByTestId('hex-grid');

    // jsdom has no TouchEvent constructor by default — synthesize a
    // plain cancelable event and graft an empty `touches` list on it.
    const touchMoveEvent = new Event('touchmove', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(touchMoveEvent, 'touches', { value: [] });
    act(() => {
      svg.dispatchEvent(touchMoveEvent);
    });

    expect(touchMoveEvent.defaultPrevented).toBe(true);
  });
});
