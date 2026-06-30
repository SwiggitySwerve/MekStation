# Council Decision — Command-Screen Focus Hierarchy Doctrine

> OMO Council (Lean+, 5 seats: Oracle, Hephaestus, Librarian, Explore-Deep, Momus + Phase-0 Metis). 2026-06-30.
> Question: "What is THE focus on each screen? What supports/borders it? Un-wrap the clutter into principles."

---

## HEADLINE

A command screen has **exactly one FOCUS region** — but the screens split into **two archetypes** that decide what "supporting" means. **Classify the screen first; then apply.** The recurring clutter exists because the team's current sense of "primary" is inverted (the tactical hex map was literally the smallest element on the combat screen), so a focus doctrine applied without the archetype classification will *systematize* the wrong instinct — collapsing the very instruments the BattleTech task depends on.

---

## THE DECISION RULE (Oracle)

> **A command screen is built around its primary OBJECT; the primary ACTION is anchored to the edge of that object and reads its enabled-state from the same source of truth the object renders — the action never floats in a separate half, and is never the smallest load-bearing element.**

- **Object-first for layout, action-first for prominence.** The object owns the largest, most central region (it is what the screen *is*). The action is the single highest-contrast control *on the border of that region*, co-located so eye and decision land together.
- **State-derived action.** The action's enabled/label state comes from the same object it acts on — not hand-styled (this is what kills the "bright CTA whose state contradicts the object" class of bug).

## THE ARCHETYPE SPLIT (Momus — the deciding correction)

| Archetype | Screens | What "supporting" means |
|---|---|---|
| **Single-action** | Starmap, Mission Launch, GM-Ledger (GM approve) | One decisive CTA. The object + its metrics frame it. **Exception (one-shot irreversible commits):** the consequence metrics are the *commitment contract*, placed between object and action — never demoted to "border." |
| **Simultaneous-instrument** | Refit Customizer, Tactical HUD | FOCUS is the *work surface* (editor tab body / hex map), but a persistent **instrument cluster** (stat strip / heat+armor+pilot) is **CO-PRIMARY and always glanceable — NOT chrome, never collapsed to hover/drawer.** |

**Why this matters:** the refit stat strip *is* the cognitive instrument — the user is solving a tonnage/slots/heat/BV constraint problem and evaluates every edit against it in real time. The tactical action dock + heat/armor are where turn decisions are *made* (a 5-hex run may overheat — you must see heat while path-planning). Demoting either "to satisfy the layout rule" produces a beautiful screen you cannot actually play on.

## THE ZONE TEMPLATE (Oracle, refined by Momus)

Every control must declare its zone before it ships. No zone → it doesn't ship.

| Zone | Belongs here | Must NOT contain |
|---|---|---|
| **FOCUS** | The one primary object/work-surface — largest, centered, `flex-1`. | Chrome, dead margin. If FOCUS doesn't dominate, the screen is broken. |
| **INSTRUMENT** *(simultaneous-instrument screens only)* | The co-primary always-visible scoreboard (refit stat strip; tactical heat/armor/pilot). | — (it is never demotable to AMBIENT). |
| **CONTEXT-FRAME** | Read-only state the action depends on — itinerary metrics, readiness warnings, ledger rows. One bordering rail, one source object. | Duplicate controls; a *second* primary action; metrics from a stale/different source. |
| **PRIMARY-ACTION ANCHOR** | Exactly one highest-contrast CTA on the FOCUS border, state-derived. Inline point-of-need affordances (Assign pilot) adjacent to their warning. | A second competing primary; destructive verbs without danger+confirm separation; bright styling on a disabled/no-op state. |
| **AMBIENT CHROME** | Nav, breadcrumb, lenses, zoom/detail — all dimmer than FOCUS but ≥4.5:1. | Anything load-bearing; engine tokens / raw ids in player copy; color-only status. |

---

## PER-SCREEN APPLICATION

> Each row: ARCHETYPE · FOCUS · what frames it · top de-clutter moves (component-grounded; Hephaestus, with Momus must-preserve). Items already shipped on `feat/playable-command-visual-pass` are marked ✅.

### 1. Starmap — `starmap.tsx` + `StarmapDisplay.tsx` · **single-action (one-shot commit)**
- **FOCUS:** the reachability map (canvas). **Action:** `Approve travel`, anchored to the destination card, state-derived (✅ already disables to "Already at Luthien"). **Commitment contract:** the JUMPS/ELAPSED/ARRIVAL/FEES/UPKEEP/FUNDS grid — keep prominent between object and action; it is *not* border.
- **De-clutter:** ✅ system labels at zoom + faction legend in-view. Next: **MERGE** the top detail-status bar into the bottom-right zoom cluster (one control corner, reclaim canvas height); **SHRINK** the always-open faction legend to a collapsible pill; **MOVE** status off color-only — add a glyph (`!`/`▲`/`✓`) to node annotations for CVD.

