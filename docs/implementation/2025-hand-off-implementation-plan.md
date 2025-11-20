# 2025 Handoff Implementation Plan

_Source: `docs/HANDOFF_REFACTOR_2025.md` (Type System & Critical Slots refactor)_

This plan translates the 2025 refactor handoff into concrete implementation work. It keeps all BattleTech construction, validation, and critical slot rules aligned with the official references documented in `docs/battletech/agents/00-INDEX.md`, `docs/battletech/agents/01-construction-rules.md`, and the canonical constants in `constants/BattleTechConstructionRules.ts`.

---

## 1. Objectives & Success Criteria

- **Eliminate `any` usage** in the remaining UI/services called out by the handoff.
- **Guarantee schema alignment** with `ICompleteUnitConfiguration` (Layer 3) and UI types (Layer 4).
- **Preserve BattleTech legality** by re-validating all construction rules after each migration step against:
  - Structure, armor, engine, heat sink rules (`01-construction-rules.md`)
  - Validation/slot distribution rules (`02-validation-rules.md`, `03-critical-slots.md`)
- **Regression-safety:** Maintain full unit editing UX parity (Structure tab, armor/weight calculations) and keep Jest + lint suites green.

Success is verified when the targeted files compile without casts, critical slot + weight calculations match `BattleTechConstructionRules.ts`, and validation suites exercise the stricter types.

---

## 2. Workstreams

### 2.1 StructureTab Strict Typing (UI Layer)

**Problem:** `components/editor/tabs/StructureTab.tsx` mixes legacy strings with new component objects and relies on `as any` when calling `updateConfiguration`.

**Deliverables:**
- `StructureTab` uses typed helpers from `types/core/BaseTypes.ts`, `types/systemComponents`, and `types/criticalSlots.ts`.
- Local state derives from `ICompleteUnitConfiguration` and `ComponentConfiguration` rather than ad‑hoc strings.
- Memory/tech progression helpers exchange typed payloads (no implicit `Record<string, string>`).

**Steps:**
1. **Type inventory:** Map every `UnitConfiguration` property to the canonical type (e.g., `structureType: ComponentConfiguration | null`, `enhancements: ComponentConfiguration[]`). Document gaps inline.
2. **Introduce typed enums/interfaces** for repeated literals (`StructureType`, `GyroType`, `HeatSinkType`) if not already exported from `types/systemComponents`.
3. **Refactor handlers** (`handleStructureTypeChange`, etc.) to return `ComponentConfiguration` objects without `as any`. Update `updateConfig` signature to accept `Partial<ICompleteUnitConfiguration>`.
4. **Memory system alignment:** Update `TechBaseMemory` helpers to store `ComponentConfiguration` instead of strings; adjust serialization helpers accordingly.
5. **Validation hook-up:** Ensure changes still respect structure/armor/engine rules by asserting against `calculateStructureWeight`, `calculateMaxArmorTonnage`, and referencing `docs/battletech/agents/01-construction-rules.md`.
6. **Testing:** Extend or add component tests validating typed handler outputs, ensuring no regressions in movement/heat calculations.

### 2.2 Validation Services Type Migration

**Problem:** Files under `services/validation/*` still rely on loosely typed inputs, undermining rule enforcement described in `docs/battletech/agents/02-validation-rules.md` and `03-critical-slots.md`.

**Deliverables:**
- Every validator consumes `ICompleteUnitConfiguration` (Layer 3) and typed collections (`IEquipmentInstance[]`, `ICriticalSlot[]`).
- Shared validation context (`IValidationContext`) centralizes derived data (tonnage, available slots, armor max) computed via `constants/BattleTechConstructionRules.ts`.
- Lint rule preventing `any` within `services/validation`.

**Steps:**
1. **Audit validators:** Document current inputs/outputs per file, highlight unsafe casts.
2. **Define `IValidationContext`:** (tonnage, weight budget, slot map, tech base, era) referencing calculations from `utils/constructionRules/*`.
3. **Refactor sequentially:** Start with leaf validators (structure, armor, critical slots) to accept typed context, then update orchestrators (`ValidationManager`, `ConstructionRulesValidator`).
4. **Introduce exhaustive switch/enum guards** for tech base + rules level to ensure compile-time coverage.
5. **Unit tests:** Expand validator tests under `__tests__/services/` to include mixed tech + advanced systems cases, verifying compliance with `01-construction-rules.md` and `03-critical-slots.md`.
6. **Docs:** Update `docs/battletech/agents/02-validation-rules.md` with references to the new context type if needed.

### 2.3 Weight Balance Services Alignment

