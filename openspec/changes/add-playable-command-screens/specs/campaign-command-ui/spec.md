## ADDED Requirements

### Requirement: Campaign command console continuity
Campaign screens SHALL present starmap, missions, Mek stable, finance, contracts, activity log, and GM ledger as connected command contexts that preserve campaign identity and next-action affordances.

#### Scenario: Campaign navigation preserves command context
- **WHEN** a player moves between campaign starmap, missions, Mech Bay, finance, and GM ledger routes
- **THEN** each screen SHALL retain the campaign identity and expose the next relevant command without requiring a separate setup page

### Requirement: Campaign command panels explain consequences
Campaign command panels SHALL show current state, pending consequences, unresolved blockers, and links to the surface that resolves each blocker.

#### Scenario: Blocker links to fix surface
- **WHEN** a mission, travel, repair, refit, finance, or personnel blocker prevents a command
- **THEN** the panel SHALL identify the blocker and provide a route or action to the relevant fix surface
