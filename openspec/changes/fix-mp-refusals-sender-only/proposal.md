# Private hosted match refusals

## Why
Refused hosted match intents currently broadcast the attempted intent ID and raw diagnostics to opponents and spectators.

## What Changes
- Reply to the initiating connection only, including lobby, branch admission and journal authority errors.
- Keep existing Error codes and envelope shape; use one fixed reason per code and log diagnostic details server-side with match and intent IDs.
- Preserve rejection audit ordering, successful lobby/event publication, reconnect and fog admission.

## Impact
Affected capabilities: multiplayer-server and audit-timeline. No wire schema, event digest, recording or fixture changes. C4 supplies production multiplayer E2E after local verification.

## Earlier behavior reversed
The previous rejection viewer-surface test required a redacted rejected row for other players and a full row for the GM. This change reverses that specified behavior for sender-only refusal privacy. It refines canonical `Action Lifecycle Provenance Is Idempotent and Separate` and the active umbrella's `Audit Captures Action Provenance` / `Timeline and Export Use the Same Viewer Projection`: the sender may read their own rejected row, while other principals, including a playing GM, may not. Per-request timelineDigest values change with the returned content; no committed digest changes.

OPEN product question: should a referee who commands no side see players' refused attempts? The role model must distinguish a playing GM from a non-playing referee before granting that access. This is not a defect; audit rows remain in the operator-accessible store.
