/** Local-only BV terms, classified against namespaces emitted by the reference. */
import {
  familyOf,
  foldWeaponTerms,
  type buildDeltaReport,
  type IJavaReferenceRow,
} from './unit-bv-parity';

type DeltaReport = ReturnType<typeof buildDeltaReport>;
type DeltaRow = DeltaReport['rows'][number];

interface IKeySetSource {
  family: string;
  path: string;
  sha256: string | null;
  sourceSha256: string | null;
}
interface IKeySetTerm extends IKeySetSource {
  category: 'native-local-only' | 'non-native-local';
  namespace: string;
  term: string;
  value: number | null;
  valueIssue?: 'undefined' | 'nonfinite';
}
interface IUnassessedKeySetRow extends IKeySetSource {
  category: 'unassessed';
  reason: 'unjoined' | 'missing-reference-terms' | 'missing-local-terms';
}
type KeySetRow = IKeySetTerm | IUnassessedKeySetRow;
interface IKeySetCounts {
  nativeFindings: number;
  nonNativeLocalDiagnostics: number;
}
interface IKeySetRowCounts extends IKeySetCounts {
  rows: number;
  assessedRows: number;
  unassessedRows: number;
}
interface IKeySetFamily extends IKeySetRowCounts {
  byNamespace: Record<string, IKeySetCounts>;
  byKey: Record<string, IKeySetCounts>;
}
export interface IBVKeySetReport {
  schemaVersion: 1;
  ok: boolean;
  counts: IKeySetRowCounts;
  nativeNamespaces: Record<string, string[]>;
  byFamily: Record<string, IKeySetFamily>;
  rows: KeySetRow[];
}

/** Scalar names stay exact. Indexed root containers retain their structural
 * prefix (trooper.<n>...), then classify their nested scalar or dotted key.
 * Other numeric identity/rank segments start the variable suffix; otherwise
 * the final dotted segment is the identity. No namespace names are assumed.
 */
function namespaceOf(key: string): string {
  const parts = key.split('.');
  if (parts.length === 1) return key;
  if (parts.length > 2 && /^-?\d+$/.test(parts[1]))
    return `${parts[0]}.<n>.${namespaceOf(parts.slice(2).join('.'))}`;
  const variable = parts.findIndex((part) => /^(?:-?\d+|#\d+)$/.test(part));
  return `${parts.slice(0, variable < 0 ? -1 : variable).join('.')}.`;
}

function countRows(
  rowCount: number,
  entries: readonly KeySetRow[],
): IKeySetRowCounts {
  const unassessedRows = entries.filter(
    (row) => row.category === 'unassessed',
  ).length;
  return {
    rows: rowCount,
    assessedRows: rowCount - unassessedRows,
    unassessedRows,
    nativeFindings: entries.filter(
      (row) => row.category === 'native-local-only',
    ).length,
    nonNativeLocalDiagnostics: entries.filter(
      (row) => row.category === 'non-native-local',
    ).length,
  };
}

function rollup(
  entries: readonly KeySetRow[],
  key: 'namespace' | 'term',
): Record<string, IKeySetCounts> {
  const counts = new Map<string, IKeySetCounts>();
  for (const row of entries) {
    if (row.category === 'unassessed') continue;
    const group = counts.get(row[key]) ?? {
      nativeFindings: 0,
      nonNativeLocalDiagnostics: 0,
    };
    if (row.category === 'native-local-only') group.nativeFindings++;
    else group.nonNativeLocalDiagnostics++;
    counts.set(row[key], group);
  }
  return Object.fromEntries(
    [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function unassessedReason(
  row: DeltaRow,
): IUnassessedKeySetRow['reason'] | null {
  if (!row.joined) return 'unjoined';
  if (!row.java?.terms) return 'missing-reference-terms';
  if (!row.ours?.terms) return 'missing-local-terms';
  return null;
}

/** Reuse the legacy comparator's authoritative path/hash joins. Its report is
 * read-only here: adding this report cannot alter legacy output or BV values.
 * References must be the entire trusted input, not just the selected row.
 */
export function buildBVKeySetReport(
  report: Pick<DeltaReport, 'rows'>,
  references: readonly IJavaReferenceRow[],
): IBVKeySetReport {
  const namespaces = new Map<string, Set<string>>();
  for (const reference of references) {
    const family = familyOf(reference);
    const group = namespaces.get(family) ?? new Set<string>();
    for (const key of Object.keys(
      foldWeaponTerms(reference.battleValue.terms) ?? {},
    ))
      group.add(namespaceOf(key));
    namespaces.set(family, group);
  }

  const rows: KeySetRow[] = [];
  for (const row of [...report.rows].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  )) {
    const source: IKeySetSource = {
      family: row.family,
      path: row.path,
      sha256: row.sha256 ?? null,
      sourceSha256: row.sourceSha256,
    };
    const reason = unassessedReason(row);
    if (reason) {
      rows.push({ ...source, category: 'unassessed', reason });
      continue;
    }
    const java = foldWeaponTerms(row.java?.terms) ?? {};
    const ours = foldWeaponTerms(row.ours?.terms) ?? {};
    for (const term of Object.keys(ours).sort()) {
      if (Object.hasOwn(java, term)) continue;
      const namespace = namespaceOf(term);
      const value = ours[term];
      rows.push({
        ...source,
        category: namespaces.get(row.family)?.has(namespace)
          ? 'native-local-only'
          : 'non-native-local',
        namespace,
        term,
        value: value !== undefined && Number.isFinite(value) ? value : null,
        ...(value === undefined
          ? { valueIssue: 'undefined' as const }
          : !Number.isFinite(value)
            ? { valueIssue: 'nonfinite' as const }
            : {}),
      });
    }
  }

  const counts = countRows(report.rows.length, rows);
  const families = [
    ...new Set([...namespaces.keys(), ...report.rows.map((row) => row.family)]),
  ].sort();
  return {
    schemaVersion: 1,
    ok: counts.nativeFindings === 0 && counts.unassessedRows === 0,
    counts,
    nativeNamespaces: Object.fromEntries(
      [...namespaces.keys()]
        .sort()
        .map((family) => [family, [...(namespaces.get(family) ?? [])].sort()]),
    ),
    byFamily: Object.fromEntries(
      families.map((family) => {
        const group = rows.filter((row) => row.family === family);
        return [
          family,
          {
            ...countRows(
              report.rows.filter((row) => row.family === family).length,
              group,
            ),
            byNamespace: rollup(group, 'namespace'),
            byKey: rollup(group, 'term'),
          },
        ];
      }),
    ),
    rows,
  };
}
