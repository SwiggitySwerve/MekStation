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

export const safeParseIssues = z.core._safeParse(
  ContractIssues as unknown as z.core.$ZodErrorClass,
);
