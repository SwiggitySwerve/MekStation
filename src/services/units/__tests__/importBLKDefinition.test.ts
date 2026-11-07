import fixtures from '../../../../scripts/__tests__/fixtures/protomechs.pinned.json';
import { importBLKDefinition } from '../importBLKDefinition';

it('retains a structurally loadable construction-invalid source and its diagnostics', async () => {
  const text = fixtures[0].blk.replace(
    /<cruiseMP>[\s\S]*?<\/cruiseMP>/,
    '<cruiseMP>\n0\n</cruiseMP>',
  );
  const result = await importBLKDefinition(text);
  expect(result).toMatchObject({
    success: true,
    data: {
      definition: {
        family: 'protomechs',
        isValid: false,
        movement: { cruiseMP: 0 },
        validationErrors: expect.arrayContaining([
          expect.stringMatching(/cruise MP/i),
        ]),
        blkSource: { text, diagnostics: { isValid: false } },
      },
    },
  });
});

it('returns handler diagnostics rather than substituting invalid source motion', async () => {
  const result = await importBLKDefinition(
    fixtures[0].blk.replace('Biped', 'Tracked'),
  );
  expect(result).toMatchObject({
    success: false,
    error: {
      validationErrors: expect.arrayContaining([
        expect.stringContaining('motion_type'),
      ]),
    },
  });
});
