# Expire match invitations at the store boundary

## Why

Match stores clear their lookup index when a lobby ends but retain its room code
in metadata. Campaign recovery can reopen that invitation. Duplicate codes also
have no database constraint, so lookup ownership can change silently.

## What Changes

- Share the server store rule that only lobby metadata retains a normalized code.
- Reject duplicate lobby codes atomically in both stores and retry generated-code
  collisions at creation, with at most five attempts.
- Backfill existing match files before readers receive the store and install a
  partial UNIQUE index. Earliest created_at, then match_id, retains a duplicate.
- Verify the existing hostless DELETE fallback continues closing the store.

## Impact

Multiplayer match metadata and the match store's separate SQLite file. No new
columns, events, wire fields or replay formats. Duplicate losers retain their
rows, seats and events but lose the invitation. Their hosts can recreate a lobby.

## Non-goals

P2P lifecycle, campaign warm-session admission, TTL policy, recovery quarantine,
engine behavior and construction parity.
