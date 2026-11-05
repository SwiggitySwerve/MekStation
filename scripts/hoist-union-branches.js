'use strict';

/**
 * json-schema-to-zod renders a JSON Schema `oneOf` as
 *
 *   z.any().superRefine((x, ctx) => {
 *     const schemas = [ <branch schemas> ];
 *     const { errors, failed } = schemas.reduce(...safeParse(x)...);
 *     ...
 *   })
 *
 * so every validated value rebuilds every branch schema from scratch (and the
 * failing branches then build a ZodError). For an armor-allocation record that
 * is once per location per unit, thousands of times per catalog pass. The
 * branch schemas are immutable and stateless, so they can be built once.
 *
 * This rewrites each `const schemas = [ ... ];` to `const schemas = <name>();`
 * and returns the matching `const <name> = once(() => [ ... ]);` declarations.
 * `once` defers construction to the first parse, so declaration order against
 * other module-level schemas does not matter. Identical branch lists share one
 * declaration. Any `superRefine` that does not have exactly this shape, or
 * whose bracket cannot be matched, is left untouched.
 */

const MARKER = 'z.any().superRefine((x, ctx) => {';
const SCHEMAS = /^\s*const schemas = \[/;

/** Index of the `]` matching the `[` at `open`, skipping string literals; -1 if none. */
function matchingBracket(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      for (i += 1; i < text.length && text[i] !== ch; i += 1)
        if (text[i] === '\\') i += 1;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']' && --depth === 0) return i;
  }
  return -1;
}

const ONCE_DECLARATION =
  'const once = <T,>(make: () => T): (() => T) => {\n' +
  '  let value: T | undefined;\n' +
  '  return () => (value ??= make());\n' +
  '};\n';

/**
 * @param {string} body json-schema-to-zod output
 * @param {string} prefix name prefix for the generated declarations
 * @returns {{ body: string, declarations: string }}
 */
function hoistUnionBranches(body, prefix = 'unionBranches') {
  const names = new Map(); // branch list text -> declaration name
  let out = '';
  let cursor = 0;
  for (
    let at = body.indexOf(MARKER);
    at !== -1;
    at = body.indexOf(MARKER, cursor)
  ) {
    const afterMarker = at + MARKER.length;
    const head = SCHEMAS.exec(body.slice(afterMarker));
    const open = head ? afterMarker + head[0].length - 1 : -1;
    const close = open === -1 ? -1 : matchingBracket(body, open);
    if (close === -1 || body[close + 1] !== ';') {
      out += body.slice(cursor, afterMarker);
      cursor = afterMarker;
      continue;
    }
    const list = body.slice(open, close + 1);
    if (!names.has(list)) names.set(list, `${prefix}${names.size + 1}`);
    out +=
      body.slice(cursor, afterMarker + head[0].indexOf('const schemas')) +
      `const schemas = ${names.get(list)}();`;
    cursor = close + 2;
  }
  out += body.slice(cursor);
  const declarations = names.size
    ? ONCE_DECLARATION +
      [...names]
        .map(([list, name]) => `const ${name} = once(() => ${list});\n`)
        .join('')
    : '';
  return { body: out, declarations };
}

module.exports = { hoistUnionBranches, ONCE_DECLARATION };
