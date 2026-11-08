# Design

CampaignGmArbiter owns proposal ID uniqueness for its lifetime and rejects duplicates before validation or commit. The existing malformed-intent rejection shape avoids wire schema changes. Closing resolves queued proposals, cancels timers, and publishes closure to local subscribers, including runtime callers still awaiting admission or commit.

The local runtime installs its waiter before invoking the arbiter and never replaces an existing waiter for a duplicate. The arbiter still decides acceptance. Its closure subscription drains every remaining waiter with session-closed.

The campaign socket exposes an optional local onClose subscription, notifying once even on caller close and replaying the signal to late subscribers. Replacing an active transport settles old proposal waiters through the existing registry observer without closing foreign transport objects; delayed old socket callbacks cannot release the new transport. The proposal adapter reserves IDs per transport, registers listeners before sending, resolves errors/closure/send failures as terminal session-closed results, and removes listeners once.

Consumers continue submitting campaign intents to authoritative hosts and receiving server decisions. There is no new wire frame or persisted ID registry. A new arbiter/transport lifetime permits a new submission after reconnect. The canonical capability is openspec/specs/coop-campaign-sync/spec.md.

## Wire caller guard

Root approved adding bindCampaignSyncConnection.ts and its existing test suite after discovery that every terminal submission result was broadcast. Immediately before submission, the binder asks the arbiter whether the ID was already submitted, with no intervening await. It sends only that socket the existing Error frame (code INVALID_INTENT, reason malformed-intent, intentId carrying the proposal ID). No CampaignDecision is broadcast for the duplicate, so the original guest waiter and GM queue retain their pending proposal. The arbiter independently enforces ID uniqueness for direct callers.

The binder regression was recorded red before this guard: it received duplicate CampaignDecision frames instead of the sender-only Error. The additional files remain within the multiplayer server directory gate.

## Behavior-preserving extraction

Root approved extracting the existing review-context functions into campaignGmProposalContext.ts to keep CampaignGmArbiter under its 400-line lint bound. relevantStandingFor, describeProposalEffect, and its private formatCbills move unchanged; CampaignGmArbiter retains its public describeProposalEffect export. This extraction is verified and committed independently before the lifecycle fix.
