/**
 * Thrown when a unit payload fails validation at a loader boundary.
 *
 * Lives apart from `unitContractAdapter` so a caller that only needs the error
 * type (the browser canonical service) does not import the whole zod contract.
 *
 * Carries the issue list (first 5 in the message) so test output and CI logs
 * can pinpoint the offending field without re-running the parse.
 */
export class UnitContractParseError extends Error {
  /** The issues, preserved verbatim for debugging. */
  readonly issues: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
  }>;

  constructor(
    issues: ReadonlyArray<{
      readonly path: string;
      readonly message: string;
    }>,
    sourceLabel: string,
    /** Which check rejected the payload; names the guard in log lines. */
    origin = 'parseUnit: UnitContract.safeParse',
  ) {
    const summary = issues
      .slice(0, 5)
      .map((issue) => `  ${issue.path || '<root>'}: ${issue.message}`)
      .join('\n');
    super(`${origin} failed for ${sourceLabel}:\n${summary}`);
    this.name = 'UnitContractParseError';
    this.issues = issues;
  }
}
