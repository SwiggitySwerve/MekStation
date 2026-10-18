# L2 (P3 exit / v2.3.0) fit-check preparation - 2026-10-18

Prepared for Root. **Recommendation: retain the registered B15-first chain; register the missing security and packaged-launch slices before admission, and re-freeze the older residual units on post-L1 Main. No L2 source unit is admitted by this report.** The controlling overlay leaves task contracts/caps intact and requires every mapped task letter plus exact-Main proof; its L2 row is tasks 58, 59, 61-66 and P2CER plus packaged Electron launch smoke. B15 is an additional L2/P3-exit group. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:13`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:95`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

## Snapshot, method and limits

L1 is still in progress: at this baseline B14-0B product has merged but its separate closure is pending, while U38 is blocked. No L2 state transition follows from this prep. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:1`, `openspec/planning/2026-09-12-roadmap-completion/units.json:10390`.

- Detached worktree: `E:/Projects/Personal/MekStation-wt/l2-prep-20261018`; HEAD `4d9eb7213449962d9285402f48416b9608868642` (local `origin/main` when created; descendant of requested `921ad8a1e`, checked with `git merge-base --is-ancestor`). The root checkout was read only for PLAN/STATUS and Git metadata; no fetch, commit, PR, dependency install, Jest, build, browser or packaged execution was performed. The only authored file is this report. These are observations of this research session, not new delivery receipts.
- File checks used literal filesystem paths; history checks used `git diff --numstat <registration-commit> HEAD -- <manifest leaves>`. B15 baseline is merged registration `c962217b`, PRIV baseline `21b490fd`, residual literal registration baseline `8a62fe84`. The underlying B15 design baseline is `e52000e3`, residual registration baseline `ba8007f2`; neither is a new runtime proof. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:178`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:96`, `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cer-registration-20261016.json:5`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23298`, `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:4`.
- Every file counts, including tests/evidence; U41 counts added product/spec/ledger lines with no deletion credit and exempts tests/generated/evidence lines. Existing file length is navigation data, **not** changed-line consumption. No proposed implementation exists here, so all implementation line fits remain UNMEASURED. Sources: `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.
- "Manifest" below distinguishes literal candidate leaves from directory ownership aliases. The B15 receipt explicitly says its full candidate union is **not an admission manifest**; freeze source/test/helper/lifecycle/evidence names before edits. The earlier residual registration also requires exact-file measured admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:192`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23313`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16634`.

## Verified inventory and task crosswalk

