## Why

GM corrections replace live state without recording an event. The next action
rebuilds state from history and discards the correction, including heat 0 → 17 → 0
when advancing from Initiative to Movement.

## What Changes

- Record closed, typed `gm_correction_applied` resolved effects through the
  existing intervention projection owner, with no private ledger data.
- Match ordinary event disclosure for each supported leaf in both fog modes.
- Refuse rescued, unit activation/order leaves, undefined pending actions and
  the complete unit-reload family with named reasons.
- Require R11a's version contract and reload-required reader compatibility;
  introduce the correction rule at the next producer version in a final commit.
- Keep P2P corrections and the interim UI disable in force pending full writer,
  hosted recovery and viewer proof. Re-enablement is a follow-up.

## Impact

Capabilities: gm-combat-interventions, game-state-management, multiplayer-sync.
The new event changes producer rules; historical recordings are not rewritten.
No generated construction contracts or catalogs change.
