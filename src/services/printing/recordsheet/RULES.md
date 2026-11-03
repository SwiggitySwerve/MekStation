# Record-sheet figures

Construction and equipment owners decide numerical values. The customizer builders project their results into RecordSheetService; preview and export must use the same builder.

- Vehicle BV uses computeVehicleBVFromState, including structure type and chassis protection. Aerospace BV uses calculateBattleValueForUnit with the original subtype, support marker, thrust, heat sinks, armor total and mounts. Neither path reads a saved BV estimate.
- Small-unit preview/export callers pass the full typed source snapshot. All three sheet BV paths call calculateBattleValueForUnit; typed editor snapshots reuse the existing pure state BV owners, retaining native source protection, mount facts and field-gun ammo guards. Missing source is only the legacy partial-input compatibility path.
- BA header tonnage follows canonical default transport weight (squad size), not suit mass. Infantry transport tonnage uses calculateInfantryTransportWeight. ProtoMech topology comes from explicit chassis/main-gun facts.
- Ares loader configuration reuses deriveEffectiveConfiguration so the superheavy tripod cockpit retains its center-leg armor, structure and asset; other mech projections stay unchanged.
- The aerospace subtype selects the conventional fighter flag before sheet dispatch. Small craft still use the fighter sheet and need a separate template.
- Non-mech equipment keeps its mount id and catalog equipmentId separate. Resolve exact catalog identity/name through the equipment service; reuse the mech equipment formatter for damage, range and ammo figures. Unknown/partial names retain dashes. Explicit caller values (including zero) take precedence.
- Aerospace heat capacity calls calculateHeatDissipation through the shared heat-sink type mapper. Mech extraction remains unchanged.
- Vehicle motion labels preserve Hydrofoil, Submarine and Rail. The shared motion tuple owns both the TypeScript and Zod contracts. PrintTank template selection uses naval for Hydrofoil, submarine for Submarine, wige for standard WiGE, and vehicle for Rail and superheavy WiGE. Preview/export, extraction and the schema preserve the construction owner's isSuperheavy flag; printing never recomputes weight limits. The loader uses getSupportVehicleSizeIndex for support chassis and isSuperHeavyTank for combat chassis. VTOL always uses standard assets and still refuses the absent dual-turret template. Both paper manifests register every selected asset.

Enforcement: recordSheetFigures.test.ts covers the repaired boundaries; catalogRecordSheets.test.ts traverses all six committed indexes through production builders/extractors/selectors/bindings. It rejects repaired mismatch classes and snapshots the complete named residual digest/counts. Review snapshot changes against the emitted per-unit audit (RECORD_SHEET_AUDIT directory); never update snapshots to approve a new mismatch without investigation.

The model harness does not certify template equipment rows, pixels, PDF output, or MegaMek parity. Capital sheets, support/superheavy topology, and the remaining BA/infantry/ProtoMech gaps are separate work.
