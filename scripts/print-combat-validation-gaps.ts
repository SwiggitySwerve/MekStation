import {
  getCombatValidationOutOfScopeRows,
  getCombatValidationUnresolvedRows,
} from '../src/simulation/runner/CombatValidationGapInventory';

type GapOutputFormat = 'json' | 'refs' | 'summary';

interface IGapInventoryOptions {
  readonly format: GapOutputFormat;
  readonly level?: string;
  readonly section?: string;
}

function parseOptions(argv: readonly string[]): IGapInventoryOptions {
  const options: { format: GapOutputFormat; level?: string; section?: string } =
    {
      format: 'json',
    };

  for (const arg of argv) {
    const [flag, value] = arg.split('=', 2);
    if (flag === '--format' && isGapOutputFormat(value)) {
      options.format = value;
    } else if (flag === '--level' && value) {
      options.level = value;
    } else if (flag === '--section' && value) {
      options.section = value;
    }
  }

  return options;
}

function isGapOutputFormat(
  value: string | undefined,
): value is GapOutputFormat {
  return value === 'json' || value === 'refs' || value === 'summary';
}

function countBy(rows: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row] = (counts[row] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort());
}

const options = parseOptions(process.argv.slice(2));
const inventoryRows =
  options.level === 'out-of-scope'
    ? getCombatValidationOutOfScopeRows()
    : getCombatValidationUnresolvedRows();
const rows = inventoryRows.filter(
  (row) =>
    (options.level === undefined || row.level === options.level) &&
    (options.section === undefined || row.sectionId === options.section),
);

if (options.format === 'refs') {
  console.log(rows.map((row) => row.ref).join('\n'));
} else if (options.format === 'summary') {
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        byLevel: countBy(rows.map((row) => row.level)),
        bySection: countBy(rows.map((row) => row.sectionId)),
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        rows,
      },
      null,
      2,
    ),
  );
}