| Layer item                     | Actual ledger holder                            | Current state / significance                                                      | Source                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 58                             | U99                                             | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16133`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16117`                                                                                                                                                         |
| 59                             | U100                                            | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16181`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16165`                                                                                                                                                         |
| 61                             | U104                                            | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16333`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16317`                                                                                                                                                         |
| 62                             | U101a                                           | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16435`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16424`                                                                                                                                                         |
| 63                             | U101b                                           | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16488`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16477`                                                                                                                                                         |
| 64                             | U101c                                           | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16541`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16530`                                                                                                                                                         |
| 65                             | U101d                                           | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16595`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16584`                                                                                                                                                         |
| 65 aggregate                   | U101                                            | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16231`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16215`                                                                                                                                                         |
| 66                             | U105                                            | planned; no implementation receipts                                               | `openspec/planning/2026-09-12-roadmap-completion/units.json:16386`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16370`                                                                                                                                                         |
| B15                            | 11 units: 0, 1, 2, 4, 4J, 3R, 3, 5, 5R, PRIV, 6 | all blocked, documentary registration only                                        | `openspec/planning/2026-09-12-roadmap-completion/units.json:23617`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16845`                                                                                                                                                         |
| P2CER                          | registration, not a unit ID                     | already accepted/merged `08f917ef` (#2137); reconcile as done, do not reimplement | `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:956`; `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:958`; `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:960` |
| Packaged Electron launch smoke | no dedicated L2 holder in this inventory        | must register exact scope and acceptance before implementation                    | `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`; `.github/workflows/pr-checks.yml:978`; `desktop/scripts/test-build.js:297`                                                                                                                        |

This is **20 open ledger units** (11 B15 + nine residual/aggregate entries), one already-delivered registration and one unregistered smoke requirement. Task 60/U103 is not in the L2 row; I1-I4/P2CG2/P2CH/P2C are L1 prerequisites, not duplicated L2 work. Sources: crosswalk above; `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23477`.

## Per-unit manifests, blockers, review and fit

### B15-0

**State / contract:** blocked. Operator/member access contract: Document the operator versus active GM/player versus anonymous/stranger actor x all 17 campaign-method matrix, including conflict/omission disclosure, guest CampaignSnapshot projection, and the sensitive co-op session-create door. Operator administers every record in this single-operator deployment. Reconcile campaign-persistence and multiplayer identity requirements; preserve seatless solo U61. No owner column, schema migration or legacy quarantine. FN-ob2 owner-column/multi-operator clause remains open. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16618`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16628`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then U38 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16634`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16626`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 8 files / 275 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:158`. Candidate fits the static reserve; no split established. Keep spec-only classification only while documenting settled policy. Actual policy changes require reclassification. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16627`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `openspec/changes/design-campaign-authority-and-sync/design.md`; `openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md`; `openspec/changes/design-campaign-authority-and-sync/specs/campaign-access-projection/spec.md`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16622`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16623`.

| Literal candidate leaf                                                                         | Current check       | Source                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `openspec/changes/design-campaign-authority-and-sync/design.md`                                | 141 lines; exists   | `openspec/changes/design-campaign-authority-and-sync/design.md:1`                                |
| `openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md`       | 78 lines; exists    | `openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md:1`       |
| `openspec/changes/design-campaign-authority-and-sync/specs/campaign-access-projection/spec.md` | 39 lines; exists    | `openspec/changes/design-campaign-authority-and-sync/specs/campaign-access-projection/spec.md:1` |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`                                   | 24215 lines; exists | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`                                   |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-1

**State / contract:** blocked. Dormant operator session and policy seam: Add CampaignOperatorCredential from operator environment or protected data-dir file (0600 on POSIX; restrictive user ACL on Windows). POST /api/campaign-local-session consumes proof and issues a bounded HttpOnly SameSite=Strict cookie; Secure on HTTPS, explicit Origin/CSRF validation and no proxy-header authority. resolveActor/authorize live in campaignAccess.ts; valid self-issued bearer proves identity only. Electron passes the secret to its child and establishes the cookie with session.cookies before loadURL; no renderer IPC secret and no account/seat requirement. Development prints a secret-free local pairing link once; prove the secret in a POST, never URLs/responses/logs. No campaign route enforcement yet; dormant seam does not break callers. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16640`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16650`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-0 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16648`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 15 files / 455 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:198`. High fit risk: 15-file candidate / 455 estimated additions leaves no file slack and 45-line estimate margin. Secret provisioning, Origin/CSRF, renewal and Electron cookie setup need a measured prefix plan; split before admission if any new helper/test/artifact is needed. F1/F2 on existing auth routes are NOT discharged merely by a safe new local-session endpoint. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16649`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `server.js`; `desktop/electron/main.server.ts`; `desktop/electron/main.window.ts`; `desktop/electron/__tests__/main.server.test.ts`; `desktop/electron/__tests__/main.window.security.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16644`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16645`.

| Literal candidate leaf                                                    | Current check                    | Source                                                             |
| ------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `server.js`                                                               | 904 lines; exists                | `server.js:1`                                                      |
| `desktop/electron/main.server.ts`                                         | 124 lines; exists                | `desktop/electron/main.server.ts:1`                                |
| `desktop/electron/main.window.ts`                                         | 296 lines; exists                | `desktop/electron/main.window.ts:1`                                |
| `desktop/electron/__tests__/main.server.test.ts`                          | 98 lines; exists                 | `desktop/electron/__tests__/main.server.test.ts:1`                 |
| `desktop/electron/__tests__/main.window.security.test.ts`                 | 179 lines; exists                | `desktop/electron/__tests__/main.window.security.test.ts:1`        |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`              | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`     |
| `src/lib/campaign/authority/CampaignOperatorCredential.ts`                | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16645` |
| `src/pages/api/campaign-local-session.ts`                                 | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16645` |
| `src/pages-modules/api/campaignAccess.ts`                                 | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16645` |
| `src/lib/campaign/authority/__tests__/CampaignOperatorCredential.test.ts` | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16645` |
| `src/pages-modules/api/__tests__/campaignAccess.test.ts`                  | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16645` |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-2

**State / contract:** blocked. Additive member bearer attachment: Add a small campaignCredentialClient attaching the stored co-op bearer for host/guest requests. Operator cookie rides existing same-origin fetch and keepalive automatically; no solo/desktop principal-store migration. Update persistence GET/PUT/keepalive, list, activity, head/preflight and co-op entry token handoff. Keep token readiness before page-hide, guest context separate, and existing receipt/CAS semantics. Routes remain unenforced until B15-3R/B15-3. No change to authority policy, scope requirements or token verification; such a change requires sensitive reclassification. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16662`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16672`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-1 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16678`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16670`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 15 files / 255 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:255`. 15-file candidate has no file slack. Entry-panel/transport semantics must preserve the LSC primary-vault/seat branches after L1; do not reinterpret this routine bearer-attachment slice as auth-policy authority. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16671`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/stores/campaign/useCampaignPersistenceStore.ts`; `src/pages/gameplay/campaigns/index.tsx`; `src/lib/campaign/hooks/useCampaignActivityFeed.ts`; `src/lib/campaign/encounter/readCampaignLaunchHead.ts`; `src/lib/campaign/encounter/requestLaunchAuthority.ts`; `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`; `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`; `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16666`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16667`.

| Literal candidate leaf                                                           | Current check                    | Source                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `src/stores/campaign/useCampaignPersistenceStore.ts`                             | 1588 lines; exists               | `src/stores/campaign/useCampaignPersistenceStore.ts:1`                             |
| `src/pages/gameplay/campaigns/index.tsx`                                         | 401 lines; exists                | `src/pages/gameplay/campaigns/index.tsx:1`                                         |
| `src/lib/campaign/hooks/useCampaignActivityFeed.ts`                              | 296 lines; exists                | `src/lib/campaign/hooks/useCampaignActivityFeed.ts:1`                              |
| `src/lib/campaign/encounter/readCampaignLaunchHead.ts`                           | 108 lines; exists                | `src/lib/campaign/encounter/readCampaignLaunchHead.ts:1`                           |
| `src/lib/campaign/encounter/requestLaunchAuthority.ts`                           | 265 lines; exists                | `src/lib/campaign/encounter/requestLaunchAuthority.ts:1`                           |
| `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`                | 538 lines; exists                | `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx:1`                |
| `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`              | 766 lines; exists                | `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts:1`              |
| `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx` | 671 lines; exists                | `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx:1` |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`                     | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`                     |
| `src/lib/campaign/authority/campaignCredentialClient.ts`                         | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16667`                 |
| `src/lib/campaign/authority/__tests__/campaignCredentialClient.test.ts`          | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16667`                 |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
49	44	src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx
371	5	src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx
```

Current changed-leaf anchors: `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx:1`; `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx:1`.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-4

**State / contract:** blocked. Fixture identity helper and readiness migration: Register the new e2e/helpers/campaignAccessIdentity.ts shared helper for real operator session setup and isolated member credentials. Migrate the four fixture/import/cleanup/two-process helpers and the direct restart-pack readiness probe to it; readiness uses /api/health. Keep credentials separated, preserve assertions, no verifier bypass. Supply operator-controlled test destination allowlist configuration for later replica tests. Lands green before B15-4J and enforcement; run closure-proof suite once locally. Direct journey callers are separately owned by B15-4J. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16684`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16694`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-2 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16700`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16692`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 11 files / 135 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:311`. Static 11-file / 135-line candidate fits; keep the locally required closure-proof run because this edits test infrastructure. Freeze the identity helper and authentic operator/member separation. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16693`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `e2e/fixtures/campaign.ts`; `e2e/helpers/scenarioPackLoading.ts`; `e2e/helpers/campaignJournalDrive.ts`; `e2e/helpers/campaignJournalTwoProcess.ts`; `e2e/gm-two-player-restart.pack.spec.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16688`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16689`.

| Literal candidate leaf                                       | Current check                    | Source                                                             |
| ------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| `e2e/fixtures/campaign.ts`                                   | 395 lines; exists                | `e2e/fixtures/campaign.ts:1`                                       |
| `e2e/helpers/scenarioPackLoading.ts`                         | 616 lines; exists                | `e2e/helpers/scenarioPackLoading.ts:1`                             |
| `e2e/helpers/campaignJournalDrive.ts`                        | 261 lines; exists                | `e2e/helpers/campaignJournalDrive.ts:1`                            |
| `e2e/helpers/campaignJournalTwoProcess.ts`                   | 340 lines; exists                | `e2e/helpers/campaignJournalTwoProcess.ts:1`                       |
| `e2e/gm-two-player-restart.pack.spec.ts`                     | 414 lines; exists                | `e2e/gm-two-player-restart.pack.spec.ts:1`                         |
| `openspec/planning/2026-09-12-roadmap-completion/units.json` | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`     |
| `e2e/helpers/campaignAccessIdentity.ts`                      | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16689` |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-4J

**State / contract:** blocked. Direct journey caller migration: Migrate the six direct REST journey callers to B15-4 campaignAccessIdentity and its credential-bearing fixture helpers. Preserve every existing journey assertion and per-actor isolation; no operator cookie in member browser contexts. Run green before read/CRUD enforcement. No production edits or new auth policy. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16706`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16716`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-4 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16722`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16714`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 11 files / 115 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:360`. Static 11-file / 115-line candidate fits, but the L1 journey will change before admission. Refresh the direct REST caller census, preserve all assertions, and keep operator cookies out of member contexts. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16715`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `e2e/campaign-flow.spec.ts`; `e2e/saved-custom-combat.spec.ts`; `e2e/coop-campaign-two-browser-journey.spec.ts`; `e2e/gm-campaign-ledger-control-plane.spec.ts`; `e2e/campaign-two-device-drive.spec.ts`; `e2e/campaign-journal-two-process-convergence.spec.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16710`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16711`.

| Literal candidate leaf                                       | Current check       | Source                                                         |
| ------------------------------------------------------------ | ------------------- | -------------------------------------------------------------- |
| `e2e/campaign-flow.spec.ts`                                  | 1050 lines; exists  | `e2e/campaign-flow.spec.ts:1`                                  |
| `e2e/saved-custom-combat.spec.ts`                            | 125 lines; exists   | `e2e/saved-custom-combat.spec.ts:1`                            |
| `e2e/coop-campaign-two-browser-journey.spec.ts`              | 502 lines; exists   | `e2e/coop-campaign-two-browser-journey.spec.ts:1`              |
| `e2e/gm-campaign-ledger-control-plane.spec.ts`               | 1070 lines; exists  | `e2e/gm-campaign-ledger-control-plane.spec.ts:1`               |
| `e2e/campaign-two-device-drive.spec.ts`                      | 453 lines; exists   | `e2e/campaign-two-device-drive.spec.ts:1`                      |
| `e2e/campaign-journal-two-process-convergence.spec.ts`       | 393 lines; exists   | `e2e/campaign-journal-two-process-convergence.spec.ts:1`       |
| `openspec/planning/2026-09-12-roadmap-completion/units.json` | 24215 lines; exists | `openspec/planning/2026-09-12-roadmap-completion/units.json:1` |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-3R

**State / contract:** blocked. Authenticated member reads and guest projection: Enforce record GET, activity, head and launch-authority actor/role policy before existence or private facts are disclosed. Member GET returns the existing canonical CampaignSnapshot projection, not the source envelope; adapt useCampaignPersistenceStore guest refresh to its discriminated response and own its test. Authenticate the activity viewer from bearer membership rather than claimed query ID; preserve solo cookie access and launch readiness semantics. Migrate the five owned route/store suites using authentic credentials; pin unauthorized read/private-byte RED assertions before enforcement. PUT/DELETE/adopt/collection remain B15-3; this is no remote-release point. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16728`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16738`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-4J exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16744`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16736`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 15 files / 435 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:407`. 15-file candidate has no slack. Refresh launch-authority tests after L1; authenticated projection/store discrimination is the measured-risk portion. U104 shares the route and test: serialize. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16737`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/campaigns/[id].ts`; `src/stores/campaign/useCampaignPersistenceStore.ts`; `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`; `src/pages-modules/api/campaignActivityRoute.ts`; `src/pages-modules/api/campaignLaunchHeadRoute.ts`; `src/pages-modules/api/campaignLaunchAuthorityRoute.ts`; `src/__tests__/api/campaigns/campaigns.test.ts`; `src/pages-modules/api/__tests__/campaignActivityRoute.test.ts`; `src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts`; `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16732`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16733`.

| Literal candidate leaf                                                 | Current check       | Source                                                                   |
| ---------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `src/pages/api/campaigns/[id].ts`                                      | 381 lines; exists   | `src/pages/api/campaigns/[id].ts:1`                                      |
| `src/stores/campaign/useCampaignPersistenceStore.ts`                   | 1588 lines; exists  | `src/stores/campaign/useCampaignPersistenceStore.ts:1`                   |
| `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`    | 766 lines; exists   | `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts:1`    |
| `src/pages-modules/api/campaignActivityRoute.ts`                       | 102 lines; exists   | `src/pages-modules/api/campaignActivityRoute.ts:1`                       |
| `src/pages-modules/api/campaignLaunchHeadRoute.ts`                     | 76 lines; exists    | `src/pages-modules/api/campaignLaunchHeadRoute.ts:1`                     |
| `src/pages-modules/api/campaignLaunchAuthorityRoute.ts`                | 359 lines; exists   | `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:1`                |
| `src/__tests__/api/campaigns/campaigns.test.ts`                        | 595 lines; exists   | `src/__tests__/api/campaigns/campaigns.test.ts:1`                        |
| `src/pages-modules/api/__tests__/campaignActivityRoute.test.ts`        | 151 lines; exists   | `src/pages-modules/api/__tests__/campaignActivityRoute.test.ts:1`        |
| `src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts`      | 311 lines; exists   | `src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts:1`      |
| `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts` | 1721 lines; exists  | `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts:1` |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`           | 24215 lines; exists | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`           |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
28	26	src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts
```

Current changed-leaf anchors: `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts:1`.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-3

**State / contract:** blocked. CRUD enforcement and FN-u96 live-host PUT: After B15-3R supplies authenticated guest reads/projection, enforce collection GET and full-record PUT/DELETE/adopt before body, conflict or omission disclosure. Operator administers local records; live-host PUT requires operator OR a verified durable host identity for the stored match, never body.coopSession (FN-u96). Preserve the protected GET projection from B15-3R. Explicitly migrate campaignPutLiveHost, campaignPutGenesisRoute and campaignRecordJournalTransaction tests to real authorized requests while preserving anonymous-host-shaped RED refusal, CAS, genesis and journal/checkpoint atomicity assertions. Consolidated real-verifier actor x method RED matrix and stranger-context e2e inspect bytes plus row/journal/host effects. Complete remaining-door matrix only after B15-5/B15-5R; no remote support before group closure. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16750`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16760`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-3R exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16766`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16758`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 15 files / 405 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:464`. 15-file candidate has no slack. New access matrix and e2e are prospective, not missing accidental dependencies. Genesis test drift must be preserved. FN-u96 is prospective resolvedBy only, not yet fixed/closed. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16759`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/campaigns/index.ts`; `src/pages/api/campaigns/[id].ts`; `src/pages/api/campaigns/[id]/adopt.ts`; `src/__tests__/api/campaigns/campaigns.test.ts`; `src/__tests__/api/campaigns/campaignAdoptRoute.test.ts`; `src/__tests__/api/campaigns/campaignPutLiveHost.test.ts`; `src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts`; `src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16754`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16755`.

| Literal candidate leaf                                                 | Current check                    | Source                                                                   |
| ---------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `src/pages/api/campaigns/index.ts`                                     | 60 lines; exists                 | `src/pages/api/campaigns/index.ts:1`                                     |
| `src/pages/api/campaigns/[id].ts`                                      | 381 lines; exists                | `src/pages/api/campaigns/[id].ts:1`                                      |
| `src/pages/api/campaigns/[id]/adopt.ts`                                | 186 lines; exists                | `src/pages/api/campaigns/[id]/adopt.ts:1`                                |
| `src/__tests__/api/campaigns/campaigns.test.ts`                        | 595 lines; exists                | `src/__tests__/api/campaigns/campaigns.test.ts:1`                        |
| `src/__tests__/api/campaigns/campaignAdoptRoute.test.ts`               | 165 lines; exists                | `src/__tests__/api/campaigns/campaignAdoptRoute.test.ts:1`               |
| `src/__tests__/api/campaigns/campaignPutLiveHost.test.ts`              | 352 lines; exists                | `src/__tests__/api/campaigns/campaignPutLiveHost.test.ts:1`              |
| `src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts`          | 164 lines; exists                | `src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts:1`          |
| `src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts` | 507 lines; exists                | `src/__tests__/api/campaigns/campaignRecordJournalTransaction.test.ts:1` |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`           | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`           |
| `src/__tests__/api/campaigns/campaignAccessMatrix.test.ts`             | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16755`       |
| `e2e/campaign-access-isolation.spec.ts`                                | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16755`       |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
37	0	src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts
```

Current changed-leaf anchors: `src/__tests__/api/campaigns/campaignPutGenesisRoute.test.ts:1`.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-5

**State / contract:** blocked. Operator co-op creation and complete grants boundary: Require verified operator session plus creator bearer before co-op matches/index.ts creates a match, GM seat or host-registry side effect. Close the zero/all-revoked-seat grant bypass at BOTH grants.ts and campaignShareService.requireCampaignGm; own campaignShareCallerAuthority.test.ts and replace its no-participants bypass assertion with explicit operator success/stranger refusal. Carry a trusted server-resolved operator capability into the service, never caller-controlled booleans or missing callerId. Active authorized GM remains supported. Exercise route and non-route service callers, update the consolidated matrix, and preserve no-account operator access without seats. Redeem, replica-sync, commands and rewind are B15-5R; no remote claim before it closes. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16772`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16782`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-3 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16788`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16780`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 12 files / 355 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:524`. Static 12-file / 355-line candidate leaves three slots; trusted capability must reach both route and service. No schema/owner-column work is authorized. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16781`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/multiplayer/matches/index.ts`; `src/pages/api/campaigns/[id]/grants.ts`; `src/lib/campaign/grants/campaignShareService.ts`; `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts`; `src/__tests__/api/campaigns/campaignGrantsRoute.test.ts`; `src/lib/campaign/grants/__tests__/campaignShareCallerAuthority.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16776`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16777`.

| Literal candidate leaf                                                   | Current check                    | Source                                                                     |
| ------------------------------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------- |
| `src/pages/api/multiplayer/matches/index.ts`                             | 380 lines; exists                | `src/pages/api/multiplayer/matches/index.ts:1`                             |
| `src/pages/api/campaigns/[id]/grants.ts`                                 | 200 lines; exists                | `src/pages/api/campaigns/[id]/grants.ts:1`                                 |
| `src/lib/campaign/grants/campaignShareService.ts`                        | 219 lines; exists                | `src/lib/campaign/grants/campaignShareService.ts:1`                        |
| `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts`       | 331 lines; exists                | `src/__tests__/unit/api/multiplayerCoopCreationCheckpoint.test.ts:1`       |
| `src/__tests__/api/campaigns/campaignGrantsRoute.test.ts`                | 445 lines; exists                | `src/__tests__/api/campaigns/campaignGrantsRoute.test.ts:1`                |
| `src/lib/campaign/grants/__tests__/campaignShareCallerAuthority.test.ts` | 338 lines; exists                | `src/lib/campaign/grants/__tests__/campaignShareCallerAuthority.test.ts:1` |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`             | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`             |
| `src/__tests__/api/campaigns/campaignAccessMatrix.test.ts`               | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16777`         |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-5R

**State / contract:** blocked. Replica management and command/rewind closure: Redeem POST: require operator session plus verified recipient bearer matching token.participantId; retain existing embedded-public-key signature/expiry verification and source/replica conflict checks. Embedded-key verification is NOT pinned issuer authentication or signed body/sourceInstanceId provenance; the authoritative pinned-key check stays at the source on connection. Replica-sync GET/DELETE: require operator before status/stop effects. Replica-sync POST: additionally require verified recipient bearer matching body.playerId and presented participantId, compare presented campaignId/grantId to the stored replica authority, check presented expiry, and enforce an operator-configured destination allowlist before any dial; refuse missing policy/unknown destination. The local authority does not store participantId or issuer key: do NOT promise local pinned grant-signature verification or a stored-participant comparison. Source verifies the grant on connect; issuer/participant/address persistence is a separate unregistered schema/provenance follow-up, not silently added here. Commands and rewind retain active membership/per-intent/GM checks and project private response state; operator cookie does not manufacture a co-op seat. Extend the real-verifier matrix across all 17 methods and source/replica actors. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16794`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16804`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-5 exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16810`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16802`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 14 files / 425 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:576`. 14-file / 425-line candidate leaves one slot. Destination policy, bearer/authority comparisons and complete 17-method coverage must fit; schema/provenance persistence is explicitly separate and unregistered. Split rather than silently claim local pinned-key verification. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16803`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/campaigns/redeem.ts`; `src/pages/api/campaigns/[id]/replica-sync.ts`; `src/pages/api/campaigns/[id]/commands.ts`; `src/pages/api/campaigns/[id]/rewind-preview.ts`; `src/__tests__/api/campaigns/campaignRedeemRoute.test.ts`; `src/__tests__/api/campaigns/campaignReplicaSyncRoute.test.ts`; `src/__tests__/api/campaigns/campaignCommandsRoute.test.ts`; `src/__tests__/api/campaigns/rewindPreviewRoute.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16798`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16799`.

| Literal candidate leaf                                         | Current check                    | Source                                                             |
| -------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `src/pages/api/campaigns/redeem.ts`                            | 129 lines; exists                | `src/pages/api/campaigns/redeem.ts:1`                              |
| `src/pages/api/campaigns/[id]/replica-sync.ts`                 | 257 lines; exists                | `src/pages/api/campaigns/[id]/replica-sync.ts:1`                   |
| `src/pages/api/campaigns/[id]/commands.ts`                     | 286 lines; exists                | `src/pages/api/campaigns/[id]/commands.ts:1`                       |
| `src/pages/api/campaigns/[id]/rewind-preview.ts`               | 193 lines; exists                | `src/pages/api/campaigns/[id]/rewind-preview.ts:1`                 |
| `src/__tests__/api/campaigns/campaignRedeemRoute.test.ts`      | 230 lines; exists                | `src/__tests__/api/campaigns/campaignRedeemRoute.test.ts:1`        |
| `src/__tests__/api/campaigns/campaignReplicaSyncRoute.test.ts` | 304 lines; exists                | `src/__tests__/api/campaigns/campaignReplicaSyncRoute.test.ts:1`   |
| `src/__tests__/api/campaigns/campaignCommandsRoute.test.ts`    | 361 lines; exists                | `src/__tests__/api/campaigns/campaignCommandsRoute.test.ts:1`      |
| `src/__tests__/api/campaigns/rewindPreviewRoute.test.ts`       | 198 lines; exists                | `src/__tests__/api/campaigns/rewindPreviewRoute.test.ts:1`         |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`   | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`     |
| `src/__tests__/api/campaigns/campaignAccessMatrix.test.ts`     | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16799` |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-PRIV

**State / contract:** blocked. PRIV-1 implementation: exclude co-op campaign sessions and co-op mission matches entirely from GET /api/multiplayer/lobbies (getJoinableLobbies) and spectatable listings, using meta.coopCampaign / coopMission rather than layout guesses. Stop embedding the room code in the default co-op campaign name. Invitation joining remains membership-authorized; possession of a code does not bypass campaign admission. Ordinary public lobbies remain discoverable. B15-6 owns documentation only and cites this unit exact-main PASS. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16818`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16845`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-5R exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16859`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16838`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Target <=10 files / <=300 additions, hard cap 15/500. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16866`. 10-file / <=300-line target is a hypothesis. Owns securityBoundary.test.ts but NOT the invite route or Player.ts. CF-G2A-2/4 can partly use its test leaf; invite privacy/rate-limiting and strict decoding need explicit ownership amendment or new slices first. CF-B14A-8 needs a clear invite-vs-listings disposition. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16841`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/lib/multiplayer/server/joinableLobbies.ts`; `src/lib/multiplayer/server/__tests__/joinableLobbies.test.ts`; `src/__tests__/unit/api/multiplayerLobbies.test.ts`; `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`; `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx`; `src/__tests__/api/securityBoundary.test.ts`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16822`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16830`.

| Literal candidate leaf                                                           | Current check                    | Source                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/multiplayer/server/joinableLobbies.ts`                                  | 190 lines; exists                | `src/lib/multiplayer/server/joinableLobbies.ts:1`                                  |
| `src/lib/multiplayer/server/__tests__/joinableLobbies.test.ts`                   | 194 lines; exists                | `src/lib/multiplayer/server/__tests__/joinableLobbies.test.ts:1`                   |
| `src/__tests__/unit/api/multiplayerLobbies.test.ts`                              | 147 lines; exists                | `src/__tests__/unit/api/multiplayerLobbies.test.ts:1`                              |
| `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`                | 538 lines; exists                | `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx:1`                |
| `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx` | 671 lines; exists                | `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx:1` |
| `src/__tests__/api/securityBoundary.test.ts`                                     | 647 lines; exists                | `src/__tests__/api/securityBoundary.test.ts:1`                                     |
| `openspec/planning/2026-09-12-roadmap-completion/units.json`                     | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`                     |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-priv-local.json`   | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16830`                 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-priv-review.json`  | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16830`                 |
| `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-priv-main.json`    | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16830`                 |

**Drift measurement:** `git diff --numstat 21b490fd HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
41	0	src/__tests__/api/securityBoundary.test.ts
```

Current changed-leaf anchors: `src/__tests__/api/securityBoundary.test.ts:1`.

**Carry-forwards:** PRIV-1; CF-G2A-2 co-op bit/campaign correlation; CF-G2A-4 MR1/MR4; CF-B14A-8 fog metadata in lobby/invite summaries. See carry-forward table; current manifest does not settle the invite-route portion. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### B15-6

**State / contract:** blocked. Docker honesty and supported hosting documentation: Make README/compose comments honest: current Docker image and dev compose service fail hostname admission; do not remove the loopback guard, enable binding, or advertise a working published-port deployment. Dockerfile stays outside the grant because U81 reserves it. Document same-host v2.2.0 limitations and, only after B15 core proof, the single-operator TLS reverse-proxy-to-loopback topology with allowlist and bootstrap route excluded. Add the remote procedure to coop UAT. Externally routed three-person mission evidence is release/playtest evidence, not a new product unit, QC script or network e2e spec. Multiple mutually untrusted operators remain unsupported pending FN-ob2 owner-column follow-up. PRIV-1 product implementation belongs exclusively to sensitive B15-PRIV. Keep only discovery/privacy documentation here, citing B15-PRIV exact-main PASS, fetched-main ancestry and closure before publishing any remote/tunnel hosting procedure or support claim. No listing or default-name implementation is admitted under this routine docs/config unit; all B15 remains blocked post-U38 and L1 is unchanged. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16885`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16895`.

**Release/blockers:** L1 U38 exact-main PASS, ancestry and closure; then B15-PRIV exact-main closure. Documentary predecessors are not enforced by NEXT; no U50/U81/U101c/d overlap or concurrent product/closure admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16901`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16893`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 15 actual unique files / 500 counted added lines. Registration estimate 10 files / 275 lines (not measured). Source: `openspec/planning/2026-09-12-roadmap-completion/evidence/b15-ob2-registration-20261018.json:633`. Static 10-file / 275-line candidate fits. This remains docs/config only after sensitive privacy closure; no Dockerfile grant, listener relaxation, new network e2e or remote claim before complete group proof and actual topology evidence. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16894`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `README.md`; `docker-compose.yml`; `playtest/checklists/coop-uat.md`; `docs/releases/v2.2.0-topology.md`. Exceptions below include lifecycle/prospective leaves; they do not grant parent directories. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16889`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16890`.

| Literal candidate leaf                                       | Current check                    | Source                                                             |
| ------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| `README.md`                                                  | 180 lines; exists                | `README.md:1`                                                      |
| `docker-compose.yml`                                         | 109 lines; exists                | `docker-compose.yml:1`                                             |
| `playtest/checklists/coop-uat.md`                            | 216 lines; exists                | `playtest/checklists/coop-uat.md:1`                                |
| `docs/releases/v2.2.0-topology.md`                           | 19 lines; exists                 | `docs/releases/v2.2.0-topology.md:1`                               |
| `openspec/planning/2026-09-12-roadmap-completion/units.json` | 24215 lines; exists              | `openspec/planning/2026-09-12-roadmap-completion/units.json:1`     |
| `docs/deployment/campaign-hosting.md`                        | prospective / absent at snapshot | `openspec/planning/2026-09-12-roadmap-completion/units.json:16890` |

**Drift measurement:** `git diff --numstat c962217b HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
2	0	docs/releases/v2.2.0-topology.md
216	64	playtest/checklists/coop-uat.md
```

Current changed-leaf anchors: `docs/releases/v2.2.0-topology.md:1`; `playtest/checklists/coop-uat.md:1`.

**Carry-forwards:** B15 group inherits CF-G2A-1/2/3/4/6, CF-G2-10 and LSC F1/F2; they are not all allocated to these literal leaves. See carry-forward table before admission. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U99 - task 58

**State / contract:** planned. Spec-only clause correction: in openspec/specs/coop-campaign-sync/spec.md (small-gap resync scenario, lines 144-149 at 58bbb27) convergence means the fold of facts authorized for that viewer, never raw equality with host state containing withheld facts; in the harden change's gm-authority-redaction delta (specs/gm-authority-redaction/spec.md) qualify Visibility Is Equivalent Across Surfaces as per-viewer authorized projection and ADD the existing baseline author and prior-withhold law: a migration-authored baseline never reaches a viewer lacking every represented scope; a system genesis may initialize a restricted viewer only before that viewer's fold withheld any fact; after any withheld fact or refused baseline, later full-state checkpoints stay withheld while admitted incremental facts continue; a host or owner GM entitled to every represented scope keeps the full baseline. Preserve U94's wire proof and FN-u58's resolved raw-tail disposition. Only those two spec files change; no product source change and no task tick. Proposed wording is in evidence/triage-32-37-20260927.md (tasks 32-33). Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16095`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16113`.

**Release/blockers:** L1 phase boundary/U38 as the L2 schedule gate; registration has no unit predecessor. No specific L1 source dependency is encoded. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16133`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy, replay. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16104`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 2 actual unique files / 120 counted added lines. Both spec leaves exist and are unchanged since literal registration. Two-file cap leaves no slot for ledger/evidence in the same unit diff. Freeze a lawful separate lifecycle/closure allocation or narrower registration before admission; do not treat spec-only as routine (classes remain sensitive). Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16109`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `openspec/specs/coop-campaign-sync/spec.md`; `openspec/changes/harden-gm-two-player-campaign-sessions`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16099`.

| Literal candidate leaf                                                                         | Current check     | Source                                                                                           |
| ---------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `openspec/specs/coop-campaign-sync/spec.md`                                                    | 639 lines; exists | `openspec/specs/coop-campaign-sync/spec.md:1`                                                    |
| `openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md` | 70 lines; exists  | `openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** Original residual contract above; group security carry-forwards must not be attributed to this unit without an amendment. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U100 - task 59

**State / contract:** planned. Render campaign activity for a RosterUnitChanged change kind 'repaired' from the carried unit status: Damaged reads damaged, Destroyed reads destroyed, Operational or Repaired reads repaired. Preserve the journal payload and U35g's destroyed-unit persistence decision. Red-first rows cover all three statuses. Expected edits are confined to src/lib/campaign/activity. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16146`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16161`.

**Release/blockers:** L1 phase boundary/U38; no explicit unit predecessor. Campaign alias overlaps the L1 consumers/LSC/U38 until closure. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16181`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** routine. Routine independent review/CI; no sensitive OWNER-RULING solely for this class. Reclassify if actual authority/privacy policy changes. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16154`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 3 actual unique files / 120 counted added lines. Two source/test leaves + units.json already consume all three slots. Small code fix appears plausible, but actual line fit and evidence/closure allocation must be frozen. Damaged still falls through to repaired in current source. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16157`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/lib/campaign`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16150`.

| Literal candidate leaf                                                   | Current check     | Source                                                                     |
| ------------------------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------- |
| `src/lib/campaign/activity/campaignActivityProjection.ts`                | 245 lines; exists | `src/lib/campaign/activity/campaignActivityProjection.ts:1`                |
| `src/lib/campaign/activity/__tests__/campaignActivityProjection.test.ts` | 270 lines; exists | `src/lib/campaign/activity/__tests__/campaignActivityProjection.test.ts:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** Original residual contract above; group security carry-forwards must not be attributed to this unit without an amendment. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U104 - task 61

**State / contract:** planned. Drive campaignLaunchAuthorityRoute through its public route seam with a correction saga pending across the API and socket module graphs, and prove the launch is blocked and read correctly through createDurableCampaignProgressionReaders. Proof-only unless the route still reads null; any product correction stays inside the route and reader paths. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16296`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16313`.

**Release/blockers:** L1 P2CG1H + I1/I4 (durable route/reader integration), then P2C/P2/U38 phase closure. Registration has no explicit predecessor. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16333`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, replay. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16305`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 5 actual unique files / 220 counted added lines. Four literal source/test leaves + units.json consume all five slots. Substantial L1 reader/route drift requires re-evaluating whether this is now proof-only and refreshing RED. A separate lifecycle allocation or smaller source union is needed if more artifacts are required; no automatic cap widening. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16309`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages-modules/api`; `src/lib/multiplayer/server`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16300`.

| Literal candidate leaf                                                                       | Current check      | Source                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `src/pages-modules/api/campaignLaunchAuthorityRoute.ts`                                      | 359 lines; exists  | `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:1`                                      |
| `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts`                       | 1721 lines; exists | `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts:1`                       |
| `src/lib/multiplayer/server/campaignProgressionReaders.durable.ts`                           | 249 lines; exists  | `src/lib/multiplayer/server/campaignProgressionReaders.durable.ts:1`                           |
| `src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts` | 512 lines; exists  | `src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
373	5	src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts
102	16	src/lib/multiplayer/server/campaignProgressionReaders.durable.ts
379	27	src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts
66	19	src/pages-modules/api/campaignLaunchAuthorityRoute.ts
```

Current changed-leaf anchors: `src/lib/multiplayer/server/__tests__/campaignProgressionReaders.durable.crossGraph.test.ts:1`; `src/lib/multiplayer/server/campaignProgressionReaders.durable.ts:1`; `src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts:1`; `src/pages-modules/api/campaignLaunchAuthorityRoute.ts:1`.

**Carry-forwards:** Original residual contract above; group security carry-forwards must not be attributed to this unit without an amendment. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U101a - task 62

**State / contract:** planned. Extend token minting with validated signed match/session scope using auth.ts as the sole verification owner; preserve unscoped REST identity bootstrap. No signed role claim: use existing trusted admission, seat and owner law. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16402`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16420`.

**Release/blockers:** Task57 registration already delivered; wait L1 LSC-1 token/schema ownership and U38 phase exit. No explicit predecessor in its registration. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16435`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16412`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Five literal leaves + units.json = six of eight before additional evidence. Refresh LSC token-route changes after L1. Existing auth.ts already signs optional scope; complete the mint path without enforcing socket scope early. F1/F2 need a distinct complete grant/census, not assumed coverage by securitySchemas.ts. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16416`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/multiplayer/auth`; `src/lib/multiplayer/server`; `src/lib/api/securitySchemas.ts`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16406`.

| Literal candidate leaf                                          | Current check     | Source                                                            |
| --------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| `src/pages/api/multiplayer/auth/token.ts`                       | 183 lines; exists | `src/pages/api/multiplayer/auth/token.ts:1`                       |
| `src/lib/multiplayer/server/auth.ts`                            | 318 lines; exists | `src/lib/multiplayer/server/auth.ts:1`                            |
| `src/lib/api/securitySchemas.ts`                                | 221 lines; exists | `src/lib/api/securitySchemas.ts:1`                                |
| `src/lib/multiplayer/server/__tests__/auth.test.ts`             | 187 lines; exists | `src/lib/multiplayer/server/__tests__/auth.test.ts:1`             |
| `src/lib/multiplayer/server/__tests__/socketTokenScope.test.ts` | 325 lines; exists | `src/lib/multiplayer/server/__tests__/socketTokenScope.test.ts:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
3	3	src/lib/multiplayer/server/auth.ts
```

Current changed-leaf anchors: `src/lib/multiplayer/server/auth.ts:1`.

**Carry-forwards:** FN-u29 scoped-token residual plus LSC F1/F2 auth hardening and strict-wire-decode cross-cutting gap; do not infer these are implemented by the current grant. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U101b - task 63

**State / contract:** planned. Migrate actual combat index, lobby, spectator and shared token consumers to the known match scope, including refresh/rejoin. Do not require server scope before all consumers migrate. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16451`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16473`.

**Release/blockers:** U101a exact-main closure; L1 P2 multiplayer route ownership/U38 phase gate. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16488`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16465`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Seven literal leaves + units.json = eight of eight, no room for additional artifacts or route-specific tests. Freeze lifecycle allocation and test census; split consumers into buildable prefixes if any extra test leaf is required. Could parallel U101c only after explicit two-lane amendment and full alias census. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16469`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/multiplayer/index.tsx`; `src/pages/multiplayer/lobby/[roomCode].tsx`; `src/pages/multiplayer/spectate/[matchId].tsx`; `src/pages-modules/multiplayer/multiplayerPage.helpers.ts`; `src/pages-modules/multiplayer/multiplayerAuthTokenStore.ts`; `src/lib/multiplayer/client/issuePlayerToken.ts`; `src/lib/multiplayer/client/__tests__/issuePlayerToken.test.ts`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16455`.

| Literal candidate leaf                                          | Current check     | Source                                                            |
| --------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| `src/pages/multiplayer/index.tsx`                               | 308 lines; exists | `src/pages/multiplayer/index.tsx:1`                               |
| `src/pages/multiplayer/lobby/[roomCode].tsx`                    | 426 lines; exists | `src/pages/multiplayer/lobby/[roomCode].tsx:1`                    |
| `src/pages/multiplayer/spectate/[matchId].tsx`                  | 229 lines; exists | `src/pages/multiplayer/spectate/[matchId].tsx:1`                  |
| `src/pages-modules/multiplayer/multiplayerPage.helpers.ts`      | 43 lines; exists  | `src/pages-modules/multiplayer/multiplayerPage.helpers.ts:1`      |
| `src/pages-modules/multiplayer/multiplayerAuthTokenStore.ts`    | 123 lines; exists | `src/pages-modules/multiplayer/multiplayerAuthTokenStore.ts:1`    |
| `src/lib/multiplayer/client/issuePlayerToken.ts`                | 170 lines; exists | `src/lib/multiplayer/client/issuePlayerToken.ts:1`                |
| `src/lib/multiplayer/client/__tests__/issuePlayerToken.test.ts` | 125 lines; exists | `src/lib/multiplayer/client/__tests__/issuePlayerToken.test.ts:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** FN-u29 scoped-token residual plus LSC F1/F2 auth hardening and strict-wire-decode cross-cutting gap; do not infer these are implemented by the current grant. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U101c - task 64

**State / contract:** planned. Migrate actual campaign co-op entry and token refresh to validated campaign-session scope on initial join/reconnect, preserving host/player/guest admission and REST identity bootstrap. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16508`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16526`.

**Release/blockers:** U101a exact-main closure; LSC-2/2OP, H/I transport ownership and U38 phase gate; B15 complete first per scheduling ruling. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16541`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16518`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Five literal leaves + units.json = six of eight. Heavy transport/entry drift and pending LSC changes require fresh fit. Preserve seat refresh and unscoped REST bootstrap, then scoped session join/reconnect; serialize U105 and B15 entry work. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16522`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`; `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx`; `src/lib/campaign`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16512`.

| Literal candidate leaf                                                           | Current check      | Source                                                                             |
| -------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`                | 538 lines; exists  | `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx:1`                |
| `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx` | 671 lines; exists  | `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx:1` |
| `src/lib/campaign/coop/coopCampaignAuthTokenStore.ts`                            | 57 lines; exists   | `src/lib/campaign/coop/coopCampaignAuthTokenStore.ts:1`                            |
| `src/lib/campaign/coop/campaignSyncTransport.ts`                                 | 755 lines; exists  | `src/lib/campaign/coop/campaignSyncTransport.ts:1`                                 |
| `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts`                  | 1550 lines; exists | `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts:1`                  |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
1165	3	src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts
366	30	src/lib/campaign/coop/campaignSyncTransport.ts
49	44	src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx
371	5	src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx
```

Current changed-leaf anchors: `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts:1`; `src/lib/campaign/coop/campaignSyncTransport.ts:1`; `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx:1`; `src/pages-modules/gameplay/campaigns/__tests__/CampaignCoopEntryPanel.test.tsx:1`.

**Carry-forwards:** FN-u29 scoped-token residual plus LSC F1/F2 auth hardening and strict-wire-decode cross-cutting gap; do not infer these are implemented by the current grant. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U101d - task 65

**State / contract:** planned. After combat and campaign consumers migrate, make server.js loadMultiplayerRuntime use the sole auth.ts verifier; remove inline production verification and migrate packaged validator minting. Require scope only on WebSocket authentication. Prove real packaged handshakes for valid seats and scopeless/wrong-match/wrong-role refusals. Refresh the callback caller census; any new outside-grant caller requires a separately reviewed prefix. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16559`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16580`.

**Release/blockers:** U101b + U101c exact-main closures; L1 H/LSC and B15 server ownership released; then own packaged-boundary proof. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16595`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16572`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Seven literal leaves + units.json = eight of eight. Packaged proof and verifier caller census may force a narrower registered prefix. Do not absorb GUI launch smoke here: neither CI Build Test nor BrowserWindow files are granted by its literal manifest. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16576`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `server.js`; `scripts/validate-multiplayer-packaged-socket.mjs`; `src/lib/multiplayer/server`; `src/lib/api/securitySchemas.ts`; `scripts/__tests__/validate-multiplayer-packaged-socket.test.ts`; `scripts/__tests__/packagedSocketValidatorCredentialMirror.test.ts`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16563`.

| Literal candidate leaf                                              | Current check     | Source                                                                |
| ------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------- |
| `server.js`                                                         | 904 lines; exists | `server.js:1`                                                         |
| `scripts/validate-multiplayer-packaged-socket.mjs`                  | 614 lines; exists | `scripts/validate-multiplayer-packaged-socket.mjs:1`                  |
| `src/lib/multiplayer/server/auth.ts`                                | 318 lines; exists | `src/lib/multiplayer/server/auth.ts:1`                                |
| `src/lib/api/securitySchemas.ts`                                    | 221 lines; exists | `src/lib/api/securitySchemas.ts:1`                                    |
| `scripts/__tests__/validate-multiplayer-packaged-socket.test.ts`    | 69 lines; exists  | `scripts/__tests__/validate-multiplayer-packaged-socket.test.ts:1`    |
| `scripts/__tests__/packagedSocketValidatorCredentialMirror.test.ts` | 116 lines; exists | `scripts/__tests__/packagedSocketValidatorCredentialMirror.test.ts:1` |
| `src/lib/multiplayer/server/__tests__/socketTokenScope.test.ts`     | 325 lines; exists | `src/lib/multiplayer/server/__tests__/socketTokenScope.test.ts:1`     |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
3	3	src/lib/multiplayer/server/auth.ts
```

Current changed-leaf anchors: `src/lib/multiplayer/server/auth.ts:1`.

**Carry-forwards:** FN-u29 scoped-token residual plus LSC F1/F2 auth hardening and strict-wire-decode cross-cutting gap; do not infer these are implemented by the current grant. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U101 - task 65

**State / contract:** planned. Make production multiplayer token issuance and verification satisfy the checked 6.3 scoped-token clause: the production token route mints the required session/match scope, and socket authentication refuses a token with no required scope. Preserve existing authorized host and player flows and add negative rows for scopeless, wrong-match and wrong-role tokens. Reconcile the live task only after exact-main proof; do not rewrite the historical U29 ERRATA. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16194`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16211`.

**Release/blockers:** U101d exact-main closure; all a-d and complete scoped-token proof, not merely a passing selector. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16231`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16203`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Aggregate obligation, not another token implementation pass. Literal registration files are empty; directory aliases cannot be frozen permission. After U101d closes, freeze exact proof/lifecycle/task-reconciliation output and retain original 8/300 cap. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16207`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/pages/api/multiplayer/auth`; `src/lib/multiplayer/server`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16198`.

No literal files registered (empty files array). A proof/closure manifest is required. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16231`.

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names): no changed non-ledger literal leaves.

