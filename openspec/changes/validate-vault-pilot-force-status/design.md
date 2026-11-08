# Vault pilot and force status boundaries

## Decisions and ownership

`src/services/pilots/pilotStatus.ts` owns exact vault parsing and normal transition permission. `src/services/forces/forceStatus.ts` owns exact force parsing. Both read the existing enum definitions, contain no environment or database access, and can be imported by browser healing code. Repository boundaries enforce the rules so direct service/repository callers cannot bypass API parsing. API routes return 400 before invoking a mutation for invalid status input. Existing same-host enforcement remains in the custom server; it is protection against browser-mediated requests, not user authentication.

Normal vault operations refuse KIA to any non-KIA status. KIA to KIA and status-omitting edits remain valid. Other valid pilot transitions and all force transitions remain allowed. Existing healing errors and behavior are preserved in a separate consolidation commit before enforcement.

## Pinned MekHQ evidence and explicit exception

Read with `git -C E:/Projects/Personal/mekhq show e7adc2c:<path>`; full pin `e7adc2c6f3b17ec8ad243d30843e22207fe935e4`:

- [Person.java lines 1722–1732](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/personnel/Person.java#L1722-L1732): `changeStatus` explicitly accepts dead to living, clears the death date, emits a resurrection report, and logs the resurrection.
- [PersonnelTableMouseAdapter.java lines 2534–2575](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/gui/adapter/PersonnelTableMouseAdapter.java#L2534-L2575): the status menu offers implemented statuses; this path is not conditioned on GM mode.
- [PersonnelTableMouseAdapter.java lines 1092–1107](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/gui/adapter/PersonnelTableMouseAdapter.java#L1092-L1107): the manual status command calls `changeStatus` without a GM check; changing to Active does not require the retirement confirmation.

MekHQ therefore supports manual resurrection, rather than making KIA intrinsically terminal or enforcing admin-only resurrection in this path. Root explicitly approved a narrower normal vault PUT contract: return 400 for revival and leave an **explicit GM revive** operation as a follow-up. Do not claim this restriction is a universal MekHQ rule. That future operation needs deliberate authorization, audit history, and campaign/vault reconciliation; it is not implemented here.

## Vocabularies

- `PilotStatus`: reusable vault pilots (`active`, `injured`, `mia`, `kia`, `retired`).
- `CampaignPilotStatus`: campaign roster service and recovery, including Wounded/Critical and K1's Retired/Deserted. Sharing a spelling does not make the enums interchangeable.
- `PilotFinalStatus`: tactical outcome; post-battle processing maps it into campaign roster status, including Wounded/Unconscious to Wounded/Critical and Captured to MIA.
- `PersonnelStatus` is a broader personnel vocabulary with employment and death causes, separate from the three pilot-specific enums above.

This change adds no conversions or enum merger. Campaign death propagation needs a separate durable writer with journal, retry, rewind, and multi-campaign semantics. It is not a small change to the same vault writer and remains a follow-up.

## Caller and writer inventory

Verified on fetched main `05257e185c87aaa1d4141b58d7c69b59ab0c6e46` before implementation.

| Entry | Path and status behavior |
| --- | --- |
| Pilot API update | `pages/api/pilots/[id].ts` → `PilotService.updatePilot` → `PilotRepository.update`; parsing plus repository enforcement. |
| Pilot API creation | `pages/api/pilots/index.ts`, full/template/random → repository creation; hardcoded Active, no caller-supplied status. |
| Pilot wizard | `components/pilots/wizard/usePilotCreationWizardState.ts` → pilot store → POST; statblocks use `usePilotStore.api.ts` and are Active in memory. |
| Pilot detail | `pages/gameplay/pilots/[id].tsx` → `usePilotStore.api.ts` → PUT; covered by both boundaries. |
| Store wound/heal | `usePilotStore.skills.ts` → PUT with computed status; shared terminal guard preserves existing healing errors. |
| Service wound/heal | `PilotService.ts` → repository update directly; repository enforcement covers this path. |
| Campaign creation | `CreateCampaignPage.submit.ts` creates vault pilots through POST, then separate Active roster entries. |
| Campaign fast-forward | `fastForwardCombatRunner.ensureRealPilotIds` directly creates missing SQLite pilots; creation remains Active. |
| Campaign outcome, healing, journal and replica | `postBattleProcessor.helpers.ts` maps combat outcomes; `postBattleProcessor.ts` commits roster patches only. No vault-status propagation found. |
| Campaign auto-awards | `processors/autoAwardsProcessor.ts` → pilot store PUT with awards only; status-omitting updates stay valid. |
| Force API update | `pages/api/forces/[id].ts` → `ForceService.updateForce` → `ForceRepository.operations.ts`; parsing plus repository enforcement. |
| Force creation/clone | `pages/api/forces/index.ts`, creation UI and `ForceService.cloneForce` → repository creation; default Active remains unchanged. |
| Force detail | `ForceDetailPage.helpers.ts` → `useForceStore.apiActions.ts` → PATCH; campaign `useForcesStore` is a different store/domain. |
| Force assignment/validation | `ForceService.assignPilot`, `assignPilotAndUnit`, and `validateForce` use `ForceService.validation.ts`; unknown status is unavailable. |
| Import | `ImportService.importBundle` calls injected `handlers.save`; no production pilot/force saver found. The production customizer adapter handles units. No new saver is introduced. |
| Vault sync/version restoration | Generic registered apply callbacks in `SyncEngine`/`VersionHistoryService`; no production callback writing pilot/force SQLite statuses found. |
| Yjs vault content | `useSyncedVaultStore` stores generic content; no production pilot/force SQLite adapter found. |
| Interactive session, GameEngine phases/runToCompletion, QuickResolve, quick game, pre-battle auto-resolve, AI | No vault status writer found; tactical outcomes remain separate. |
| Multiplayer dispatch/journal authority, P2P translation, standalone simulation runner | No vault status writer found. No event or gameplay transition changes. |

## Existing-data cleanup: documentation only

No query or cleanup is run against user data by this change, and startup does not rewrite invalid rows. No migration or schema constraint is added.

For a later operator-approved cleanup, close writers, back up the database, and inspect a read-only copy. Inventory only ID and raw status from `pilots` and `forces` where status is NULL or not one of that domain's current enum values. Include SQLite `typeof(status)` to detect unexpected storage classes. Build the bound allowlist from `Object.values(PilotStatus)` or `Object.values(ForceStatus)`, rather than maintaining another executable list. Inventory any browser/content copy separately; it is not automatically authoritative for SQLite.

Review each invalid row against reliable history and explicitly choose its replacement. Never infer Active from an unknown status, campaign roster spelling, or wounds alone. Ambiguous rows remain unresolved and pilots remain unavailable for assignment. Test corrections on the copy, compare before/after rows and assignments, then perform a separately approved transactional correction against exact ID/old-status pairs with a rollback backup. Valid rows are untouched. A valid replacement supplied through the normal API can repair an invalid legacy status; omission preserves the raw value. No historical KIA is revived through normal PUT.

## Validation

Characterize all five healing statuses before and after consolidation. Add failing parser, API, repository, and force-availability cases before enforcement. Test all valid statuses, omitted status, invalid strings/types/null, KIA transition pairs, mixed-update atomicity, direct repository bypasses, valid repair of a legacy invalid row, creation/clone defaults, and unchanged healing.

Run and restore three deliberate mutants: remove KIA terminality; bypass invalid-status parsing; allow unknown pilot availability. Record the exact killing test and red/green evidence in tasks. Run full API, vault service, pilot service, force service, store, and integration directories; both TypeScript configs; lint ≤63 warnings; lint:units and its Jest suite; oxfmt; OpenSpec checks; and the unkeyable budget (≤57). New pure rule suites import no environment-reading module.
