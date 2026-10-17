import * as fs from 'fs';
import * as path from 'path';

// A sandboxed preload only gets Electron's limited `require`, which cannot
// load project files: a runtime `../types/BaseTypes` import compiles to a
// require() that kills the whole bridge ("module not found").
const source = fs.readFileSync(
  path.join(__dirname, '..', 'preload.ts'),
  'utf8',
);
const statements =
  source.match(/^(import|export)\b[^;]*?\bfrom\s+'[^']+'/gm) ?? [];

describe('sandboxed preload script', () => {
  it('only imports electron at runtime (relative imports are type-only)', () => {
    const runtime = statements
      .filter((statement) => !/^(import|export) type\b/.test(statement))
      .map((statement) => /'([^']+)'$/.exec(statement)?.[1]);
    expect(runtime).toEqual(['electron']);
    expect(source).not.toMatch(/\brequire\s*\(|\bimport\s*\(/);
  });
});