**Carry-forwards:** FN-u29 scoped-token residual plus LSC F1/F2 auth hardening and strict-wire-decode cross-cutting gap; do not infer these are implemented by the current grant. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

### U105 - task 66

**State / contract:** planned. A guest acknowledges an adopted CampaignSnapshot at its authoritative revision so the convergence gate does not refuse the next host command only because the checkpoint frame was unacknowledged. Red-first live transport row reproduces U92's participants-behind refusal; green proves the snapshot ack, the next AdvanceDay succeeding, no ack of a withheld snapshot, and unchanged incremental ack ordering. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16348`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16366`.

**Release/blockers:** Task57 plus Task17/P2C required by phase plan; H/I3/I4 and P2CH complete first, then P2/U38 as phase gate. Registration currently encodes no predecessor. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16386`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.

**Review:** authority, privacy, concurrency. Sensitive: full independent Fable review (current Root-requested reviewer; ledger requires independent exact-head review) plus genuine packet before local-verified and exact-head OWNER-RULING before merge; null ownerGate is no waiver. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16357`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:27`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:28`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.

**Caps / disposition:** 8 actual unique files / 300 counted added lines. Four literal leaves + units.json = five of eight. Must re-evaluate against receipt-mode snapshot/application discipline after L1, proving no ACK before application and no withheld snapshot ACK. No split proven yet; named selectors are not proof that a discriminating live row exists. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16362`, `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.

