## Context

The current `journey-qc` capability already defines the seven required end-to-end journeys, a single runner command, evidence bundles, log search, bug extraction, and QC graph lookup. Live smoke runs prove the command surface and evidence bundle work, but the runner currently writes catalog-shaped in-process artifacts for journey steps. That is useful as a deterministic scaffold, yet it does not clearly distinguish synthetic/catalog-backed proof from domain-backed or UI-backed execution.

This change keeps the scaffold fast while making the evidence contract honest enough to drive the next waves: each step reports its execution backing, reports whether that backing is synthetic, and can be rejected by a stricter caller when non-synthetic execution is required.

## Goals / Non-Goals

**Goals:**

- Add explicit backing metadata to run plans, step results, diagnostic logs, reports, and generated artifacts.
- Add a CLI option that fails when selected steps are still synthetic/catalog-backed and the caller requires domain-backed execution.
- Preserve existing smoke journey behavior for normal local QC.
- Add tests for both the default pass path and strict backing-required failure path.

**Non-Goals:**

- Do not replace all journey steps with real domain or browser adapters in this slice.
- Do not change player-facing UI or production gameplay APIs.
- Do not hide synthetic backing behind known limitations or expected probes.
- Do not make routine `verify:qc` slower by default.

## Decisions

- **Use per-step execution backing metadata.**
  - Rationale: The gap exists at step granularity. A campaign journey may later mix synthetic setup with domain-backed economy processing, while a combat journey may mix domain-backed encounter launch with browser-backed tactical previews.
  - Alternative rejected: One journey-level `synthetic` flag. That would be too coarse for incremental adapter migration.

- **Default to `synthetic-projection` for existing in-process artifact generation.**
  - Rationale: This names what the current runner actually does without breaking existing smoke gates.
  - Alternative rejected: Rename existing evidence as domain evidence. That would make the current proof stronger-looking than it is.

- **Add a caller opt-in strict gate.**
  - Rationale: Routine smoke QC should stay fast, while roadmap and release checks need a way to prove that a journey is no longer synthetic.
  - Alternative rejected: Fail all synthetic steps by default. That would immediately break useful journey smoke coverage before real adapters exist.

- **Surface strict-gate failures through the existing bug/log path.**
  - Rationale: Missing non-synthetic backing is a validation failure that should produce the same bug packet and searchable logs as other journey failures.
  - Alternative rejected: Print a special CLI-only warning. That would not feed the bug/log workflow.

## Risks / Trade-offs

- **Risk: Synthetic runs may still look like complete journey passes.** → Reports and artifacts will show synthetic counts and backing names so the limitation remains visible.
- **Risk: Strict gate adds another command mode to learn.** → Document the flag in journey QC docs and test it through the existing script test suite.
- **Risk: Step metadata could drift from future adapters.** → Keep validation close to the runner and make adapter migration update the backing metadata with tests.

## Migration Plan

1. Add backing metadata to the runner output without changing default pass/fail behavior.
2. Add a strict option for non-synthetic backing and verify it fails with bug/log evidence today.
3. Replace synthetic steps with domain or browser adapters in later waves, using the strict option as the progress gate.

Rollback is a normal code revert: no persisted production data or user save format changes are involved.

## Open Questions

- Which journey gets the first real domain adapter after this slice: `character-build`, `mek-build`, or `combat-1v1`?
- Should the strict gate later become part of `verify:qc:journeys` after enough adapters exist?
