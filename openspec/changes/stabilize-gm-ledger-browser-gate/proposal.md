## Why

The GM ledger browser spec assumes repair emits one event and reads the asynchronous E2E store hook without waiting. It fails or flakes on main, and the explicit PR E2E inventory excludes it despite route-coverage metadata listing it.

## What Changes

Match the established two-effect repair contract. Wait for store exposure before clearing campaign state, stamping guest state or reading campaign time, and poll the initial campaign date. Add all seven tests to the existing one-worker, zero-retry gates suite, keeping the file atomic across the two shards. Update both the workflow invocation and its enforcing planner inventory.

## Capabilities

### Modified Capabilities
- `gm-campaign-intervention-boundaries`: require the GM ledger browser proof in the PR gate.

## Impact

E2E harness and existing CI selection only. No product, schema, persistence, engine, AI, multiplayer authority, P2P or simulation changes. Nightly already selects this spec. Hosted runtime will be measured from the PR's E2E timing artifact without inventing timing seeds.
