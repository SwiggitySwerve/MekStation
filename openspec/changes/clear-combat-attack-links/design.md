# Attack link ownership

`src/utils/gameplay/attackLinks.ts` owns release of the represented grapple,
squad swarm and displacement relationships. Reducers and runner state commits
call its public functions; transport and rendering do not compute cleanup.

The refactor preserves optional-key presence and unrelated values. The behavior
change scans inbound references because a host has no reciprocal swarm list in
`IUnitGameState`. It changes only relevant units and relationships. Shutdown,
unconsciousness and a retreat declaration do not mean a unit left the field.

Cleanup is part of accepted exit transitions and direct destruction commits,
not an end-of-turn repair. Repeated exits remain idempotent. No extra events or
random rolls are introduced. Existing reducer latches remain authoritative.

Pinned rules and deviations are documented in
`src/utils/gameplay/ATTACK_LINK_RULES.md`. In particular, MekStation permits
grappled withdrawal today; preventing that remains separate work. C9 clears the
dangling relationship if that withdrawal occurs.

Validation records live in `verification.md`; external raw test logs are not
ledger entries. The only active-change ledger entry is `.ledger.json` here.
