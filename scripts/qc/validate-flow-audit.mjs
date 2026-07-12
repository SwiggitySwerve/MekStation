#!/usr/bin/env node
/**
 * Flow-Audit Registry Validator
 *
 * Static, non-browser-launching cross-check between the flow-audit manifest
 * (`e2e/flows/manifest.ts`, the single source of truth per design D1) and its
 * implementation (`e2e/flow-audits.spec.ts`'s `FLOW_STAGES` table), plus the
 * spec's coverage requirements. Runs before any Playwright process spawns, so
 * a registry/implementation mismatch that would otherwise only surface as a
 * runtime "No stage implementation registered for flow" error (thrown deep
 * inside `executeFlow`, only for the ONE flow being run) is caught for EVERY
 * flow up front, in CI or pre-commit, without launching a browser.
 *
 * Checks (spec: Flow Registry, Subsystem Flow Coverage):
 *   1. No duplicate flow ids; no flow with zero checkpoints (redundant with
 *      `validateFlowManifest()` in manifest.ts, which only runs when the
 *      manifest is actually imported -- this check also covers the
 *      JSON-override fixture path used by the jest wrapper).
 *   2. No duplicate checkpoint names within a single flow.
 *   3. Every one of the six subsystem tags is covered by >=1 flow.
 *   4. Manifest flow ids <-> `flow-audits.spec.ts` `FLOW_STAGES` keys,
 *      bidirectional. Generated Playwright test titles equal `flow.id` by
 *      construction of the `for (const flow of FLOW_MANIFEST) { test(flow.id, ...) }`
 *      loop (design D1), so cross-checking `FLOW_STAGES` -- the per-flow
 *      implementation table the loop's test body actually drives -- is the
 *      concrete static analog of "manifest ids <-> spec test titles" that a
 *      non-browser validator can verify.
 *   5. Per-flow: manifest checkpoint names <-> `FLOW_STAGES[flowId]` keys,
 *      bidirectional.
 *   6. The spec still generates tests via `for (const flow of FLOW_MANIFEST)`
 *      -- guards the mechanism in #4 itself against silent drift (e.g. someone
 *      hardcoding a test list instead of iterating the manifest).
 *
 * Usage:
 *   node scripts/qc/validate-flow-audit.mjs            human-readable report
 *   node scripts/qc/validate-flow-audit.mjs --json      machine-readable report
 *
 * Env overrides (jest-wrapper fixture injection, mirrors every other
 * scripts/qc/validate-*.mjs):
 *   MEKSTATION_FLOW_MANIFEST_JSON_PATH   pre-serialized IFlowDefinition[] JSON
 *                                        (skips the real manifest read below)
 *   MEKSTATION_FLOW_AUDIT_SPEC_PATH      alternate flow-audits.spec.ts-shaped
 *                                        source file to parse
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tsModule from 'typescript';

// The `typescript` package is CommonJS; Node's ESM/CJS interop hands the
// whole `module.exports` object to the default import, so unwrap defensively
// in case a future typescript version changes its interop shape.
const ts = tsModule.default ?? tsModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const manifestJsonPathOverride = process.env.MEKSTATION_FLOW_MANIFEST_JSON_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_FLOW_MANIFEST_JSON_PATH)
  : null;
const specPath = process.env.MEKSTATION_FLOW_AUDIT_SPEC_PATH
  ? path.resolve(repoRoot, process.env.MEKSTATION_FLOW_AUDIT_SPEC_PATH)
  : path.join(repoRoot, 'e2e', 'flow-audits.spec.ts');

/** The spec's closed six-tag subsystem vocabulary (spec: Flow Registry). */
const REQUIRED_SUBSYSTEMS = [
  'navigation',
  'combat',
  'economy',
  'maintenance',
  'personnel',
  'experience',
];

// Tags an issue 'error' (vs. a hand-built 'warning' object) so main()'s
// error/warning split and JSON `status` field don't need a second literal
// scattered across every call site.
function fail(message, details = {}) {
  return { severity: 'error', message, ...details };
}

/**
 * Load the flow manifest. Normal runs shell out to the `list-flow-audit.ts`
 * tsx sidecar -- the same single read path `run-flow-audit.mjs` uses (design
 * D6) -- so this validator never diverges from what the runner sees. Jest
 * fixtures skip the tsx round-trip by pointing
 * MEKSTATION_FLOW_MANIFEST_JSON_PATH at a pre-serialized array instead.
 */
