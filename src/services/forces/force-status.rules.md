# Vault force status rules

`forceStatus.ts` owns exact parsing against `ForceStatus`. API PATCH parses external input; the repository operation enforces it before mutation. Every valid force transition is allowed. Creation and cloning start Active.

`ForceService.validation.ts` owns pilot availability for assignment and validation: Active/Injured are available; MIA/KIA/Retired and unrecognized persisted statuses are unavailable. Campaign force/roster vocabularies are separate. See `openspec/changes/validate-vault-pilot-force-status/design.md` for caller paths and the documentation-only cleanup procedure.
