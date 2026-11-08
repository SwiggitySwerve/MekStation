/** Active-change accounting formats. Filesystem and Git transport stay in callers. */
export const LEGACY_LEDGER_FILE = 'openspec/active-change-ledger.json';
export const COLOCATED_LEDGER_FILENAME = '.ledger.json';

export function colocatedLedgerFile(name) {
  return `openspec/changes/${name}/${COLOCATED_LEDGER_FILENAME}`;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parsing alone retains historical membership-only entries for cited Git trees. */
export function parseLegacyLedger(text) {
  const document = JSON.parse(text);
  if (!isRecord(document) || !Array.isArray(document.allowedActiveChanges)) {
    throw new Error(
      'Legacy ledger must contain an allowedActiveChanges array.',
    );
  }
  return document.allowedActiveChanges;
}

function normalizeLedgerEntry(entry) {
  if (!isRecord(entry)) throw new Error('Ledger entry must be an object.');
  if (
    typeof entry.name !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)
  ) {
    throw new Error('Ledger name must be a kebab-case change name.');
  }
  for (const field of ['status', 'reason']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) {
      throw new Error(`${entry.name}: ${field} must be a nonblank string.`);
    }
  }
  const date = new Date(`${entry.lastReviewed}T00:00:00.000Z`);
  if (
    typeof entry.lastReviewed !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.lastReviewed) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== entry.lastReviewed
  ) {
    throw new Error(
      `${entry.name}: lastReviewed must be a real YYYY-MM-DD date.`,
    );
  }
  // Keep the original strings: normalization must not rewrite review evidence.
  return {
    name: entry.name,
    status: entry.status,
    reason: entry.reason,
    lastReviewed: entry.lastReviewed,
  };
}

export function parseColocatedLedger(text, expectedName) {
  const entry = normalizeLedgerEntry(JSON.parse(text));
  if (entry.name !== expectedName) {
    throw new Error(
      `Ledger name ${entry.name} does not match ${expectedName}.`,
    );
  }
  return entry;
}

/** Colocated entries have already passed parseColocatedLedger at their source. */
export function reconcileLedgerEntries(legacyEntries, colocatedEntries) {
  const inventory = new Map();
  for (const raw of legacyEntries) {
    const entry = normalizeLedgerEntry(raw);
    if (inventory.has(entry.name)) {
      throw new Error(`Duplicate legacy ledger name: ${entry.name}.`);
    }
    inventory.set(entry.name, entry);
  }
  for (const entry of colocatedEntries) {
    const previous = inventory.get(entry.name);
    if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) {
      throw new Error(`Conflicting accounting metadata for ${entry.name}.`);
    }
    inventory.set(entry.name, entry);
  }
  return [...inventory.values()].sort((a, b) => a.name.localeCompare(b.name));
}
