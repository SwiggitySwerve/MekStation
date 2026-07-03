# Tasks: attack-phase-intent-composer

## 0. Design ratification gate — COMPLETE (2026-07-02)

- [x] 0.1 ADR 0002 design pass with the user: OQ1 → target-first assignment; OQ2 → torso twist IN-COMPOSER (scope hinge accepted, ~⅓ larger wave); OQ3 → called shots + TAG/indirect consumed-as-is in v1; OQ4 → full replacement of the legacy weapon-attack surface; OQ5 → always-visible heat threshold chips
- [x] 0.2 ADR 0002 flipped to Accepted; decisions recorded in design.md (D6–D10); attack-intent terms added to `openspec/TERMINOLOGY_GLOSSARY.md`
- [x] 0.3 Phases below re-sized for in-composer twist (phase 3 gains twist recomputation wiring; phase 5 is now real scope, not a placeholder)

## 1. State foundation

- [x] 1.1 Add the `attackIntent` slice (assignments: weaponId→{targetId, mode}, focused working target, composed twist, derived volley) with pure reducers + unit tests
- [x] 1.2 Derived selectors: per-weapon legality (arc under composed twist / range / LOS / ammo / destroyed, with reasons), per-weapon forecast rows via `buildToHitForecast`, ledger totals (heat over banked, expected damage, volley probability), primary/secondary designation per assignment order
- [x] 1.3 `commitComposedVolley()` compiling intent (including the twist) into the preserved `attackPlan` contract + existing torso-twist declaration path; Hold Fire path; unit tests incl. compile-down equivalence with a hand-built legacy plan + twist

## 2. Composer band UI

- [x] 2.1 Composer band (weapon palette + ledger + resolver + twist control) mounted for the weapon-attack phase, reusing the movement composer's band layout/chrome patterns
- [x] 2.2 Weapon palette rows: name/location/mode selector, forecast columns, block-at-source rendering with reasons; secondary-penalty inline display per D5/D6
- [x] 2.3 Heat & Effect Ledger with always-visible threshold chips (D10)
- [x] 2.4 Volley Resolver: composed-volley summary, explicit Fire (disabled-with-hint until ≥1 legal assignment), explicit Hold Fire

## 3. Twist intent + map interaction (tactical-map-interface delta)

- [x] 3.1 Torso twist as an intent item (D7): twist control in the composer; arc gating and enemy-token feasibility visuals recompute live on twist change; un-twist restores gating exactly (Torso Twist Intent scenarios)
- [x] 3.2 Target-first map interaction (D6): enemy click focuses the working target; weapon toggles assign against it; primary/secondary target encodings replace the single target-lock ring (MODIFIED Target Lock Visualization scenarios)
- [x] 3.3 At-source feasibility visuals on enemy tokens while composing, twist-aware (ADDED Attack Intent Map Interaction scenarios)

## 4. Single attack authority

- [ ] 4.1 Dock weapon declare/fire commands route into composer state; context menus mirror (per the existing Context Menus Mirror Command Registry requirement)
- [ ] 4.2 Full replacement (D9): gate off `CombatPlanningPanel`'s weapon-attack content while the composer is active; absorb `ToHitForecastModal`'s confirm role; remove duplicated surfaces
- [ ] 4.3 Unit test: with composer active, no second surface can mutate `attackPlan` or declare a twist directly

## 5. Called shots / TAG / indirect pass-through (D8)

- [ ] 5.1 Verify existing called-shot and TAG/indirect sub-flows keep working with the composer active; their outputs render as opaque modifiers on forecast rows; regression tests for one called-shot and one indirect volley through the composer commit path

## 6. Verification battery

- [ ] 6.1 Unit + component suites for slice, palette, ledger, resolver, twist; compile-down equivalence tests
- [ ] 6.2 E2e + command-screen evidence re-anchor (screens exercising weapon attack), validators, `openspec validate --strict`
- [ ] 6.3 Full-loop browser check: compose (incl. twist) → fire → resolution events identical to a legacy-flow volley + twist for the same inputs
