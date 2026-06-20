## ADDED Requirements

### Requirement: Journey-Level Automated QC
The E2E testing system SHALL include journey-level automated QC commands for character build, Mek build, 1v1 combat, 4v4 combat, contract campaign scenario, short campaign, and long campaign validation. These commands MUST complement existing page and subsystem tests.

#### Scenario: All journeys can run from one command
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=all --tier=standard`
- **THEN** the test system executes the standard-tier journey set and writes a result for each required journey

### Requirement: Headless, Browser, and Hybrid Modes
The E2E testing system SHALL support headless, browser, and hybrid journey execution modes. Browser and hybrid modes MUST capture page errors, critical console errors, screenshots or traces when configured, and visible completion evidence for UI-driven steps.

#### Scenario: Browser mode captures page errors
- **WHEN** a browser-mode journey encounters an uncaught page error
- **THEN** the journey result records the error and produces a bug candidate linked to the browser artifact

### Requirement: Journey Repeatability Controls
Journey-level tests SHALL expose repeatability controls for seed, run count, generated input preservation, and output directory. The test system MUST record these controls in the run plan and result.

#### Scenario: Run count executes repeated validation
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=combat-1v1 --runs=3 --seed=42`
- **THEN** the result contains three combat journey attempts tied to the same resolved configuration

### Requirement: Standard and Extended Validation Tiers
The E2E testing system SHALL distinguish standard validation from extended validation. Standard-tier journeys MUST be suitable for routine local validation, while extended-tier journeys MAY run longer campaign lengths or broader generated input matrices.

#### Scenario: Long campaign can run extended contracts
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-long --tier=extended --contracts=10`
- **THEN** the test system executes a long campaign plan with ten generated contracts or records an explicit gap for any unsupported step

### Requirement: Journey Evidence Gate
Journey-level tests SHALL fail when required evidence is missing, when a terminal state is absent, when generated steps are not executed, or when bug severity exceeds the configured gate.

#### Scenario: Missing terminal state fails journey
- **WHEN** a combat journey produces generated inputs but no combat terminal state
- **THEN** the journey result is failed and the bug extractor records a missing-terminal-state bug candidate

### Requirement: UI and Domain Agreement Checks
Journey-level tests SHALL verify agreement between UI-visible state and domain results when a journey uses browser or hybrid mode. Combat journeys MUST compare preview or runner output with the resolved engine outcome when both surfaces are available.

#### Scenario: Hybrid combat result agrees with engine
- **WHEN** a hybrid combat journey previews and resolves an attack
- **THEN** the test records whether the previewed legality, range, targetability, and terminal resolution agree with the engine output
