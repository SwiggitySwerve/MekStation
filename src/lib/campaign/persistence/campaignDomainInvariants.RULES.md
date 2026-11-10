# Campaign domain invariants

`campaignDomainInvariants.ts` owns the registry and refusal details. Status facts
come only from `refit/refitOrderStatus.ts`. Only refit one-open-per-unit is registered.
A unit may retain or reduce its stored open count; it cannot exceed both one and
its stored count. Counts are per unit and terminal history never counts.

`campaignRecordRow.plan` evaluates after authority, replay fence and version CAS,
inside the writer transaction, before any row write or journal append. No schema
or serialized envelope field changes. PUT returns the typed 422 refusal and the
row/version/journal remain unchanged. Refusals log at info.

Only the adopt route supplies legacy-adoption purpose. Tolerance applies solely
to new rows, warns and retains every duplicate. Server journal materialization
checks against null to observe all duplicates, warns and never refuses. Other
writers cannot acquire adoption tolerance by including a field in the envelope.

Client 422 parsing uses the existing refused-save transition: dirty remains true,
saveState is error, server error is visible, no automatic retry. PR C owns the
full Can't save card, discard action, client/flush pre-flight and adoption-marker
blocking after the save-loss adoption change.
