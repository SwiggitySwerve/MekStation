import { fireEvent, render, screen } from '@testing-library/react';

import type { ILegacyCombatStateFlag } from '@/types/campaign/LegacyCombatStateMigration';

import { LegacyCombatStateFlagsBanner } from '../LegacyCombatStateFlagsBanner';

const olderSave: ILegacyCombatStateFlag = {
  kind: 'combat-state',
  sessionUnitId: 'player-1-atlas-as7-d',
  reason: 'ambiguous-roster-unit',
  candidateRosterUnitIds: ['roster-a', 'roster-b'],
  matchIds: ['m-1'],
};

const unapplied: ILegacyCombatStateFlag = {
  kind: 'unapplied-delta',
  sessionUnitId: 'player-2-locust-lct-1v',
  reason: 'ambiguous-roster-unit',
  candidateRosterUnitIds: ['locust-a', 'locust-b'],
  matchIds: ['match-7'],
};

const UNAPPLIED_ID =
  'legacy-combat-state-flag-unapplied-delta|player-2-locust-lct-1v|match-7';

describe('LegacyCombatStateFlagsBanner (T1)', () => {
  it('renders nothing without flags', () => {
    const { container } = render(
      <LegacyCombatStateFlagsBanner
        flags={[]}
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('N6: says an older-save record came from an older save and that its copy is kept', () => {
    render(
      <LegacyCombatStateFlagsBanner
        flags={[olderSave]}
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(
      screen.getByTestId('legacy-combat-state-flag-player-1-atlas-as7-d'),
    ).toHaveTextContent(
      'Damage recorded for player-1-atlas-as7-d in an older save could not be matched to a roster unit: it could belong to more than one roster unit (possible units: roster-a, roster-b). A copy is kept on this device.',
    );
  });

  it('N6: words an unapplied battle delta as not applied, and claims a kept copy only once confirmed', () => {
    const { rerender } = render(
      <LegacyCombatStateFlagsBanner
        flags={[unapplied]}
        pendingQuarantineKeys={new Set(['match-7|player-2-locust-lct-1v'])}
        onDismiss={jest.fn()}
      />,
    );
    const pendingText = screen.getByTestId(UNAPPLIED_ID).textContent ?? '';
    expect(pendingText).toContain(
      'Damage from battle match-7 to player-2-locust-lct-1v could not be matched to a unit and was not applied: it could belong to more than one roster unit (possible units: locust-a, locust-b).',
    );
    expect(pendingText).not.toContain('kept on this device');
    expect(screen.getByRole('status')).not.toHaveTextContent('older save');

    rerender(
      <LegacyCombatStateFlagsBanner
        flags={[unapplied]}
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByTestId(UNAPPLIED_ID)).toHaveTextContent(
      'A copy is kept on this device.',
    );
  });

  it('N6: dismisses one flag at a time', () => {
    const onDismiss = jest.fn();
    render(
      <LegacyCombatStateFlagsBanner
        flags={[olderSave, unapplied]}
        pendingQuarantineKeys={new Set()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(
      screen.getByTestId(
        'legacy-combat-state-flag-dismiss-unapplied-delta|player-2-locust-lct-1v|match-7',
      ),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(unapplied);
  });
});
