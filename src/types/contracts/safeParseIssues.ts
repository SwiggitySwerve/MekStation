import { z } from 'zod';

/**
 * The generated contracts run inner parses that read only `.success` and
 * `.error.issues`: oneOf branches, "should NOT be valid" refinements and
 * conditional clauses. zod's `schema.safeParse` wraps every failure in a real
 * `Error` (stack capture, plus `JSON.stringify` of the issues into `message`)
 * that those checks throw away, and on valid units most inner parses fail.
 *
 * This runs the same parse and returns the same issue objects, held by a plain
 * object instead of an `Error`. The generator routes every `.safeParse(` in
 * `generated/*.zod.ts` here (scripts/route-safe-parse-issues.mjs).
 *
 * `_safeParse` is an underscore export of zod core: re-verify before upgrading
 * zod (see __tests__/safeParseIssues.test.ts).
 */
class ContractIssues {
  readonly issues: z.core.$ZodIssue[];
  constructor(issues: z.core.$ZodIssue[]) {
    this.issues = issues;
  }
}

/**
 * The declared result is honest about the wrapper: a failure carries only
 * `issues`, so `.message`, `.name` and `.stack` do not compile. The one cast
 * onto zod's error-class factory stays inside this file.
 */
export type SafeParseIssuesResult<T extends z.ZodType> =
  // `error?: undefined` matches zod's own success branch, so readers that test
  // `result.error` (as the generated oneOf blocks do) still type-check.
  | { success: true; data: z.output<T>; error?: undefined }
  | { success: false; error: { readonly issues: z.core.$ZodIssue[] } };

const parseWithIssuesOnly = z.core._safeParse(
  ContractIssues as unknown as z.core.$ZodErrorClass,
);

export const safeParseIssues = <T extends z.ZodType>(
  schema: T,
  value: unknown,
): SafeParseIssuesResult<T> =>
  parseWithIssuesOnly(schema, value) as SafeParseIssuesResult<T>;
