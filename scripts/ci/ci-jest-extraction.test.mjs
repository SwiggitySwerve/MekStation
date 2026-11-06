import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { measureJestFiles } from '../jest/test-file-durations.mjs';

test('Jest extraction preserves failed samples, slower duplicates, clamps and finite guards', () => {
  const root = path.resolve('fixture');
  const result = measureJestFiles(
    {
      testResults: [
        {
          name: path.join(root, 'a.test.ts'),
          startTime: 0,
          endTime: 10,
          status: 'failed',
        },
        { name: path.join(root, 'a.test.ts'), startTime: 0, endTime: 5 },
        { name: path.join(root, 'b.test.ts'), startTime: 10, endTime: 0 },
        { name: path.join(root, 'c.test.ts'), startTime: 0, endTime: NaN },
      ],
    },
    root,
  );
  assert.deepEqual(result, {
    filesSeen: 3,
    durations: { 'a.test.ts': 10, 'b.test.ts': 0 },
  });
  assert.throws(() => measureJestFiles({}, root), /no testResults/);
});
