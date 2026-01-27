# Change: Scenario & Combat Expansion (AtB Dynamic Generation)

## Why
MekStation's scenario system currently has 4 static templates. MekHQ's Against the Bot (AtB) system provides dynamic scenario generation with:
- Weekly battle chance checks per combat role (7 roles with different probabilities)
- Scenario type selection tables (40+ scenario types across 4 role groups)
- OpFor BV matching with difficulty scaling
- Planetary conditions affecting force composition
- Contract morale tracking (7 levels) that influences battle frequency

This expansion enables campaign-driven scenario generation instead of manual scenario creation.

## What Changes
- **Combat Roles**: 7 force-level roles (Maneuver, Frontline, Patrol, Training, Cadre, Auxiliary, Reserve) with configurable battle chances
- **Morale System**: 7 levels (Routed through Overwhelming) tracked per contract, updated on scenario outcomes
- **Scenario Type Tables**: Role-specific selection tables (d40 for Maneuver, d60 for Patrol, d20 for Frontline, d10 for Training)
- **OpFor BV Matching**: `playerBV × difficulty × (75-125% variation)` formula
- **Scenario Conditions**: Light, weather, gravity, atmosphere with force composition effects (e.g., low gravity bans tanks)
- **Weekly Processor**: Runs on Mondays, checks battle chance per combat team, generates scenarios
- **CombatRole Type**: New enum separate from CampaignPersonnelRole (resolves Plan 11↔12 circular dependency)

## Impact
- **BREAKING**: Defines `CombatRole` enum that Plan 12 (Contract Types) will import
- Affected specs: `scenario-generation`, `combat-resolution`, `mission-contracts`
- Affected code: New `src/lib/campaign/scenario/` directory, new `scenarioGenerationProcessor`
- Backward compatible: Existing 4 scenario templates still work, AtB generation is opt-in via `useAtBScenarios` option
- Migration: No changes needed for existing campaigns (new fields default to safe values)
