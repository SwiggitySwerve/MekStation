## ADDED Requirements

### Requirement: Combat Outcome Pilot KIA Path Documented As Wave-5 Gated

The `ICombatOutcome.pilotState` field documentation (TypeScript JSDoc on the type definition in `src/types/combat/CombatOutcome.ts`) SHALL include a remarks block stating that the `'KIA'` value is unreachable in Wave 4 because no engine event flips `pilotConscious=false`, and pointing consumers to the Wave-5 pilot-event wiring change as the unblock dependency.

This requirement is documentation-only (no spec scenario test); it ensures downstream consumers (post-battle-review-ui, repair-queue-integration, roster processors) plan around the limitation rather than discovering it in production.

This requirement closes a Tier 4 audit finding on the keystone `ICombatOutcome` interface introduced by archived `add-combat-outcome-model`.

#### Scenario: ICombatOutcome JSDoc surfaces KIA limitation

- **WHEN** a contributor reads the `ICombatOutcome.pilotState` field in `src/types/combat/CombatOutcome.ts`
- **THEN** the JSDoc `@remarks` block states that `'KIA'` is currently unreachable
- **AND** the remarks cite `src/lib/combat/outcome/combatOutcome.ts:128-133` as the derivation site
- **AND** the remarks reference the Wave-5 pilot-event wiring change name (or the `wire-interactive-psr-integration` change if pilot consciousness events are folded into that work) as the unblock dependency
