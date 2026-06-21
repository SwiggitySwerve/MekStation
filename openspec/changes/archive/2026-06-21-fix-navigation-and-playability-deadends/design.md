# Design: Fix Navigation And Playability Dead-Ends

## Context

The audit's Cluster U findings share one shape: the navigation/affordance
surface promises a destination the implementation cannot honor, or hides real
capability behind a stub. None require new subsystems — every fix consumes
machinery that already exists (`listMatchLogs`, `GET /api/campaigns`, the
interactive session engine that `Watch AI Battle` already drives). The risk in
this change is over-building: adding a parallel hub framework, a second games
reader, or a campaign persistence layer when the existing ones suffice. The
design biases to the minimum that removes each dead-end.

The two findings that carry a genuine decision rather than a wiring task are
U-4 (Quick Game auto-resolve-only) and the multiplayer vault gate. Both are
recorded explicitly below with the chosen behavior AND the honest spec state.

## Decisions

### D1 — `/gameplay` resolves to a real hub index, not a redirect-to-child

`/gameplay` SHALL be a real index page that links the gameplay sub-surfaces
(Quick Game, Pilots, Forces, Campaigns, Encounters, Games, Multiplayer), not a
bare `router.replace` to one child. Rationale: the mobile bottom-nav "Gameplay"
tab (`MobileBottomNav.tsx:38`) and 17 breadcrumbs treat `/gameplay` as a
landing destination; a hub gives those a coherent target and a place to surface
the new Multiplayer entry. A redirect would still leave the breadcrumb trail
pointing at a passthrough with no content. The hub reuses the same nav item
definitions the sidebar already declares — no new route registry.

### D2 — Multiplayer entry is added to the existing `gameplayItems`, not a new section

The Multiplayer link SHALL be appended to the existing `gameplayItems` array in
`TopBar.tsx` and mirrored in `MobileBottomNav`'s menu, rather than creating a
new top-level "Multiplayer" nav section. Rationale: simplest-solution-first —
the Gameplay section already groups every play surface; multiplayer belongs
there. A new section would fragment the nav for one link.

### D3 — Games list reads `listMatchLogs`, demo data is removed entirely

The games list SHALL call `listMatchLogs()` (`MatchLogService.ts:135`) and map
`MatchLogSummary[]` to the list rows, with a real `EmptyState` when the reader
returns an empty array. `DEMO_GAMES` is deleted, not feature-flagged.
Rationale: a demo entry that masquerades as a real game is a false affordance;
keeping it behind a flag preserves the lie. The reader already exists and
returns the shape the list needs.

### D4 — Quick Game: relabel the auto path AND add an interactive Skirmish on-ramp (DECISION)

This is the change's one product decision. Quick Game today auto-fires
`startBattle()` on mount (`QuickGamePlay.tsx:100`) and shows a results table —
an auto-resolve, despite being advertised as the "learn the mechanics" path.
The decision is **both halves**, not one:

1. The existing auto path SHALL be explicitly labeled "Auto-Resolve" wherever
   it is offered, so the user knows the battle resolves without their input.
2. A low-friction interactive "Skirmish" on-ramp SHALL be added that launches an
   interactive session on the hex board (the same engine `Watch AI Battle`
   already drives, but with the human controlling one side) without requiring
   campaign/force setup.

Rationale: relabeling alone leaves the learner with no way to actually play;
adding interactivity alone leaves auto-resolve mislabeled. The honest spec
state is: auto-resolve is honestly named (a label change, fully implementable
now) and an interactive on-ramp exists (the engine already supports it via the
spectator path). The interactive on-ramp's *depth* (full turn UI parity with the
tactical shell) is bounded by the existing tactical-map surface — this change
guarantees the learner reaches the board, not that every advanced control is
present.

### D5 — Campaign list consumes `GET /api/campaigns`; store gains a switcher, single-campaign clobber removed

The campaign store SHALL stop treating `campaign` as the sole campaign slot for
list purposes: the list page SHALL source its entries from
`GET /api/campaigns` (`listCampaignSummaries`, `api/campaigns/index.ts:4`), and
the store SHALL expose a switcher action that loads a chosen campaign into the
active `campaign` slot rather than `createCampaign` overwriting it. Rationale:
the multi-campaign backend already exists and returns summaries; the bug is
purely that the list UI reads the single in-memory slot. The active-campaign
slot stays single (one campaign is "open" at a time) — only the *list* and
*switch* are added, which is the minimum that fixes the clobber.

### D6 — Campaign dashboard subscribes via selectors, mirroring the list page's prior fix

`CampaignDashboardPage` SHALL read campaign/roster/mission state through Zustand
selector subscriptions (e.g. `useCampaignStore((s) => s.getCampaign())`) instead
of `store.getState().getCampaign()` at render
(`CampaignDashboardPage.tsx:54`). Rationale: the list page already adopted this
pattern for the same bug class; reactivity is the correct fix, and the audit
explicitly notes the precedent.

### D7 — Onboarding is an entry point + glossary scaffold, not authored curriculum

The home surface SHALL gain a first-run onboarding/tutorial entry in
`navigationCards` (`index.tsx:23`) and an inline glossary surface defining core
jargon (BV, gunnery, piloting, heat, PSR). Rationale: the audit finding is
"no entry point and no glossary" — the minimum fix is the entry point plus a
glossary scaffold the player can reach. Deep tutorial content is deferred
(non-goal) so this change does not balloon into curriculum authoring.

### D8 — Multiplayer vault gate gains a setup path / guest affordance, transport untouched (DECISION)

The multiplayer entry page SHALL keep the vault-password gate
(`multiplayer/index.tsx:216`) but add (a) a link/route explaining how to set up
a vault identity and (b) a clearly-labeled affordance for the path forward when
the user has no vault yet. The decision is explicitly scoped to *self-explaining
the gate*, NOT changing the auth model. Honest spec state: the gate becomes
navigable and explained; whether a guest can actually play is governed by the
`multiplayer-server` truthfulness work (MP-1), out of scope here. The delta
therefore asserts the setup-path affordance, not a working guest session.

## Open Questions

(none)

## Risks

- **Quick Game interactive on-ramp scope creep (D4)** — the interactive Skirmish
  could be read as "build the full tactical command shell." Mitigation: the
  delta pins the requirement to "learner reaches the hex board with control of
  one side via the existing engine," not turn-UI parity; depth is a named
  non-goal.
- **Multiplayer entry implies working multiplayer (D8)** — adding nav + a setup
  path could be read as a claim that networked play works. Mitigation: the
  proposal Non-goals and the delta scope the change to reachability + gate
  explanation; the truthfulness cluster (MP-1/MP-2) owns the working-or-not
  claim.
- **Games list reader cost** — `listMatchLogs` is defaulted to a 50-row limit;
  if a player has many matches the list must paginate or cap. Mitigation: the
  delta requires the existing limit to be honored and an empty state, not
  unbounded rendering.
- **Dashboard reactivity regression** — switching to selectors can re-introduce
  the auto-save/dirty-bridge ordering the page installs after hydration.
  Mitigation: the task group requires the existing client-ready/auto-save
  bridge behavior to be preserved and re-verified.
