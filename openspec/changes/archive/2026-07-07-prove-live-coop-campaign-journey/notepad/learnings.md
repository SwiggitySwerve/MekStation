# Learnings — prove-live-coop-campaign-journey

Conventions & patterns discovered during execution. Orchestrator (Atlas) writes; subagents read.

## Confirmed at kickoff (Atlas)

- **CO1 classes are transport-agnostic (task 1.1 orchestrator flag — RESOLVED).** `src/lib/multiplayer/server/CampaignMatchHost.ts`, `CampaignSyncSession.ts`, `CampaignGmArbiter.ts` already live under `src/lib/multiplayer/server/` and import ONLY from `@/lib/campaign/sync/*`, `@/types/*`, and `@/lib/p2p/roomCodes`. No `window`/`document`/`localStorage`/`react`/`zustand`/`BroadcastChannel` refs. `roomCodes.ts` guards `crypto` with `typeof crypto !== 'undefined'` — safe in Node 22 (global crypto exists). **No extraction needed** — build the server registry directly on top of these classes.
- **Reference registry pattern:** `src/lib/multiplayer/server/MatchHostRegistry.ts` — process-local `Map<string, ServerMatchHost>`, `getOrCreate`/`get`/`closeMatch`/`_reset`, module singleton via `getMatchHostRegistry()` + `_resetMatchHostRegistry()` for tests. CampaignHostRegistry (task 1.1) mirrors this shape.
- **Reference socket binding:** `src/lib/multiplayer/server/bindMultiplayerSocketConnection.ts` — the pattern `bindCampaignSyncConnection` (task 1.3) mirrors.
- **Reference two-context E2E:** `e2e/multiplayer-live-vault-auth.spec.ts` — `openContextPage(browser)` helper, two `browser.newContext()`, vault-auth. Task 5.1 models on this.
- **Reference socket integration test:** `scripts/validate-multiplayer-dev-socket.mjs` — real `ws` client spawning `server.js`. Tasks 1.3/1.4 model on this.
- **Mirror store:** `src/lib/p2p/campaignMirrorStore.ts` (NOT under src/stores). Its action is `applyEvent` which calls the `applyCampaignEvent` reducer internally — do NOT invent a new API to match task 2.3's acceptance wording ("applyCampaignEvent").

## Repo execution constraints (bake into every delegation)

- **Codex UNAVAILABLE on this drive (confirmed at kickoff, Atlas).** `codex exec --sandbox danger-full-access` hung with zero output on a trivial read-only probe (>90s, killed). Matches repo memory "Codex sandbox BLOCKED on E:\ drive." Per team-lead fallback instruction, ALL implementation routes to direct subagents (`omo-hephaestus`, sequential — parallel hephaestus fan-out has FAILED on this repo, one task at a time).
- Pre-commit runs full `next build` (~3–5 min) — commit via background shell, never foreground-block.
- After any spec/validator edit: run oxfmt + the affected validator + its jest wrapper (double-quote formatter hook vs oxfmt single-quote race breaks token-matching QC validators).
- jest+babel silently passes wrong enum members — the envelope decoder's runtime exhaustiveness assertion (task 1.2) is the guard; its test MUST feed an unknown kind.
- No new combat `GameEventType` members. Campaign frame kinds are a separate union.
- Git: feature branch (feat/prove-live-coop-campaign-journey) → PR → merge to main. Never push to main. Verify PR state==MERGED before proceeding past a merge gate.
- Never add AI attribution to commits/PRs.
