## Why

The CAMP-01 program requires each focused implementation wave to prove what ran, at which reviewed commit, with which repository provenance, and whether its evidence survived worktree cleanup. Existing commands and screenshots do not provide a shared fail-closed receipt that binds those facts or prevents stale, substituted, cross-run, or branch-head evidence from being accepted.

## What Changes

- Add a versioned `camp01-authority-receipt/v1` writer, validator, and executable controller for immutable wave commands, exact-SHA execution, canonical GitHub provenance, durable evidence export, and cleanup.
- Add first-class CAMP-PROOF, PROOF-02 reproduction, and PROOF-02 triage contracts plus the CAMP-00 through CAMP-01H command rows declared by the parent change.
- Make Next, Playwright, runtime databases, screenshots/traces/videos, and UX-audit runners opt in to writer-owned ephemeral/output roots and normalized durable JSON reports without changing their default behavior.
- Replace the chained viewport package script with one tested Node orchestrator whose three argv arrays are shared with the CAMP-01H contract.
- Add creation-bound, non-force worktree and branch cleanup with a writer-owned cleanup receipt that followers must validate.
- Add adversarial regression coverage for command, environment, provenance, path, evidence, digest, and cleanup drift.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `journey-qc`: Require a strict authority-receipt boundary for CAMP-01 wave evidence, exact-main reproduction and triage, isolated H-session artifacts, and cleanup-gated sequencing.

## Non-goals

- Implementing any campaign roster, co-op, launch-boundary, custom-unit, Mech Bay, or combat journey product behavior.
- Repairing any PROOF-02 failure before a fresh exact-main reproduction and independently reviewed triage exists.
- Providing hostile-local-user non-repudiation, tenant authentication, remote multi-user safety, or general-purpose CI attestation.
- Replacing existing default Playwright, UX-audit, or viewport behavior outside the explicit opt-in receipt contract.
- Adding dependencies.

## Impact

- Affected scripts: CAMP-01 receipt writer/validator/controller, Playwright wrapper, UX walkthrough runner, and viewport-sweep runner.
- Affected package surface: focused receipt write/validate/controller/test commands and the single-command viewport sweep.
- Affected evidence: durable allowlisted JSON/image artifacts under `.sisyphus/evidence/playtest`, with no retained local paths, raw argv, environment values, messages, stacks, secrets, or reporter payloads.
- Affected workflow: every later CAMP implementation wave must present reviewed-head and exact-main receipts plus a validated predecessor cleanup receipt.
