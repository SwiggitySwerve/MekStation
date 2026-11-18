/**
 * Pin for safeParseIssues: every inner parse in generated/*.zod.ts goes
 * through zod core's underscore export `_safeParse` with an issues-only error
 * class. If zod moves, this test fails first: re-verify Z1 before upgrading zod.
 */

import { z } from 'zod';
import zodPackage from 'zod/package.json';

import { UnitContract } from '../generated/unit.zod';
import { safeParseIssues } from '../safeParseIssues';

const REVERIFY = 're-verify Z1 before upgrading zod';

const samples: [string, z.ZodType, unknown][] = [
  ['wrong type', z.object({ a: z.number() }), { a: 'x' }],
  [
    'nested path and custom message',
    z.object({ list: z.array(z.string().min(2, 'too short')) }),
    { list: ['ok', 'x'] },
  ],
  ['union', z.union([z.number(), z.object({ front: z.number() })]), 'x'],
  [
    'refine',
    z.unknown().refine((value) => value !== 1, 'Should NOT be valid'),
    1,
  ],
  ['unit contract, empty', UnitContract, {}],
  [
    'unit contract, bad fields',
    UnitContract,
    { id: 3, schemaVersion: '2.0.0', armor: { allocation: { HEAD: 'x' } } },
  ],
];

describe('safeParseIssues zod pin', () => {
  it('runs on the pinned zod version', () => {
    expect(`zod ${zodPackage.version}: ${REVERIFY}`).toBe(
      `zod 4.3.6: ${REVERIFY}`,
    );
    expect(`${typeof z.core._safeParse}: ${REVERIFY}`).toBe(
      `function: ${REVERIFY}`,
    );
  });

  it.each(samples)(
    '%s: the same issues as safeParse, without an Error',
    (_label, schema, input) => {
      const expected = schema.safeParse(input);
      const actual = safeParseIssues(schema, input);
      expect(expected.success).toBe(false);
      expect(actual.success).toBe(false);
      if (actual.success) throw new Error('expected a failed parse');
      expect(actual.error).not.toBeInstanceOf(Error);
      expect(actual.error.issues).toStrictEqual(expected.error?.issues);
    },
  );

  it('declares a failure as issues only, so Error fields do not compile', () => {
    const result = safeParseIssues(z.number(), 'not a number');
    if (result.success) throw new Error('expected a failed parse');
    // @ts-expect-error the issues-only error has no message (it is not an Error)
    expect(result.error.message).toBeUndefined();
    // @ts-expect-error nor a stack
    expect(result.error.stack).toBeUndefined();
    expect(result.error.issues).toHaveLength(1);
  });

  it('returns the same data on success', () => {
    const schema = z.object({ n: z.string().transform((s) => s.length) });
    expect(safeParseIssues(schema, { n: 'abc' })).toEqual(
      schema.safeParse({ n: 'abc' }),
    );
  });
});
