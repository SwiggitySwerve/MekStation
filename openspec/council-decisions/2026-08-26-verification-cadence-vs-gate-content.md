# Council decision — verification cadence vs. gate content

**Date:** 2026-08-26
**Convened on:** "go back and verify after every 10 tasks are completed to have a
self verifying loop in cadence during development before continuing to the next block"
**Variant:** Lean++ thin (Metis pre-phase → Oracle, Explore-Deep, Momus → Judge)

## Headline

Cadence was already 1-per-PR and the regression shipped anyway. The gate that
would have caught it did not exist, and the script family that comes closest is
wired to nothing.

## Decision

**Reject the cadence framing. Build the missing client↔server bridge test, and
land it where CI already enforces it.**

## Evidence that decided it

- **Cadence was already tighter than proposed.** Every PR #1354–#1369 ran
  typecheck + oxlint + ~33,170 jest tests + 30/30 CI, plus a falsification pass.
  PR #1369 (MERGED) passed all of it and was wrong anyway; #1370 reverted it.
- **No gate was structurally capable of failing on it.**
  `grep -rl "client'" src/lib/multiplayer/server/__tests__/` returns 0 — no
  server-side test imports the client, and nothing anywhere wired the real
  `client.ts` to a real fog-enabled `ServerMatchHost`. Running a gate that cannot
  fail on a bug class more often changes nothing.
- **The near-miss gates are orphaned.**
  `grep -c "verify:qc" .github/workflows/pr-checks.yml
  .github/workflows/nightly-validation.yml` returns 0 and 0. The
  `verify:qc:multiplayer:*` scripts are developer-local in both lanes.
- **The producer refutes the assumption on sight.**
  `src/lib/multiplayer/server/ServerMatchHostEvents.ts:169` — `if (!filtered)
  continue;`. Measured fog streams: player A `[2,3,4,5,6,7,8,10,11,12]`,
  player B `[2,3,4,5,6,7,9,10,11,12]`.
- **Receipt drift is currently hypothetical.** 2 of 2 sampled receipts in
  `harden-gm-two-player-campaign-sessions/tasks.md` verified TRUE against their
  cited artifacts.

## Survival Score — Modified

Momus (kill-mandated) landed the decisive objection: a bridge test landing in the
`verify:qc:*` family would inherit its siblings' orphaned fate and the next #1369
would ship clean again. Its proposed remedy was a `pr-checks.yml` edit.

Verifying that remedy changed it again: jest's unit project roots include `src/`,
and every test added under `src/` this session ran in CI. **A plain jest test
under `src/lib/multiplayer/**/__tests__/` is enforced automatically** — so the
answer is to put it there, not in the orphaned script family. No workflow edit,
no new required check, no branch-protection change.

## What was built

`src/lib/multiplayer/__tests__/clientAgainstFogServer.integration.test.ts` — an
in-memory duplex pairing the real `IClientWebSocket` with the real `IMatchSocket`,
so a real fog-enabled `ServerMatchHost` drives the real `client.ts`.

**Verified to catch the actual regression:** reintroducing #1369's contiguity
branch reds both bridge rows.

Honest nuance: after #1370 the client's own unit rows would also red on a
reintroduction, because they now encode the sparse-stream expectation. The
difference that matters is where the expectation comes from — a fixture can be
rewritten to match a wrong assumption (exactly what #1369 did), whereas the
bridge derives it from the producer.

## The norm (a norm, not a control)

**Name the producer.** When a change assumes a property of data produced
elsewhere, cite the file:line that produces it and drive at least one test from
that real producer, not a fixture that encodes the assumption.

Dissent on record (Momus): this has no mechanization and is the same category as
this repo's other prose-MANDATORY rules — not worse than the status quo, but not
load-bearing either. The control is the bridge test; this is a habit.

## Deferred

Periodic receipt-reconciliation by a second agent. Revisit if any receipt is ever
found false — 2 of 2 sampled held.

## Trade-offs accepted

No periodic pass means whole-program drift across 107 tasks stays unmonitored.

## Protocol deviations, disclosed

- Phase 2 was **not** a single-message fan-out. Oracle, Explore-Deep and Momus
  fired in three separate messages: full token cost, forfeited parallelism.
- Momus saw the candidate decision, making it a merged Phase 2/3 adversary pass
  rather than an independent Phase-2 position.
- Judge returned REVISE on unsourced load-bearing claims; revised by verifying all
  six inline (PR states, producer line, socketFactory, both grep counts, the
  pinned sparsity test). Not re-judged.
