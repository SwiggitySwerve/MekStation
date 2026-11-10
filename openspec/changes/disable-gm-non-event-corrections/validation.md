# Interim GM correction validation

Base: `3f4d7331870d22c790d860419dbac1bd9973db66`, fetched from
`origin/main`; branch created with `--no-track`.

## Loss evidence and scope

Coordinator 4's confirmed loss report, audited at
`33f30fb35a46844148aacb8da43b7a14d102a2e6`, records a real seeded
InteractiveSession heat correction **0 -> 17 -> 0** on the next advancePhase,
before Heat resolution. The correction emitted no event. This lane verified
the production caller on its fetched base; it does not claim a new execution
of that scratch loss fixture. The report is
`arch-findings-c4/02-gm-correction-loss.md` in the coordinator audit workspace.

The six controls, their live previews and their approval path are blocked.
Advance Phase still uses the event-backed engine method. No InteractiveSession,
event schema, multiplayer implementation, ledger implementation or persisted
format changed. [D-8 R10](proposal.md#d-8-r10-follow-up) remains the real fix.

## Completed evidence

| Check | Result |
| --- | --- |
| Test-first run against unchanged executable source | 4 suites; 29 failed, 48 passed |
| Focused green run after implementation | 5 suites; 78 passed; native exit 0 |
| UI mutant: re-enable Heat/Ammo in command availability only | 1 failed, 15 passed; disabled assertion caught it |
| Same UI file after byte-identical restoration | 16 passed; native exit 0 |
| Approval mutant: remove the command support recheck | 6 failed, 10 passed; all six temporary refusal reasons caught it |
| Same approval file after byte-identical restoration | 16 passed; native exit 0 |
| Root and scripts TypeScript configs | Passed via npm run typecheck |
| Root lint | Passed; 62 warnings, 0 errors (limit 63) |
| Unit lint | Passed; 17084/17085, no ceiling changes |
| Root formatting check | Passed; 9483 matched files |
| Replay/digest/golden before executable edits | 70 suites; 1098 assertions passed; worker shutdown warning; PowerShell wrapper status 1 |
| Focused OpenSpec strict validation | Passed |

The initial red run used `--maxWorkers=2`. Each mutant and restored green run
used one `--runTestsByPath` file at a time with `--maxWorkers=3`. Source bytes
were restored in a finally block. Logs and structured receipts are in
`arch-findings-c4/interim-evidence/` in the coordinator audit workspace.

Existing generic GM confirmation/cancellation tests now use Advance Phase as
the surviving control; their confirmation, freshness and privacy assertions
remain. The tactical E2E match in `e2e/ux-deep-play-audit.spec.ts` uses Advance
Phase. No E2E or a11y spec assertions were changed. Ten command source citations
were re-anchored by descriptor ID and body boundaries after formatting.

## Hosted gate policy

Root replaced the local heavy-slot plan with load rule 6: prefer hosted evidence
and do not run a second full copy of CI locally. Directory-wide, integration,
a11y, simulation/combat, replay and E2E evidence must come from green hosted PR
Checks on the exact submitted head. Hosted results are pending at PR creation;
this receipt does not claim them complete.

Required before merge: "directory-wide and a11y gates are proven by hosted PR
Checks on this head (local machine load rule)."

The local combat attempt was stopped without claiming completion. The recorded
six-process execution tree and all known owned Node/gate-runner processes were
verified absent. No fixture or digest was regenerated. The 331-suite directory
batch, a11y project, combat validation and replay-after batch will not run locally.

Only these final light gates are run locally under the revised instruction:

```text
node scripts/ci/budget-check.mjs
npx openspec validate --all --strict
```

Normal commit hooks remain enabled. They format/lint staged files and invoke the
repository's existing type checks; no optional full test run is added.

The budget result must be reported against the requested 57/92 constraint.
Fetched main's configuration currently permits 93 repoWideKeys; this lane does
not change that ceiling. OpenSpec strict validation passed 332/332 items. The first budget attempt timed
out in its existing 120-second Jest file census before producing metrics; a
single unchanged retry is recorded in the PR body. No timeout or budget ceiling
was changed.
