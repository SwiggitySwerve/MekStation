## 1. Tactical Command Contract

- [x] 1.1 Expand `GmTacticalCommandId` and GM referral command descriptors for Wave 5 combat intervention controls.
- [x] 1.2 Update combat-action support exclusion metadata so GM referee commands remain auditable but outside player BattleMech action validation.
- [x] 1.3 Add command registry tests proving GM mode exposes the expanded command family and non-GM modes hide it.

## 2. Preview Adapter and Domain Routing

- [x] 2.1 Extend the tactical preview adapter to accept optional combat correction and unit reload payload overrides.
- [x] 2.2 Map command IDs to the correct combat, unit-reload, or deferred economy ledger domains.
- [x] 2.3 Add blocked/manual-takeover guidance for commands that require detailed payloads before approval.

## 3. Combat Guardrails

- [x] 3.1 Reject no-op reposition/facing, damage/critical, heat/ammo, and turn-order corrections with explicit conflict reasons.
- [x] 3.2 Add regression tests proving incomplete corrections block before approval and meaningful payloads still preview/apply.

## 4. Validation

- [x] 4.1 Run focused GM intervention and tactical dock Jest tests.
- [x] 4.2 Run `openspec validate wave-05-gm-combat-intervention-controls --strict`.
- [x] 4.3 Run broader typecheck, combat gap, journey QC, logging QC, and all-spec validation before PR.
