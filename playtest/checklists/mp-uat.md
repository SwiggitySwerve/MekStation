# Multiplayer UAT Checklist — Phase 4

Two browser windows on the same machine, both pointing at `http://localhost:3600`. File defects to `playtest/ISSUES.md`. Feature gaps → `CLOSEOUT.md` "gaps".

## Smoke pass — two-window match

- [ ] Window A: lobby loads; "Create Match" form accepts a name + BV + scenario
- [ ] Window B: matchmaking browser shows A's match in the list within 5s
- [ ] Window B joins A's match → both windows show the match-lobby screen with both player names
- [ ] Both windows mark "ready" → battle map loads in sync on both windows
- [ ] Turn 1: A moves a unit; B sees the position update within 1s
- [ ] Turn 1: B fires a weapon; A sees the to-hit + damage resolution within 1s
- [ ] Play 4 alternating turns; no desync between the two windows' state
- [ ] Battle resolves to a winner; both windows see the post-battle summary; replay persists to the Replay Library on both sides

## Spectator pass

- [ ] Window C: matchmaking browser shows A↔B match with "spectator slot available"
- [ ] Window C joins as spectator
- [ ] C sees the same map state as A and B
- [ ] C's input is read-only — clicking units does NOT mutate game state for A/B
- [ ] C disconnects → A/B continue with no interruption
- [ ] A new spectator D can join mid-game and immediately see correct current state (no replay-from-start)

## Durability / kill+resume

- [ ] Mid-match (turn 2-3), kill the server process
- [ ] Restart `npm run dev`
- [ ] Both A and B's clients reconnect within 30s
- [ ] Match state survives: positions, damage, heat, ammo, current-turn pointer all correct
- [ ] **Known limitation** — recovered-session adapted-units may be empty arrays; if move/attack play breaks after recovery, log as gap, do NOT file in ISSUES.md
- [ ] Replay-from-recovery does NOT double-emit events in the event log

## Host migration

- [ ] Mid-match, disconnect Window A (close window or kill its tab)
- [ ] Confirm B sees the migration: either "B is now host" or "match ended (host left)" with a clear UI
- [ ] If migration happens: B's subsequent moves persist server-side; a new client joining sees B as host

## Rate-limit / abuse

- [ ] Window A rapidly spams an action (e.g. movement preview ×30 in 1s)
- [ ] Server rate-limiter rejects with a clear toast / status message
- [ ] No crash; game state unaffected by spam
- [ ] B's window does NOT see spurious phantom moves from A's rate-limited attempts

## Matchmaking browser polish

- [ ] Filter by scenario type works
- [ ] Filter by BV range works
- [ ] "Refresh" updates the list within 5s
- [ ] Closed matches drop out of the list within 30s (no ghost matches)
- [ ] Joining a match that has just closed shows a clear error, not a hang

## Asserts (manual observation)

- [ ] No WebSocket reconnection storm (browser DevTools → Network → WS tab; reconnections should be linear, not exponential)
- [ ] Server-side state diff/delta correctness across reconnects (no full-state thrash on each reconnect)
- [ ] Spectator seat enforces read-only at server boundary (server rejects any spectator-sourced mutation)

## Sign-off

- [ ] Final-pass timestamp: `____________`
- [ ] Defect count filed in `ISSUES.md`: `____________`
- [ ] Gaps logged for `CLOSEOUT.md`: `____________`