function loadManifest() {
  if (manifestJsonPathOverride) {
    return JSON.parse(fs.readFileSync(manifestJsonPathOverride, 'utf8'));
  }
  const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const listScript = path.join(repoRoot, 'scripts', 'qc', 'list-flow-audit.ts');
  const result = spawnSync(process.execPath, [tsxCli, listScript], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.error) {
    console.error(`Failed to read flow manifest: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      `Flow manifest failed to load (exit ${result.status}):\n${result.stderr || result.stdout}`,
    );
    process.exit(1);
  }
  return JSON.parse(result.stdout);
}

/** Read a property/string-literal key's text value, or null for non-literal keys. */
function stringLiteralValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function isFlowStagesDeclaration(node) {
  if (!ts.isVariableDeclaration(node)) return false;
  if (!ts.isIdentifier(node.name) || node.name.text !== 'FLOW_STAGES') {
    return false;
  }
  return Boolean(
    node.initializer && ts.isObjectLiteralExpression(node.initializer),
  );
}

function findFlowStagesNode(sourceFile) {
  let flowStagesNode = null;

  function visit(node) {
    if (isFlowStagesDeclaration(node)) {
      flowStagesNode = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return flowStagesNode;
}

function checkpointNamesForFlow(flowStageProperty) {
  if (!ts.isObjectLiteralExpression(flowStageProperty.initializer)) return [];

  const checkpointNames = [];
  for (const checkpointProperty of flowStageProperty.initializer.properties) {
    if (!ts.isPropertyAssignment(checkpointProperty)) continue;
    const checkpointName = stringLiteralValue(checkpointProperty.name);
    if (checkpointName !== null) checkpointNames.push(checkpointName);
  }
  return checkpointNames;
}

/**
 * Statically parse `FLOW_STAGES` out of the flow-audit spec file's syntax
 * tree. Deliberately a syntax-only parse (no type-checking, no module
 * resolution) -- importing the real spec file directly would execute
 * `@playwright/test`'s `test()`/`test.describe()` calls outside the
 * Playwright test runner, which is unsupported. Returns the top-level
 * `FLOW_STAGES` keys (flow ids) mapped to their nested keys (checkpoint
 * names), plus whether the manifest-driven generation loop is still present.
 */
function parseFlowStages(sourceText) {
  const sourceFile = ts.createSourceFile(
    specPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const flowStagesNode = findFlowStagesNode(sourceFile);

  const flowIdToCheckpointNames = new Map();
  if (!flowStagesNode) {
    return {
      flowStagesFound: false,
      flowIdToCheckpointNames,
      hasManifestDrivenLoop:
        /for\s*\(\s*const\s+flow\s+of\s+FLOW_MANIFEST\s*\)/.test(sourceText),
    };
  }
  for (const flowStageProperty of flowStagesNode.properties) {
    if (!ts.isPropertyAssignment(flowStageProperty)) continue;
    const flowId = stringLiteralValue(flowStageProperty.name);
    if (flowId === null) continue;
    flowIdToCheckpointNames.set(
      flowId,
      checkpointNamesForFlow(flowStageProperty),
    );
  }

  const hasManifestDrivenLoop =
    /for\s*\(\s*const\s+flow\s+of\s+FLOW_MANIFEST\s*\)/.test(sourceText);

  return {
    flowStagesFound: flowStagesNode !== null,
    flowIdToCheckpointNames,
    hasManifestDrivenLoop,
  };
}

/** Checks 1-2: duplicate flow ids, zero-checkpoint flows, duplicate checkpoints per flow. */
function validateManifestShape(flows, issues) {
  const seenFlowIds = new Set();
  for (const flow of flows) {
    if (typeof flow.id !== 'string' || flow.id.trim() === '') {
      issues.push(fail('Flow manifest entry is missing a valid id.'));
      continue;
    }
    if (seenFlowIds.has(flow.id)) {
      issues.push(
        fail(`Duplicate flow id in manifest: "${flow.id}".`, {
          flowId: flow.id,
        }),
      );
    }
    seenFlowIds.add(flow.id);

    if (!Array.isArray(flow.checkpoints) || flow.checkpoints.length === 0) {
      issues.push(
        fail(`Flow "${flow.id}" has zero checkpoints.`, { flowId: flow.id }),
      );
      continue;
    }

    const seenCheckpoints = new Set();
    for (const checkpoint of flow.checkpoints) {
      if (seenCheckpoints.has(checkpoint.name)) {
        issues.push(
          fail(
            `Flow "${flow.id}" has duplicate checkpoint "${checkpoint.name}".`,
            { flowId: flow.id, checkpoint: checkpoint.name },
          ),
        );
      }
      seenCheckpoints.add(checkpoint.name);
    }
  }
}

/** Check 3: every subsystem tag in the closed vocabulary has >=1 flow. */
function validateSubsystemCoverage(flows, issues) {
  const coverage = new Map(REQUIRED_SUBSYSTEMS.map((tag) => [tag, []]));
  for (const flow of flows) {
    for (const tag of flow.subsystems ?? []) {
      if (coverage.has(tag)) coverage.get(tag).push(flow.id);
    }
  }
  for (const tag of REQUIRED_SUBSYSTEMS) {
    if (coverage.get(tag).length === 0) {
      issues.push(
        fail(`Subsystem tag "${tag}" is not covered by any registered flow.`, {
          subsystem: tag,
        }),
      );
    }
  }
  return Object.fromEntries(coverage);
}

/** Checks 4-6: manifest <-> FLOW_STAGES bidirectional cross-check. */
function validateSpecCrossCheck(flows, specResult, issues) {
  if (!specResult.flowStagesFound) {
    issues.push(
      fail(
        `Could not find "const FLOW_STAGES = {...}" in ${path.relative(repoRoot, specPath)}.`,
      ),
    );
    return;
  }
  if (!specResult.hasManifestDrivenLoop) {
    issues.push(
      fail(
        `${path.relative(repoRoot, specPath)} no longer generates tests via ` +
          '"for (const flow of FLOW_MANIFEST)" -- generated test titles may have ' +
          'drifted from the manifest ids (design D1).',
      ),
    );
  }

  const manifestFlowIds = new Set(flows.map((flow) => flow.id));
  const specFlowIds = new Set(specResult.flowIdToCheckpointNames.keys());

  for (const flowId of manifestFlowIds) {
    if (!specFlowIds.has(flowId)) {
      issues.push(
        fail(
          `Flow "${flowId}" is registered in the manifest but has no FLOW_STAGES ` +
            `implementation in ${path.relative(repoRoot, specPath)}.`,
          { flowId },
        ),
      );
    }
  }
  for (const flowId of specFlowIds) {
    if (!manifestFlowIds.has(flowId)) {
      issues.push(
        fail(
          `${path.relative(repoRoot, specPath)} implements FLOW_STAGES for ` +
            `"${flowId}", which is not registered in the manifest.`,
          { flowId },
        ),
      );
    }
  }

  for (const flow of flows) {
    const specCheckpoints = specResult.flowIdToCheckpointNames.get(flow.id);
    if (!specCheckpoints) continue; // already reported above as entirely missing

    const manifestCheckpointNames = new Set(
      (flow.checkpoints ?? []).map((checkpoint) => checkpoint.name),
    );
    const specCheckpointNames = new Set(specCheckpoints);

    for (const name of manifestCheckpointNames) {
      if (!specCheckpointNames.has(name)) {
        issues.push(
          fail(
            `Flow "${flow.id}" checkpoint "${name}" has no stage runner in ` +
              `FLOW_STAGES["${flow.id}"].`,
            { flowId: flow.id, checkpoint: name },
          ),
        );
      }
    }
    for (const name of specCheckpointNames) {
      if (!manifestCheckpointNames.has(name)) {
        issues.push(
          fail(
            `FLOW_STAGES["${flow.id}"] implements checkpoint "${name}", which is ` +
              'not declared on the manifest flow.',
            { flowId: flow.id, checkpoint: name },
          ),
        );
      }
    }
  }
}

// Only one flag exists today (--json); kept as its own function rather than
// inlined in main() so a future flag doesn't need to be threaded through
// main()'s body by hand.
function parseArgs(argv) {
  return { json: argv.includes('--json') };
}

// Entry point: run every check against the loaded manifest + parsed spec,
// then report in either human-readable or --json form and exit non-zero on
// any error so CI/pre-commit can gate on this without parsing stdout.
function main() {
  const options = parseArgs(process.argv.slice(2));
  const flows = loadManifest();
  const issues = [];

  validateManifestShape(flows, issues);
  const subsystemCoverage = validateSubsystemCoverage(flows, issues);

  try {
    const sourceText = fs.readFileSync(specPath, 'utf8');
    const specResult = parseFlowStages(sourceText);
    validateSpecCrossCheck(flows, specResult, issues);
  } catch (error) {
    issues.push(
      fail(
        `Failed to read ${path.relative(repoRoot, specPath)}: ${error.message}`,
      ),
    );
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const coveredSubsystemCount = REQUIRED_SUBSYSTEMS.filter(
    (tag) => subsystemCoverage[tag].length > 0,
  ).length;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          status: errors.length > 0 ? 'fail' : 'pass',
          flowCount: flows.length,
          subsystemCoverage,
          errors,
          warnings,
        },
        null,
        2,
      ),
    );
  } else {
    for (const issue of issues) {
      console.log(
        `${issue.severity === 'error' ? 'ERROR' : 'WARN'}: ${issue.message}`,
      );
    }
    console.log(
      `[qc:flow:validate] flows=${flows.length} subsystems=${coveredSubsystemCount}/${REQUIRED_SUBSYSTEMS.length} errors=${errors.length} warnings=${warnings.length}`,
    );
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
