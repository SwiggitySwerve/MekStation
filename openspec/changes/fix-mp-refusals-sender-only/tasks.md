## Implementation
- [x] Audit refusal producers and all Error readers before editing runtime code.
- [x] Bind sender-only replies to connection keys and centralize fixed refusal wording and diagnostic logging.
- [x] Cover refusal classes with player, opponent and spectator sockets; verify existing client behavior and rejection audit ordering.
- [x] Run and restore broadcast, raw-text and sender-plus-broadcast mutants.
- [x] Run allowed focused checks, document evidence and commit locally without pushing.
- [ ] C4 runs production multiplayer E2E.

## Audit filter and dead-key follow-up
- [x] Audit every timelineDigest reader; confirm comparisons stay within one viewer and committed head digests remain separate.
- [x] Replace earlier rejection-surface expectations with an explicit sender-only requirement, including GM viewers.
- [x] Filter rejected rows once in mapTimelineEntries for both timeline and export.
- [x] Prove sender and GM own-row access, unchanged committed events, and another player's later baseline and full export privacy over real-host SQLite.
- [x] Prove dead-key recovery resends the already rejected identity, receives the same refusal only on the new key, settles pending state, and retains exactly one audit row.
- [x] Kill and restore filter removal, wrong principal, GM exemption, and ReplayEnd resend-suppression mutants.
- [x] Run the full 28-suite selection plus history, HTTP, and audit guards with maxWorkers=2 (33 suites, 532 tests).
- [x] Complete changed-file formatting/lint, strict OpenSpec validation, guarded typecheck and release notes.
