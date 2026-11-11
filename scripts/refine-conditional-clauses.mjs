/**
 * json-schema-to-zod renders every conditional clause (anyOf / oneOf / if) in an
 * object's `allOf` as a z.union intersected into the inferred type. N clauses
 * become a union-of-intersections with up to 2^N members, which tsc expands:
 * 14 such clauses on one object drove a type check past 90 GB.
 *
 * The shape to avoid is a conjunction of union-typed clauses in the inferred type.
 * The amplifier is a distributive conditional over that contract union:
 * `UnitDefinitionForFamily` (services/units/unitLoaderService/definitionTypes.ts)
 * distributes over every member, and the union doubles per clause. Measured on
 * dose files that use the production load patterns: 10 clauses already pass 8 GB
 * (1.5 GB and 149 s at 8) where the same contract read plainly stays near 0.3 GB.
 * The rule is enforced by scripts/__tests__/refine-conditional-clauses.test.mjs
 * (no chain of more than one union in the generated unit contract).
 *
 * A conditional clause only constrains a value; it adds nothing to the type.
 * So an object schema whose `allOf` holds two or more conditional clauses keeps
 * its other members as the type, and the clauses become ONE generated
 * `superRefine`. Each clause is rendered from the schema's own text (never
 * hand-written) and reports its own `title` (else `description`) as the message.
 * One clause is left alone: a single union is not a chain.
 *
 * The clause schemas are built once per module (`once`, see hoist-union-branches),
 * not on every parse.
 */

const CONDITIONAL_KEYWORDS = ['anyOf', 'oneOf', 'if'];

/** @returns {boolean} true when the `allOf` entry is a conditional clause */
export function isConditionalClause(clause) {
  return (
    Boolean(clause) &&
    typeof clause === 'object' &&
    CONDITIONAL_KEYWORDS.some((keyword) => keyword in clause)
  );
}

/** Object schema whose conjunction of conditional clauses must leave the type. */
export function hasClauseChain(node) {
  return (
    node?.type === 'object' &&
    Array.isArray(node.allOf) &&
    node.allOf.filter(isConditionalClause).length >= 2
  );
}

/**
 * @param {(schema: object) => string} render the generator's own renderer, parserOverride included
 * @param {string} prefix name prefix for the generated declarations
 */
export function createClauseRefiner(render, prefix = 'schemaClauses') {
  const names = new Map(); // clause list text -> declaration name
  return {
    /** parserOverride hook: the object's zod expression, or undefined to leave it to the library. */
    override(node) {
      if (!hasClauseChain(node)) return undefined;
      const { allOf, ...rest } = node;
      const clauses = allOf.filter(isConditionalClause);
      const kept = allOf.filter((clause) => !isConditionalClause(clause));
      const base = render(kept.length > 0 ? { ...rest, allOf: kept } : rest);
      const list = `[${clauses
        .map((clause) => {
          const message =
            clause.title ?? clause.description ?? 'Schema condition not met';
          return `[${render(clause)}, ${JSON.stringify(message)}]`;
        })
        .join(', ')}]`;
      if (!names.has(list)) names.set(list, `${prefix}${names.size + 1}`);
      return `${base}.superRefine((value, ctx) => {
  for (const [clause, message] of ${names.get(list)}())
    if (!clause.safeParse(value).success) ctx.addIssue({ code: 'custom', message });
})`;
    },
    /** Module-level declarations; they call `once`, so declare it first. Empty when nothing was refined. */
    declarations() {
      return [...names]
        .map(
          ([list, name]) =>
            `const ${name} = once((): [z.ZodType, string][] => ${list});\n`,
        )
        .join('');
    },
  };
}
