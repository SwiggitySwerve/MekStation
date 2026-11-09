## Context

The runner mutates its private state through direct phase functions. Its log
contains `TurnStarted` and phase-stamped combat events, but no `PhaseChanged`.
The common reducer instead resets phase damage when it receives a phase change.
Ordinary `AttackDeclared`/`AttackResolved` reducers do not reconstruct the
runner's fired-weapon list. Shared turn-reset helpers also deliberately preserve
different sparse/explicit key policies. Phase emission alone cannot resolve all
three differences.

## Decision

Keep runtime behavior and the event stream unchanged. Define runner-log replay as
ordered deterministic playback of the supplied history, rather than equality
with the runner's private state or a guarantee of authoritative resume. Do not
change generic session replay or impose a source-based admission fence.

The characterization pins present behavior, including known gaps. A future fix
must deliberately update the affected expectations; these tests do not endorse
the gaps as permanent rules. They do not claim to inventory every unit-state
difference beyond the selected fields.

## Corpus and comparison

`SimulationRunner.replayScope.test-helpers.ts` owns the seeds and configuration.
It imports the existing Atlas JSON and production hydration functions, avoiding
the Node canonical service and its environment-dependent import graph. An
injected invariant observes the runner's End-phase state without consuming RNG,
changing events, or adding production instrumentation. This corpus must reach
End on its final turn; an early exit fails that precondition rather than
silently comparing a stale snapshot.

The test compares ordered event sequence numbers, source/roster identity,
replayed turn boundaries and the final `GameEnded` interpretation. Repeated
replay must produce strictly equal state without mutating the supplied events.
Selected-field comparisons preserve the distinction between absent keys and
explicit cleared values.

## Caller paths

| Entry or consumer | Existing path | Effect |
| --- | --- | --- |
| Standalone, swarm, batch, combat validation | `SimulationRunner.run`, `BatchRunner`, simulation CLIs | Observe and characterize; no writer change |
| QuickResolve, quick game, pre-battle auto-resolve, campaign fast-forward | Their callers of `GameEngine.runToCompletion` | Separate session-based driver; preserve existing digest locks |
| Interactive session and AI | Session commands and `advancePhase`; runner AI uses direct runner phase functions | Preserve both drivers and their RNG behavior |
| Multiplayer dispatch and journal authority | `ServerMatchHostDecision`, `ServerMatchHostJournalAuthority`, `MatchRecovery`, `MatchSessionProjector` | Preserve authoritative hydration and digests |
| P2P | Intent translation and host session command adapter | Preserve host phase emission and client mirroring |
| Replay and outcome readers | `useSharedReplayPlayer`, `gameSessionReplay`, `GameOutcomeCalculator`, viewer projection | Clarify the runner-log limit; no projection change |
| Replay library and scenario packs | Stored-envelope loader, flow/anchor packs, GameEngine fast-forward packs | Preserve bytes, schemas and provenance; no minting |

## Alternatives and compatibility

Scratch trials on fetched main showed that emitted phase changes and inferred
phase boundaries each removed phase-damage differences on this corpus, while
leaving the fired-weapon and key-shape differences. Emission changed all eight
sampled log digests; inference preserved logs but changed their projections.
Neither option is implemented here. Any event-stream, committed digest, golden
or fixture change remains a Root decision; never regenerate them in this PR.

## Verification

Run the whole runner test directory, integration directory, replay/digest/golden
surface before and after, exact `validate:combat`, both TypeScript configurations,
lint, `lint:units` and its tests, oxfmt, OpenSpec validation and the CI budget check.
The new tests must not increase the unkeyable-test budget above 57.

The required mutant removes runner `TurnStarted` emission. The private loop
still reaches turn 10, while replay stays at turn 0, so the scoped-contract
witness must fail. Restore the mutant before all final gates and commit only the
tests, corpus and scope documentation.

## Local validation evidence

Validated on main `52f65d9c7` after merging the upstream update into the lane.
The 209 existing comparison suites passed before the change; all are covered
and pass in the final directory/replay runs. Those final runs contain 266
distinct suites, with 3,221 tests passed and 32 existing skips. The exact
`npm run validate:combat` command also passed, including its 79-suite,
2,107-test Jest step and strict OpenSpec checks. Both TypeScript configurations,
lint, lint:units and its Jest suite, formatting, OpenSpec validation and the CI
budget check passed. Root lint reports 62 warnings; unkeyable tests remain 57.

Omitting runner `TurnStarted` emission failed all eight playback cases with
expected turn 10 and actual turn 0. Restoring the producer byte-for-byte passed
all ten new tests. All 26 inventoried replay/scenario fixture hashes remained
unchanged; existing digest/golden assertions passed without regeneration.
