import { fireEvent, render, screen } from '@testing-library/react';

import { LegacyCombatStateFlagsBanner } from '../LegacyCombatStateFlagsBanner';

describe('LegacyCombatStateFlagsBanner (T1)', () => {
  it('renders nothing without flags', () => {
    const { container } = render(
      <LegacyCombatStateFlagsBanner flags={[]} onDismiss={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each unresolved entry with its candidates and dismisses on request', () => {
    const onDismiss = jest.fn();
    render(
      <LegacyCombatStateFlagsBanner
        flags={[
          {
            sessionUnitId: 'player-1-atlas-as7-d',
            reason: 'ambiguous-roster-unit',
            candidateRosterUnitIds: ['roster-a', 'roster-b'],
            matchIds: ['m-1'],
          },
        ]}
        onDismiss={onDismiss}
      />,
    );
    expect(
      screen.getByTestId('legacy-combat-state-flag-player-1-atlas-as7-d'),
    ).toHaveTextContent(
      'player-1-atlas-as7-d: it could belong to more than one roster unit (possible units: roster-a, roster-b)',
    );
    fireEvent.click(screen.getByTestId('legacy-combat-state-flags-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
