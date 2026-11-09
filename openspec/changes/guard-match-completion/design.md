## Context

P2P already appends GameEnded before marking metadata completed. Interactive single-player persistence appends without the completion step. The match-log storage module owns the shared ordering operation; callers retain their own error reporting.

## Decisions

- Extract the P2P operation without changing optional completion-port support or its rejection behavior, then adopt it for interactive events.
- Use the recorded GameEnded timestamp and match identity, rather than the current clock or route identity.
- Invalid quick-game completion calls are no-ops, including repeated calls after completion.

## Risks and Validation

Exercise delayed and rejected appends, rejected completion writes, metadata retention eligibility, and the quick-game state matrix. Run runner, replay/digest/golden and combat validation before and after engine changes. Stop if any committed fixture or digest changes.
