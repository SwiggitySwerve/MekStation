/**
 * Pins the legacy unseeded recovery roller as the only remaining ambient
 * (`Math.random`) roller handed to an interactive session: it may be
 * referenced only by its own module and by `fromSessionAsync`'s seedless
 * branch. OPEN (D-8): resume design (b) removes it.
 */
import * as fs from 'fs';
import * as path from 'path';

import { createLegacyUnseededRecoveryD6Roller } from '../legacyUnseededRecoveryD6Roller';

const SRC_ROOT = path.resolve(__dirname, '..', '..');
const NAME = 'createLegacyUnseededRecoveryD6Roller';

function productionFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      productionFiles(full, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec|stories)\.tsx?$/.test(entry.name) &&
      !entry.name.includes('.test-helpers.')
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('createLegacyUnseededRecoveryD6Roller', () => {
  it('is used only by the seedless branch of fromSessionAsync', () => {
    const users = productionFiles(SRC_ROOT)
      .filter((file) => fs.readFileSync(file, 'utf8').includes(NAME))
      .map((file) => path.relative(SRC_ROOT, file).split(path.sep).join('/'))
      .sort();
    expect(users).toEqual([
      'engine/InteractiveSession.ts',
      'engine/legacyUnseededRecoveryD6Roller.ts',
    ]);
    const source = fs.readFileSync(
      path.join(SRC_ROOT, 'engine', 'InteractiveSession.ts'),
      'utf8',
    );
    expect(source.split(`${NAME}()`).length - 1).toBe(1);
  });

  it('rolls a d6 from the ambient source, as main did for old saves', () => {
    const roller = createLegacyUnseededRecoveryD6Roller();
    const random = jest.spyOn(Math, 'random');
    try {
      random.mockReturnValue(0);
      expect(roller()).toBe(1);
      random.mockReturnValue(0.999);
      expect(roller()).toBe(6);
    } finally {
      random.mockRestore();
    }
  });
});
