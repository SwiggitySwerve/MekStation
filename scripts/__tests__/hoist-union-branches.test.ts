/* eslint-disable @typescript-eslint/no-require-imports */
const { hoistUnionBranches, ONCE_DECLARATION } =
  require('../hoist-union-branches.js') as {
    hoistUnionBranches: (
      body: string,
      prefix?: string,
    ) => { body: string; declarations: string };
    ONCE_DECLARATION: string;
  };

const refine = (list: string) =>
  [
    'z.any().superRefine((x, ctx) => {',
    `    const schemas = ${list};`,
    '    const { errors, failed } = schemas.reduce(f, { errors: [], failed: 0 });',
    '  })',
  ].join('\n');

describe('hoistUnionBranches', () => {
  it('moves the branch list out of the callback into a once() declaration', () => {
    const list =
      '[z.number().int().gte(0), z.object({ "a": z.string() }).strict()]';
    const { body, declarations } = hoistUnionBranches(
      `export const A = z.record(z.string(), ${refine(list)});`,
    );
    expect(body).toContain('const schemas = unionBranches1();');
    expect(body).not.toContain('const schemas = [');
    expect(declarations).toBe(
      `${ONCE_DECLARATION}const unionBranches1 = once(() => ${list});\n`,
    );
  });

  it('shares one declaration between identical lists and numbers distinct ones', () => {
    const one = '[z.number(), z.string()]';
    const two = '[z.boolean(), z.null()]';
    const { body, declarations } = hoistUnionBranches(
      [refine(one), refine(two), refine(one)].join('\n'),
    );
    expect(body.match(/const schemas = unionBranches1\(\);/g)).toHaveLength(2);
    expect(body.match(/const schemas = unionBranches2\(\);/g)).toHaveLength(1);
    expect(declarations.match(/= once\(/g)).toHaveLength(2);
  });

  it('matches the closing bracket past nested lists and brackets inside strings', () => {
    const list =
      '[z.string().regex(new RegExp("^[a-z]+\\\\]$")), z.tuple([z.number(), z.string()]), z.literal("]")]';
    const { body, declarations } = hoistUnionBranches(refine(list));
    expect(body).toContain('const schemas = unionBranches1();');
    expect(body).toContain('const { errors, failed } = schemas.reduce');
    expect(declarations).toContain(`once(() => ${list});`);
  });

  it('leaves a superRefine of another shape, or with an unmatched bracket, alone', () => {
    const other = 'z.any().superRefine((x, ctx) => { ctx.addIssue({}); })';
    const broken = [
      'z.any().superRefine((x, ctx) => {',
      '    const schemas = [z.number(), "never closed";',
      '  })',
    ].join('\n');
    for (const input of [other, broken, 'z.string()']) {
      expect(hoistUnionBranches(input)).toEqual({
        body: input,
        declarations: '',
      });
    }
  });

  it('keeps text around the callback byte for byte', () => {
    const input = `before ${refine('[z.number()]')} after`;
    const { body } = hoistUnionBranches(input);
    expect(body.startsWith('before z.any().superRefine((x, ctx) => {\n')).toBe(
      true,
    );
    expect(body.endsWith('\n  }) after')).toBe(true);
  });
});