**Ownership aliases:** `src/lib/campaign`; `src/lib/multiplayer/server`. Literal registration below narrows these aliases. Source: `openspec/planning/2026-09-12-roadmap-completion/units.json:16352`.

| Literal candidate leaf                                             | Current check      | Source                                                               |
| ------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------- |
| `src/lib/campaign/coop/campaignSyncTransport.ts`                   | 755 lines; exists  | `src/lib/campaign/coop/campaignSyncTransport.ts:1`                   |
| `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts`    | 1550 lines; exists | `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts:1`    |
| `src/lib/multiplayer/server/CampaignSyncSession.ts`                | 946 lines; exists  | `src/lib/multiplayer/server/CampaignSyncSession.ts:1`                |
| `src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts` | 952 lines; exists  | `src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts:1` |

**Drift measurement:** `git diff --numstat 8a62fe84 HEAD -- <above non-ledger literal leaves>` (literal pathspecs, including bracketed route names):

```text
1165	3	src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts
366	30	src/lib/campaign/coop/campaignSyncTransport.ts
```

Current changed-leaf anchors: `src/lib/campaign/coop/__tests__/campaignSyncTransport.test.ts:1`; `src/lib/campaign/coop/campaignSyncTransport.ts:1`.

**Carry-forwards:** Original residual contract above; group security carry-forwards must not be attributed to this unit without an amendment. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`.

## P2CER reconciliation

P2CER is a completed prerequisite registration, not a planned `units[]` entry. STATUS records #2137 at `08f917ef`, three changed files, green CI and exact-Main validator PASS. Its three-file frozen scope is roadmap.json, units.json and evidence/p2cer-registration-20261016.json; 15/500 caps, zero product lines. It added broadcaster regression/cutover ownership, not runtime acceptance. The receipt itself correctly retains its pre-delivery "pending Root gates" language; later STATUS supplies acceptance, so do not overwrite the historical receipt. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:956`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:958`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:960`, `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cer-registration-20261016.json:35`, `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cer-registration-20261016.json:40`.

