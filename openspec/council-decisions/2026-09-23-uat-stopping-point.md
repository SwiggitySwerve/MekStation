# Council 4 (2026-09-23): where the roadmap loop stops for user acceptance testing

Convened on the owner's question while U35f and U22a were in flight: scope what remains, answer the questions we can foresee, and find a stopping point on the implementation where UAT can start. The variant was Lean+: Metis alone in Phase 0, then Hephaestus, Oracle, Librarian, Explore-Deep and Momus in one message, a cross-attack round with both proposers, and two independent omo-judge passes (both VERIFIED). The parent measured every deciding fact below in the session, and inferences are labelled.

## Headline

UAT round 1 starts now on a pinned production build with both journal flags off. The pin is U35f's merge `668ed250f`.

The rewind chain that was in flight (U22a, U22) changes nothing a tester on production defaults can reach. The one in-flight unit that touched round 1's centre was U35f's co-op refresh, and it went into the pin only after its review measured no loss on today's co-op campaigns.

## Decision (owner answers of 2026-09-23, all "(Recommended)")

1. **Round 1 configuration: production flags only.** `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED = false` (`src/lib/campaign/sync/JournalCampaignEventStore.ts:86`). `COMBAT_JOURNAL_AUTHORITY_MODE = 'off'` (`src/lib/multiplayer/server/matchJournalAuthority.ts:20-21`), and the combat mirror returns at `src/lib/multiplayer/server/DurableMatchStore.ts:1000`. GM rewind is therefore unreachable in round 1: every real match refuses with "no authoritative history". No fixture-armed or `NEXT_PUBLIC_E2E_MODE` build counts as acceptance.
2. **Round 1 pin: after U35f, because its review was clean.** U35f's Lane A measured the host keeping the co-op spend (950,000) on a snapshot-authority co-op campaign in three cases: nothing queued, a save in flight, and after a 409 rollback. The review is `.sisyphus/roadmap-completion-20260912/u35f-lane-a-review-20260923.md` (APPROVE). The owner ruled the head, and U35f merged as `668ed250f`, the round 1 build.
3. **U35d, the campaign journal flip: strictly round 2.** Round 2 starts only when U35d and the combat journal chain (U23, U43, U24, U44) are on main, so no round tests a half-flipped app.
4. **The loop during round 1 keeps going fully on main.** The tester stays on the pinned build, and triage re-checks each finding against the current head.
5. **UAT findings: one triage pass per round** into a UAT register under `openspec/planning/2026-09-12-roadmap-completion/evidence/`. Each finding is sorted into a fold into an existing unit, a new unit, an owner packet, or not a defect.
6. **Round 2 database: fresh for acceptance, plus one carried-over round 1 database.** The carried-over database shows what happens to campaigns created before the flip.
7. **Scope housekeeping.** PK-u2b-ruling closes as superseded: U2b's rows moved to U2c and U22. The repo split (U63 to U85) and the loop-hygiene units never gate a UAT round.
8. **Round 1 entry gate, on the pinned commit.** It runs `npm run qc:ux-audit:prod` (10 journeys) and `npm run verify:qc:coop-campaign-journey` (CAMP-01), including the legs OD-grants-403-console-sweep still owes. It also runs the ladder groups that do not arm the journal fixtures. A critical any of them reproduces blocks the pin or goes on the known-issues list.

## Round 1 for the owner

**Start the app:** run `npm run build` then `npm start`, which is `node .next/standalone/server.js` on port 3600 (`package.json:16`, `server.js:392`). The standalone runtime forces production mode (`server.js:56-57`), and with it the durable match store (`src/lib/multiplayer/server/getDefaultMatchStore.ts:56-61`). Use a fresh database.

**Journeys:**
- construction and the compendium
- a quick game to auto-resolve
- the single-player campaign loop
- a co-op campaign in two browser profiles
- a GM two-player tactical match without rewind
- first visit, empty states and mobile

