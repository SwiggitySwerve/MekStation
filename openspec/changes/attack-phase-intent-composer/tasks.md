# Tasks: attack-phase-intent-composer

## 0. Design ratification gate (blocks all later phases)

- [ ] 0.1 Run the ADR 0002 design pass with the user: resolve OQ1 (assignment interaction shape), OQ2 (torso twist in/out of composer), OQ3 (called shots + TAG/indirect v1 placement), OQ4 (surface replacement extent), OQ5 (overheat guardrail presentation)
- [ ] 0.2 Flip ADR 0002 to Accepted; record resolved decisions in design.md; add attack-intent terms to `openspec/TERMINOLOGY_GLOSSARY.md`
- [ ] 0.3 Re-size phases 2–6 against the OQ resolutions (OQ2 is the scope hinge); update this task list if twist lands in-composer

## 1. State foundation

- [ ] 1.1 Add the `attackIntent` slice (assignments: weaponId→{targetId, mode}, working focus, composed-volley derivations) with pure reducers + unit tests
- [ ] 1.2 Derived selectors: per-weapon legality (arc/range/LOS/ammo/destroyed with reasons), per-weapon forecast rows via `buildToHitForecast`, ledger totals (heat over banked, expected damage, volley probability), primary/secondary designation per assignment order
- [ ] 1.3 `commitComposedVolley()` compiling intent into the preserved `attackPlan` contract (`setAttackTarget`/`togglePlannedWeapon`/`setPlannedWeaponMode`/`commitAttack`); Hold Fire path; unit tests incl. compile-down equivalence with a hand-built legacy plan

## 2. Composer band UI

- [ ] 2.1 Composer band (weapon palette + ledger + resolver) mounted for the weapon-attack phase, reusing the movement composer's band layout/chrome patterns
- [ ] 2.2 Weapon palette rows: name/location/mode selector, forecast columns, block-at-source rendering with reasons; secondary-penalty inline display per D5
- [ ] 2.3 Heat & Effect Ledger with threshold consequence chips per OQ5 resolution
- [ ] 2.4 Volley Resolver: composed-volley summary, explicit Fire (disabled-with-hint until ≥1 legal assignment), explicit Hold Fire

## 3. Map interaction (tactical-map-interface delta)

- [ ] 3.1 Click-assigns-target per OQ1 resolution; primary/secondary target encodings replace the single target-lock ring (MODIFIED Target Lock Visualization scenarios)
- [ ] 3.2 Arc/range/LOS at-source gating visuals on enemy tokens while composing (ADDED Attack Intent Map Interaction scenarios)

## 4. Single attack authority

- [ ] 4.1 Dock weapon declare/fire commands route into composer state; context menus mirror (per the existing Context Menus Mirror Command Registry requirement)
- [ ] 4.2 Absorb `ToHitForecastModal`'s confirm role; gate/replace `CombatPlanningPanel` weapon-attack content per OQ4 resolution; remove duplicated surfaces
- [ ] 4.3 Unit test: with composer active, no second surface can mutate `attackPlan` directly

## 5. Torso twist (scope per OQ2 — placeholder until phase 0 resolves)

- [ ] 5.1 If in-composer: twist as an intent item recomputing arc gating live; if out: assert composed volley invalidates cleanly on external twist

## 6. Verification battery

- [ ] 6.1 Unit + component suites for slice, palette, ledger, resolver; compile-down equivalence tests
- [ ] 6.2 E2e + command-screen evidence re-anchor (screens exercising weapon attack), validators, `openspec validate --strict`
- [ ] 6.3 Full-loop browser check: compose → fire → resolution events identical to a legacy-flow volley for the same inputs