Fit: all three registration files exist. The two ledgers have continued to evolve; the P2CER receipt is unchanged since its merge (`git diff 08f917ef HEAD -- <three-file scope>`). This is not a reason to repeat P2CER. Reconcile its row in the L2 completion view against preserved registration/merge evidence, and retain P2CE1-3/P2CG1 successor ownership. Review class: documentary registration; original independent review remains historical, no new sensitive source admission or OWNER-RULING is implied. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:959`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23477`, `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cer-registration-20261016.json:72`.

## Packaged Electron smoke - missing admission holder

The requirement is explicitly **"packaged Electron launch smoke added to Build Test"**. Current CI Build Test packs with electron-builder and verifies platform output; its final step ends at directory/executable existence. The local `desktop/scripts/test-build.js` is stronger: packaged security audit and packaged socket smoke use the built executable with `--electron-node-exe`, but that validator starts it with `ELECTRON_RUN_AS_NODE=1`. This is packaged server/socket proof, not BrowserWindow/session-cookie/navigation proof. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `.github/workflows/pr-checks.yml:915`, `.github/workflows/pr-checks.yml:978`, `.github/workflows/pr-checks.yml:988`, `desktop/scripts/test-build.js:288`, `desktop/scripts/test-build.js:297`, `scripts/validate-multiplayer-packaged-socket.mjs:473`.

