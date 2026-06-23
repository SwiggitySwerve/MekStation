# ui-flow-shell Specification

## Purpose
Defines the gameplay UI flow shell that maps required journey QC IDs to player and GM route checkpoints, validation commands, and inspection intent so top-level gameplay flows remain discoverable, auditable, and tied to repeatable evidence.
## Requirements
### Requirement: Journey-backed gameplay flow registry
The system SHALL define a typed gameplay UI flow registry that maps every required journey QC ID to an ordered player and GM flow through gameplay UI routes. Each flow entry MUST include journey ID, display name, module, role intent, ordered route checkpoints, primary action route, QC command, and inspection notes.

#### Scenario: Registry covers required journeys
- **WHEN** the UI flow registry is validated
- **THEN** it contains exactly one flow entry for each required journey QC ID

#### Scenario: Flow checkpoints preserve route order
- **WHEN** the `contract-campaign` flow is rendered or validated
- **THEN** its checkpoints preserve campaign/base, contract selection, encounter launch, tactical combat, post-combat, salvage, repair, economy, and log review order

### Requirement: Gameplay hub flow shell
The gameplay hub SHALL render a flow shell that exposes the required journey-backed flows without replacing existing gameplay navigation. The shell MUST show the journey ID, module, primary action, route checkpoints, QC command, and GM/player inspection intent for each flow.

#### Scenario: Hub shows validated journeys
- **WHEN** a user opens `/gameplay`
- **THEN** the hub shows flow-shell entries for character build, BattleMech build, 1v1 combat, 4v4 combat, contract campaign, short campaign, and long campaign

#### Scenario: Existing gameplay cards remain available
- **WHEN** the flow shell renders on the gameplay hub
- **THEN** the existing Quick Game, Pilots, Forces, Campaigns, Encounters, Games, and Multiplayer navigation cards remain available

### Requirement: Route checkpoint validation
The system SHALL validate that every UI flow checkpoint maps to an existing gameplay page template or an explicitly non-clickable placeholder route. Placeholder routes MUST use stable parameter names and MUST include a concrete entry route when the flow needs runtime IDs.

#### Scenario: Placeholder route maps to page template
- **WHEN** the validator reads `/gameplay/campaigns/:campaignId/salvage`
- **THEN** it matches the existing `/gameplay/campaigns/[id]/salvage` page template

#### Scenario: Missing page template fails validation
- **WHEN** a UI flow checkpoint references a route without a matching gameplay page template or documented placeholder handling
- **THEN** UI flow validation fails and names the flow ID and route

### Requirement: GM and player visibility separation
The UI flow shell SHALL distinguish player action checkpoints from GM review or override checkpoints. GM-only notes MUST be labeled as GM inspection or intervention intent and MUST NOT imply that hidden GM rationale is player-visible.

#### Scenario: Combat flow exposes GM review intent
- **WHEN** the `combat-1v1` or `combat-4v4` flow is rendered
- **THEN** the shell identifies tactical combat and post-battle review as player-visible checkpoints and GM intervention/review as GM inspection intent

#### Scenario: Campaign flow preserves player-safe framing
- **WHEN** a campaign flow includes salvage, repair, economy, or time checkpoints
- **THEN** the shell describes player-visible net-effect inspection separately from GM correction authority
