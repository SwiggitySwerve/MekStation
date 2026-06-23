## Context

The journey QC runner already materializes deterministic run plans, executes `campaign-long`, writes structured logs, and preserves generic bug evidence. The current evidence proves a generated long campaign can complete, but it does not compare repeat attempts for drift, does not prove JSON save/load stability for the produced artifacts, and does not surface the gameplay UI flow checkpoints in the long-campaign evidence bundle.

The `campaign-long` journey is intentionally headless-first today. The UI flow shell maps that journey to campaign/base, starmap, medical, salvage, repair, finances, and campaign log checkpoints, but no browser runner drives those pages end to end yet. This design adds a stability gate that is honest about that boundary while making repeated long-campaign evidence actionable.

## Goals / Non-Goals

**Goals:**

- Provide one scriptable long-campaign stability command with configurable seed, contract count, run count, run ID, and evidence directory.
- Reuse the existing journey QC runner instead of building a separate campaign simulator path.
- Write a `stability-manifest.json` beside the existing journey evidence.
- Compare deterministic campaign artifacts across repeated attempts after normalizing volatile fields such as timestamps, run IDs, generated IDs, and attempt numbers.
- Validate JSON save/load round trips for the run plan, result, and campaign-generated artifacts.
- Add medium-or-higher bug candidates when stability drift, missing artifacts, save round-trip mismatch, terminal-state failure, or missing UI flow linkage is detected.
- Include UI flow evidence in the manifest without implying that a browser campaign lane has run.

**Non-Goals:**

- Implement full browser automation for long campaigns.
- Replace existing journey QC evidence formats.
- Add campaign economy, repair, salvage, market, travel, or time-cascade domain behavior.
- Add new package dependencies.

## Decisions

1. Add a dedicated wrapper script instead of overloading `qc:journeys`.

   The new script will call the existing runner with `journey=campaign-long`, `tier=extended`, and default `contracts=10`, then post-process the evidence bundle into a stability manifest. This keeps the generic journey command stable while giving long campaigns a stronger gate.

   Alternative considered: add a generic `--stability` flag to `qc:journeys`. Rejected because the first stability contract is long-campaign-specific and includes campaign UI flow expectations that would make the base runner less clear.

2. Use canonical JSON digests for drift detection.

   The manifest will read campaign artifacts written for each attempt, normalize volatile fields, and hash canonical JSON. Attempts must produce the same digest for the same artifact role. Drift records must name the artifact role, attempt number, baseline digest, actual digest, and evidence reference.

   Alternative considered: compare raw files. Rejected because raw run IDs, generated IDs, attempt numbers, and timestamps would cause false drift.

3. Treat save/load proof as parse/stringify canonical round-trip evidence.

   The stability gate will read each required JSON artifact, parse it, write the canonical structure in memory, parse it again, and compare normalized canonical digests. This proves the evidence artifacts survive the current JSON persistence boundary without requiring a separate production save service.

   Alternative considered: no-op by trusting file writes. Rejected because the user asked for stable saves and repeatability evidence.

4. Append stability bugs to the existing `bugs.json` format.

   Stability failures should be visible to `qc:journeys:bugs`, so the script will append medium-or-higher bug candidates using the existing fields: severity, journey ID, run ID, step ID when known, fingerprint, summary, evidence references, module, and triage packet.

   Alternative considered: write a standalone drift-only report. Rejected because it would split bug discovery across tools.

5. Record UI flow linkage as evidence, not browser execution.

   The manifest will load `gameplayUiFlowShell.json`, assert exactly one `campaign-long` flow exists, record its QC command and checkpoints, and mark `browserExecuted: false` until a separate browser lane exists.

   Alternative considered: require Playwright execution immediately. Rejected because current `campaign-long` is headless-first and this wave is about deterministic long-campaign stability.

## Risks / Trade-offs

- Raw payloads contain generated IDs that vary by attempt -> Normalize known volatile fields before hashing.
- A digest-only mismatch can be hard to debug -> Include artifact references and a bug triage hint that points to the manifest and compared artifact role.
- UI flow evidence could be mistaken for browser coverage -> Include an explicit `browserExecuted: false` field and keep the known limitation visible.
- The current campaign journey uses catalog/synthetic backing -> Preserve execution backing summaries in the manifest so callers do not confuse synthetic evidence with domain-backed campaign mechanics.
- Stability script could hide generic journey failures -> Fail immediately when the underlying journey result fails, and still write the manifest plus bug candidates.

## Migration Plan

1. Add delta specs and tasks for the stability gate.
2. Implement `scripts/qc/validate-long-campaign-stability.mjs`.
3. Add `qc:campaign-long:stability` and `verify:qc:campaign-long` package scripts.
4. Add focused Jest coverage for successful stability evidence and injected drift failure.
5. Run OpenSpec validation, focused tests, journey QC validation, the new stability command, and standard type/format checks.

Rollback is deleting the new script, package commands, tests, and OpenSpec change before merge. The existing `qc:journeys` behavior remains compatible.

## Open Questions

- Browser-backed long-campaign signoff remains a follow-up lane once the campaign UI can drive a full 6-10 contract path.
