# app-navigation Delta Specification

## ADDED Requirements

### Requirement: Dashboard Gameplay Entry

The application dashboard (`/`) SHALL include a Gameplay navigation card linking to `/gameplay`, so the core play loop is discoverable from the landing page without using the top-bar menus.

#### Scenario: Dashboard offers Gameplay

- **GIVEN** a user on the dashboard
- **WHEN** the navigation cards render
- **THEN** a Gameplay card SHALL be present alongside Onboarding, Compendium, My Units, Unit Builder, and Compare
- **AND** activating it SHALL navigate to `/gameplay`

### Requirement: Gameplay Hub Player-First Content

The gameplay hub SHALL present its player-facing navigation cards (Quick Game, Pilots, Forces, Campaigns, Encounters, Games, Multiplayer) as the first content section, before any diagnostic or QC content.

#### Scenario: Player cards lead the hub

- **GIVEN** a user opens `/gameplay`
- **WHEN** the hub renders
- **THEN** the first content section below the page title SHALL be the player navigation cards
- **AND** no npm command text or QC matrix SHALL appear above them
