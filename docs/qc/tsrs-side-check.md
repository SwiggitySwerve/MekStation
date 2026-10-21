# Advisory tsrs typecheck side-check

`tsrs Side-Check (advisory)` is an extra, non-required Ubuntu job in
`pr-checks.yml`. It is outside the `Lint and Test` aggregator's `needs`, uses
`continue-on-error: true`, and must stay outside branch protection. The existing
`npm run typecheck` TS7 gate remains authoritative. The historical 32-check-name
comparison in `evidence/p2cg1s-local-20261018.json` is unchanged.

The Linux trial and independent verification found identical diagnostics for
clean projects and 18 seeded errors, with about 6x faster root checking on that
WSL host. This supports collecting advisory CI evidence; it does not establish
editor, watch, emit, warm incremental, or Windows compatibility.

## Pin and behavior

- Isolated install: `npm install --no-save --prefix "$RUNNER_TEMP/tsrs" tsrs@0.18.0-ts7.1.0-dev.20260929`.
- Native package: `@tsrs/linux-x64-gnu`; binary SHA256:
  `d0bd720c20e9900764811bb0f36e46d2d56916d3048e768053919d40db02a194`.
- `scripts/qc/tsrs-side-check.mjs` verifies the version and native binary hash
  before executing it, then runs both existing typecheck projects with both
  compilers: root `--noEmit --skipLibCheck` and scripts
  `-p scripts/tsconfig.json --noEmit`. Each root run deletes
  `tsconfig.tsbuildinfo` before and after execution for a cold comparison.
- Both use `--pretty false`. tsrs additionally uses the documented reference
  diagnostic mode, `--checkerAssignment go --noLazyMembers`.
- Normalization removes ANSI colors, normalizes CRLF and diagnostic file paths,
  and sorts diagnostic records while preserving duplicates, locations, codes,
  and full multiline messages. Unexpected output is retained and reported as an
  error. Exit 0 means clean; 1 and 2 both mean diagnostics present. TS7 7.0.2's
  exit 1 is an upstream regression fixed by
  [typescript-go #4407](https://github.com/microsoft/typescript-go/pull/4407);
  tsrs follows classic tsc's exit 2.

The step summary contains cold wall timings, raw exit statuses, normalized
parity (`MATCH`, `MISMATCH`, or `ERROR`), and any diff. Differences or operational
errors return nonzero so the tolerated job failure is visible, without failing
the PR. Installation/setup failures remain visible in the job log. No repository
dependency or lockfile is modified.

## Updating and rerunning

Before bumping, repeat Linux clean and seeded diagnostic parity against the
required TS7 version, measure cold timings, and independently verify the new
native executable's SHA256. Update `TSRS_VERSION` and `TSRS_SHA256` in the script
and the exact install version in the workflow together, then update this note
and run `scripts/__tests__/tsrs-side-check.test.ts` plus the CI contract checks.
Keep the check advisory until separately approved evidence supports adoption.

Local Linux rerun, after the isolated install:

```sh
node scripts/qc/tsrs-side-check.mjs "$RUNNER_TEMP/tsrs"
```

Windows rerun trigger: `npm view @tsrs/win32-x64` no longer returns E404. When
available, repeat native Windows clean/seed parity and interleaved timing against
TS7 and the matched upstream version, then test warm incremental invalidation
before considering a required-gate replacement.
