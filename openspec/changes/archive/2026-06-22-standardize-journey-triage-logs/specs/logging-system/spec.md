## ADDED Requirements

### Requirement: Journey Diagnostic Triage Context
Structured journey diagnostics SHALL include standardized triage context when emitted by journey QC. The context MUST identify actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, failureCause, evidenceRefs, and nextDebuggingHint when those fields are applicable to the step. Failure diagnostics MUST include a stable fingerprint that can be used by log search and bug reports.

#### Scenario: Tactical rejection diagnostic explains action context
- **WHEN** a tactical action rejection is logged by a journey step
- **THEN** the structured diagnostic includes actor, rejected action, state before/after summary, rule decision, validation result, warning reasons, evidence references, and a stable fingerprint

#### Scenario: Failure diagnostic links to bug packet
- **WHEN** a required journey step fails
- **THEN** the failure diagnostic includes failureCause and fingerprint
- **AND** the generated bug packet references that fingerprint in its triage logFingerprints
