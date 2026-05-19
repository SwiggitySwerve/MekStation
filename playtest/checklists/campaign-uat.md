# Campaign UAT Checklist — Phase 3

Run against `npm run dev` on `http://localhost:3600`. **Largest surface — Wave 4 was 5 changes (persistence + combat loop + bay UI + command UI + refit/prestige). Expect the most defects here.** File to `playtest/ISSUES.md`.

## Happy-path: full 5-mission campaign

- [ ] New campaign creates with a starting force (4-unit lance + initial pilots)
- [ ] Contract list loads with at least 3 contracts of varied difficulty
- [ ] Accept one contract → contract status flips to "active" → mission becomes launchable
- [ ] **Personnel UI** — hire a pilot from the available pool; pilot appears in roster; XP/skills/portrait render
- [ ] **Personnel UI** — assign hired pilot to an empty mech bay; assignment persists on navigation away + back
- [ ] **Mech Bay UI** — load/unload a mech; repair queue accepts a damaged mech; estimated repair time shown
- [ ] **Mech Bay UI** — configure a refit (swap a weapon); refit queue accepts; cost + time shown
- [ ] **Medical Bay UI** — injured pilot listed; recovery time visible; healing tick advances on day advance
- [ ] **Salvage Bay UI** — post-mission salvage list renders; selecting an item credits it to the bay
- [ ] **Finances UI** — P&L view shows positive contract payout − negative monthly burn
- [ ] **Finances UI** — contract payout posts on mission completion; monthly burn deducts at month rollover
- [ ] Launch mission → either:
  - Full combat (browser-driven): proceed as in [SP UAT](sp-uat.md), then return to campaign
  - Auto-resolve: confirm auto-resolve outcomes persist to campaign state
- [ ] After mission: XP awarded to surviving pilots; damage applied to surviving mechs; ammo expenditure recorded
- [ ] Repeat 5 missions; verify no state corruption, no orphaned bay entries, no double-counted finances
- [ ] **Refit** — start a refit on an idle mech; refit completes after time elapses; mech reflects new loadout in subsequent mission
- [ ] **Prestige** — accumulate prestige to a threshold; confirm rank/reputation change applies; new contract types unlock

## Edge variants

- [ ] **Bankruptcy** — drain funds (skip contract payments, max monthly burn); confirm bankruptcy modal / game-over state matches spec
- [ ] **Pilot KIA** — let a pilot die in combat; confirm body lost, mech becomes vacant, can re-assign or hire replacement
- [ ] **Mech totaled** — destroy a mech beyond salvage threshold; confirm bay slot freed; insurance / replacement flow
- [ ] **Refit interrupted** — start a refit, launch a mission, return; verify refit state survived
- [ ] **Repair queue overflow** — queue 8+ repairs; UI must scroll or paginate, not break

## Server-restart durability (server-side persistence test)

- [ ] Mid-mission: kill the dev server process (`Ctrl+C` on `npm run dev`)
- [ ] Restart: `npm run dev`
- [ ] Refresh browser → campaign state survives (roster, finances, in-flight contracts intact)
- [ ] **Known limitation** — `InteractiveSession.fromSession()` rebuilds with empty adapted-units arrays. If a recovered mission can't be resumed for full move/attack play, **log as gap in `CLOSEOUT.md`, do NOT file in ISSUES.md.**

## Asserts (manual observation)

- [ ] No Zod validation toasts at any bay UI
- [ ] All currency / XP / time deltas reconcile when navigating between UIs (no "stale view" bugs)
- [ ] Cascade-on-force-delete: deleting a force properly cascades to encounters / replays without orphans (per the [repair-broken-encounter-drafts](../../openspec/specs/) project memory)
- [ ] Encounter→Replay browser hook fires when finishing a campaign mission; replay appears in library tagged with `encounterMeta`

## Sign-off

- [ ] Final-pass timestamp: `____________`
- [ ] Defect count filed in `ISSUES.md`: `____________`
- [ ] Gaps logged for `CLOSEOUT.md`: `____________`