**Problem:** `services/WeightBalanceService.ts` and dependent services (`WeightCalculationService`, `WeightOptimizationService`, `WeightBalanceAnalysisService`) must consume strict `IEquipmentInstance[]` lists while honoring construction constants.

**Deliverables:**
- Weight services operate on typed allocations (system vs. inventory) using `SystemAllocation` / `EquipmentAllocation`.
- Calculations source constants exclusively from `BattleTechConstructionRules.ts`.
- Consumers (`components/overview`, reports) updated to handle typed responses.

**Steps:**
1. **Model definition:** Confirm `IEquipmentInstance` shape (Layer 3) and ensure it includes `weight`, `criticalSlots`, `techBase`.
2. **Refactor WeightBalanceService:**
   - Replace generic arrays with `IEquipmentInstance[]`.
   - Distinguish fixed system mass (structure, engine) versus inventory weight.
   - Introduce helper to compute structure/armor limits referencing `docs/battletech/agents/01-construction-rules.md`.
3. **Cascade updates:** Adjust downstream services to consume the typed output; remove `as IEquipmentInstance[]`.
4. **Regression suite:** Expand existing tests (likely in `__tests__/services/WeightBalanceService.test.ts`) to cover IS/Clan tech, exotic structures (Endo Steel, Composite), ensuring totals respect tonnage.
5. **Performance check:** Run profiling (if scripts exist) to confirm no significant regressions for large unit configs.

---

## 3. Cross-Cutting Tasks

- **Shared Type Utilities:** Create/update a `types/construction/index.ts` barrel to expose frequently used interfaces (prevents duplicate definitions and satisfies “no duplicate files” rule).
- **ESLint Enforcement:** Extend custom rule set (see `eslint-plugins/layout-standards/`) so `services/validation` and `components/editor/tabs` cannot use `any`.
- **Documentation:** After each workstream, append a short “Refactor Completion” note to `docs/HANDOFF_REFACTOR_2025.md` or link this plan for status tracking.
- **BattleTech Rule Checks:** After each major refactor, run existing validation suites plus targeted calculations to ensure compliance with `01-construction-rules.md` and `03-critical-slots.md`.

---

## 4. Testing & Verification Strategy

1. **Unit Tests:** Augment component + service tests covering:
   - Structure tab handlers (selecting Endo Steel, gyro variants, heat sink swaps).
   - Validator edge cases (over-tonnage, slot overflow, illegal tech mix).
   - Weight balance calculations for IS vs. Clan vs. Industrial mechs.
2. **Integration Tests:** Re-run editor integration tests under `__tests__/integration/` to ensure drag/drop and configuration flows still succeed with typed payloads.
3. **Rule Regression:** Use validation scripts or snapshots comparing calculated structure/armor values against `BattleTechConstructionRules.ts`.
4. **Manual QA Checklist:** 
   - Load sample units of varying tonnage.
   - Toggle tech progression memory and confirm persistence.
   - Verify weight summary never exceeds tonnage and slots never go negative.

---

## 5. Timeline & Dependencies

| Week | Focus | Dependencies |
| --- | --- | --- |
| 1 | StructureTab typing & memory cleanup | Access to `types/systemComponents`, component tests |
| 2 | Validation context refactor (structure/armor/slots validators) | Updated types from Week 1 |
| 3 | Remaining validators + ConstructionRulesValidator integration | Context type + test baselines |
| 4 | WeightBalance service chain + regression tests | Typed validators (for shared context) |
| 5 | Cross-cutting ESLint/doc updates, final QA | All workstreams |

Parallel efforts are possible (e.g., start on weight services once `IEquipmentInstance` verified), but keep sequencing above to minimize churn.

---

## 6. Risks & Mitigations

- **Type mismatches between layers:** Mitigate by introducing dedicated adapters (Layer 3 → Layer 4) and enforcing them via unit tests.
- **Rule regressions:** Continuously cross-check against `docs/battletech/agents/01-construction-rules.md` and rerun validator suites after each change set.
- **Legacy string consumers:** Identify remaining string-based APIs early and either migrate or create typed wrappers to avoid blocking the refactor.
- **Test coverage gaps:** Add regression cases for advanced tech (Endo Steel, XL Gyros) to ensure new types cover `docs/battletech/agents/08-advanced-systems.md`.

---

## 7. Definition of Done

- No `any` usage in targeted files; ESLint enforces this.
- UI + services compile against strict BattleTech type layers.
- Validation + weight calculations demonstrably match the rules in `BattleTechConstructionRules.ts`.
- Documentation updated (this plan + handoff doc status).
- All tests and lint pass (`npm run lint`, `npm run test`).

Once the above criteria are met, the 2025 handoff items are considered fully implemented and ready for further feature work.
