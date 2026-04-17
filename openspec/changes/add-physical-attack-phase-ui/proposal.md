# Change: Add Physical Attack Phase UI

## Why

`implement-physical-attack-phase` brings the Physical Attack phase body to life in the engine — punches, kicks, charges, DFAs, pushes, and clubs — but provides no player surface. `add-attack-phase-ui` explicitly marks physical-attack UI as a non-goal (see `add-attack-phase-ui/proposal.md:51`), so players who reach the Physical Attack phase currently have no way to declare a physical attack. For the Phase 1 MVP ("I can play a full match to a decisive outcome"), hand-to-hand combat is part of what "full match" means — a 4-mech skirmish without the ability to punch a lower-BV crippled target is an incomplete experience. This change adds the missing declaration surface that binds to the engine's `PhysicalAttackDeclared` event path.

## What Changes

- During the Physical Attack phase, the action panel adds a "Physical Attacks" sub-panel beneath the weapons list (the weapons list is grayed out in this phase since weapon attacks have already resolved)
- The sub-panel shows eligible physical attack types for the selected unit given restriction rules from `physicalAttacks/restrictions.ts`: punch (if arm didn't fire), kick (if leg actuators intact), charge (if attacker ran this turn), DFA (if attacker jumped), push (adjacency + facing), club (if melee weapon equipped)
- Each row shows the attack type, target (adjacent enemy selected by the player via a target-lock interaction mirroring the weapon-attack flow), to-hit breakdown, damage, and any attacker self-risk (charge damage to self, DFA miss → attacker fall)
- A "Declare" button on each row appends `PhysicalAttackDeclared` with `{attackerId, targetId, attackType, limb?}`; the engine's resolution step (from `implement-physical-attack-phase`) fires when both sides lock
- A "Skip Physical Attack" affordance closes the phase for the Player side without declaring anything — important because most turns a mech won't be adjacent to an enemy
- The to-hit forecast modal (from `add-attack-phase-ui`) is reused with a `PhysicalAttackForecast` variant that lists physical-specific modifiers (actuator damage, TMM, piloting skill, attack-type base, prone target bonus/penalty)
- Visual feedback: charge and DFA declarations render an arrow from attacker to target on the map; push declarations show the displacement direction as a ghost hex
- Restriction violations are surfaced inline in the sub-panel with a disabled row + tooltip citing the rule (e.g., "Right arm fired LRM-10 — cannot punch this turn")

## Dependencies

- **Requires**: `implement-physical-attack-phase` (the engine side must exist or there is nothing for this UI to declare against), `add-interactive-combat-core-ui` (action panel is where the sub-panel lives), `add-attack-phase-ui` (reuses the target-lock and forecast-modal patterns)
- **Required By**: `add-damage-feedback-ui` already handles the damage feedback when physical attacks resolve — no additional downstream dependency

## Impact

- **Affected specs**: `tactical-map-interface` (ADDED — physical attack sub-panel contract, declaration interaction, charge/DFA arrow overlays, push displacement ghost), `physical-attack-system` (MODIFIED — surfaces UI-facing projection of eligible declarations per unit)
- **Affected code**: `src/components/gameplay/ActionBar.tsx` (extend with physical sub-panel), new `src/components/gameplay/PhysicalAttackForecastModal.tsx` (or extend the existing `ToHitForecastModal` to handle both variants), `src/stores/useGameplayStore.ts` (`physicalAttackPlan: {attackerId, targetId, attackType, limb?} | null`), new `src/components/gameplay/overlays/PhysicalAttackIntentArrow.tsx` for charge/DFA visual preview
- **Non-goals**: multi-target physical attacks (physical is always single-target), AI-driven physical declarations (those are in `implement-physical-attack-phase` task 11), the physical-attack resolution animations themselves (`add-damage-feedback-ui` already covers damage feedback; charge/DFA collision animations may land with `add-damage-feedback-effects` in Phase 7)
- **Accessibility**: same colorblind cues as weapon attacks — intent arrows use both color + arrowhead shape + dashed pattern so they remain distinguishable without hue
- **Database**: none
