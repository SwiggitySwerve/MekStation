# after-combat-report Specification Delta

## MODIFIED Requirements

### Requirement: Post-Battle Report Screen

The post-battle report screen SHALL now render from `ICombatOutcome`
(superseding the original `IPostBattleReport`) and SHALL surface every
campaign-relevant dimension of the battle in a single page layout.

#### Scenario: Screen renders all required sections

- **GIVEN** a user navigates to `/gameplay/games/[id]/review` for a
  completed session
- **WHEN** the page finishes loading
- **THEN** the page SHALL contain an outcome summary header, one casualty
  panel per participating unit, one pilot outcome panel per participating
  pilot, a salvage panel (or empty-state), a contract status panel (when
  contract linked), and a repair preview panel

#### Scenario: Standalone skirmish omits contract panel

- **GIVEN** a review for a standalone skirmish (no `contractId` on the
  outcome)
- **WHEN** the page renders
- **THEN** the contract status panel SHALL NOT be rendered
- **AND** the salvage panel SHALL render with an empty-state message

#### Scenario: Return-to-campaign commits outcome

> DEFERRED to Wave 5: "marks reviewed in the session store" requires a
> `reviewed` flag on `useGameplayStore` that does not exist yet. The
> dequeue from `useCampaignStore.pendingBattleOutcomes` is the de-facto
> reviewed signal today — when the player clicks "Apply outcome" the
> outcome is removed from the queue, `applyPostBattle` is invoked, and
> the router pushes the campaign dashboard, so two of the three SHALL
> clauses are met. The session-store flag lands with the Wave 5
> session-lifecycle cleanup. (pickup:
> `src/pages/gameplay/games/[id]/review.tsx:218`)

- **GIVEN** a review page for an outcome not yet committed to the
  campaign pending queue
- **WHEN** the user clicks "Return to Campaign"
- **THEN** the outcome SHALL be appended to
  `campaign.pendingBattleOutcomes`
- **AND** the session SHALL be marked reviewed in the session store
- **AND** the router SHALL navigate to the campaign dashboard
