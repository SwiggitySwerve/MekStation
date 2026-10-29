import { createHash } from 'crypto';

import { decodeBlkConstructionEngine } from '@/services/conversion/blkEngineIdentity';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { computeVehicleEngineWeight } from '@/utils/construction/vehicle/engine';

import { VehicleUnitHandler } from '../VehicleUnitHandler';
import sources from './fixtures/none-trailers.json';

const parser = new BlkParserService();
const handler = new VehicleUnitHandler();

describe('explicit BLK NONE independently of trailer identity', () => {
  it.each(sources)('loads original source $path', ({ content, sha256 }) => {
    expect(createHash('sha256').update(content).digest('hex')).toBe(sha256);
    const parsed = parser.parse(content);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const loaded = handler.parse(parsed.data.document);
    expect(loaded.success).toBe(true);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    expect(loaded.data.unit.engineType).toBe(8);
    expect(loaded.data.unit.engineRating).toBe(0);
    expect(loaded.data.unit.isTrailer).toBe(true);
    expect(handler.calculateWeight(loaded.data.unit)).toBe(
      loaded.data.unit.tonnage * 0.1 + loaded.data.unit.totalArmorPoints / 16,
    );
  });

  it.each([false, true])(
    'keeps zero-cruise identity with trailer=%s',
    (trailer) => {
      const parsed = parser.parse(sources[0].content);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      for (const code of [0, 1, 8]) {
        const loaded = handler.parse({
          ...parsed.data.document,
          engineType: code,
          rawTags: {
            ...parsed.data.document.rawTags,
            trailer: String(trailer),
          },
        });
        expect(loaded.success).toBe(true);
        if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
        expect(loaded.data.unit.engineRating).toBe(code === 8 ? 0 : 10);
        expect(loaded.data.unit.isTrailer).toBe(trailer);
      }
    },
  );

  it('preserves positive-cruise NONE loading and separately diagnoses legality', () => {
    const parsed = parser.parse(sources[0].content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const loaded = handler.parse({ ...parsed.data.document, cruiseMP: 3 });
    expect(loaded.success).toBe(true);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    expect(loaded.data.unit.engineRating).toBeGreaterThan(0);
    expect(handler.validate(loaded.data.unit).errors.join(' ')).toMatch(
      /absent engine|NONE/i,
    );
  });

  it('distinguishes known absence from unknown or unsupported engines', () => {
    expect(decodeBlkConstructionEngine(8, false)).toBeNull();
    expect(() => decodeBlkConstructionEngine(99, false)).toThrow();
    expect(() => decodeBlkConstructionEngine(9, false)).toThrow();
  });

  it.each([GroundMotionType.TRACKED, GroundMotionType.HOVER])(
    'returns zero before installed-engine rules for %s',
    (motionType) => {
      for (const rating of [0, 155, 500]) {
        expect(
          computeVehicleEngineWeight(rating, null, { tonnage: 52, motionType }),
        ).toBe(0);
      }
    },
  );
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])(
    'retains independent Clan flags for supported source %s',
    (engineType) => {
      const parsed = parser.parse(sources[0].content);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      for (const [type, flag] of [
        ['IS Level 2', 'true'],
        ['Clan Level 2', 'false'],
      ]) {
        const loaded = handler.parse({
          ...parsed.data.document,
          type,
          engineType,
          rawTags: { ...parsed.data.document.rawTags, clan_engine: flag },
        });
        expect(loaded.success).toBe(true);
        if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
        expect(loaded.data.unit.clanEngine).toBe(flag === 'true');
        expect(loaded.data.unit.engineType).toBe(engineType);
      }
    },
  );

  it('reports unknown direct document codes without throwing or accepting absence', () => {
    const parsed = parser.parse(sources[0].content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const result = handler.parse({ ...parsed.data.document, engineType: 99 });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Unknown engine accepted');
    expect(result.error.errors.join(' ')).toMatch(/BLK engine_type: 99/);
  });
});
