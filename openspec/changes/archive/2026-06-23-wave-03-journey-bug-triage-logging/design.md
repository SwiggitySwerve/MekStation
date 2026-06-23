## Context

Journey QC currently writes structured per-step diagnostics and extracts bug candidates, but the failure evidence still has two usability problems:

- A single failed step can become both a high-severity step bug and a medium-severity log bug with the same log fingerprint.
- The text bug reporter shows only a subset of the triage packet, so the user must inspect JSON or `system.ndjson` to see actor, state, and rule-decision context.

Wave 3 is the proof layer before GM ledger and UI-flow work. It should make failed journey runs produce a compact, repeatable bug packet that can be read directly from the command line.

## Goals / Non-Goals

**Goals:**

- Use a deterministic dedupe key so matching result-derived and log-derived bug candidates collapse into one canonical packet.
- Preserve the richer severity/summary from the result-derived bug while retaining log fingerprint evidence.
- Add a structured `bug.candidate_extracted` diagnostic with triage context for extraction count, gated count, severity gate, bug packet path, and report path.
- Make the text reporter display actor, state before/after summary, rule decision, warnings, failure cause, next hint, and log fingerprints when available.
- Cover the behavior with focused journey QC tests and the existing QC validation commands.

**Non-Goals:**

- No browser/domain journey adapter implementation.
- No GM ledger implementation.
- No changes to durable domain events, replay logs, or match-log persistence.

## Decisions

1. **Dedupe after candidate construction.**
   Build candidates from result steps and error logs as today, then pass the final list through a deterministic dedupe function keyed by run ID, journey ID, step ID, and failure cause or matching log fingerprint. This keeps extraction sources simple while guaranteeing reporter output is canonical.

2. **Prefer canonical step bugs over log-only duplicates.**
   When duplicate candidates describe the same failed step, keep the higher-severity result-derived bug and merge evidence/log fingerprints from the log-derived bug. A log-only bug remains when there is no corresponding failed step.

3. **Keep triage summaries compact.**
   Reporter output should show stable summaries rather than dumping objects. State fields use concise one-line formatting for status, terminal state, artifact count, execution backing, and expected terminal state.

4. **Treat extraction itself as a structured journey diagnostic.**
   The `bug.candidate_extracted` log entry should include a triage packet with actor `journey-bug-extractor`, action `extract-bug-candidates`, before/after counts, rule decision based on severity gate, validation result, warning summaries, evidence references, and a next debugging hint.

## Risks / Trade-offs

- Duplicate bugs from unrelated sources could collapse if the key is too broad. Mitigation: include run ID, journey ID, step ID, and the failure/log cause in the dedupe key.
- Reporter output could become noisy. Mitigation: show compact triage lines only when triage exists, and keep JSON output unchanged for machines.
- Older evidence may lack triage. Mitigation: keep reporter compatibility with existing summary/fingerprint/evidence fields.
