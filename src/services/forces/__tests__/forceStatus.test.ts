import { ForceStatus } from '@/types/force/ForceInterfaces';

import { parseForceStatus } from '../forceStatus';

describe('vault force status parsing', () => {
  it.each(Object.values(ForceStatus))('accepts exactly %s', (status) => {
    expect(parseForceStatus(status)).toBe(status);
  });

  it.each(
    [
      undefined,
      null,
      '',
      'Active',
      ' active',
      'active ',
      'retired',
      'kia',
      'constructor',
      '__proto__',
      0,
      true,
      {},
      [],
      ['active'],
    ].map((value) => ({ value })),
  )('rejects $value', ({ value }) => {
    expect(parseForceStatus(value)).toBeNull();
  });
});
