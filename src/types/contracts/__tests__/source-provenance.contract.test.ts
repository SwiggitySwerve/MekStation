/** Shared wire fixtures exercise the generated boundary without editor state. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { SourceProvenanceContract } from '@/types/contracts';

interface IConformanceCase {
  name: string;
  accepted: boolean;
  document: unknown;
}

const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'fixtures/source-provenance.json'),
    'utf8',
  ),
) as { originalBytesHex: string; cases: IConformanceCase[] };

describe('portable source provenance v1', () => {
  test.each(fixtures.cases)('$name (accepted=$accepted)', (fixture) => {
    const result = SourceProvenanceContract.safeParse(fixture.document);
    expect({ name: fixture.name, accepted: result.success }).toEqual({
      name: fixture.name,
      accepted: fixture.accepted,
    });
    if (result.success) {
      // A boundary must retain every source row and metadata value exactly.
      expect(result.data).toEqual(fixture.document);
      expect(
        SourceProvenanceContract.parse(JSON.parse(JSON.stringify(result.data))),
      ).toEqual(result.data);
    } else {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it('keeps original-byte SHA-256 separate from Git blob and design identity', () => {
    const bytes = Buffer.from(fixtures.originalBytesHex, 'hex');
    const digest = createHash('sha256').update(bytes).digest('hex');
    expect(
      createHash('sha256')
        .update(bytes.toString('utf8').replaceAll('\r\n', '\n'))
        .digest('hex'),
    ).not.toBe(digest);
    for (const fixture of fixtures.cases.filter((entry) => entry.accepted)) {
      const parsed = SourceProvenanceContract.parse(fixture.document);
      expect(parsed.sources.every((source) => source.sha256 === digest)).toBe(
        true,
      );
      for (const { source } of parsed.sources) {
        if (source.kind === 'git') {
          const algorithm = source.blob.length === 40 ? 'sha1' : 'sha256';
          expect(
            createHash(algorithm)
              .update(`blob ${bytes.length}\0`)
              .update(bytes)
              .digest('hex'),
          ).toBe(source.blob);
        }
      }
    }
  });
});
