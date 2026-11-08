## PR1: protocol and client

- [x] 1. Record failing protocol, session-hook and overlay regressions for the new reasons.
- [x] 2. Widen `MatchPaused.reason` to `peer-pending`, `gm-absent` and `opponent-fault`.
- [x] 3. Keep the reason in client pause state; invent no grace for a non-peer cause; word the pause error by cause.
- [x] 4. Show one sentence per cause in the pause overlay and the countdown only while a seat is pending.
- [x] 5. Kill the client grace and countdown mutants; run the full affected directories and gates.

## PR2: server producers and exits

- [x] 6. Record failing server regressions: fault, GM-absent, overlap, late join, seated retry, spectator join, forfeit.
- [x] 7. Build the pause snapshot by precedence; resume only when every cause clears.
- [x] 8. Broadcast on opponent fault and GM pause changes; send the snapshot to each joining socket.
- [x] 9. Retry a faulted opponent on a seated participant's join only.
- [x] 10. Lift the pause on forfeit only when it succeeds, then broadcast `MatchResumed`.
- [x] 11. Word the `MATCH_PAUSED` refusal by cause; document the pause contract in `TRANSPORT.md`.
- [x] 12. Kill the server mutants; run the full affected directories, integration, runner guard and gates.
