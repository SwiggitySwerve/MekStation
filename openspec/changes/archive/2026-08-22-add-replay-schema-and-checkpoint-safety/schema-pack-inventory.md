# Replay Schema Pack Inventory

This inventory freezes the baseline ownership of every current replay discriminant at `d4ea98e4182380ce339bc71aa8712bec7adee744`. Combat names come from `GameEventType` in `src/types/gameplay/GameSessionCoreTypes.ts`; campaign names come from `CampaignEventType` in `src/types/campaign/CampaignSync.ts`.

| Task / PR | Domain | Count | Canonical discriminants |
| --- | --- | ---: | --- |
| 3 | Campaign | 7 | `CampaignDayAdvanced`, `FundsChanged`, `PilotHired`, `ContractAccepted`, `RosterUnitChanged`, `SalvageAllocated`, `CampaignSnapshotPublished` |
| 4 | Combat lifecycle / initiative | 8 | `GameCreated`, `GameStarted`, `GameEnded`, `TurnStarted`, `TurnEnded`, `PhaseChanged`, `InitiativeRolled`, `InitiativeOrderSet` |
| 5 | Combat movement / facing | 6 | `MovementDeclared`, `MovementInvalid`, `MovementLocked`, `RuntimeMovementStateChanged`, `MovementEnhancementActivated`, `FacingChanged` |
| 6 | Combat ranged / indirect | 13 | `AttackDeclared`, `AttackInvalid`, `AttackLocked`, `AttacksRevealed`, `AttackResolved`, `SpottingDeclared`, `IndirectFireSpotterSelected`, `IndirectFireSpotterLost`, `IndirectFireForwardObserver`, `IndirectFireNarcOverride`, `AmmoConsumed`, `AMSInterception`, `DesignatorMarkerApplied` |
| 7 | Combat damage / heat / critical | 12 | `DamageApplied`, `HeatGenerated`, `HeatDissipated`, `HeatEffectApplied`, `PilotHit`, `UnitDestroyed`, `AmmoExplosion`, `CriticalHit`, `CriticalHitResolved`, `LocationDestroyed`, `TransferDamage`, `ComponentDestroyed` |
| 8 | Combat physical / PSR / ground objects | 10 | `PSRTriggered`, `PSRResolved`, `UnitFell`, `UnitStuck`, `UnitStood`, `PhysicalAttackDeclared`, `PhysicalAttackLocked`, `PhysicalAttackResolved`, `GroundObjectPickedUp`, `GroundObjectDropped` |
| 9A | Combat vehicle / represented system state | 9 | `ShutdownCheck`, `StartupAttempt`, `NeuralInterfaceStateChanged`, `MotiveDamaged`, `MotivePenaltyApplied`, `VehicleImmobilized`, `TurretLocked`, `VehicleCrewStunned`, `VTOLCrashCheck` |
| 9B | Combat terrain / mission / morale / withdrawal | 13 | `CommandResultPublished`, `TerrainChanged`, `MinefieldChanged`, `EmpMinefieldEffectApplied`, `RetreatTriggered`, `UnitRetreated`, `UnitEjected`, `ObjectiveCaptured`, `ObjectiveLost`, `ObjectiveProgress`, `MoraleShifted`, `WithdrawalDeclared`, `ForcedWithdrawalTriggered` |
| 10 | Combat battle armor | 10 | `TrooperKilled`, `SquadEliminated`, `SwarmAttached`, `SwarmDamage`, `SwarmDismounted`, `LegAttack`, `LegAttackResolved`, `VibroClawAttackResolved`, `MimeticBonus`, `StealthBonus` |

The campaign total is seven and the combat total is 81. Each discriminant has exactly one baseline-pack owner. Task 11 MUST compare the live unions against this inventory and the composed registry; a new, removed, renamed, duplicated, or reassigned discriminant requires a reviewed spec-only inventory update before its schema-pack implementation begins. Pack PRs remain unwired from production replay until task 11 proves exhaustive composition.

## Amendments

- 2026-08-21 (reviewed spec-only update, per the rule above): `PhysicalAttackLocked` (`physical_attack_locked`) added to the task-8 combat physical row (9 -> 10; combat total 80 -> 81). The discriminant was added to `GameEventType` by PR #1130 (`fix(gameplay): complete physical attack activations`) AFTER this inventory froze at `d4ea98e4182380ce339bc71aa8712bec7adee744`; the task-11 live-union comparison caught the drift. It is a real produced-and-reduced event (`createPhysicalAttackLockedEvent` in `src/utils/gameplay/gameEvents/statusPhysical.ts`, reducer `applyPhysicalAttackLocked` in `src/utils/gameplay/gameState/actionLocking.ts`) with payload `IAttackLockedPayload` (`{ unitId }`) -- the same payload contract as the ranged `AttackLocked` already baselined in the task-6 pack. Owner: the combat physical pack (task 8's `CombatPhysicalBaselineSchemaPack.ts`); its v1 schema lands with task 11's composition PR, which is also the first PR after this amendment.
