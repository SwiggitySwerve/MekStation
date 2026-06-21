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

