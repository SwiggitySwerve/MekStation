/**
 * NodeCanonicalUnitService missing-family TTL (S10 PR1).
 *
 * An absent family index (ENOENT) is remembered only briefly, so a catalog
 * that appears after the first read is picked up without a process restart.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';

/** The missing-family TTL agreed for S10 (30 seconds). */
const MISSING_FAMILY_TTL_MS = 30_000;

describe('NodeCanonicalUnitService missing family TTL', () => {
  let projectRoot: string;
  let service: NodeCanonicalUnitService;

  const familyDir = (): string =>
    path.join(projectRoot, 'public', 'data', 'units', 'battlemechs');
  const writeIndex = (): void => {
    fs.mkdirSync(familyDir(), { recursive: true });
    fs.writeFileSync(
      path.join(familyDir(), 'index.json'),
      JSON.stringify({
        version: 'ttl-test',
        units: [
          {
            id: 'atlas-as7-d',
            chassis: 'Atlas',
            model: 'AS7-D',
            tonnage: 100,
            techBase: 'INNER_SPHERE',
            year: 2750,
            path: 'atlas.json',
          },
        ],
      }),
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-08T00:00:00Z'));
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-missing-family-'));
    service = new NodeCanonicalUnitService(projectRoot);
  });

  afterEach(() => {
    jest.useRealTimers();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('keeps a missing family empty until the TTL elapses', () => {
    expect(service.getIndexSync()).toEqual([]);
    writeIndex();
    jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS - 1);

    expect(service.getIndexSync()).toEqual([]);
  });

  it('rereads a missing family once the TTL has elapsed', () => {
    expect(service.getIndexSync()).toEqual([]);
    writeIndex();
    jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS);

    expect(service.getIndexSync()).toHaveLength(1);
  });

  it('stays missing for another TTL when the retry finds the file still absent', () => {
    expect(service.getIndexSync()).toEqual([]);
    jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS);
    expect(service.getIndexSync()).toEqual([]);
    writeIndex();
    jest.advanceTimersByTime(MISSING_FAMILY_TTL_MS - 1);

    expect(service.getIndexSync()).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(service.getIndexSync()).toHaveLength(1);
  });
});
