# campaign-management — Delta for fix-campaign-list-merge-and-e2e-isolation

## ADDED Requirements

### Requirement: Campaign List Merges Server And Local Sources

The campaigns list surface SHALL render the union of the server-persisted
campaign summaries (from `GET /api/campaigns`) and the active in-store campaign,
deduplicated by campaign id. The in-store campaign SHALL be included whenever its
id is absent from the server summaries, so that a newly created, not-yet-persisted
campaign is visible even when the server database already contains other
campaigns. When a campaign id appears in both sources, the server summary SHALL be
the rendered entry for that id. When the server database is empty, the in-store
campaign SHALL still be listed if one is present.

**Rationale**: The prior rule rendered server summaries **exclusively-or** the
in-store campaign (`summaries.length > 0 ? summaries : campaign ? [campaign] : []`),
so any store-created campaign became invisible the moment the server database held
at least one other campaign. A real user who has saved campaigns and then creates a
new unsaved one never saw it appear in the list. Merging by id makes the list the
true union of what is persisted and what is live in the store.

**Priority**: High

#### Scenario: Non-empty server database plus an unsaved local campaign lists both

- **GIVEN** the server database returns one or more campaign summaries from `GET /api/campaigns`
- **AND** the campaign store holds an active campaign whose id is NOT among those summaries
- **WHEN** the campaigns list page renders
- **THEN** a campaign card SHALL appear for each server summary
- **AND** a campaign card SHALL also appear for the in-store campaign
- **AND** the in-store campaign SHALL NOT be hidden by the presence of the server summaries

#### Scenario: Duplicate id resolves to the server summary

- **GIVEN** the server summaries include a campaign with id `campaign-x`
- **AND** the campaign store's active campaign also has id `campaign-x`
- **WHEN** the campaigns list page renders
- **THEN** exactly one card SHALL be rendered for `campaign-x`
- **AND** that card SHALL be sourced from the server summary, not the in-store campaign

#### Scenario: Empty server database still lists the local campaign

- **GIVEN** the server database returns no campaign summaries
- **AND** the campaign store holds an active campaign
- **WHEN** the campaigns list page renders
- **THEN** a campaign card SHALL appear for the in-store campaign

#### Scenario: Empty store with server summaries lists only the server campaigns

- **GIVEN** the server database returns one or more campaign summaries
- **AND** the campaign store holds no active campaign
- **WHEN** the campaigns list page renders
- **THEN** a campaign card SHALL appear for each server summary
- **AND** no additional local-only card SHALL be rendered
