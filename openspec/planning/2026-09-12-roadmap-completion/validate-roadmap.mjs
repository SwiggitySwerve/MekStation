import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const planningDir = scriptDir;
const errors = [];

const fail = (message) => {
  if (errors.length < 100) errors.push(message);
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const hasValue = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const countBy = (values, key) => values.reduce((counts, value) => {
  const name = value[key];
  counts.set(name, (counts.get(name) || 0) + 1);
  return counts;
}, new Map());
const checkUnique = (values, label) => {
  for (const [value, count] of countBy(values, 'value')) {
    if (count > 1) fail(`duplicate ${label}: ${value}`);
  }
};

try {
  const roadmapFile = path.join(planningDir, 'roadmap.json');
  const snapshotFile = path.join(planningDir, 'evidence', 'admission-snapshot.json');
  const inventoryFile = path.resolve(repoRoot, 'docs/audits/2026-09-12-customizer-spec-reconciliation/inventory.json');
  const deliveryFile = path.join(planningDir, 'DELIVERY.md');
  const roadmap = readJson(roadmapFile);
  const snapshot = readJson(snapshotFile);
  const inventory = readJson(inventoryFile);
  const delivery = fs.readFileSync(deliveryFile, 'utf8');
  const groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
  const nodes = Array.isArray(roadmap.nodes) ? roadmap.nodes : [];
  const tasks = Array.isArray(roadmap.tasks) ? roadmap.tasks : [];
  const packages = Array.isArray(roadmap.packages) ? roadmap.packages : [];

  const packageNames = groups.map((group) => group.name);
  checkUnique(packageNames.map((value) => ({ value })), 'snapshot package');
  checkUnique(packages.map((pkg) => ({ value: pkg.name })), 'roadmap package');
  if (packages.length !== groups.length) fail(`package count ${packages.length} != snapshot ${groups.length}`);
  const snapshotByPackage = new Map(groups.map((group) => [group.name, group]));
  for (const pkg of packages) {
    const expected = snapshotByPackage.get(pkg.name);
    if (!expected) { fail(`package missing from snapshot: ${pkg.name}`); continue; }
    const checked = expected.tasks.filter((task) => task.checked === true).length;
    const open = expected.tasks.filter((task) => task.checked === false).length;
    for (const [field, actual, wanted] of [
      ['taskPath', pkg.taskPath, expected.path],
      ['taskSha256', pkg.taskSha256, expected.sha256],
      ['checked', pkg.checked, checked],
      ['open', pkg.open, open],
    ]) if (actual !== wanted) fail(`${pkg.name}.${field} does not match admission snapshot`);
  }

  const snapshotTasks = [];
  for (const group of groups) for (const task of Array.isArray(group.tasks) ? group.tasks : []) {
    const key = `${group.name}#${task.id}@${task.line}`;
    if (snapshotTasks.some((item) => item.key === key)) fail(`duplicate snapshot task occurrence: ${key}`);
    snapshotTasks.push({ key, group, task });
  }
  const actualTaskKeys = new Set();
  for (const task of tasks) {
    if (actualTaskKeys.has(task.key)) fail(`duplicate roadmap task key: ${task.key}`);
    actualTaskKeys.add(task.key);
  }
  if (tasks.length !== snapshotTasks.length) fail(`task count ${tasks.length} != snapshot ${snapshotTasks.length}`);
  const actualByKey = new Map(tasks.map((task) => [task.key, task]));
  for (const expected of snapshotTasks) {
    const actual = actualByKey.get(expected.key);
    if (!actual) { fail(`missing task occurrence: ${expected.key}`); continue; }
    const expectedFields = {
      package: expected.group.name,
      sourcePath: expected.group.path,
      sourceSha256: expected.group.sha256,
      sourceId: expected.task.id,
      sourceIdExplicit: expected.task.sourceIdExplicit,
      sourceLine: expected.task.line,
      text: expected.task.text,
      checkedAtAdmission: expected.task.checked,
      sourceTaskKey: `${expected.group.name}#${expected.task.id}`,
    };
    if (actual.key !== expected.key) fail(`wrong occurrence key for ${expected.key}`);
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      if (actual[field] !== expectedValue) fail(`${expected.key}.${field} differs from snapshot`);
    }
  }
  for (const key of actualTaskKeys) if (!snapshotTasks.some((task) => task.key === key)) fail(`extra roadmap task occurrence: ${key}`);

  const nodeIds = nodes.map((node) => node.id);
  checkUnique(nodeIds.map((value) => ({ value })), 'node id');
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const stateLine = delivery.split(String.fromCharCode(10)).find((line) => line.includes("Allowed slice states:")) || "";
  const knownStates = [...stateLine.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  if (!knownStates.length) fail('DELIVERY.md has no allowed slice states');
  for (const node of nodes) {
    if (!knownStates.includes(node.state)) fail(`${node.id} has unknown state: ${node.state}`);
    if (!Array.isArray(node.dependsOn)) { fail(`${node.id}.dependsOn is not an array`); continue; }
    const seen = new Set();
    for (const dependency of node.dependsOn) {
      if (seen.has(dependency)) fail(`${node.id} repeats dependency ${dependency}`);
      seen.add(dependency);
      if (!nodeById.has(dependency)) fail(`${node.id} depends on unknown node ${dependency}`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id, chain = []) => {
    if (visiting.has(id)) { fail(`dependency cycle: ${[...chain, id].join(' -> ')}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of nodeById.get(id)?.dependsOn || []) if (nodeById.has(dependency)) visit(dependency, [...chain, id]);
    visiting.delete(id); visited.add(id);
  };
  for (const id of nodeIds) visit(id);

  const expectedAssignments = new Map(nodeIds.map((id) => [id, new Map()]));
  for (const task of tasks) {
    if (!nodeById.has(task.primaryNode)) { fail(`${task.key} has unknown primary node ${task.primaryNode}`); continue; }
    const assignments = expectedAssignments.get(task.primaryNode);
    assignments.set(task.key, (assignments.get(task.key) || 0) + 1);
  }
  for (const node of nodes) {
    const actual = new Map();
    if (!Array.isArray(node.taskKeys)) { fail(`${node.id}.taskKeys is not an array`); continue; }
    for (const key of node.taskKeys) actual.set(key, (actual.get(key) || 0) + 1);
    const expected = expectedAssignments.get(node.id);
    const keys = new Set([...actual.keys(), ...expected.keys()]);
    for (const key of keys) if ((actual.get(key) || 0) !== (expected.get(key) || 0)) fail(`task assignment mismatch for ${key} at ${node.id}`);
  }

  const targetStates = new Set(["needs-proof", "preserve-planned"]);
  const targetInventory = (inventory.canonicalSpecifications || []).filter((item) => targetStates.has(item.initialReview?.status));
  checkUnique(targetInventory.map((item) => ({ value: item.id })), "inventory triage id");
  const expectedTriage = new Map(targetInventory.map((item) => [item.id, {
    path: item.path,
    initialStatus: item.initialReview.status,
    priorNote: item.initialReview.notes ?? null,
  }]));
  const triageStates = new Set(["unreconciled", "in-review", "dispositioned"]);
  const actualTriage = Array.isArray(roadmap.triage) ? roadmap.triage : [];
  const seenTriage = new Set();
  for (const row of actualTriage) {
    if (seenTriage.has(row.id)) fail("duplicate triage row: " + row.id);
    seenTriage.add(row.id);
    const expected = expectedTriage.get(row.id);
    if (!expected) { fail("unexpected triage row: " + row.id); continue; }
    for (const field of ["path", "initialStatus", "priorNote"]) if (row[field] !== expected[field]) fail("triage " + row.id + "." + field + " differs from inventory");
    if (!triageStates.has(row.state)) fail("triage " + row.id + " has unknown state: " + row.state);
    if (row.state === "dispositioned") {
      if (!["existing", "deferred", "out-of-scope", "in-scope-repair"].includes(row.disposition)) fail("triage " + row.id + " has invalid disposition");
      if (!hasValue(row.evidence)) fail("triage " + row.id + " disposition lacks evidence");
      if (row.disposition === "in-scope-repair" && (!hasValue(row.repairNode) || !nodeById.has(row.repairNode))) fail("triage " + row.id + " lacks successor node");
    }
  }
  if (seenTriage.size !== expectedTriage.size) fail("triage row count " + seenTriage.size + " != inventory target " + expectedTriage.size);
  for (const id of expectedTriage.keys()) if (!seenTriage.has(id)) fail("missing triage row: " + id);

  const links = [
    [roadmap.sourceSnapshot, planningDir], [roadmap.inventorySource, repoRoot],
    [roadmap.deliveryContract, planningDir], [roadmap.workerContract, planningDir],
    [roadmap.completionContract, planningDir], [roadmap.progress, planningDir],
  ];
  for (const [link, base] of links) if (typeof link !== 'string' || !fs.existsSync(path.resolve(base, link))) fail(`missing roadmap link: ${link}`);
  for (const node of nodes) for (const ownershipPath of node.ownershipPaths || []) {
    if (typeof ownershipPath !== 'string' || !fs.existsSync(path.resolve(repoRoot, ownershipPath))) fail(`${node.id} ownership path missing: ${ownershipPath}`);
  }

  const campIds = Array.from({ length: 9 }, (_, index) => "R2.camp-" + index);
  for (const id of campIds) if (!nodeById.has(id)) fail("missing CAMP node: " + id);
  for (const id of campIds) {
    const node = nodeById.get(id);
    const gate = node && node.githubReviewGate;
    if (!gate || gate.state !== "APPROVED" || gate.exactHead !== true || gate.nonAuthor !== true || gate.nonDismissed !== true || gate.soloException !== false || !Array.isArray(gate.permissions) || gate.permissions.length !== 3 || !["WRITE", "MAINTAIN", "ADMIN"].every((permission) => gate.permissions.includes(permission))) fail(id + " has invalid CAMP GitHub review gate");
  }
  for (const node of nodes.filter((item) => item.state === 'complete' || item.state === 'archived')) {
    const receipt = node.receipt;
    const mainSha = receipt?.mainSha ?? receipt?.mainSHA;
    if (!receipt || typeof mainSha !== "string" || !/^[0-9a-f]{40}$/i.test(mainSha)) fail(node.id + " terminal receipt lacks valid 40-hex main SHA");
    if (!hasValue(receipt?.evidence)) fail(`${node.id} terminal receipt lacks evidence`);
    if (!hasValue(receipt?.cleanupReceipt ?? receipt?.cleanup)) fail(`${node.id} terminal receipt lacks cleanup receipt`);
  }

  const derivedCounts = {
    packages: groups.length,
    tasks: snapshotTasks.length,
    checkedAtAdmission: snapshotTasks.filter(({ task }) => task.checked === true).length,
    openAtAdmission: snapshotTasks.filter(({ task }) => task.checked === false).length,
    triage: targetInventory.length,
  };
  for (const [field, wanted] of Object.entries(derivedCounts)) if (roadmap.counts?.[field] !== wanted) fail(`counts.${field} is not derived snapshot value ${wanted}`);
  if (errors.length) {
    console.error(`ROADMAP VALIDATION FAILED (${errors.length} issue${errors.length === 1 ? '' : 's'})`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`ROADMAP VALIDATION PASSED: ${derivedCounts.nodes ?? nodes.length} nodes, ${derivedCounts.packages} packages, ${derivedCounts.tasks} tasks, ${derivedCounts.triage} triage rows`);
  }
} catch (error) {
  console.error(`ROADMAP VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
