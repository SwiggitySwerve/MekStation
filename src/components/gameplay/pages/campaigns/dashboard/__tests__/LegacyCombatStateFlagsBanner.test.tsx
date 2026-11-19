import { fireEvent, render, screen } from '@testing-library/react';

import type { ILegacyCombatStateFlag } from '@/types/campaign/LegacyCombatStateMigration';

import { LegacyCombatStateFlagsBanner } from '../LegacyCombatStateFlagsBanner';

const olderSave: ILegacyCombatStateFlag = {
  kind: 'combat-state',
  quarantinedOnDeviceId: 'device-a',
  sessionUnitId: 'player-1-atlas-as7-d',
  reason: 'legacy-not-attributed',
  candidateRosterUnitIds: [],
  matchIds: ['m-1'],
};

const unapplied: ILegacyCombatStateFlag = {
  kind: 'unapplied-delta',
  quarantinedOnDeviceId: 'device-a',
  sessionUnitId: 'player-2-locust-lct-1v',
  reason: 'legacy-not-attributed',
  candidateRosterUnitIds: [],
  matchIds: ['match-7'],
};

const UNAPPLIED_ID =
  'legacy-combat-state-flag-unapplied-delta|player-2-locust-lct-1v|match-7';

describe('LegacyCombatStateFlagsBanner (T1)', () => {
  it('renders nothing without flags', () => {
    const { container } = render(
      <LegacyCombatStateFlagsBanner
        flags={[]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('§186.4: says plainly that older-save damage was not applied to any unit and that its copy is kept', () => {
    render(
      <LegacyCombatStateFlagsBanner
        flags={[olderSave]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 damage record was not applied to any unit',
    );
    expect(
      screen.getByTestId('legacy-combat-state-flag-player-1-atlas-as7-d'),
    ).toHaveTextContent(
      /^Damage recorded for player-1-atlas-as7-d in an older save was not applied to any unit\. A copy is kept on this device\.$/,
    );
  });

  it('N6: words an unapplied battle delta as not applied, and claims a kept copy only once confirmed', () => {
    const { rerender } = render(
      <LegacyCombatStateFlagsBanner
        flags={[unapplied]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set(['match-7|player-2-locust-lct-1v'])}
        onDismiss={jest.fn()}
      />,
    );
    const pendingText = screen.getByTestId(UNAPPLIED_ID).textContent ?? '';
    expect(pendingText).toBe(
      'Damage to player-2-locust-lct-1v from battle match-7 was not applied to any unit: this save does not record which roster unit fought.',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('older save');

    rerender(
      <LegacyCombatStateFlagsBanner
        flags={[unapplied]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByTestId(UNAPPLIED_ID)).toHaveTextContent(
      'A copy is kept on this device.',
    );
  });

  it('words a battle unit the launch could not tell apart with its possible units', () => {
    render(
      <LegacyCombatStateFlagsBanner
        flags={[
          {
            ...unapplied,
            reason: 'ambiguous-roster-unit',
            candidateRosterUnitIds: ['locust-a', 'locust-b'],
          },
        ]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByTestId(UNAPPLIED_ID)).toHaveTextContent(
      'Damage to player-2-locust-lct-1v from battle match-7 was not applied to any unit: it could belong to more than one roster unit (possible units: locust-a, locust-b). A copy is kept on this device.',
    );
  });

  it('N6: dismisses one flag at a time', () => {
    const onDismiss = jest.fn();
    render(
      <LegacyCombatStateFlagsBanner
        flags={[olderSave, unapplied]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 damage records were not applied to any unit',
    );
    fireEvent.click(
      screen.getByTestId(
        'legacy-combat-state-flag-dismiss-unapplied-delta|player-2-locust-lct-1v|match-7',
      ),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith(unapplied);
  });

  it('F3: a copy confirmed on another device is said to be kept where it was found', () => {
    render(
      <LegacyCombatStateFlagsBanner
        flags={[{ ...olderSave, quarantinedOnDeviceId: 'device-b' }]}
        currentDeviceId="device-a"
        pendingQuarantineKeys={new Set()}
        onDismiss={jest.fn()}
      />,
    );
    const text =
      screen.getByTestId('legacy-combat-state-flag-player-1-atlas-as7-d')
        .textContent ?? '';
    expect(text).toContain(
      'A copy is kept on the device where this was found.',
    );
    expect(text).not.toContain('A copy is kept on this device.');
  });
});
