import { PilotStatus } from '@/types/pilot/PilotInterfaces';

import { canTransitionPilotStatus, parsePilotStatus } from '../pilotStatus';

describe('vault pilot status parsing', () => {
  it.each(Object.values(PilotStatus))('accepts exactly %s', (status) => {
    expect(parsePilotStatus(status)).toBe(status);
  });

  it.each(
    [
      undefined,
      null,
      '',
      'Active',
      ' active',
      'active ',
      'wounded',
      'critical',
      'deserted',
      'KIA',
      'constructor',
      '__proto__',
      0,
      true,
      {},
      [],
      ['active'],
    ].map((value) => ({ value })),
  )('rejects $value', ({ value }) => {
    expect(parsePilotStatus(value)).toBeNull();
  });
});

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

  it.each(
    Object.values(PilotStatus).filter((status) => status !== PilotStatus.KIA),
  )('refuses KIA to %s', (status) => {
    expect(canTransitionPilotStatus(PilotStatus.KIA, status)).toBe(false);
  });
});
