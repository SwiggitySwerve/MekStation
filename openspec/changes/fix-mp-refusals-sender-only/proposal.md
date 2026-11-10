# Private hosted match refusals

## Why
Refused hosted match intents currently broadcast the attempted intent ID and raw diagnostics to opponents and spectators.

## What Changes
- Reply to the initiating connection only, including lobby, branch admission and journal authority errors.
- Keep existing Error codes and envelope shape; use one fixed reason per code and log diagnostic details server-side with match and intent IDs.
- Preserve rejection audit ordering, successful lobby/event publication, reconnect and fog admission.

## Impact
Affected capability: multiplayer-server. No wire schema, event digest, recording or fixture changes. C4 supplies production multiplayer E2E after local verification.