**Acceptance interpretation:** PLAN names a packaged Electron launch smoke without spelling out a BrowserWindow witness. GUI readiness below is a recommendation for Root to freeze at registration, not a pre-existing acceptance letter. At minimum Build Test must execute the packaged runtime rather than infer launch from artifact existence. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `.github/workflows/pr-checks.yml:978`, `.github/workflows/pr-checks.yml:988`.

**Proposed amendment, not admitted:** register one routine infrastructure slice for CI pack-and-launch orchestration (reclassify authority/privacy if actual startup/cookie behavior changes). Candidate ownership: `.github/workflows/pr-checks.yml`, `desktop/scripts/test-build.js` or a narrower existing CI caller, one new `desktop/scripts/validate-packaged-launch.js`, one focused helper test, units/roadmap registration and exact evidence outputs. Freeze actual literals and use ordinary 15/500 ceilings unless the existing governing contract is stricter. Acceptance: launch the actual platform executable without Node mode in an isolated data directory; observe renderer navigation, health/server startup, operator cookie established before campaign access after B15-1, bounded failure and owned-process teardown; retain socket/security regressions and artifact identity. Linux needs an explicit display strategy (e.g. xvfb), not a silently skipped GUI check. These are recommended acceptance details derived from the launch requirement and the B15-1 bootstrap contract, not existing proof. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16640`, `desktop/electron/main.window.ts:1`, `desktop/electron/main.server.ts:1`.

Release blocker: neither implementation cap fit nor runtime pass measured. U101d owns packaged socket validator, not CI/BrowserWindow launch; B15-1 owns main.server/main.window. Sequence the new smoke after both, or split CI plumbing (early, no startup edits) from final exact-Main proof. Preserve one heavy-run rule and the specified machine-idle gate; no heavy run was needed for this preparation. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16595`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16644`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:30`.

