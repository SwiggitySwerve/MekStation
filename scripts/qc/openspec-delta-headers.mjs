import fs from 'node:fs';
import path from 'node:path';

function deltaSpecs(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return deltaSpecs(file);
      return entry.isFile() && entry.name === 'spec.md' ? [file] : [];
    });
}

/** Active-change discovery belongs to the CI validator; archives are excluded there. */
export function findDuplicateDeltaHeaders(changesDirectory, activeChanges) {
  const duplicates = [];
  for (const change of activeChanges) {
    for (const file of deltaSpecs(
      path.join(changesDirectory, change, 'specs'),
    )) {
      const operations = new Map();
      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const match =
            /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements[ \t]*$/.exec(
              line,
            );
          if (!match) return;
          const lines = operations.get(match[1]) ?? [];
          lines.push(index + 1);
          operations.set(match[1], lines);
        });
      for (const [operation, lines] of operations) {
        if (lines.length > 1) duplicates.push({ file, operation, lines });
      }
    }
  }
  return duplicates;
}
