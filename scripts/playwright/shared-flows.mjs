// Owns shared-flow map validation only; PR browser selection does not read it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';

// These tooling projects require explicit env selection and do not run nightly.
const ENV_GATED_TOOLING = new Set([
  'e2e/flow-audits.spec.ts', // MEKSTATION_FLOW_ID
  'e2e/scenario-pack-minting.spec.ts', // MEKSTATION_MINT_PACK_ID
]);
const isSpec = (value) =>
  typeof value === 'string' && /^e2e\/.*\.spec\.ts$/.test(value);
const nonEmpty = (value) =>
  typeof value === 'string' && value.trim().length > 0;
const checkOwner = (owner) =>
  assert.ok(
    ['C1', 'C2', 'C3', 'C4'].includes(owner),
    `owner must be C1-C4: ${owner}`,
  );

export function checkSharedFlows(root) {
  const map = JSON.parse(
    fs.readFileSync(
      path.join(root, 'config/playwright/shared-flows.json'),
      'utf8',
    ),
  );
  const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);
  // Read the working tree as well as the index so even a new, untracked spec
  // forces an explicit coverage decision. No Playwright collection is needed.
  const specs = new Set(
    fs
      .readdirSync(path.join(root, 'e2e'), {
        recursive: true,
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
      .map((entry) =>
        path
          .relative(root, path.join(entry.parentPath, entry.name))
          .replaceAll('\\', '/'),
      ),
  );
  const mapped = new Set();
  const pending = new Set();
  const ids = new Set();
  assert.ok(
    Array.isArray(map.flows) && map.flows.length > 0,
    'flows must be a non-empty array',
  );
  const checkSpec = (spec) =>
    assert.ok(isSpec(spec) && specs.has(spec), `Missing spec: ${spec}`);
  for (const flow of map.flows) {
    assert.ok(
      nonEmpty(flow.id) && !ids.has(flow.id),
      `Invalid or duplicate flow id: ${flow.id}`,
    );
    ids.add(flow.id);
    checkOwner(flow.owner);
    assert.ok(
      ['pr', 'nightly'].includes(flow.tier),
      `Invalid tier: ${flow.id}`,
    );
    assert.ok(nonEmpty(flow.notes), `Missing notes: ${flow.id}`);
    assert.ok(
      Array.isArray(flow.paths) && flow.paths.length > 0,
      `Missing paths: ${flow.id}`,
    );
    for (const glob of flow.paths) {
      assert.ok(
        nonEmpty(glob) && !glob.startsWith('!'),
        `Invalid path glob: ${glob}`,
      );
      const matches = picomatch(glob, { dot: true });
      assert.ok(
        tracked.some((file) => matches(file)),
        `${flow.id}: glob matches no tracked file: ${glob}`,
      );
    }
    assert.ok(Array.isArray(flow.specs), `Missing specs array: ${flow.id}`);
    assert.ok(
      flow.pendingSpecs === undefined || Array.isArray(flow.pendingSpecs),
      `Invalid pendingSpecs: ${flow.id}`,
    );
    assert.ok(
      flow.specs.length > 0 || flow.pendingSpecs?.length > 0,
      `${flow.id} needs specs or pendingSpecs`,
    );
    assert.equal(
      new Set(flow.specs).size,
      flow.specs.length,
      `Duplicate specs: ${flow.id}`,
    );
    for (const spec of flow.specs) {
      checkSpec(spec);
      assert.ok(
        !ENV_GATED_TOOLING.has(spec),
        `Env-gated tooling cannot be mapped: ${spec}`,
      );
      mapped.add(spec);
    }
    for (const entry of flow.pendingSpecs ?? []) {
      assert.ok(isSpec(entry.spec), `Invalid pending spec: ${entry.spec}`);
      checkOwner(entry.owner);
      assert.ok(
        nonEmpty(entry.reason),
        `Pending spec needs a non-empty reason: ${entry.spec}`,
      );
      assert.ok(
        !fs.existsSync(path.join(root, entry.spec)),
        `Pending spec now exists; move it into specs: ${entry.spec}`,
      );
      assert.ok(
        !pending.has(entry.spec),
        `Duplicate pending spec: ${entry.spec}`,
      );
      pending.add(entry.spec);
    }
  }
  const byDesign = new Set();
  assert.ok(
    Array.isArray(map['nightly-only-by-design']),
    'Missing nightly-only-by-design array',
  );
  for (const { spec, reason } of map['nightly-only-by-design']) {
    checkSpec(spec);
    assert.ok(
      nonEmpty(reason),
      `By-design spec needs a non-empty reason: ${spec}`,
    );
    assert.ok(!mapped.has(spec), `Spec is both mapped and by-design: ${spec}`);
    assert.ok(!byDesign.has(spec), `Duplicate by-design spec: ${spec}`);
    assert.ok(
      !ENV_GATED_TOOLING.has(spec),
      `Env-gated tooling is not nightly: ${spec}`,
    );
    byDesign.add(spec);
  }
  for (const spec of specs) {
    assert.ok(
      mapped.has(spec) || byDesign.has(spec) || ENV_GATED_TOOLING.has(spec),
      `Unclassified E2E spec: ${spec}`,
    );
  }
  // TODO(step 5): when folded selection is enabled, a map/by-design change must
  // run every affected spec, considering both the base and head maps.
  return {
    flows: ids.size,
    mapped: mapped.size,
    byDesign: byDesign.size,
    pending: pending.size,
  };
}
