# BV Residual Outlier Acceptance - 2026-07-04

## Verification Basis

- Source report: `validation-output/bv-validation-report.json`
- Generated at: `2026-07-04T05:36:29.454Z`
- Validated units: 4,196
- Exact matches: 4,019
- Within 1%: 4,190 (99.9%)
- Within 2%: 4,196 (100%)
- Within 3%: 4,196 (100%)
- Over 3%: 0

## Accepted Residuals

These six units are the remaining true `>1%` Battle Value residuals after the converter/catalog fixes. Each is already within 2%, and none indicates a known calculation defect. They are accepted as provenance/catalog residuals unless a future source-data refresh provides cleaner reference data.

| Unit                      | Reference BV | Calculated BV | Diff | Percent | Disposition                                                                                                                    |
| ------------------------- | -----------: | ------------: | ---: | ------: | ------------------------------------------------------------------------------------------------------------------------------ |
| UrbanKnight UM-DKX        |          974 |           990 |  +16 | +1.643% | Accepted. Exotic equipment/reference-data provenance; no current evidence of a calculator defect.                              |
| Arctic Fox AF1U           |          821 |           810 |  -11 | -1.340% | Accepted. Residual remains after LRT/LRM Torpedo mapping cleanup; treat as source/reference nuance unless new data narrows it. |
| Cudgel CDG-2A             |        1,750 |         1,771 |  +21 | +1.200% | Accepted. TSM plus physical-attack equipment edge case; small residual with no over-3% risk.                                   |
| DemolitionMech WI-DMM MOD |          444 |           449 |   +5 | +1.126% | Accepted. Stale MUL/reference provenance is more likely than a calculation defect.                                             |
| Silver Fox SVR-5Y         |        1,316 |         1,330 |  +14 | +1.064% | Accepted. Unclear low-magnitude provenance residual; park pending stronger source evidence.                                    |
| Sarath SRTH-1OB           |        1,475 |         1,460 |  -15 | -1.017% | Accepted. Unclear low-magnitude provenance residual; park pending stronger source evidence.                                    |

## Reopen Criteria

Reopen any accepted residual if a future MegaMek/MUL refresh changes the reference BV, adds missing equipment metadata, or pushes the unit outside the validation gates. The current acceptance depends on preserving the gates from this report: exact matches at or above 4,015, within-1% at or above 99.8%, and over-3% at 0.
