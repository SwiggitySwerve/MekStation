# encounter-system — Delta for add-replay-step-and-effect-animations

## ADDED Requirements

### Requirement: Encounter Detail Watch Replay Link

The encounter detail page SHALL render a "Watch Replay" navigation control linking to `/gameplay/games/<gameSessionId>/replay` whenever the loaded `IEncounter` has a populated `gameSessionId` (i.e. the encounter has been launched and `EncounterRepository.linkSession` has stamped the launched session id onto the row). The page module is at `src/pages/gameplay/encounters/[id].tsx`. The control SHALL be hidden when `gameSessionId` is `undefined`.

The control SHALL be implemented as a button that uses the
existing `Button` component from `@/components/ui` for styling
parity with the surrounding `EncounterActionsFooter`. The button
SHALL invoke `router.push('/gameplay/games/' + gameSessionId +
'/replay')` on click — it SHALL NOT use a raw `<a href>` because
the navigation needs to flow through Next.js's client-side router
to preserve the encounter store state for back-navigation.

The button SHALL be discoverable on the page without scrolling
past the existing forces / map / validation cards. The placement
SHALL be co-located with the existing encounter action surfaces
(`EncounterActionsFooter`) so the user finds replay-related
actions in the same visual region as launch / quick-resolve / delete.

The button label SHALL be the literal text `"Watch Replay"`. The
button SHALL carry a `data-testid` of `'encounter-watch-replay-link'`
so test specs can target it deterministically.

#### Scenario: Launched encounter with gameSessionId shows the link

- **GIVEN** an encounter loaded into the detail page with
  `status: EncounterStatus.Launched` and
  `gameSessionId: 'session-abc-123'`
- **WHEN** the page mounts
- **THEN** a button labelled `"Watch Replay"` SHALL be visible
- **AND** the button SHALL carry the test id
  `'encounter-watch-replay-link'`

#### Scenario: Draft encounter without gameSessionId hides the link

- **GIVEN** an encounter loaded into the detail page with
  `status: EncounterStatus.Draft` and `gameSessionId: undefined`
- **WHEN** the page mounts
- **THEN** no button with the test id
  `'encounter-watch-replay-link'` SHALL be present in the
  rendered DOM

#### Scenario: Click navigates to the replay route

- **GIVEN** the Watch Replay button is visible for an encounter
  with `gameSessionId: 'session-abc-123'`
- **WHEN** the user clicks the button
- **THEN** `router.push` SHALL be called with the literal
  string `'/gameplay/games/session-abc-123/replay'`
- **AND** the call SHALL go through `next/router`, not a raw
  `<a href>` browser navigation

#### Scenario: Button hides immediately when encounter is unlaunched

- **GIVEN** an encounter that was previously launched and then
  had its `gameSessionId` cleared (e.g. a test scenario or a
  future un-launch flow)
- **WHEN** the page re-renders with `gameSessionId: undefined`
- **THEN** the Watch Replay button SHALL no longer be visible
- **AND** the page SHALL NOT throw or warn about a missing
  `gameSessionId`