## Open carry-forwards and concrete admission gaps

| Finding           | Still-open requirement / current evidence                                                                                                                                                                                                           | Proposed owner disposition before admission                                                                                                                                                       | Source                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CF-G2A-1          | Invite-route abuse budget in both summary and identity modes before non-loopback hosting. No B15 literal owns the invite handler.                                                                                                                   | Register sensitive B15-INV (name provisional): invite handler, real securityBoundary tests, rate-limit helper/test as needed; exact cap/census first.                                             | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`; `src/pages/api/multiplayer/invites/[roomCode].ts:43`                                                                     |
| CF-G2A-2 / PRIV-1 | Exclude co-op rows/code/matchId, close co-op-ness/campaignId correlation; non-member with known code must get 401/404 in identity mode. Handler currently authenticates identity then returns campaignId without a membership check in that branch. | Keep listing/default-name work in B15-PRIV; explicitly allocate invite authorization/privacy closure to B15-INV. A hidden lobby alone cannot establish known-code refusal.                        | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:461`; `src/pages/api/multiplayer/invites/[roomCode].ts:82`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16818` |
| CF-G2A-3          | Strict base64 wire decode rejects trailing/padding garbage and non-base64 characters. Player.ts is outside every listed B15/U101 literal manifest.                                                                                                  | Register bounded sensitive B15-WIRE or amend a measured narrower prefix with Player.ts and its actual tests.                                                                                      | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:462`                                                                                                                           |
| CF-G2A-4          | Lowercase Bearer and empty campaignId rows must kill MR1/MR4; rerouted by Root, not discharged by G2.                                                                                                                                               | B15-INV / B15-PRIV must explicitly freeze the two test rows and any invite implementation leaf, preserving parent routing.                                                                        | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:463`; `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:471`                                                        |
| CF-G2A-6          | Consider verified playerId accountability logging; optional consideration, not an automatic logging requirement.                                                                                                                                    | Disposition explicitly in invite slice review; use logger, never raw console. Do not manufacture a release blocker if declined with rationale.                                                    | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:465`                                                                                                                           |
| CF-G2-10          | Umbrella carry-forward preserves PRIV-1, MR1/MR4 and CF-G2A-1/2/3/6.                                                                                                                                                                                | Use one traceable finding-to-new-unit map; avoid duplicate closure claims.                                                                                                                        | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:275`                                                                                                                           |
| CF-B14A-8         | Lobby/invite fogOfWar summaries remain readable by authenticated callers; "non-member learns nothing" scoped to active/completed matches.                                                                                                           | Reconcile wording and decide invited-code summary policy; listing exclusion does not automatically fix public invite summaries. B15-PRIV/FOG owns routing, invite implementation needs new grant. | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:27`; `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:40`                                                          |
| LSC F1            | clientRateLimitKey trusts caller X-Forwarded-For before socket address; affects token/vault KDF budgets.                                                                                                                                            | Register auth-security slice with security.ts, real unit/route tests and all affected callers. No proxy-header authority. Existing U101a securitySchemas.ts is not security.ts.                   | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`; `openspec/planning/2026-09-12-roadmap-completion/evidence/lsc-prep2-20261018.txt:67`; `src/lib/api/security.ts:82`       |
| LSC F2            | Existing auth routes lack Host/Origin guard; LSC protects only local-seats.                                                                                                                                                                         | Same auth-security registration must census token/vault endpoints and same-host/reverse-proxy policy; do not merely guard the new operator-session route.                                         | `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:109`; `openspec/planning/2026-09-12-roadmap-completion/evidence/lsc-prep2-20261018.txt:68`                                     |
| FN-ob2 / FN-u96   | B15 only addresses single-operator credential/member access; owner-column/multi-operator clause stays open. FN-u96 live-host PUT remains prospective resolvedBy.                                                                                    | Preserve open statuses until genuine relevant exact-Main proof; no owner-column/schema expansion hidden in B15.                                                                                   | `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`; `openspec/planning/2026-09-12-roadmap-completion/units.json:16750`                                                      |

Search coverage: PROGRESS.md, units.json ownership/behavior/successor registrations and docs/audits were searched for `-> B15`, `B15-PRIV`, `U101`, F1/F2, X-Forwarded-For and Host/Origin. The merged review text is primarily preserved under ledger evidence, not every original docs/audits path; G2A review receipt/text and LSC prep are therefore cited directly. Sources: `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:453`, `openspec/planning/2026-09-12-roadmap-completion/evidence/p2cg1g2a-source-fable-review-20261018.txt:1`, `docs/audits/2026-10-18-b15-ob2-registration-design.md:59`, `docs/audits/2026-10-18-council3-decision.md:32`.

## Dependency DAG and conditional parallel work

The arrows below are a textual adjacency list, separating registered/documentary gates from proposed repairs. They do not create admission authority. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16488`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16541`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16595`.

