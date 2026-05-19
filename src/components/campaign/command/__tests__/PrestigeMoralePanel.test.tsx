/**
 * Prestige & Morale Panel — render tests
 *
 * Covers tasks.md 8.5 and the spec scenarios "The surface shows morale and
 * prestige" and "The surface exposes no mutation controls".
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { MoraleState } from '@/types/campaign/Prestige';

import {
  SAMPLE_MORALE_TRANSITIONS,
  SAMPLE_UNIT_PRESTIGE,
} from '../__fixtures__/prestigeMoraleFixtures';
import { PrestigeMoralePanel } from '../PrestigeMoralePanel';

describe('PrestigeMoralePanel', () => {
  it('shows the current company morale state', () => {
    render(
      <PrestigeMoralePanel
        moraleState={MoraleState.High}
        moraleTransitions={SAMPLE_MORALE_TRANSITIONS}
        unitPrestige={SAMPLE_UNIT_PRESTIGE}
      />,
    );
    expect(screen.getByTestId('morale-state-badge')).toHaveTextContent('High');
  });

  it('lists the recent morale transitions', () => {
    render(
      <PrestigeMoralePanel
        moraleState={MoraleState.High}
        moraleTransitions={SAMPLE_MORALE_TRANSITIONS}
        unitPrestige={SAMPLE_UNIT_PRESTIGE}
      />,
    );
    const rows = screen.getAllByTestId('morale-transition-row');
    expect(rows.length).toBe(SAMPLE_MORALE_TRANSITIONS.length);
  });

  it('shows each unit prestige score', () => {
    render(
      <PrestigeMoralePanel
        moraleState={MoraleState.High}
        moraleTransitions={SAMPLE_MORALE_TRANSITIONS}
        unitPrestige={SAMPLE_UNIT_PRESTIGE}
      />,
    );
    expect(screen.getByTestId('prestige-score-atlas-as7d')).toHaveTextContent(
      '84',
    );
    expect(
      screen.getByTestId('prestige-score-commando-com2d'),
    ).toHaveTextContent('18');
  });

  it('shows an empty prestige state when no units have prestige', () => {
    render(
      <PrestigeMoralePanel
        moraleState={MoraleState.Steady}
        moraleTransitions={[]}
        unitPrestige={[]}
      />,
    );
    expect(screen.getByTestId('morale-transitions-empty')).toBeInTheDocument();
    expect(screen.getByTestId('command-empty')).toBeInTheDocument();
  });

  it('exposes no mutation controls', () => {
    const { container } = render(
      <PrestigeMoralePanel
        moraleState={MoraleState.High}
        moraleTransitions={SAMPLE_MORALE_TRANSITIONS}
        unitPrestige={SAMPLE_UNIT_PRESTIGE}
      />,
    );
    // A read-only surface — no buttons, no inputs, no editable fields.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('select')).toHaveLength(0);
  });
});
