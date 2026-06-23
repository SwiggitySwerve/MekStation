# Design

## Approach
Extend `scripts/qc/journey-qc-core.mjs` because it already owns journey catalog, validation graph, logging map, and UI flow shell validation. Add a focused inspection model that can be reused by a small CLI wrapper.

## Validation Boundary
- `qc:journeys:validate` continues to validate the entire journey QC bundle.
- `qc:ui-flow-shell:validate` validates only the shell contract and reports shell-specific counts.
- `qc:ui-flow-shell -- --journey=<id>` prints the selected player/GM checkpoint sequence and QC command.
- `qc:ui-flow-shell -- --journey=<id> --json` emits automation-friendly JSON.

## Checkpoint Order
The shell validator maintains a required checkpoint sequence per required journey. The sequence is an ordered subsequence gate: flows may include extra checkpoints, but required checkpoints must remain present and ordered.

## Browser Execution
This wave keeps browser signoff separate. Route placeholders such as `:campaignId` remain validation targets matched to page templates, not generated runtime IDs.
