import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CanonicalUnitService } from '../CanonicalUnitService';
import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';
import { loadUnitDefinition } from '../unitLoaderService/loadUnitDefinition';

describe('canonical source read failures', () => {
  let root: string;
  let file: string;
  const originalFetch = global.fetch;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'canonical-read-'));
    const directory = path.join(root, 'public/data/units/infantry');
    fs.mkdirSync(directory, { recursive: true });
    file = path.join(directory, 'squad.json');
    fs.writeFileSync(
      path.join(directory, 'index.json'),
      JSON.stringify({
        units: [
          {
            id: 'squad',
            chassis: 'Squad',
            model: '',
            tonnage: 1,
            techBase: 'INNER_SPHERE',
            year: 3050,
            unitType: 'Infantry',
            path: 'squad.json',
          },
        ],
      }),
    );
    global.fetch = jest.fn(async (input) => {
      const pathname = new URL(String(input), 'http://localhost').pathname;
      const target = path.join(root, 'public', pathname);
      return {
        ok: fs.existsSync(target),
        status: fs.existsSync(target) ? 200 : 404,
        json: async () => JSON.parse(fs.readFileSync(target, 'utf8')),
      } as Response;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each(['missing file', 'malformed JSON'])(
    'distinguishes %s from an absent id and retries the repaired source',
    async (failure) => {
      if (failure === 'malformed JSON') fs.writeFileSync(file, '{bad json');
      const node = new NodeCanonicalUnitService(root);
      const services = [new CanonicalUnitService(), node];
      for (const service of services) {
        expect(await service.getById('infantry:squad')).toBeNull();
        await expect(
          service.getById('infantry:squad', { strict: true }),
        ).rejects.toThrow();
        const result = await loadUnitDefinition(
          {
            read: (reference) =>
              service.getById(reference.id, {
                family: reference.family,
                strict: true,
              }),
          },
          { source: 'canonical', family: 'infantry', id: 'squad' },
        );
        expect(result).toMatchObject({ success: false, code: 'read-failed' });
        expect(result).not.toHaveProperty('definition');
        expect(
          await service.getById('infantry:unknown', { strict: true }),
        ).toBeNull();
      }
      expect(() =>
        node.getByIdSync('infantry:squad', { strict: true }),
      ).toThrow();

      const repaired = {
        id: 'squad',
        unitType: 'Infantry',
        source: 'retained',
      };
      fs.writeFileSync(file, JSON.stringify(repaired));
      for (const service of services) {
        expect(
          await service.getById('infantry:squad', { strict: true }),
        ).toEqual(repaired);
        expect(await service.getById('squad', { family: 'infantry' })).toBe(
          await service.getById('infantry:squad'),
        );
      }
    },
  );
});
