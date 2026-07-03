/**
 * MechToken attack-intent encodings (change `attack-phase-intent-composer`,
 * phase 3, tactical-map-interface delta):
 *
 *  - secondary-target encoding: DASHED amber ring, visually distinct from
 *    the primary's solid pulsing ring by dash pattern (not hue alone);
 *  - at-source infeasibility: blocked glyph + dotted ring with the
 *    rules-backed reason available on inspection (<title>);
 *  - primary ring unchanged (pulsing red, MODIFIED Target Lock
 *    Visualization keeps the legacy scenarios intact).
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-map-interface/spec.md
 */

import type { IMechToken } from '@/types/gameplay';

import { MechToken } from '../MechToken';
import {
  makeToken,
  renderInSvg,
  screen,
} from './UnitTokenForType.test-helpers';

const EVENT_STATE = {
  destroyed: false,
  pilotHitCount: 0,
  unconscious: false,
  killed: false,
  critCount: 0,
  damageEntries: [],
} as unknown as Parameters<typeof MechToken>[0]['eventState'];

describe('MechToken — attack intent map encodings', () => {
  it('renders the dashed secondary-target ring, distinct from the primary pulse', () => {
    renderInSvg(
      <MechToken
        token={makeToken({ isSecondaryTarget: true }) as IMechToken}
        eventState={EVENT_STATE}
      />,
    );
    const ring = screen.getByTestId('unit-secondary-target-ring');
    // Non-color-redundant: the dash pattern is the distinction carrier.
    expect(ring).toHaveAttribute('stroke-dasharray', '6 4');
    expect(
      screen.queryByTestId('unit-active-target-pulse'),
    ).not.toBeInTheDocument();
  });

  it('primary (active target) suppresses the secondary encoding on the same token', () => {
    renderInSvg(
      <MechToken
        token={
          makeToken({
            isActiveTarget: true,
            isSecondaryTarget: true,
          }) as IMechToken
        }
        eventState={EVENT_STATE}
      />,
    );
    expect(screen.getByTestId('unit-active-target-pulse')).toBeInTheDocument();
    expect(
      screen.queryByTestId('unit-secondary-target-ring'),
    ).not.toBeInTheDocument();
  });

  it('renders the infeasible encoding with the rules-backed reason on inspection', () => {
    renderInSvg(
      <MechToken
        token={
          makeToken({
            side: undefined as never, // side irrelevant to the encoding
            attackInfeasibleReason: 'out of front arc',
          }) as IMechToken
        }
        eventState={EVENT_STATE}
      />,
    );
    const badge = screen.getByTestId('unit-attack-infeasible');
    expect(badge.querySelector('title')).toHaveTextContent('out of front arc');
  });

  it('renders no intent encodings on a destroyed token', () => {
    renderInSvg(
      <MechToken
        token={
          makeToken({
            isDestroyed: true,
            isSecondaryTarget: true,
            attackInfeasibleReason: 'out of range',
          }) as IMechToken
        }
        eventState={EVENT_STATE}
      />,
    );
    expect(
      screen.queryByTestId('unit-secondary-target-ring'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('unit-attack-infeasible'),
    ).not.toBeInTheDocument();
  });
});
