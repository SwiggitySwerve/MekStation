# Authorized archive and customizer follow-ups

The user authorized continuing the three proposed archives and the remaining customizer work on 2026-09-12. This record extends the earlier reconciliation; `verification.json`, `changed-files.json`, and their evidence remain dated snapshots of that first phase. Current follow-up results are in `followup-verification.json`.

## Archives

`repair-equipment-catalog`, `establish-battlemech-chassis-index`, and `add-customizer-edit-recovery` moved to `openspec/changes/archive/2026-09-12-<name>`. All 15 source files, including each `.openspec.yaml`, matched the proposed SHA-256 manifest before and after movement. Only those three active-ledger entries were removed. Canonical requirement titles were verified present before movement. `archive-result.json` records completion at 09:42 UTC and 12 remaining packages at that moment; the later explicit-routing package brings the current active total to 13.

No further package was archived automatically. In particular, earlier record-sheet task receipts remain intact, and the follow-up evidence is attached to its Infantry task separately.

## Infantry preview

`src/components/customizer/infantry/InfantryPreviewTab.tsx` now uses the existing `PreviewTabFrame` and `useRecordSheetToolbarActions`. `InfantryRecordSheetPreview.tsx` now uses the existing `useRecordSheetCanvasRenderer` and `RecordSheetCanvasPreview`. The duplicated direct-canvas asynchronous effect and fixed-size markup were removed. Infantry selectors and the Infantry unit builder remain the source of its sheet data.

This gives Infantry the existing manual 20–300% zoom, 15-point increments, Fit Width/Fit Page modes, paper-aware display dimensions, and a staged canvas commit that rejects older requests and disposed canvases. Manual zoom persists across resize and paper changes. The legacy scale prop remains accepted for compatibility; the shared controls determine display scale. Print and PDF preserve their click-time unit/paper snapshot through the existing toolbar actions.

The new component regression deliberately completes a newer render before an older render. Against the original source it observes the old width 111 replacing the current width 222; the fixed source preserves 222. A second regression proves the actual zoom controls appear inside an Infantry store. The existing mount, type dispatch, extractor, and synchronous print reservation assertions remain. Parent characterization restored the final source bytes in a `finally` block and verified their equality after the negative test.

## Explicit route precedence

`src/hooks/useCustomizerRouter.ts` adds `hasExplicitTab` to its parsed result, true only for an explicitly supplied valid tab. `src/components/customizer/CustomizerWithRouter.tsx` uses that signal when choosing between the URL and the stored last subtab. Structure now behaves like the other explicit valid tabs. Omitted and invalid tab segments retain stored/default restoration; malformed unit handling, shallow navigation, campaign query preservation, and hydration readiness remain on their existing paths.

The hook tests cover route-template recovery, explicit Structure, omission, another explicit valid tab, and an invalid tab. The composition regression renders the actual customizer/router combination with a persisted Preview selection and verifies both explicit Structure and omitted-tab restoration. The resolver remains private. Browser coverage opens a real edited draft through an explicit Structure URL, reloads, checks identity/edits, then verifies omission restores Preview.

## Browser coverage and test repairs

The same three-file CI selection now resolves to 12 cases: equipment catalog 3, record-sheet rendering 6, and edit recovery 3. The new Infantry scenario exercises real unit creation, zoom persistence, both fit modes, A4 backing dimensions, a generated single-page A4 PDF, and a 390px viewport. Both new behavior scenarios failed against the pre-fix production build.

The first rebuilt run found two selector problems after reaching the new behavior: the existing armor test selected any spinbutton before the asynchronous destination tab settled, and the new paper selector omitted the colon in its accessible name. The tests now select `Armor tonnage` and exact `Paper Size:`. No forced click, fixed sleep, skipped assertion, or product-error suppression was introduced. The original failed run and subsequent full-pack result remain separate evidence.

## Specifications and inventory

Canonical `record-sheet-export` includes Infantry in shared viewer scope and adds a staged-render scenario; its active delta carries the same scenario. Canonical `customizer-routing` and `customizer-tabs` define explicit-tab precedence and document the parser fields. The new routing change contains proposal, design, tasks, and a strict-valid delta. Canonical/active `e2e-testing` and the CI proposal/design reflect the 12-case selection and two added scenarios.

The inventory now separates active and archived packages while preserving every baseline review. The new overview groups all 220 canonical specs and explains the 13 active packages, unstarted plans, partial implementations, and acceptance gaps. The vault/maps proposal's stale promise to remove name/tonnage inference was corrected because the current creation flow already uses explicit references and minted instance IDs.

## Evidence limits

The operating-system print dialog, full nightly browser suite, Firefox/WebKit, desktop packaging, broad CAMP three-witness journey, and production activation of the GitHub check are outside the local follow-up proof. A checked task or a canonical specification is not a universal implementation claim. No commit, push, or PR was created during this local reconciliation; the unrelated printable-model research remains untouched.
