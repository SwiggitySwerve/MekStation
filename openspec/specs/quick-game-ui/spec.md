# quick-game-ui Specification

## Purpose

Defines Quick Game UI requirements for Scenario Type Selector and AI Tier Selector, preserving the source-of-truth scope introduced by archived change polish-wave-6.2-gaps.

## Requirements
### Requirement: Scenario Type Selector

The Quick Game setup screen SHALL expose a scenario-type selector allowing the operator to choose from the four scenario archetypes (Annihilation, Capture-the-Flag, Defend, Breakthrough) without editing JSON configs.

**Priority**: High

#### Scenario: Operator picks a non-default scenario type

**GIVEN** the operator is on `/quick-game` (or equivalent setup route)
**WHEN** they open the scenario-type Select and choose `CTF`
**THEN** the system SHALL update `useQuickGameStore.scenarioConfig.scenarioType` to `CTF`
**AND** the next Launch Game click SHALL initialize the encounter with `scenarioType: 'CTF'`
**AND** the existing default Annihilation flow SHALL remain unchanged when the operator does not interact with the selector

#### Scenario: Selector exposes the four canonical scenario types

**GIVEN** the operator opens the scenario-type Select
**WHEN** the options render
**THEN** the system SHALL surface exactly four options: `Annihilation`, `CTF`, `Defend`, `Breakthrough`
**AND** the testid `quick-game-scenario-select` SHALL identify the Select element for automated tests

### Requirement: AI Tier Selector

The Quick Game setup screen SHALL expose an AI-tier selector allowing the operator to choose from the four tactical-AI difficulty tiers (Green, Regular, Veteran, Elite) without editing JSON configs.

**Priority**: High

#### Scenario: Operator picks a non-default AI tier

**GIVEN** the operator is on the Quick Game setup screen
**WHEN** they open the AI-tier Select and choose `Veteran`
**THEN** the system SHALL update `useQuickGameStore.scenarioConfig.aiTier` to `Veteran`
**AND** the next Launch Game click SHALL initialize the bot pilot with the `Veteran` AI behavior profile
**AND** the default `Regular` flow SHALL remain unchanged when the operator does not interact

#### Scenario: Selector exposes the four canonical AI tiers

**GIVEN** the operator opens the AI-tier Select
**WHEN** the options render
**THEN** the system SHALL surface exactly four options: `Green`, `Regular`, `Veteran`, `Elite`
**AND** the testid `quick-game-ai-tier-select` SHALL identify the Select element for automated tests

### Requirement: Auto-Resolve Labeling

The Quick Game surface SHALL honestly label the path that resolves the battle
without player input as "Auto-Resolve", so the user understands the battle
completes automatically before they choose it.

#### Scenario: Auto path is labeled Auto-Resolve

- **GIVEN** the Quick Game surface offers the path that runs the battle to
  completion without per-turn player input
- **WHEN** that path is presented to the user
- **THEN** it SHALL be labeled "Auto-Resolve"
- **AND** the label SHALL distinguish it from any interactive play option.

### Requirement: Interactive Skirmish On-Ramp

The Quick Game surface SHALL provide a low-friction interactive "Skirmish"
on-ramp that launches an interactive session on the hex board with the player
controlling one side, reachable without campaign or force setup, so a learner
can actually play rather than only auto-resolve or spectate. This requirement
guarantees the learner reaches the hex board via the existing interactive
session engine; full turn-UI parity with the tactical command shell is not
required by this requirement.

#### Scenario: Interactive Skirmish reaches the hex board

- **GIVEN** the Quick Game surface is rendered
- **WHEN** the user selects the interactive Skirmish on-ramp
- **THEN** an interactive session SHALL launch on the hex board with the player
  controlling one side
- **AND** the launch SHALL NOT require prior campaign or force setup
- **AND** the surface presented SHALL be the interactive tactical/hex-board
  surface rather than the auto-resolve results table.

#### Scenario: Interactive option distinct from spectator and auto-resolve

- **GIVEN** the Quick Game surface offers Auto-Resolve, spectator ("Watch AI
  Battle"), and the interactive Skirmish on-ramp
- **WHEN** the play options are enumerated
- **THEN** the interactive Skirmish on-ramp SHALL be a distinct option from both
  Auto-Resolve and the spectator path.
