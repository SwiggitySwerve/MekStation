## Why

GM combat intervention runtime support already covers the major correction families, but the tactical command surface exposes only phase advance, damage, and a deferred economy action. Wave 5 connects the combat-first GM workflow to the existing ledger so a GM can preview and approve meaningful combat corrections without resetting an encounter or leaking private adjudication notes.

## What Changes

- Expand tactical GM command descriptors beyond the initial stubs to cover position/facing, damage, heat/ammo, initiative/turn order, lifecycle preservation/removal, attack-result correction, objective correction, unit reload, and resource correction.
- Route tactical GM combat commands through the existing combat intervention implementer with explicit command-to-correction mapping.
- Allow the tactical adapter to accept prefilled correction payloads from future focused dialogs while preserving safe defaults for quick command previews.
- Block incomplete no-op combat correction previews with clear conflict reasons instead of producing ready previews that change nothing.
- Keep resource correction deferred to the campaign/economy implementer and unit reload routed to the existing reload domain boundary.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `gm-tactical-command-surface`: The GM command surface exposes all Wave 5 combat intervention command families and produces ledger preview requests for each.
- `gm-combat-interventions`: Combat intervention previews reject incomplete no-op correction payloads with explicit conflicts.
- `gm-unit-reload-reconciliation`: The tactical GM surface includes an active-unit reload command that routes to the existing unit-reload intervention boundary.

## Impact

- `src/components/gameplay/TacticalActionDock/commands/gmReferralCommands.ts`
- `src/lib/interventions/GmTacticalCommandPreviewAdapter.ts`
- `src/lib/interventions/GmCombatInterventionPreview.ts`
- Focused Jest coverage for command descriptors, preview adapter routing, no-op rejection, and GM confirmation UI behavior.
- No new runtime dependency or BattleTech catalog dependency.

## Non-goals

- Building full GM data-entry dialogs for every correction family.
- Implementing economy/base corrections in the tactical combat slice.
- Replacing the existing unit reload reconciliation implementer.
- Changing normal player combat validation or BattleMech rules resolution.
