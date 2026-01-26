# Draft: Campaign Phase 2 — High-Impact Systems Planning

## Requirements (confirmed)
- **Scope**: 5 individual plans for high-impact systems, then 12+ remaining systems
- **Systems**: Day Advancement, Turnover/Retention, Repair Quality, Financial Expansion, Faction Standing
- **Architecture**: Plugin/registry pattern for day advancement pipeline
- **Test Strategy**: TDD (RED-GREEN-REFACTOR), same as MVP
- **Formula Fidelity**: Exact MekHQ formulas (1:1 parity)
- **Missing Dependencies**: Stub with neutral defaults, flag with TODO for future
- **UI Scope**: UI included per system plan (not separated)
- **Plan Format**: One plan per system (manageable, independent)

## Technical Decisions
- Day advancement uses plugin/registry so modules self-register
- All modifier formulas match MekHQ Java code exactly
- Modifiers referencing unbuilt systems return 0 with TODO flags
- Each plan is self-contained with its own UI work

## Research Sources
- `mekhq-vs-mekstation-analysis.md` — 80-feature comparison
- `mekhq-modifier-systems.md` — 9 complete calculation pipelines
- `mekhq-campaign-system.md` — Completed MVP plan (all TODOs done)

## Scope Boundaries
- INCLUDE: All 5 high-impact systems with full depth
- INCLUDE: Remaining 12+ systems after high-impact complete
- EXCLUDE: StratCon, Story Arcs, Interstellar Map (Phase 3+)
- EXCLUDE: MekHQ save file import

## Open Questions
- None — all decisions captured
