import assert from 'node:assert/strict';
import { test } from 'node:test';

import { routeSafeParseIssues } from '../route-safe-parse-issues.mjs';

test('routes oneOf branches, named and inline receivers, nested not refinements', () => {
  const source = [
    '((result) => result)(schema.safeParse(x));',
    'if (!clause.safeParse(value).success) ctx.addIssue(issue);',
    'z.any().refine((value) => !z.object({ "a": z.any().refine((value) => !Def_a.safeParse(value).success, "m") })',
    '  .safeParse(value).success, "m");',
  ].join('\n');
  const { source: out, count } = routeSafeParseIssues(source);
  assert.equal(count, 4);
  assert.equal(
    out,
    [
      '((result) => result)(safeParseIssues(schema, x));',
      'if (!safeParseIssues(clause, value).success) ctx.addIssue(issue);',
      'z.any().refine((value) => !safeParseIssues(z.object({ "a": z.any().refine((value) => !safeParseIssues(Def_a, value).success, "m") }), value).success, "m");',
    ].join('\n'),
  );
});

test('leaves source without safeParse untouched', () => {
  const source = 'export const A = z.object({ a: z.string() });\n';
  assert.deepEqual(routeSafeParseIssues(source), { source, count: 0 });
});

test('fails closed when .safeParse( text survives the rewrite', () => {
  assert.throws(
    () => routeSafeParseIssues('z.string().describe("x.safeParse(y)")'),
    /1 \.safeParse\( call\(s\) left unrouted/,
  );
  assert.throws(
    () => routeSafeParseIssues('schema?.safeParse(x)'),
    /optional \.safeParse call/,
  );
});
