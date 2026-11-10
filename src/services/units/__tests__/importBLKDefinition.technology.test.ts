import { createHash } from 'node:crypto';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { RulesLevel, TechBase } from '@/types/enums';

import { createBattleArmorHandler } from '../handlers/BattleArmorUnitHandler';
import { createInfantryHandler } from '../handlers/InfantryUnitHandler';
import { createVehicleHandler } from '../handlers/VehicleUnitHandler';
import { importBLKDefinition } from '../importBLKDefinition';
import fixtures from './fixtures/mixed-blk-technology.pinned.json';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
describe('native Mixed BLK binary technology import', () => {
  it.each(fixtures.fixtures)(
    'retains the pinned binary facts for $path',
    async (source) => {
      expect(createHash('sha256').update(source.blk).digest('hex')).toBe(
        source.sha256,
      );
      const parsed = new BlkParserService().parse(source.blk);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const handler =
        source.unitType === 'BattleArmor'
          ? createBattleArmorHandler()
          : source.unitType === 'Tank'
            ? createVehicleHandler()
            : createInfantryHandler();
      const native = handler.parse(parsed.data.document);
      if (!native.success) throw new Error(native.error.errors.join('; '));
      expect(native.data.unit).toMatchObject({
        techBase: TechBase[source.techBase as keyof typeof TechBase],
        rulesLevel: RulesLevel[source.rulesLevel as keyof typeof RulesLevel],
      });
      const imported = await importBLKDefinition(source.blk);
      expect(imported).toMatchObject({
        success: true,
        data: {
          definition: {
            techBase: source.techBase,
            rulesLevel: source.rulesLevel,
            blkSource: {
              text: source.blk,
              document: { type: parsed.data.document.type },
              handlerUnit: {
                techBase: TechBase[source.techBase as keyof typeof TechBase],
                rulesLevel:
                  RulesLevel[source.rulesLevel as keyof typeof RulesLevel],
              },
            },
          },
        },
      });
      if (imported.success) {
        expect(imported.data.definition).not.toHaveProperty('techBaseMode');
        expect(imported.data.definition).not.toHaveProperty('isMixedTech');
      }
    },
  );

  it.each([
    ['Clan', false, TechBase.CLAN],
    ['IS', true, TechBase.INNER_SPHERE],
  ] as const)(
    'keeps an explicit opposite-tech engine on a %s chassis',
    (chassis, flag, techBase) => {
      const source = fixtures.fixtures.find((row) => row.unitType === 'Tank');
      if (!source) throw new Error('Missing pinned Tank fixture');
      // Synthetic variants of the exact source, not additional native fixtures.
      const text =
        source.blk
          .replace(
            /<type>[\s\S]*?<\/type>/i,
            `<type>Mixed (${chassis} Chassis) Experimental</type>`,
          )
          .replace(/<clan_engine>[\s\S]*?<\/clan_engine>/i, '') +
        `\n<clan_engine>${flag}</clan_engine>\n`;
      const parsed = new BlkParserService().parse(text);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      expect(createVehicleHandler().parse(parsed.data.document)).toMatchObject({
        success: true,
        data: {
          unit: {
            techBase,
            clanEngine: flag,
            rulesLevel: RulesLevel.EXPERIMENTAL,
          },
        },
      });
    },
  );

  it.each(['IS', 'Clan'])(
    'refuses unrepresentable Mixed %s Unofficial with structured diagnostics',
    async (chassis) => {
      const source = fixtures.fixtures.find(
        (row) => row.unitType === 'Infantry',
      );
      if (!source) throw new Error('Missing pinned infantry fixture');
      const text = source.blk.replace(
        /<type>[\s\S]*?<\/type>/i,
        `<type>Mixed (${chassis} Chassis) Unofficial</type>`,
      );
      await expect(importBLKDefinition(text)).resolves.toMatchObject({
        success: false,
        error: {
          validationErrors: expect.arrayContaining([
            expect.stringMatching(/Unofficial.*RulesLevel/),
          ]),
        },
      });
    },
  );
});