### 2. Mission Launch — `launch.tsx` + `missionLaunchReadinessPanel.tsx` · **single-action**
- **FOCUS:** the unit-readiness list ("is my force deployable?"). **Action:** `Launch` (✅ amber badge + briefing aside already shipped). Badge is fully projection-derived (`launchReadinessVariant`/`launchReadinessLabel`) — safe to restyle without touching logic.
- **De-clutter (Momus: do NOT over-engineer — it's already right-sized):** **MERGE** the 3× redundant readiness echo (top badge + footer consequences + briefing "Readiness") to one authority; **SHRINK** `launchConsequences` to one line. **Real remaining bugs are data hygiene, not focus:** strip raw `mission-<epoch>` id from the subtitle; decide whether no-pilot should hard-block launch.

### 3. Refit Customizer — `CampaignRefitCommandBar.tsx` + `tabs/` · **simultaneous-instrument**
- **FOCUS:** the active editor tab body. **INSTRUMENT (co-primary, do NOT shrink — Momus):** the live stat strip (TONNAGE/BV/ENGINE/ARMOR/SLOTS/HEAT) — it is the scoreboard, always visible. **Action:** `Save refit order` (✅ already disables at 0-delta).
- **De-clutter:** **UNIFY** the stat-strip color ramp — today BV cyan / ENGINE orange / HEAT green is noise; use neutral tiles + one accent token only on the value *changed this session* (makes "what did I just change" the signal). **SHRINK** the command-bar context line (campaign/date/budget/rules/constraint) — keep `{N} build fields changed` prominent, move the rest to a tooltip; verify `formatCampaignDate` is fed a sliced date (not raw ISO). *(Current capture shows a correct 100-ton Atlas — the 50t fixture bug is largely resolved.)*

### 4. Tactical HUD — `GameplayLayout.*` + `TacticalActionDock/` + `HexMapDisplay.mpLegend.tsx` · **simultaneous-instrument**
- **FOCUS:** the hex map (✅ `min-h-[60vh]` shipped — keep pushing toward ~60-70% viewport). **INSTRUMENT (must stay glanceable WITH the map — Momus):** heat (current/total), armor front/rear, pilot G/P, phase label, MP used/remaining. **Action surface:** the single bottom `TacticalActionDock` (Explore-Deep confirms it is *one* clean grouped row, hotkeys inline).
- **De-clutter:** **MERGE the duplicate movement selector** — the dock's movement group AND the interactive in-map `mpLegend` both call `onMovementModeSelect`. Keep ONE. *(Open sub-decision: keep selection at point-of-action on the map and make the dock group a readout, OR vice-versa — flagged for implementation.)* **COLLAPSE** the `w-28` Map-Lens `LeftTray` behind a toggle on desktop (reclaim 112px of canvas). **De-leak:** map `Interactive: select_movement` → player copy. **Fix** the `E`/`E` hotkey collision (Evade vs Rotate Right).

### 5. GM Ledger — `GmCampaignInterventionControlPlane.tsx` · **single-action (GM) / read-only (guest)**
- **FOCUS (GM, 06/07):** the transaction-preview card (the live correction) + the **public/private two-column log — the duality IS the point; never collapse one log to a toggle (Momus).** **Action:** approve/commit the previewed correction.
- **De-clutter:** **MERGE** the 5 equal-weight preview buttons (merchant/repair/salvage/unit-reload/time) into one "Generate correction" + type selector (the action is "preview a correction"; type is a parameter). **SHRINK** the 4-card status bar — fold preview/approval-reason into the preview panel; keep balance + approval-summary standing. **De-jargon** the internal `family` token in player rows.
- **FOCUS (guest, 08):** the "GM authority required" wall + the player-only log (correctly redacted — nothing else to render).

### 6. Networked proof — dev E2E harness · **out of product scope**
- It is a test scaffold ("Networked Command E2E Proof"), not product UI — label it as such; do not apply product chrome doctrine.

---

## BACKING PRINCIPLES (Librarian — named sources)

1. One primary action per screen; rest secondary/tertiary *(Refactoring UI)*. 2. Three-tier button weight: filled/outlined/text *(Material 3)*. 3. Progressive disclosure — hide advanced controls *(NN/g)*. 4. **Map/canvas dominant at 60-70%; panels are literal margins** *(game-HUD; Fluent 2)* → validates the tactical/starmap canvas-fill. 5. Gestalt proximity/common-region chunking reduces *perceived* item count *(NN/g)*. 6. Whitespace is load-bearing — tight intra-group, wide inter-group *(Refactoring UI)*. 7. F/Z scan → primary action at the terminal scan point *(NN/g)*. 8. **Hide/disable non-applicable actions unambiguously rather than greying** *(Apple HIG)*. 9. **On dark themes use luminance steps, reserve ONE accent hue exclusively for the primary action** *(Material 3 dark)* — today amber/blue/green/orange compete; reserve amber for the single primary.

---

## SURVIVAL SCORE: **Intact — with one load-bearing guardrail**

The doctrine survives **only if each screen is correctly classified single-action vs simultaneous-instrument before any layout change.** Kill signal (Momus): the team's current "primary" instinct is already inverted, so without the archetype tag they will collapse the refit stat strip and the tactical heat panel "to satisfy the rule" and make the screens unusable. **Guardrail = the archetype column + the must-preserve lists above are mandatory inputs to every screen's implementation.**

## PRESERVED DISSENT

- **Refit stat strip (decided for Momus):** Hephaestus proposed FOCUS = editor body, *shrink the stat strip*. Momus refuted — the stat strip is the primary instrument. **Council adopts Momus**; the strip is co-primary (INSTRUMENT zone), not chrome. This is the single most important correction in the decision.
- **Tactical movement selector (open sub-decision):** both agree the dock-group and the map `mpLegend` duplicate the movement vocabulary; *which* surface becomes the single selector (dock readout vs point-of-action map control) is left to implementation, leaning toward point-of-action per Momus's "decisions happen at the map."
- **Audit drift:** several original audit findings are **already fixed** in current code (readiness amber badge, save-at-0-delta disable, inline Assign-pilot, the 50t→100t Atlas, screen-02 disabled CTA) — the doctrine must not re-prescribe them.
