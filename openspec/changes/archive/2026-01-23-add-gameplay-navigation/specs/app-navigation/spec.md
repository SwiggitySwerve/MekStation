# app-navigation Delta

## ADDED Requirements

### Requirement: Gameplay Section Navigation Items

The Gameplay navigation section SHALL include items for all gameplay features.

#### Scenario: Gameplay section contents

- **WHEN** the Gameplay section is expanded
- **THEN** the following navigation items are displayed in order:
  - Pilots (`/gameplay/pilots`) with PilotIcon
  - Forces (`/gameplay/forces`) with ForceIcon
  - Campaigns (`/gameplay/campaigns`) with CampaignIcon
  - Encounters (`/gameplay/encounters`) with EncounterIcon
  - Games (`/gameplay/games`) with GameIcon

#### Scenario: Navigate to Forces

- **WHEN** the user clicks the "Forces" navigation item
- **THEN** navigation proceeds to `/gameplay/forces`
- **AND** the Forces item is highlighted as active
- **AND** the Gameplay section header is highlighted

#### Scenario: Navigate to Campaigns

- **WHEN** the user clicks the "Campaigns" navigation item
- **THEN** navigation proceeds to `/gameplay/campaigns`
- **AND** the Campaigns item is highlighted as active

#### Scenario: Navigate to Encounters

- **WHEN** the user clicks the "Encounters" navigation item
- **THEN** navigation proceeds to `/gameplay/encounters`
- **AND** the Encounters item is highlighted as active

#### Scenario: Navigate to Games

- **WHEN** the user clicks the "Games" navigation item
- **THEN** navigation proceeds to `/gameplay/games`
- **AND** the Games item is highlighted as active

#### Scenario: Deep route active state

- **WHEN** the current route is `/gameplay/campaigns/abc123`
- **THEN** the Campaigns navigation item is highlighted as active
- **AND** the Gameplay section header is highlighted
