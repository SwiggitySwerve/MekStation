# app-navigation Delta — fix-navigation-and-playability-deadends

## ADDED Requirements

### Requirement: Gameplay Hub Route

The application SHALL serve a real page at `/gameplay` so the mobile bottom-nav
"Gameplay" tab and every breadcrumb that resolves to `/gameplay` reach a
navigable hub rather than a 404, and the hub SHALL link each gameplay
sub-surface.

#### Scenario: Mobile Gameplay tab reaches the hub

- **GIVEN** the mobile bottom-nav "Gameplay" tab routes to `/gameplay`
- **WHEN** the user taps the tab
- **THEN** the application SHALL render the gameplay hub page (HTTP 200, not a
  404)
- **AND** the hub SHALL present navigable links to Quick Game, Pilots, Forces,
  Campaigns, Encounters, Games, and Multiplayer.

#### Scenario: Breadcrumb to /gameplay resolves

- **GIVEN** a breadcrumb trail whose root segment links to `/gameplay`
- **WHEN** the user activates the `/gameplay` breadcrumb segment
- **THEN** the gameplay hub page SHALL render
- **AND** no 404 or empty-passthrough page SHALL be shown.

### Requirement: Multiplayer Navigation Entry

The navigation surface SHALL expose a link to the multiplayer hub `/multiplayer`
from both the desktop Gameplay navigation section and the mobile gameplay menu,
so the hub is reachable without manually typing the URL.

#### Scenario: Desktop sidebar lists Multiplayer

- **GIVEN** the desktop sidebar Gameplay section is rendered
- **WHEN** its items are enumerated
- **THEN** a Multiplayer item linking to `/multiplayer` SHALL be present
  alongside Quick Game, Pilots, Forces, Campaigns, Encounters, and Games.

#### Scenario: Mobile menu lists Multiplayer

- **GIVEN** the mobile gameplay menu is open
- **WHEN** its items are enumerated
- **THEN** a Multiplayer entry linking to `/multiplayer` SHALL be present
- **AND** activating it SHALL navigate to the multiplayer hub.

### Requirement: Games List Real Data

The games list page SHALL render the player's real match history sourced from
the match-log reader, and SHALL show a real empty state when no matches exist,
rather than rendering hardcoded demo data.

#### Scenario: Real matches render in the games list

- **GIVEN** the match-log reader returns one or more recorded matches
- **WHEN** the games list page renders
- **THEN** each returned match SHALL appear as a list row
- **AND** no hardcoded demo entry SHALL be shown.

#### Scenario: Empty match history shows an empty state

- **GIVEN** the match-log reader returns no matches
- **WHEN** the games list page renders
- **THEN** a clearly-labeled empty state SHALL be shown
- **AND** no fake or placeholder game entry SHALL be presented as a real match.

### Requirement: Onboarding And Glossary Entry Point

The application SHALL provide a first-run onboarding/tutorial entry point
reachable from the home surface and an inline glossary defining core game jargon
(Battle Value, gunnery, piloting, heat, and piloting-skill-roll), so a new
player has guidance and term definitions.

#### Scenario: Onboarding entry reachable from home

- **GIVEN** the home page is rendered
- **WHEN** its navigation entries are enumerated
- **THEN** an onboarding/tutorial entry SHALL be present
- **AND** activating it SHALL navigate to the onboarding surface.

#### Scenario: Glossary defines core jargon

- **GIVEN** the glossary surface is open
- **WHEN** the core jargon terms are looked up
- **THEN** definitions SHALL be available for Battle Value, gunnery, piloting,
  heat, and piloting-skill-roll.

### Requirement: Multiplayer Entry Setup Path

The multiplayer entry page SHALL keep the vault-identity gate but SHALL also
present a setup path explaining how to obtain a vault identity and a clearly
labeled path-forward affordance when the user has no vault token, so the gate is
self-explanatory rather than a dead-end. This requirement governs reachability
and explanation of the gate only and SHALL NOT assert that networked play is
functional.

#### Scenario: Gate explains itself and offers a setup path

- **GIVEN** the multiplayer entry page is rendered for a user with no vault token
- **WHEN** the vault-password gate is shown
- **THEN** a link or route explaining how to set up a vault identity SHALL be
  presented
- **AND** a clearly labeled path-forward affordance SHALL be shown
- **AND** the underlying multiplayer auth model and transport SHALL remain
  unchanged.
