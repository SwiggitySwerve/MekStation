import ts from 'typescript';

/**
 * json-schema-to-zod and the generator's own hooks emit inner parses as
 * `<schema>.safeParse(<value>)`: oneOf branches, `not` refinements, conditional
 * clauses. Each failure builds a zod `Error` that is thrown away. This rewrites
 * every such call to `safeParseIssues(<schema>, <value>)`
 * (src/types/contracts/safeParseIssues.ts), which returns the same result
 * without an `Error`.
 *
 * Calls are found on the TypeScript syntax tree, so any receiver works. It
 * fails closed: if any `.safeParse(` text survives, it throws, and both the
 * write and the `--check` modes of the generator fail.
 */
export const SAFE_PARSE_ISSUES_IMPORT =
  "import { safeParseIssues } from '../safeParseIssues';\n";

/**
 * @param {string} source generated TypeScript
 * @returns {{ source: string, count: number }}
 */
export function routeSafeParseIssues(source) {
  const file = ts.createSourceFile(
    'generated.ts',
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const edits = [];
  (function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'safeParse'
    ) {
      if (node.questionDotToken || node.expression.questionDotToken)
        throw new Error('route-safe-parse-issues: optional .safeParse call');
      const receiver = node.expression.expression;
      // `receiver.safeParse(args)` -> `safeParseIssues(receiver, args)`; the call's
      // own closing parenthesis closes the new call.
      edits.push({
        at: receiver.getStart(file),
        end: -1,
        text: 'safeParseIssues(',
      });
      edits.push({ at: receiver.end, end: node.arguments.pos, text: ', ' });
    }
    ts.forEachChild(node, visit);
  })(file);
  edits.sort((a, b) => b.at - a.at);
  let out = source;
  for (const [index, edit] of edits.entries()) {
    if (edits[index + 1]?.at === edit.at)
      throw new Error(
        `route-safe-parse-issues: overlapping calls at ${edit.at}`,
      );
    out =
      out.slice(0, edit.at) +
      edit.text +
      out.slice(edit.end === -1 ? edit.at : edit.end);
  }
  const left = out.match(/\.\s*safeParse\s*\(/g)?.length ?? 0;
  if (left > 0)
    throw new Error(
      `route-safe-parse-issues: ${left} .safeParse( call(s) left unrouted; ` +
        'the emitter changed shape, extend the rewrite before regenerating',
    );
  return { source: out, count: edits.length / 2 };
}
