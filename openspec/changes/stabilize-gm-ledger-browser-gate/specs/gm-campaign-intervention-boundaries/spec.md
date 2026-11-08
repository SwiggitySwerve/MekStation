## ADDED Requirements

### Requirement: GM Ledger Browser Proof Runs on Pull Requests

The existing pull-request Chromium regression gates SHALL execute the GM campaign ledger control-plane spec once across their two shards, on one worker with zero retries. The spec SHALL await the exposed campaign store before accessing it and SHALL assert repair completion's distinct ticket and unit-state effects. Campaign time assertions SHALL wait for a readable initial date. The CI planner and workflow invocation SHALL agree on the selected file inventory.

#### Scenario: GM ledger test file enters the PR gate
- **GIVEN** a code or E2E pull request
- **WHEN** the two E2E shards allocate their live test census
- **THEN** all seven GM ledger browser tests SHALL be selected once on one shard with zero retries

#### Scenario: E2E store exposure follows page hydration
- **GIVEN** the campaign page is visible before the E2E store hook is published
- **WHEN** the spec reads campaign time or clears client state
- **THEN** the spec SHALL wait for store exposure rather than reporting a campaign hydration failure
