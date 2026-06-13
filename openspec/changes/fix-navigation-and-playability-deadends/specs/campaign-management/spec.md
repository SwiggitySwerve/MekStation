# campaign-management Delta — fix-navigation-and-playability-deadends

## ADDED Requirements

### Requirement: Multi-Campaign List And Switcher

The campaign list surface SHALL source its entries from the multi-campaign
backend so multiple campaigns coexist and are all listed, and the campaign store
SHALL expose a switcher that loads a chosen campaign into the active campaign
slot. Creating a new campaign SHALL NOT delete or clobber any other stored
campaign.

#### Scenario: Multiple campaigns are listed

- **GIVEN** two campaigns have been created and persisted
- **WHEN** the campaign list surface renders from the multi-campaign backend
- **THEN** both campaigns SHALL appear as list entries
- **AND** neither campaign SHALL have been deleted by the creation of the other.

#### Scenario: Switching changes the active campaign without loss

- **GIVEN** two persisted campaigns and one of them loaded as the active campaign
- **WHEN** the user switches to the other campaign via the switcher action
- **THEN** the chosen campaign SHALL become the active campaign
- **AND** the previously active campaign SHALL remain stored and still listed.

#### Scenario: New Campaign does not clobber the active campaign for the list

- **GIVEN** an active campaign is loaded
- **WHEN** the user creates a new campaign
- **THEN** the existing campaign SHALL remain present in the campaign list
- **AND** the list SHALL be able to show more than one campaign.

### Requirement: Reactive Campaign Dashboard

The campaign dashboard SHALL read campaign, roster, and mission state through
reactive store subscriptions so it re-renders when the underlying stores change,
rather than reading a one-time `getState()` snapshot at render time.

#### Scenario: Dashboard re-renders on campaign store change

- **GIVEN** the campaign dashboard is rendered for the active campaign
- **WHEN** the campaign store updates the active campaign's state
- **THEN** the dashboard SHALL re-render to reflect the new state
- **AND** it SHALL NOT continue displaying a stale render-time snapshot.

#### Scenario: Reactivity preserves auto-save bridge ordering

- **GIVEN** the dashboard installs the client-ready auto-save dirty bridge after
  hydration
- **WHEN** the dashboard is converted to reactive store subscriptions
- **THEN** the auto-save dirty-bridge behavior SHALL be preserved
- **AND** day advancement and edits SHALL still re-arm the auto-save debounce.
