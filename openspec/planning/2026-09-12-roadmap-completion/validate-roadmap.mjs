import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const planningDir = scriptDir;
const errors = [];

const argv = process.argv.slice(2);
const readOption = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : null;
};
const snapshotOverride = readOption('--snapshot');
const roadmapOverride = readOption('--roadmap');
const wantNext = argv.includes('--next');
const wantGit = argv.includes('--git');
// Evidence checks are cheap and read only files this repository already owns, so they run by default;
// --no-evidence is the explicit, announced opt-out. --github is opt-in because it talks to GitHub.
const wantEvidence = !argv.includes('--no-evidence');
const wantGithub = argv.includes('--github');
if (!wantEvidence) console.error('NOTICE: evidence mode is off (--no-evidence); stage receipt paths and mainProof proof lines are not checked.');

const SENSITIVE_REVIEW_CLASSES = ['authority', 'privacy', 'migration', 'replay', 'idempotency', 'concurrency'];
const REVIEW_CLASSES = [...SENSITIVE_REVIEW_CLASSES, 'routine'];
const STAGE_NAMES = ['admission', 'red', 'local', 'review', 'merge', 'mainProof', 'tick'];
const REQUIRED_STAGES_BY_STATE = {
  planned: [],
  blocked: [],
  'owner-gated': [],
  admitted: ['admission'],
  implementing: ['admission'],
  'local-verified': ['admission', 'red', 'local'],
  'pr-open': ['admission', 'red', 'local'],
  'review-required': ['admission', 'red', 'local'],
  'ci-running': ['admission', 'red', 'local'],
  merged: ['admission', 'red', 'local', 'review', 'merge'],
  'main-verified': ['admission', 'red', 'local', 'review', 'merge', 'mainProof'],
  complete: ['admission', 'red', 'local', 'review', 'merge', 'mainProof', 'tick'],
  archived: ['admission', 'red', 'local', 'review', 'merge', 'mainProof', 'tick'],
};
const STATE_RANK = {
  planned: 0,
  blocked: 0,
  'owner-gated': 0,
  admitted: 1,
  implementing: 2,
  'local-verified': 3,
  'pr-open': 4,
  'review-required': 5,
  'ci-running': 6,
  merged: 7,
  'main-verified': 8,
  complete: 9,
  archived: 10,
};
const IN_FLIGHT_STATES = new Set(['admitted', 'implementing', 'local-verified', 'pr-open', 'review-required', 'ci-running', 'merged']);
const TERMINAL_UNIT_STATES = new Set(['main-verified', 'complete', 'archived']);
const DOCS_PREFIXES = ['openspec/planning/', 'docs/'];

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
const isHex40 = (value) => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
// Ownership is directory-shaped, so containment - not string equality - decides whether a path is taken:
// 'src/lib' takes 'src/lib/multiplayer/server' and the reverse, while 'src/libx' is unrelated to both.
const normalisePath = (value) => String(value).replace(/\/+$/, '');
const pathsOverlap = (a, b) => {
  const left = normalisePath(a);
  const right = normalisePath(b);
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
};
// A mainProof receipt's runtime.playwright is a Playwright ladder line ('<label>: N failed / M passed'
// returns N), a jest summary ('<label>: Tests: [K failed, ][S skipped, ]N passed, M total' returns K, 0
// when no failed part), or '<label>: N passed (...)' (the label optional so U1's bare total parses),
// which returns the sum of every 'K failed' inside the parentheses, so the runtime lines' per-group
// '0 failed' parse as 0 and a non-zero K is a red. Returns null for anything else - prose is not a proof.
const parseProofLine = (value) => {
  if (typeof value !== 'string') return null;
  const line = value.trim();
  const ladderRed = /^(?:.+?:\s*)?(\d+) failed \/ (\d+) passed$/.exec(line);
  if (ladderRed) return Number(ladderRed[1]);
  const jest = /^(?:.+?:\s*)?Tests:\s+((?:\d+ (?:failed|skipped|todo|passed), )+)\d+ total$/.exec(line);
  if (jest) return Number(/(\d+) failed/.exec(jest[1])?.[1] ?? 0);
  const passed = /^(?:.+?:\s*)?(\d+) passed(?:\s+\(([^)]*)\))?$/.exec(line);
  if (passed) return [...(passed[2] ?? '').matchAll(/(\d+) failed/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  return null;
};
// U41: runtime.failedRows is required on a red mainProof whose at is on or after this day. The one red
// receipt before it without failedRows is U15b's (2026-09-17), which keeps only the count check.
const FAILED_ROWS_CUTOVER = '2026-09-27';
// The first E2E id each entry names, sorted, so two lists compare one to one (undefined: none named).
const e2eIds = (entries) => entries.map((entry) => /\bE2E-\d+\b/.exec(String(entry))?.[0]).sort();
// U41 cap counting rule (GOAL.md:56, DELIVERY.md:8): these files are generated or tests, and their
// added lines do not count toward caps.maxNonGeneratedLines.
const UNCOUNTED_FILES = [
  /(^|\/)package-lock\.json$/, /(^|\/)\.next\//, /(^|\/)__snapshots__\//, /\.snap$/, /^public\/data\//, /^src\/types\/contracts\/generated\//,
  /(^|\/)__tests__\//, /^e2e\//, /\.(test|spec)\.[cm]?[jt]sx?$/,
];
// The ledger's own evidence directory, relative to the repository root; merge diffs skip it.
const EVIDENCE_PREFIX = `${path.relative(repoRoot, path.join(planningDir, 'evidence')).split(path.sep).join('/')}/`;
// Historical node receipts were never normalised: some are null, some a bare evidence path, some an
// object whose main SHA field drifted between mainSha and mainSHA. Read all three shapes tolerantly.
const readReceipt = (node) => {
  const receipt = node && typeof node === 'object' ? node.receipt : node;
  if (receipt === null || receipt === undefined) return {};
  if (typeof receipt === 'string') return receipt.trim() ? { evidence: receipt.trim() } : {};
  if (typeof receipt !== 'object') return {};
  const result = {};
  const mainSha = receipt.mainSha ?? receipt.mainSHA;
  if (typeof mainSha === 'string') result.mainSha = mainSha;
  if (hasValue(receipt.evidence)) result.evidence = receipt.evidence;
  return result;
};
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
  const roadmapFile = roadmapOverride ? path.resolve(process.cwd(), roadmapOverride) : path.join(planningDir, 'roadmap.json');
  const roadmapDir = path.dirname(roadmapFile);
  const snapshotFile = snapshotOverride
    ? path.resolve(process.cwd(), snapshotOverride)
    : path.join(roadmapDir, 'evidence', 'admission-snapshot.json');
  const inventoryFile = path.resolve(repoRoot, 'docs/audits/2026-09-12-customizer-spec-reconciliation/inventory.json');
  const deliveryFile = path.join(roadmapDir, 'DELIVERY.md');
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
    [roadmap.sourceSnapshot, roadmapDir], [roadmap.inventorySource, repoRoot],
    [roadmap.deliveryContract, roadmapDir], [roadmap.workerContract, roadmapDir],
    [roadmap.completionContract, roadmapDir], [roadmap.progress, roadmapDir],
  ];
  if (roadmap.unitLedger !== undefined) links.push([roadmap.unitLedger, roadmapDir]);
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
    const receipt = readReceipt(node);
    if (!isHex40(receipt.mainSha)) fail(node.id + " terminal receipt lacks valid 40-hex main SHA");
    if (!hasValue(receipt.evidence)) fail(`${node.id} terminal receipt lacks evidence`);
    if (!hasValue(node.receipt?.cleanupReceipt ?? node.receipt?.cleanup)) fail(`${node.id} terminal receipt lacks cleanup receipt`);
  }

  // ------------------------------------------------------------------ unit ledger (roadmap.unitLedger)
  let nextLine = null;
  let nextExitCode = 0;
  if (roadmap.unitLedger !== undefined) {
    const ledgerFile = path.resolve(roadmapDir, String(roadmap.unitLedger));
    const ledger = fs.existsSync(ledgerFile) ? readJson(ledgerFile) : null;
    if (!ledger) fail(`unit ledger is unreadable: ${roadmap.unitLedger}`);
    else {
      const units = Array.isArray(ledger.units) ? ledger.units : [];
      const packets = Array.isArray(ledger.packets) ? ledger.packets : [];
      const deferrals = Array.isArray(ledger.deferrals) ? ledger.deferrals : [];
      if (!hasValue(ledger.holdersRule)) fail('unit ledger lacks holders rule text');
      if (typeof ledger.programSnapshot !== 'string' || !fs.existsSync(path.resolve(roadmapDir, ledger.programSnapshot))) {
        fail(`unit ledger programSnapshot missing: ${ledger.programSnapshot}`);
      }
      checkUnique(units.map((unit) => ({ value: unit.id })), 'unit id');
      checkUnique(packets.map((packet) => ({ value: packet.id })), 'packet id');
      checkUnique(deferrals.map((deferral) => ({ value: deferral.id })), 'deferral id');
      const unitById = new Map(units.map((unit) => [unit.id, unit]));
      const packetById = new Map(packets.map((packet) => [packet.id, packet]));
      const taskByKey = actualByKey;

      // ---- holders: every task key referenced anywhere must exist, and no key may sit in two holders
      const holders = new Map();
      const claim = (key, holderId) => {
        if (!taskByKey.has(key)) { fail(`${holderId} references unknown task key ${key}`); return; }
        if (holders.has(key)) fail(`task key ${key} is held twice: ${holders.get(key)} and ${holderId}`);
        else holders.set(key, holderId);
      };
      for (const unit of units) for (const key of Array.isArray(unit.taskKeys) ? unit.taskKeys : []) claim(key, unit.id);
      for (const packet of packets) for (const key of Array.isArray(packet.taskKeys) ? packet.taskKeys : []) claim(key, packet.id);
      for (const deferral of deferrals) for (const key of Array.isArray(deferral.taskKeys) ? deferral.taskKeys : []) claim(key, deferral.id);

      // ---- per-unit structure
      const tickedKeys = new Set();
      for (const unit of units) {
        const label = unit.id;
        if (!knownStates.includes(unit.state)) fail(`${label} has unknown state: ${unit.state}`);
        const receipts = unit.stageReceipts && typeof unit.stageReceipts === 'object' ? unit.stageReceipts : null;
        if (!receipts) { fail(`${label}.stageReceipts is not an object`); continue; }
        for (const stage of STAGE_NAMES) {
          if (!(stage in receipts)) fail(`${label}.stageReceipts lacks ${stage}`);
          const value = receipts[stage];
          if (value !== null && (typeof value !== 'object' || Array.isArray(value))) fail(`${label}.stageReceipts.${stage} is neither null nor an object`);
          if (value !== null && typeof value === 'object' && !hasValue(value.path)) fail(`${label}.stageReceipts.${stage} lacks an evidence path`);
        }
        if (receipts.tick) for (const key of unit.taskKeys || []) tickedKeys.add(key);

        // ---- evidence: a claimed receipt must be on disk, and a product mainProof must carry a proof
        // line that parses, with one stated expectation per red row when the run reports reds
        if (wantEvidence) {
          for (const stage of STAGE_NAMES) {
            const value = receipts[stage];
            if (!value || typeof value !== 'object' || Array.isArray(value) || !hasValue(value.path)) continue;
            if (!fs.existsSync(path.resolve(roadmapDir, String(value.path)))) fail(`${label}.stageReceipts.${stage} path does not exist: ${value.path}`);
          }
          if (unit.ciClass === 'product' && receipts.mainProof && hasValue(receipts.mainProof.path)) {
            const proofFile = path.resolve(roadmapDir, String(receipts.mainProof.path));
            let proof = null;
            if (fs.existsSync(proofFile)) {
              try { proof = readJson(proofFile); } catch { fail(`${label} mainProof receipt is not readable JSON: ${receipts.mainProof.path}`); }
            }
            if (proof) {
              const proofLine = proof.runtime?.playwright;
              const failedRows = parseProofLine(proofLine);
              if (failedRows === null) fail(`${label} mainProof receipt runtime.playwright is not a ladder or jest result: ${proofLine === undefined ? '(absent)' : String(proofLine)}`);
              else if (failedRows > 0) {
                // The expectation list has lived under runtime on the receipts written so far; accept it
                // at the top level too, so a future receipt need not nest it.
                const expectedReds = proof.expectedReds ?? proof.runtime?.expectedReds;
                if (!Array.isArray(expectedReds)) fail(`${label} mainProof receipt reports ${failedRows} failed row(s) without an expectedReds array`);
                else if (expectedReds.length !== failedRows) fail(`${label} mainProof expectedReds has ${expectedReds.length} entr(y/ies) but the run reports ${failedRows} failed row(s)`);
                else if (!expectedReds.every((entry) => typeof entry === 'string' && entry.trim().length > 0)) fail(`${label} mainProof expectedReds has an entry that is not a non-empty string naming a red row`);
                // U41 (1): runtime.failedRows must name the same E2E ids as expectedReds, one to one, on
                // every receipt that carries it and on every receipt dated from FAILED_ROWS_CUTOVER.
                else if (Array.isArray(proof.runtime?.failedRows) || !(String(proof.at) < FAILED_ROWS_CUTOVER)) {
                  const rows = proof.runtime?.failedRows;
                  if (!Array.isArray(rows)) fail(`${label} mainProof reports ${failedRows} failed row(s) without a runtime.failedRows array`);
                  else {
                    const wanted = e2eIds(expectedReds);
                    const got = e2eIds(rows);
                    if (wanted.includes(undefined) || got.includes(undefined) || !same(wanted, got)) fail(`${label} mainProof expectedReds (${wanted.join(', ')}) and runtime.failedRows (${got.join(', ')}) do not name the same E2E ids one to one`);
                  }
                }
              }
            }
          }
        }

        const ownerNodeId = typeof unit.reownedTo === 'string' ? unit.reownedTo : unit.node;
        if (!nodeById.has(unit.node)) fail(`${label} names unknown node ${unit.node}`);
        if (typeof unit.reownedTo === 'string' && !nodeById.has(unit.reownedTo)) fail(`${label} is re-owned to unknown node ${unit.reownedTo}`);
        const ownerNode = nodeById.get(ownerNodeId);

        const ownershipPaths = Array.isArray(unit.ownershipPaths) ? unit.ownershipPaths : [];
        if (!ownershipPaths.length) fail(`${label} has no ownership paths`);
        for (const ownershipPath of ownershipPaths) {
          if (typeof ownershipPath !== 'string' || !fs.existsSync(path.resolve(repoRoot, ownershipPath))) fail(`${label} ownership path missing: ${ownershipPath}`);
          else if (ownerNode && !(ownerNode.ownershipPaths || []).includes(ownershipPath)) fail(`${label} owns ${ownershipPath}, which is not owned by ${ownerNodeId}`);
        }
        const derivedCiClass = ownershipPaths.length && ownershipPaths.every((item) => DOCS_PREFIXES.some((prefix) => String(item).startsWith(prefix) || String(item) + '/' === prefix)) ? 'docs' : 'product';
        if (unit.ciClass !== derivedCiClass) fail(`${label}.ciClass is ${unit.ciClass} but its ownership paths derive ${derivedCiClass}`);

        const reviewClasses = Array.isArray(unit.reviewClasses) ? unit.reviewClasses : [];
        if (!reviewClasses.length) fail(`${label} has no review classes`);
        for (const reviewClass of reviewClasses) if (!REVIEW_CLASSES.includes(reviewClass)) fail(`${label} has unknown review class ${reviewClass}`);

        const caps = unit.caps && typeof unit.caps === 'object' ? unit.caps : null;
        if (!caps) fail(`${label}.caps is not an object`);
        else {
          if (!Number.isInteger(caps.maxFiles) || caps.maxFiles < 1 || caps.maxFiles > 15) fail(`${label}.caps.maxFiles must be an integer in 1..15`);
          if (!Number.isInteger(caps.maxNonGeneratedLines) || caps.maxNonGeneratedLines < 1 || caps.maxNonGeneratedLines > 500) fail(`${label}.caps.maxNonGeneratedLines must be an integer in 1..500`);
          if (ownerNode && Number.isInteger(ownerNode.maxFiles) && caps.maxFiles > ownerNode.maxFiles) fail(`${label}.caps.maxFiles exceeds ${ownerNodeId}`);
          if (ownerNode && Number.isInteger(ownerNode.maxNonGeneratedLines) && caps.maxNonGeneratedLines > ownerNode.maxNonGeneratedLines) fail(`${label}.caps.maxNonGeneratedLines exceeds ${ownerNodeId}`);
        }

        for (const key of Array.isArray(unit.taskKeys) ? unit.taskKeys : []) {
          if (ownerNode && !(ownerNode.taskKeys || []).includes(key)) fail(`${label} holds ${key}, which is not a task key of ${ownerNodeId}`);
        }

        // ---- stage monotonicity
        const required = REQUIRED_STAGES_BY_STATE[unit.state] ?? null;
        if (required === null) fail(`${label} has a state with no receipt ladder: ${unit.state}`);
        else for (const stage of required) if (!receipts[stage]) fail(`${label} is ${unit.state} without a ${stage} receipt`);
        let seenGap = false;
        for (const stage of STAGE_NAMES) {
          if (!receipts[stage]) seenGap = true;
          else if (seenGap) fail(`${label} has a ${stage} receipt with an earlier stage missing`);
        }

        // ---- head chain
        const rank = STATE_RANK[unit.state] ?? 0;
        if (rank >= STATE_RANK.merged) {
          if (!isHex40(unit.prHead)) fail(`${label}.prHead is not a 40-hex head`);
          if (!isHex40(receipts.review?.head)) fail(`${label} review receipt has no 40-hex head`);
          if (!isHex40(receipts.merge?.head)) fail(`${label} merge receipt has no 40-hex head`);
          if (receipts.review?.head !== unit.prHead) fail(`${label} review head does not equal prHead`);
          if (receipts.merge?.head !== unit.prHead) fail(`${label} merge head does not equal prHead`);
          if (!isHex40(unit.mergeSha)) fail(`${label}.mergeSha is not a 40-hex commit`);
          if (receipts.merge?.mergeSha !== unit.mergeSha) fail(`${label} merge receipt mergeSha does not equal unit mergeSha`);
        }
        if (receipts.mainProof) {
          if (!isHex40(receipts.mainProof.mergeCommit)) fail(`${label} mainProof receipt has no 40-hex merge commit`);
          if (receipts.merge && receipts.merge.mergeSha !== receipts.mainProof.mergeCommit) fail(`${label} mainProof merge commit does not equal the merge receipt mergeSha`);
        }

        // ---- review independence
        if (receipts.review) {
          const reviewerModel = receipts.review.reviewerModel;
          const implementerModel = receipts.review.implementerModel;
          if (!hasValue(reviewerModel) || !hasValue(implementerModel)) fail(`${label} review receipt lacks reviewerModel/implementerModel`);
          else if (reviewerModel === implementerModel) fail(`${label} review receipt is not cross-model: ${reviewerModel} reviewed itself`);
          // U41 (5): a lane that finished the implementation cannot be the one that reviewed it.
          if (hasValue(receipts.review.finisherModel) && receipts.review.finisherModel === reviewerModel) fail(`${label} review receipt is not cross-model: its finisher ${reviewerModel} is also its reviewer`);
          if (!isHex40(receipts.review.reviewedHead ?? receipts.review.head)) fail(`${label} review receipt has no 40-hex reviewed head`);
        }

        // ---- sensitive classes need an owner ruling bound to the merged head
        const sensitive = reviewClasses.filter((reviewClass) => SENSITIVE_REVIEW_CLASSES.includes(reviewClass));
        // U41 (3): from local-verified on, a packet must already name the unit in blocks, so the ruling
        // below has somewhere to land. No dated cutover: no unit on the ledger at U41 admission lacked one.
        if (sensitive.length && rank >= STATE_RANK['local-verified'] && !packets.some((packet) => (packet.blocks || []).includes(unit.id))) {
          fail(`${label} carries sensitive classes (${sensitive.join(', ')}) and is ${unit.state} with no packet naming it in blocks`);
        }
        if (sensitive.length && rank >= STATE_RANK.merged) {
          const ruling = packets.find((packet) => (packet.blocks || []).includes(unit.id) && packet.ruling);
          if (!ruling) fail(`${label} carries sensitive classes (${sensitive.join(', ')}) and is ${unit.state} without a packet ruling`);
          else if (ruling.ruling.ruledHead !== receipts.merge?.head) fail(`${label} packet ruling ${ruling.id} is bound to ${ruling.ruling.ruledHead}, not the merged head`);
        }

        // ---- owner gate
        if (unit.state === 'owner-gated' || (unit.ownerGate !== null && unit.ownerGate !== undefined)) {
          const packetId = unit.ownerGate?.packetId;
          if (!hasValue(packetId)) fail(`${label} is owner-gated without ownerGate.packetId`);
          else if (!packetById.has(packetId)) fail(`${label} is gated on unknown packet ${packetId}`);
          else if (packetById.get(packetId).decision !== null) fail(`${label} is gated on ${packetId}, which already carries a decision`);
        }

        // ---- tick receipt: the live row must actually read "- [x]"
        if (receipts.tick) {
          for (const key of unit.taskKeys || []) {
            const task = taskByKey.get(key);
            if (!task) continue;
            const sourceFile = path.resolve(repoRoot, task.sourcePath);
            if (!fs.existsSync(sourceFile)) { fail(`${label} tick receipt cannot read ${task.sourcePath}`); continue; }
            const rows = fs.readFileSync(sourceFile, 'utf8').split(String.fromCharCode(10))
              .map((line) => /^\s*- \[([ xX])\] (.*)$/.exec(line))
              .filter((match) => match && match[2].trim() === String(task.text).trim());
            if (task.sourceIdExplicit && !String(task.text).startsWith(String(task.sourceId))) fail(`${label} tick receipt cannot anchor ${key} on its source id`);
            if (rows.length !== 1) fail(`${label} tick receipt matched ${rows.length} live rows for ${key} by source id and text`);
            else if (rows[0][1].toLowerCase() !== 'x') fail(`${label} tick receipt claims ${key} but the live row is not checked`);
          }
        }
      }

      // ---- packets
      for (const packet of packets) {
        const label = packet.id;
        for (const blocked of Array.isArray(packet.blocks) ? packet.blocks : []) if (!unitById.has(blocked)) fail(`${label} blocks unknown unit ${blocked}`);
        for (const nodeId of Array.isArray(packet.nodes) ? packet.nodes : []) if (!nodeById.has(nodeId)) fail(`${label} names unknown node ${nodeId}`);
        if (!hasValue(packet.question) || !String(packet.question).trim().endsWith('?')) fail(`${label} has no closed question`);
        const options = Array.isArray(packet.options) ? packet.options : [];
        if (options.length < 2) fail(`${label} has fewer than two options`);
        for (const option of options) for (const field of ['label', 'consequence', 'effort']) if (!hasValue(option?.[field])) fail(`${label} has an option missing ${field}`);
        if (!hasValue(packet.agentRecommendation)) fail(`${label} lacks an agent recommendation`);
        if (!hasValue(packet.revertCost)) fail(`${label} lacks a revert cost`);
        if (packet.decision !== null && !hasValue(packet.decision)) fail(`${label}.decision is neither null nor a recorded decision`);
        if (packet.ruling !== null) {
          if (!isHex40(packet.ruling?.ruledHead)) fail(`${label}.ruling has no 40-hex ruledHead`);
          if (packet.decision === null) fail(`${label} carries a ruling with no decision`);
        }
      }

      // ---- deferrals
      for (const deferral of deferrals) {
        if (!nodeById.has(deferral.deferredToNode)) fail(`${deferral.id} defers to unknown node ${deferral.deferredToNode}`);
        if (!hasValue(deferral.reason)) fail(`${deferral.id} lacks a reason`);
        if (!Array.isArray(deferral.taskKeys) || !deferral.taskKeys.length) fail(`${deferral.id} defers no task keys`);
      }

      // ---- holders rule, per activated package
      const activatedPackages = new Set();
      for (const unit of units) for (const key of unit.taskKeys || []) {
        const task = taskByKey.get(key);
        if (task) activatedPackages.add(task.package);
      }
      for (const packageName of activatedPackages) {
        for (const task of tasks) {
          if (task.package !== packageName || task.checkedAtAdmission !== false) continue;
          if (tickedKeys.has(task.key)) continue;
          if (!holders.has(task.key)) fail(`activated package ${packageName} leaves ${task.key} open and unheld`);
        }
      }

      // ---- optional live proof: ancestry, merge ownership and the line cap
      if (wantGit) {
        for (const unit of units) {
          if ((STATE_RANK[unit.state] ?? 0) < STATE_RANK['main-verified']) continue;
          if (!isHex40(unit.mergeSha)) { fail(`${unit.id} is ${unit.state} without a 40-hex mergeSha to prove`); continue; }
          try {
            execFileSync('git', ['merge-base', '--is-ancestor', unit.mergeSha, 'origin/main'], { cwd: repoRoot, stdio: 'ignore' });
          } catch {
            fail(`${unit.id} mergeSha ${unit.mergeSha} is not an ancestor of origin/main`);
          }
          // U41 (4) and (6): the merge's own diff is the squash commit against its first parent (the
          // unit baseline is rarely that parent, so baseline..mergeSha would include other units' merges),
          // with the ledger's evidence directory skipped. A file outside ownershipPaths fails unless the
          // unit's ownershipExceptions lists it; the added lines of files UNCOUNTED_FILES does not match
          // must stay within caps.maxNonGeneratedLines unless capException.countedLines records that count.
          let numstat;
          try {
            numstat = execFileSync('git', ['diff', '--numstat', '--no-renames', `${unit.mergeSha}^1`, unit.mergeSha], { cwd: repoRoot, encoding: 'utf8' });
          } catch {
            fail(`${unit.id} mergeSha ${unit.mergeSha} has no first-parent diff to check`);
            continue;
          }
          const exceptions = Array.isArray(unit.ownershipExceptions) ? unit.ownershipExceptions : [];
          let counted = 0;
          for (const [added, , file] of numstat.split(String.fromCharCode(10)).filter(Boolean).map((row) => row.split('\t'))) {
            if (file.startsWith(EVIDENCE_PREFIX)) continue;
            if (!(unit.ownershipPaths || []).some((owned) => pathsOverlap(file, owned)) && !exceptions.includes(file)) {
              fail(`${unit.id} merge ${unit.mergeSha.slice(0, 9)} touches ${file} outside its ownershipPaths and ownershipExceptions`);
            }
            if (!UNCOUNTED_FILES.some((pattern) => pattern.test(file))) counted += Number(added) || 0;
          }
          const cap = unit.caps?.maxNonGeneratedLines;
          if (counted > cap && unit.capException?.countedLines !== counted) {
            fail(`${unit.id} merge ${unit.mergeSha.slice(0, 9)} counts ${counted} added non-generated, non-test lines over its cap of ${cap}`);
          }
        }
      }

      // ---- optional GitHub proof of the owner ruling that Lane B records off-repository
      if (wantGithub) {
        let noticePrinted = false;
        for (const unit of units) {
          const sensitive = (Array.isArray(unit.reviewClasses) ? unit.reviewClasses : []).some((reviewClass) => SENSITIVE_REVIEW_CLASSES.includes(reviewClass));
          if (!sensitive || (STATE_RANK[unit.state] ?? 0) < STATE_RANK.merged) continue;
          const merge = unit.stageReceipts?.merge;
          const pr = Number.isInteger(merge?.pr) ? merge.pr : null;
          const head = merge?.head;
          if (pr === null) { fail(`${unit.id} carries sensitive classes and is ${unit.state} but its merge receipt names no PR number`); continue; }
          if (!isHex40(head)) { fail(`${unit.id} merge receipt has no 40-hex head to bind an owner ruling to`); continue; }
          let view = null;
          try {
            view = JSON.parse(execFileSync('gh', ['pr', 'view', String(pr), '--json', 'state,labels,comments'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
          } catch (error) {
            // Never a silent pass: say why the proof could not be taken, then fail the unit.
            if (!noticePrinted) { console.error(`NOTICE: gh is not available or refused the query, so --github cannot prove any owner ruling (${(error instanceof Error ? error.message : String(error)).split(String.fromCharCode(10))[0]})`); noticePrinted = true; }
            fail(`${unit.id} PR #${pr} could not be read with gh, so its owner ruling is unproved`);
            continue;
          }
          if (view.state !== 'MERGED') fail(`${unit.id} PR #${pr} is ${view.state}, not MERGED`);
          const labels = (Array.isArray(view.labels) ? view.labels : []).map((item) => (typeof item === 'string' ? item : item?.name));
          if (!labels.includes('owner-ruled')) fail(`${unit.id} PR #${pr} does not carry the owner-ruled label`);
          const comments = Array.isArray(view.comments) ? view.comments : [];
          if (!comments.some((comment) => String(comment?.body ?? '').includes(`OWNER-RULING ${head}`))) fail(`${unit.id} PR #${pr} has no comment containing OWNER-RULING ${head}`);
        }
      }

      // ---- next admissible unit
      if (wantNext) {
        const inFlightPaths = [...new Set(units.filter((unit) => IN_FLIGHT_STATES.has(unit.state)).flatMap((unit) => unit.ownershipPaths || []))];
        let ownerGated = 0;
        let blocked = 0;
        let chosen = null;
        for (const unit of units) {
          if (TERMINAL_UNIT_STATES.has(unit.state)) continue;
          if (unit.state === 'owner-gated' || (unit.ownerGate !== null && unit.ownerGate !== undefined)) { ownerGated += 1; continue; }
          if (chosen) { blocked += 1; continue; }
          const ownerNode = nodeById.get(typeof unit.reownedTo === 'string' ? unit.reownedTo : unit.node);
          const dependenciesReady = (ownerNode?.dependsOn || []).every((dependency) => {
            const state = nodeById.get(dependency)?.state;
            return state === 'main-verified' || state === 'complete';
          });
          const pathFree = !(unit.ownershipPaths || []).some((ownershipPath) => inFlightPaths.some((inFlight) => pathsOverlap(ownershipPath, inFlight)));
          if (unit.state === 'planned' && dependenciesReady && pathFree) chosen = unit.id;
          else blocked += 1;
        }
        if (chosen) { nextLine = chosen; nextExitCode = 0; }
        else { nextLine = `NONE-ADMISSIBLE: ${ownerGated} owner-gated, ${blocked} blocked`; nextExitCode = 3; }
      }
    }
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
  } else if (wantNext) {
    console.log(nextLine ?? 'NONE-ADMISSIBLE: 0 owner-gated, 0 blocked');
    process.exitCode = nextLine ? nextExitCode : 3;
  } else {
    console.log(`ROADMAP VALIDATION PASSED: ${derivedCounts.nodes ?? nodes.length} nodes, ${derivedCounts.packages} packages, ${derivedCounts.tasks} tasks, ${derivedCounts.triage} triage rows`);
  }
} catch (error) {
  console.error(`ROADMAP VALIDATION ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
