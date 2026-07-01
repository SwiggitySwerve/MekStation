/**
 * WaypointLayer render tests (change `tactical-movement-intent-composer`,
 * tactical-map-interface delta ADDED "Waypoint Composition Interaction", task
 * 3.4). Proves per-leg cost chips, pivot indicators with facing-change MP, and
 * the pop affordance limited to the last waypoint.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import type { ILocomotionLeg } from '@/types/gameplay';

import { WaypointLayer } from '../WaypointLayer';

function leg(
  toQ: number,
  toR: number,
  mpCost: number,
  facingChange = 0,
  fromQ = 0,
  fromR = 0,
): ILocomotionLeg {
  return {
    from: { hex: { q: fromQ, r: fromR }, facingChange: 0 },
    to: { hex: { q: toQ, r: toR }, facingChange },
    path: [{ q: toQ, r: toR }],
    mpCost,
  };
}

/** Render the SVG layer inside an <svg> root so SVG children are valid. */
function renderLayer(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

describe('WaypointLayer (3.4)', () => {
  it('renders nothing when there are no legs', () => {
    const { queryByTestId } = renderLayer(<WaypointLayer legs={[]} zoom={1} />);
    expect(queryByTestId('waypoint-layer')).toBeNull();
  });

  it('renders a per-leg cost chip for each leg at playable zoom', () => {
    const legs = [leg(1, 0, 4), leg(2, 0, 2, 0, 1, 0)];
    const { getByTestId } = renderLayer(<WaypointLayer legs={legs} zoom={1} />);
    // Chip on the forest waypoint (4 MP) and the second leg (2 MP).
    expect(getByTestId('leg-cost-chip-1-0')).toHaveAttribute(
      'data-leg-mp',
      '4',
    );
    expect(getByTestId('leg-cost-chip-2-0')).toHaveAttribute(
      'data-leg-mp',
      '2',
    );
  });

  it('gates the cost chips below medium zoom', () => {
    const legs = [leg(1, 0, 4)];
    const { queryByTestId } = renderLayer(
      <WaypointLayer legs={legs} zoom={0.5} />,
    );
    expect(queryByTestId('leg-cost-chip-1-0')).toBeNull();
    // Markers still render regardless of zoom.
    expect(queryByTestId('waypoint-marker-1-0')).not.toBeNull();
  });

  it('renders a pivot indicator with facing-change MP where travel direction changes', () => {
    const legs = [leg(1, 0, 4, 2)];
    const { getByTestId } = renderLayer(<WaypointLayer legs={legs} zoom={1} />);
    const pivot = getByTestId('pivot-indicator-1-0');
    expect(pivot).toHaveAttribute('data-pivot-facing-change', '2');
  });

  it('omits the pivot indicator when there is no facing change', () => {
    const legs = [leg(1, 0, 4, 0)];
    const { queryByTestId } = renderLayer(
      <WaypointLayer legs={legs} zoom={1} />,
    );
    expect(queryByTestId('pivot-indicator-1-0')).toBeNull();
  });

  it('limits the pop affordance to the last waypoint', () => {
    const onPop = jest.fn();
    const legs = [leg(1, 0, 4), leg(2, 0, 2, 0, 1, 0)];
    const { getByTestId } = renderLayer(
      <WaypointLayer legs={legs} zoom={1} onPopLastWaypoint={onPop} />,
    );

    const firstMarker = getByTestId('waypoint-marker-1-0');
    const lastMarker = getByTestId('waypoint-marker-2-0');
    expect(firstMarker).not.toHaveAttribute('data-waypoint-interactive');
    expect(lastMarker).toHaveAttribute('data-waypoint-interactive', 'true');

    // Clicking the non-last marker does nothing.
    fireEvent.click(firstMarker);
    expect(onPop).not.toHaveBeenCalled();

    // Clicking the last marker pops.
    fireEvent.click(lastMarker);
    expect(onPop).toHaveBeenCalledTimes(1);
  });
});
