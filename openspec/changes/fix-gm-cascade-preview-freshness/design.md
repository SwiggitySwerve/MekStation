# Design

Freshness belongs to cascade preparation, not command builders or React rendering. A preview carries a transient discriminated token: campaign identity/version/date for campaign state, or an existing hashState fingerprint for tactical and other state. Preparation compares that token before calling the domain implementer. Missing freshness on an otherwise ready preview is blocked; callers regenerate previews rather than approving an unversioned projection.

The existing time-correction checks retain their exact reasons and behavior. Those checks validate command-supplied time bases; the new token independently binds every projection to the state used to produce it. The reducer continues to own UI action tokens and uses its existing blocked transition.

Approved records are explicitly constructed and omit freshness. Persisted campaign effects and host-only funds intents retain their existing shapes. The co-op guard compares caller state before sending; it does not compare the host's journal version.

Canonical records permit approved and manual only. Existing append enforcement already rejects previewed/cancelled. Repository producers persist campaign effect histories rather than transient previews; removal requires no migration. Arbitrary externally fabricated historical data is outside the repository writer guarantee.
