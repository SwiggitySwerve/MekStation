# coop-campaign-sync — Delta for polish-command-surfaces-wave3

## ADDED Requirements

### Requirement: Co-op Creation Onboarding Affordances

The co-op campaign create surface SHALL disclose that one-click creation applies defaults (Mercenary faction, Standard preset, empty roster) through a static skip-notice, so a player understands that name, faction, preset, and roster were defaulted and can be configured from the campaign dashboard after creation. On a vault-identity (token-mint) failure, the surface SHALL present a link to vault settings (`/settings#vault`) in the error notice for both the create and join paths. The vault-settings link SHALL be gated to the identity / token-mint step, so that non-identity failures — invite-code lookup and match creation (POST) — retain generic error copy without the vault link.

**Rationale**: Co-op creation ships create-first with hardcoded defaults and no notice, and vault-identity failures render as raw error strings with no affordance, even though `/settings#vault` already deep-links to the vault section. Mislabeling non-identity errors as vault problems would train users to change the wrong setting.

**Priority**: Medium

#### Scenario: Skip-notice describes the applied defaults

- **GIVEN** a user on the co-op campaign entry surface
- **WHEN** the Create Co-op button is displayed
- **THEN** a static skip-notice SHALL be shown near the button describing the applied defaults (Mercenary faction, Standard preset, empty roster)
- **AND** the notice SHALL indicate the campaign can be renamed and configured from the dashboard after creation

#### Scenario: Vault-identity failure surfaces the settings link

- **GIVEN** a user creating or joining a co-op campaign
- **WHEN** the vault-identity token mint fails
- **THEN** the error notice SHALL include a link to `/settings#vault`
- **AND** the link SHALL be shown for both the create-error and join-error paths

#### Scenario: Non-identity failure keeps generic copy

- **GIVEN** a user creating or joining a co-op campaign
- **WHEN** the failure is a non-identity error (invite-code lookup or match creation POST)
- **THEN** the error notice SHALL retain generic copy
- **AND** it SHALL NOT include the vault-settings link