The automated journeys that mirror them are in `e2e/ux-walkthrough-audit.spec.ts` (:27, :88, :166, :235, :314, :397, :558) and `e2e/ux-deep-play-audit.spec.ts` (:986, :1135, :1295).

**Known issues to carry in** (verified unless marked):
1. Rewind always refuses on production defaults, and its message ("Play a turn first, then ask again", `src/components/multiplayer/gmRewindPreviewPhrasing.ts:94`) never becomes true until the combat flip.
2. Rewind refuses matches with fog of war (`src/pages/api/matches/[id]/rewind-preview.ts:187-195`).
3. In co-op matches, either player can command any unit (`src/lib/multiplayer/server/ServerMatchHostIntent.ts:548-552`). U38 fixes it.
4. Campaigns stay on snapshot authority, the production default. U35d is the flip.
5. Unverified, read from the code: after a server restart, a co-op host rebuilds from the campaign's creation-time state (`src/lib/multiplayer/server/CampaignHostRegistry.ts` near 372-387).
6. Unverified, from ledger text:
   - the co-op host may need a reload to see approved proposals (U56);
   - networked tokens may start stacked at hex {0,0} facing North (U37);
   - GM correction controls are rough (U36);
   - refused or dropped sessions give poor messages (U50).
7. The app is single-user on localhost: the campaign routes check no credential (the OB-2 decision).
8. The 2026-07-07 playtest criticals were fixed and archived in #1013 through #1018. The round 1 pre-flight re-checks them live, because the base UX journeys last ran on 2026-07-10.

**Out of round 1:** GM rewind and correction, anything fixture-armed, the repo split, and the loop-hygiene units.

## How the council got here

- **Phase 0, Metis.** The repo already has UAT-shaped harnesses (qc:ux-audit, the CAMP-01 journey, the E2E ladder groups). Metis added that the owner's acceptance ruling already excludes gated rows, so UAT need not wait for the whole ledger. Two of its claims were wrong and were corrected by Explore-Deep. U63 comes after the cutover (OD-repo-split-boundaries-in-place, sub-decision 3), and PK-u2b-ruling was moot.
- **Phase 2.** Hephaestus proposed waiting for U35f, U22a and U22, with a fixture-armed rewind preview. Oracle proposed two rounds without waiting for U22. Librarian brought outside practice: gate on defect severity, keep a known-issues list, test the configuration that ships, and keep trunk moving under a pinned build. Explore-Deep established the facts above.
- **Momus's objection.** E2E-25, the row U22a and U22 target, runs only in the privacy-pack ladder group. That group forces both journal flags on (`scripts/qc/gm-two-player-campaign-core.cjs:204-206`, `:234-239`), so waiting for the rewind chain buys nothing a production-default UAT can see.
- **Phase 3.** Both proposers accepted the objection and dropped the rewind preview. Oracle moved to pinning the current main at once. Hephaestus kept one condition: U35f's refresh runs on every co-op host, so it goes in only with its store fix and no loss on snapshot-authority campaigns.
- **Where it ended.** The owner took the conditional pin. U35f's Lane A then measured the condition as met.
- **Survival Score: Modified.** The Phase 2 frontrunner, waiting for U22a and U22, was killed. The fixture-armed preview was dropped. The surviving plan is two rounds, with a round 1 shaped like "pin now", plus the U35f condition.
- **Dissent on record.** Oracle held that U35f adds risk without a production-default benefit. That dissent is settled by measurement, not overruled: U35f's review found no loss.

## Open risks and revisit triggers

- If the round 1 pre-flight reproduces a critical, fix it before the owner starts, or list it.
- If U35d's re-admission gate fails again, round 2 moves out.
- Round 1's co-op findings may need re-checking after U35d changes co-op authority.
- Inference, not measured: U22a's shared host registry may make the host's "close match" route end a live match (`src/pages/api/multiplayer/matches/[id].ts:120`). No UI caller was found, and it does not affect the round 1 pin.
