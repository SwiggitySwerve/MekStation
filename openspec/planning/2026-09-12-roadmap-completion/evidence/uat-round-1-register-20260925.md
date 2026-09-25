# UAT round 1 register

Owner decision `OD-uat-two-rounds`. Build: tag `uat-round-1-20260923` (commit `668ed250f`), both journal flags off, a fresh database. Start it with `npm run build` then `npm start` (port 3600).

The owner adds findings below as they come up. At the end of the round the parent runs one triage pass that sorts each finding into: fold into an existing unit, new unit, an owner packet, or not a defect.

## Known issues carried in (entry gate, 2026-09-25)

1. GM rewind is unreachable on production defaults, and its refusal message ('Play a turn first') never becomes true until the combat journal flip. Round 2.
2. Rewind refuses matches with fog of war (`src/pages/api/matches/[id]/rewind-preview.ts:187-195`).
3. In co-op matches either player can command any unit (U38).
4. The customizer's New Unit button opens the combined 'Add unit' dialog (create blank, configure new, or load from the library). This is by design; the automated audit journey is stale (U87).
5. A command sent while the other player is reloading is refused and the pause overlay shows; nothing is lost.
6. A co-op campaign update can occasionally arrive a few seconds late (measured once at 3.66 s); it is not lost. The cause is being measured (U89).
7. Unmeasured, from ledger text: the co-op host may need a reload to see approved proposals (U56); networked tokens may start stacked at hex {0,0} facing North (U37); GM correction controls are rough (U36); refused or dropped sessions give poor messages (U50).
8. Single user on localhost only: the campaign routes check no credential.
9. Hosting a co-op match from a campaign whose units were added through the campaign creation page is refused (the create request answers 400): the request carries each unit's pinned library version and the server's body check does not know that field. Traced in code on 2026-09-25, not yet run live; a campaign created with an empty roster is not affected (U88).
10. A GM intervention approved on the co-op host's GM Ledger changes only the host's own campaign; the guest never sees it, and a funds correction on the host is undone by the next co-op update. Traced in code on 2026-09-25, not run live (U92, after the journal flip).

## Findings

| # | When | Journey | What happened | Expected | Severity (owner) |
|---|---|---|---|---|---|
