# Change: Add Quick Session Mode

## Why

Not all games need campaign persistence. Users should be able to:

- Play a quick skirmish without setting up a campaign
- Test unit designs in combat scenarios
- Play one-off multiplayer battles
- Learn the game mechanics without commitment

Quick Session Mode provides standalone games where units are temporary instances with no persistence beyond the session. History is tracked only for that session's timeline.

## What Changes

- Add "Quick Game" entry point separate from campaign games
- Create temporary unit instances (not linked to campaign)
- Track session-only events (viewable in game replay, not persisted long-term)
- Support same scenario generation as campaigns
- Skip campaign-specific features (repair, XP, etc.)

## Impact

- Affected specs: New `quick-session` capability
- Related specs: `scenario-generation`, `event-store`, `force-management`
- Affected code:
  - `src/pages/gameplay/quick/` (new)
  - `src/stores/useQuickGameStore.ts` (new)
  - `src/services/game/`

## Dependencies

- `scenario-generation` spec (for OpFor generation)
- `force-management` spec (for player force selection)

## Sequencing

Can be developed in parallel with campaign features. Uses same scenario generation infrastructure.
