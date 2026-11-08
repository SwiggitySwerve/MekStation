import { PilotStatus } from '@/types/pilot/PilotInterfaces';

import { canTransitionPilotStatus } from '../pilotStatus';

describe('vault pilot status transitions', () => {
  it.each(Object.values(PilotStatus))(
    'preserves healing eligibility for %s',
    (status) => {
      expect(canTransitionPilotStatus(status, PilotStatus.Active)).toBe(
        status !== PilotStatus.KIA,
      );
    },
  );

  it('allows an idempotent KIA update', () => {
    expect(canTransitionPilotStatus(PilotStatus.KIA, PilotStatus.KIA)).toBe(
      true,
    );
  });
});