```text
L1 final closure: ... -> P2C(Task17) -> P2(Task18) -> U38(Task19)
U38 -> B15-0 -> B15-1 -> B15-2 -> B15-4 -> B15-4J -> B15-3R
    -> B15-3 -> B15-5 -> B15-5R -> B15-PRIV -> B15-6
Task57(already done) -> U101a -> {U101b, U101c} -> U101d -> U101 aggregate
Task57 + P2C -> U105
L1/U38 schedule boundary -> U99, U100, U104
P2CER(already done) -> P2CE/P2CG1 ownership prerequisite (historical)

Proposed amendments only:
U38 -> auth-security(F1/F2) / wire-decode / invite-hardening
B15-5R -> invite-hardening -> B15-PRIV -> B15-6
B15 complete -> U101 chain (existing B15 scheduling ruling)
B15-1 + U101d -> registered packaged GUI smoke
All open L2 contracts + smoke + preserved P2CER -> P3 exit/Astra -> v2.3.0
```

U99/U100/U104/U105 have no explicit predecessor in registration, but the overlay places them after L1; U105 additionally retains Task57+Task17. Add the documentary release gates instead of treating planned/NEXT as permission. B15's registration currently serializes the entire group and requires one product/closure lane. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16386`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16634`.

**If Root obtains an explicit second-product-lane amendment:**

| Candidate pair                           | Physical product/test overlap                                                               | Conditions                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| U99 with U100 or most B15 implementation | none among listed literals (U99 harden/coop specs vs activity or B15 design-campaign specs) | freeze narrowed aliases, allocate caps/evidence; serialize shared units.json/closure writes       |
| U100 with U101b after B15                | none among registered literal files                                                         | fresh alias census for src/lib/campaign, separate artifacts and heavy-run slot; U101b waits U101a |
| U101b with U101c                         | none among registered literals                                                              | both wait U101a; freeze campaign/server aliases; U101d waits both; no shared ledger writes        |
| U104 with U101b                          | none among registered literal files                                                         | U104 after L1/B15-3R changes; shared server aliases must be narrowed/documented                   |
| GUI-smoke CI plumbing with U99/U100      | potentially none if no startup/server/socket validator edits                                | first register its literal scope; final GUI proof waits B15-1/U101d                               |

These are **candidate** non-overlap pairs, not current safe admissions: every unit lifecycle uses the common ledger, and ancestor aliases (U105/U101c campaign, U101/server and U104/api/server) require a new fresh census. Never overlap U104 with B15-3R (same launch route/tests), U105 with U101c (same transport/tests), B15-2/PRIV with U101c (same entry/test), B15-1 with U101d (server.js), or any B15 predecessor/successor before its closure. Sources: per-unit literal tables; `docs/audits/2026-10-18-b15-ob2-registration-design.md:59`, `docs/audits/2026-10-18-b15-ob2-registration-design.md:63`.

## Minimal ledger amendments needed now - proposals only

1. Add an L2 release-point/accounting marker with the 20 open holders above, completed P2CER receipt reference, missing packaged GUI-smoke holder, unchanged P3 full-letter/Astra exit and v2.3.0 target. Do not create a second P2CER unit, copy L1 units into L2, or mark tasks delivered. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:95`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:956`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`.
2. Allocate CF-G2A-1/2/3/4/6, CF-G2-10, CF-B14A-8 and LSC F1/F2 to exact implementations: recommended narrow invite/auth-security/wire slices with literal tests and independent evidence; ordinary caps, sensitive classes, genuine packet/ruling gates. Place required invite/privacy fixes before B15-6's remote documentation/claim. Do not load them into the already-full B15-1/2/3R/3 inventories. Sources: carry-forward table; `docs/audits/2026-10-18-b15-ob2-registration-design.md:36`.
3. Register the packaged GUI launch smoke as a bounded unit, including exact CI/launcher/helper/test/lifecycle paths and platform acceptance; preserve existing packaged socket/security proof. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16595`, `.github/workflows/pr-checks.yml:978`.
4. Refresh residual literal/lifecycle manifests on post-L1 Main: U99 (2/120), U100 (3/120), U104 (5/220), U101b/d (8/300) are particularly file-tight. Freeze authentic separate closure outputs where allowed; otherwise register narrower prefixes. Keep aggregate U101 proof distinct. Record measured source/test/lifecycle unions before admission, not arbitrary cap increases. Sources: per-unit caps/manifests above; `openspec/planning/2026-09-12-roadmap-completion/DELIVERY.md:11`.
5. Encode/document U38/B15-first and original Task57/mint->consumer->enforcement/Task17->snapshot gates in the L2 marker and each release decision; preserve historical empty predecessor arrays unless a reviewed amendment changes them. Any second lane requires an explicit amendment to the one-product/closure rule and a literal/ancestor census, not a scheduling inference. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:93`, `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16634`.

## Recommended L2 execution order

1. Finish L1 through genuine U38 exact-Main proof/closure and v2.2.0 release/human-session obligations; perform the documentary amendments above while waiting. No L2 product admission now. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:21`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16635`.
2. Rebase/re-census and deliver B15-0 -> 1 -> 2 -> 4 -> 4J -> 3R -> 3 -> 5 -> 5R, with each review/ruling where sensitive, CI, Main proof and separate closure. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16656`.
3. Deliver newly registered auth-security/wire/invite prefixes at their reviewed gate (recommended after 5R for a simple single-lane schedule), then B15-PRIV -> B15-6. No remote/tunnel claim before all related findings, complete actor x 17-method isolation and actual intended-topology evidence are closed; multi-operator hosting remains unsupported. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:23629`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:460`, `openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md:108`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16859`.
4. Deliver U99 -> U100 -> U104 -> U105, refreshing their RED/fit against the completed L1/B15 inputs. If a second lane is explicitly allowed, U99/U100 are the first clean parallel candidates; otherwise retain one product/closure lane. Sources: literal tables above; `openspec/planning/2026-09-12-roadmap-completion/units.json:16348`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16634`.
5. Deliver U101a -> U101b -> U101c -> U101d -> U101 aggregate exact-Main closure. U101b/c may run in parallel only under the reviewed two-lane conditions above. Keep unscoped REST identity bootstrap during migration and enforce scope on sockets only after all consumers. Sources: `openspec/planning/2026-09-12-roadmap-completion/units.json:16402`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16559`, `openspec/planning/2026-09-12-roadmap-completion/units.json:16231`.
6. Run the newly registered packaged GUI smoke on the final integrated Main and preserve actual platform artifact/runtime evidence; reconcile P2CER as already done. Audit every P3 task letter (withheld application, wrong scope, hidden state, stale lineage, revocation, no-op and reconnect), obtain independent Astra P3-exit review, then publish v2.3.0 under standing release authority. P4 Task33 remains the final production-UAT clause, not a claim made by P3. Sources: `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:22`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/PLAN.md:95`, `E:/Projects/Personal/MekStation/.omo/plans/mekstation-phased-delivery-20261015/STATUS.md:956`.
