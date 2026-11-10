import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';
import { createHash } from 'node:crypto';

import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import type { IUnitMountedEquipmentIdentity } from '@/types/unit/MountedEquipmentInterfaces';
import type { UnitFamily } from '@/types/unit/UnitIndex';
import type {
  IUnitParseData,
  IUnitTypeHandler,
  IUnitValidateResult,
} from '@/types/unit/UnitTypeHandler';

import customHandler from '@/pages/api/units/custom/[id]';
import handler from '@/pages/api/units/import';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import mixedTechnologyFixtures from '@/services/units/__tests__/fixtures/mixed-blk-technology.pinned.json';
import aerospaceFixtures from '@/services/units/handlers/__tests__/fixtures/aerospace-capital-validity.json';
import fixedWingFixtures from '@/services/units/handlers/__tests__/fixtures/fixed-wing-support.json';
import locationFixtures from '@/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import { createAerospaceHandler } from '@/services/units/handlers/AerospaceUnitHandler';
import { createBattleArmorHandler } from '@/services/units/handlers/BattleArmorUnitHandler';
import { createConventionalFighterHandler } from '@/services/units/handlers/ConventionalFighterUnitHandler';
import { FixedWingSupportUnitHandler } from '@/services/units/handlers/FixedWingSupportUnitHandler';
import { createInfantryHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { createSmallCraftHandler } from '@/services/units/handlers/SmallCraftUnitHandler';
import { createSupportVehicleHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { createVehicleHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { createVTOLHandler } from '@/services/units/handlers/VTOLUnitHandler';
import vehicleFixtures from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';

import fixtures from '../../../../scripts/__tests__/fixtures/protomechs.pinned.json';
import { parseImportResponse } from '../../helpers';

async function post(sourceText: unknown) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
  });
  req.body = { sourceFormat: 'blk', sourceText };
  await handler(req, res);
  return res;
}

async function reload<F extends UnitFamily>(family: F, id: string) {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id },
    });
    await customHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    return {
      ok: true,
      json: async () => JSON.parse(res._getData()),
    } as Response;
  });
  try {
    return await loadUnitDefinition(family, id, 'custom');
  } finally {
    global.fetch = originalFetch;
  }
}
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(123456789);
  getSQLiteService({ path: ':memory:' }).initialize();
});
afterEach(() => {
  resetSQLiteService();
  jest.restoreAllMocks();
});

it.each(
  mixedTechnologyFixtures.fixtures.filter(
    (source) => source.unitType === 'Infantry',
  ),
)(
  'saves and reopens the pinned Mixed infantry binary fields: $path',
  async (source) => {
    const response = await post(source.blk);
    expect(response._getStatusCode()).toBe(201);
    const id = parseImportResponse(response).data?.unitId;
    if (!id) throw new Error('Expected saved custom identity');
    expect(await reload('infantry', id)).toMatchObject({
      success: true,
      definition: {
        techBase: source.techBase,
        rulesLevel: source.rulesLevel,
        blkSource: { text: source.blk, handlerUnit: { techBase: 'Clan' } },
      },
    });
    expect(getUnitRepository().getById(id)).toMatchObject({
      techBase: source.techBase,
      rulesLevel: source.rulesLevel,
    });
  },
);

it.each(['IS', 'Clan'])(
  'refuses Mixed %s Unofficial without a database write',
  async (chassis) => {
    const source = mixedTechnologyFixtures.fixtures.find(
      (row) => row.unitType === 'Infantry',
    );
    if (!source) throw new Error('Missing pinned infantry fixture');
    const text = source.blk.replace(
      /<type>[\s\S]*?<\/type>/i,
      `<type>Mixed (${chassis} Chassis) Unofficial</type>`,
    );
    const before = getUnitRepository().list();
    const response = await post(text);
    expect(response._getStatusCode()).toBe(400);
    expect(parseImportResponse(response).error?.validationErrors).toEqual(
      expect.arrayContaining([expect.stringMatching(/Unofficial.*RulesLevel/)]),
    );
    expect(getUnitRepository().list()).toEqual(before);
  },
);

it.each(fixtures)(
  'imports and reloads pinned $path without dropping source or handler facts',
  async (source) => {
    expect(createHash('sha256').update(source.blk).digest('hex')).toBe(
      source.sha256,
    );
    const parsed = new BlkParserService().parse(source.blk);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const expected = parseExpected(
      parsed.data.document,
      createProtoMechHandler(),
    );
    await expectSavedImport(
      'protomechs',
      source.blk,
      parsed.data.document,
      expected,
      {
        armor: { byLocation: expected.unit.armorByLocation },
        movement: {
          cruiseMP: expected.unit.cruiseMP,
          jumpMP: expected.unit.jumpMP,
        },
      },
      false,
      parsed.data.warnings,
    );
  },
);

// Raw-byte SHA-256 values independently verified with git show mm-data 50f7efe.
// vehicles.pinned.json's existing hashes normalize CRLF; its content is original.
const vehicleSources = [
  [
    '2750 IS Land/Puma Assault Tank PAT-001.blk',
    'bee0871399a451f95ebb09a16a38c1a0fd68d86e0e48844245761f3056667e57',
    UnitType.VEHICLE,
    'Tracked',
  ],
  [
    '3085u/Cutting Edge/Ranger Armored Fighting Vehicle VV22.blk',
    'c669a3372977bcdb932e62f51d5ef82c5e64df98c33ea5fb51b355f5a27ec178',
    UnitType.VEHICLE,
    'Wheeled',
  ],
  [
    '3075/Tamerlane Strike Sled (Flamer).blk',
    '5ceb9843137d2eadd33866de3484c8f9f9f4570da60e134a2a088c8d4b7f83d3',
    UnitType.VEHICLE,
    'Hover',
  ],
  [
    '3145/Clans/Skadi Swift Attack VTOL.blk',
    'f0dfb188cfcddd624fbdf4a50460a05868b19e07bc832d45d36f1aa680012213',
    UnitType.VTOL,
    'VTOL',
  ],
  [
    'AToW Companion/Naval/Small Steamer.blk',
    'cfe001a95c9166ad26f788371589a743c6f2b0c2f1175da85daa02ff8721f62c',
    UnitType.SUPPORT_VEHICLE,
    'Naval',
  ],
  [
    'AToW Companion/Hover/Boreas Cavalry Hovercraft Prime.blk',
    '9c7a6cce4ed989563faadd8ce15febbaf7c9d15e30f9e14fec6556f8b8f47d33',
    UnitType.SUPPORT_VEHICLE,
    'Hover',
  ],
  [
    '3145/Steiner/Gulltoppr OmniMonitor (A).blk',
    'a2b9d49d48f46d85a8078cdbf00566215ee403a2827417473539e35f7e7d1346',
    UnitType.VEHICLE,
    'Tracked',
  ],
  [
    '3075 Support tanks/HMRV (Hazardous Materials Recovery Vehicle) Oppie O-65.blk',
    '997bcdf57f7e3942358811cec54ca6ce358b2d8623dd3aecf6463ea3704562b4',
    UnitType.SUPPORT_VEHICLE,
    'Tracked',
  ],
] as const;

function vehicleText(path: string): string {
  const text =
    vehicleFixtures.rows.find((row) => row.path === path)?.content ??
    locationFixtures.rows.find(
      (row) => row.path === `data/mekfiles/vehicles/${path}`,
    )?.content;
  if (!text) throw new Error(`Missing committed vehicle fixture: ${path}`);
  return text;
}

function parseExpected<T extends IBaseUnit>(
  document: IBlkDocument,
  handler: IUnitTypeHandler<T>,
) {
  const result = handler.parse(document);
  if (!result.success) throw new Error(result.error.errors.join('; '));
  return { ...result.data, diagnostics: handler.validate(result.data.unit) };
}

type ImportProofUnit = IBaseUnit & {
  readonly equipment?: readonly (IUnitMountedEquipmentIdentity & {
    readonly location: string;
  })[];
};

async function expectSavedImport(
  family: UnitFamily,
  text: string,
  document: IBlkDocument,
  expected: IUnitParseData<ImportProofUnit> & {
    readonly diagnostics: IUnitValidateResult;
  },
  fields: Record<string, unknown>,
  invalid = false,
  parserWarnings: readonly string[] = [],
) {
  const { unit } = expected;
  if (invalid) {
    expect(expected.diagnostics.isValid).toBe(false);
    expect(expected.diagnostics.errors.length).toBeGreaterThan(0);
  }
  const res = await post(text);
  expect(res._getStatusCode()).toBe(201);
  const id = parseImportResponse(res).data?.unitId;
  if (!id) throw new Error('Expected saved custom identity');
  expect(id).toMatch(/^custom-/);
  expect(id).not.toBe(unit.id);
  expect(getUnitRepository().list()).toHaveLength(1);
  const loaded = await reload(family, id);
  expect(loaded).toMatchObject({
    success: true,
    family,
    reference: { source: 'custom', family, id, version: 1 },
  });
  if (!loaded.success) throw new Error(loaded.error);
  expect(loaded.definition).toMatchObject({
    id,
    family,
    unitType: unit.unitType,
    chassis: document.name,
    model: document.model,
    isValid: unit.isValid,
    validationErrors: unit.validationErrors,
    equipment: unit.equipment?.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: mount.location,
    })),
    ...fields,
  });
  expect(loaded.definition.blkSource).toEqual(
    JSON.parse(
      JSON.stringify({
        text,
        document,
        handlerUnit: unit,
        diagnostics: expected.diagnostics,
        warnings: [...parserWarnings, ...expected.warnings],
      }),
    ),
  );
  return loaded;
}

async function expectVehicleImport(
  text: string,
  unitType: UnitType,
  motionType: string,
  invalid = false,
) {
  const parsed = new BlkParserService().parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const expected =
    unitType === UnitType.VTOL
      ? parseExpected(parsed.data.document, createVTOLHandler())
      : unitType === UnitType.SUPPORT_VEHICLE
        ? parseExpected(parsed.data.document, createSupportVehicleHandler())
        : parseExpected(parsed.data.document, createVehicleHandler());
  await expectSavedImport(
    'vehicles',
    text,
    parsed.data.document,
    expected,
    {
      unitType,
      motionType,
      armor: { byLocation: expected.unit.armorByLocation },
      movement: expected.unit.movement,
    },
    invalid,
    parsed.data.warnings,
  );
}

it.each(vehicleSources)(
  'saves and reloads original vehicle bytes %s',
  async (path, sha256, unitType, motionType) => {
    const text = vehicleText(path);
    expect(createHash('sha256').update(text).digest('hex')).toBe(sha256);
    await expectVehicleImport(text, unitType, motionType);
  },
);

it('saves and reloads a loadable construction-invalid vehicle with diagnostics', async () => {
  const source = vehicleText(vehicleSources[3][0]);
  const text = source.replace(
    /<cruiseMP>[\s\S]*?<\/cruiseMP>/i,
    '<cruiseMP>\n0\n</cruiseMP>',
  );
  expect(text).not.toBe(source);
  await expectVehicleImport(text, UnitType.VTOL, 'VTOL', true);
});

it('rejects a vehicle name conflict without overwriting its saved source', async () => {
  const text = vehicleText(vehicleSources[0][0]);
  expect((await post(text))._getStatusCode()).toBe(201);
  const before = getUnitRepository().list();
  const saved = getUnitRepository().getById(before[0].id);
  const res = await post(`# conflicting source\n${text}`);
  expect(res._getStatusCode()).toBe(409);
  expect(parseImportResponse(res).error?.suggestedName).toBeTruthy();
  expect(getUnitRepository().list()).toEqual(before);
  expect(getUnitRepository().getById(before[0].id)).toEqual(saved);
});

it('rejects an unrepresentable vehicle armor code without defaulting or writing', async () => {
  const text = vehicleText(vehicleSources[0][0]).replace(
    /<armor_type>[\s\S]*?<\/armor_type>/i,
    '<armor_type>999</armor_type>',
  );
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /armor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});

it('preserves the existing ProtoMech armor admission boundary', async () => {
  const text = fixtures[0].blk.replace(
    /<armor_type>[\s\S]*?<\/armor_type>/i,
    '<armor_type>4</armor_type>',
  );
  expect(text).not.toBe(fixtures[0].blk);
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /armor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});

it.each(['DropShip', 'BattleMech'])(
  'explicitly rejects unsupported BLK type %s without a write',
  async (type) => {
    const res = await post(fixtures[0].blk.replace('ProtoMek', type));
    expect(res._getStatusCode()).toBe(400);
    expect(parseImportResponse(res).error?.message).toMatch(
      /unsupported BLK unit type/i,
    );
    expect(getUnitRepository().list()).toHaveLength(0);
  },
);
it.each([
  undefined,
  42,
  'not BLK',
  fixtures[0].blk.replace(
    /<cruiseMP>[\s\S]*?<\/cruiseMP>/,
    '<cruiseMP>bad</cruiseMP>',
  ),
])('rejects malformed source %# without a write', async (text) => {
  expect((await post(text))._getStatusCode()).toBe(400);
  expect(getUnitRepository().list()).toHaveLength(0);
});

// Original bytes from mm-data 50f7efe; retained here to keep the four-file slice.
const additionalAerospaceText: Readonly<Partial<Record<string, string>>> = {
  'convfighter/3039u/Boeing Jump Bomber.blk':
    "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a9d6-77a9-9301-8e42c523eb53\n</UUID>\n\n<UnitType>\nConvFighter\n</UnitType>\n\n<Name>\nBoeing Jump Bomber\n</Name>\n\n<Model>\n\n</Model>\n\n<mul id:>\n409\n</mul id:>\n\n<year>\n3037\n</year>\n\n<type>\nIS Level 1\n</type>\n\n<role>\nNone\n</role>\n\n<motion_type>\nAerodyne\n</motion_type>\n\n<SafeThrust>\n9\n</SafeThrust>\n\n<cockpit_type>\n0\n</cockpit_type>\n\n<vstol>\n1\n</vstol>\n\n<heatsinks>\n10\n</heatsinks>\n\n<sink_type>\n0\n</sink_type>\n\n<fuel>\n320\n</fuel>\n\n<engine_type>\n1\n</engine_type>\n\n<armor_type>\n0\n</armor_type>\n\n<armor_tech_rating>\n0\n</armor_tech_rating>\n\n<armor_tech_level>\n1\n</armor_tech_level>\n\n<armor>\n7\n3\n3\n3\n</armor>\n\n<Nose Equipment>\n</Nose Equipment>\n\n<Left Wing Equipment>\n</Left Wing Equipment>\n\n<Right Wing Equipment>\n</Right Wing Equipment>\n\n<Aft Equipment>\n</Aft Equipment>\n\n<Wings Equipment>\n</Wings Equipment>\n\n<Fuselage Equipment>\n</Fuselage Equipment>\n\n<capabilities>\n<p>The two main features of the Jump Bomber are its low cost and high speed. At just under 160,000 C-bills each, the Boeing Jump Bomber costs one-sixth as much as the cheapest aerospace fighter. Boeing shamelessly based the design on the successful Capellan Guardian fighter, modifying the chassis for more advanced manufacturing facilities while keeping the popular integral diagnostic system. Most armor and weapons were removed to install a larger engine, and the resulting high thrust allows the fighter to swiftly carry a full external payload across the battlefield.</p><p>Paper-thin armor guarantees that most Jump Bombers encountering hostile fire will not return. Since most conventional fighters cannot survive return fire anyway, Federated Boeing mounted only a single ton of armor to shield the internals from weather and small arms fire. Boeing planned to borrow Capellan bomb-release tactics developed by Guardian pilots, such as toss bombing, where the aircraft releases bombs in upward arcs and turns away before reaching the target zone. The Jump Bomber also retained the Guardian's VSTOL capability, allowing commanders to bring Jump Bombers on offensive missions without captured airstrips, following the main force anywhere on the planetary surface as long as fuel and bombs are supplied.</p>\n</capabilities>\n\n<overview>\n<p>Military planners inside Federated Suns space anticipated Capellan attempts to exploit upcoming Federated Commonwealth actions against House Kurita. To address this, the AFFS began to heavily fortify key systems along the Capellan border. Planners repeatedly requested additional aerospace fighters be permanently stationed on those worlds, but even the Lyran alliance and the technological recovery from the Helm Memory Core could not produce adequate quantities of such advanced vehicles. Since there were not enough fighters to leave idle on non-capital planets, the requests were refused. The AFFS decided to resort to swarms of much less expensive conventional fighters to fill the ground support role. Federated Boeing was the only company to approach the bid with a working prototype, easily securing the contract.</p>\n</overview>\n\n<deployment>\n<p>The first run of twenty-five Jump Bombers went straight to Marlette in the late 3030s. No other customers, militia or mercenary, approached Federated Boeing to purchase additional Jump Bombers, preferring to see how well they performed in combat first. No combat history was recorded until 3044, when McCarron's Armored Cavalry attacked the system; the Jump Bomber functioned properly but failed to turn the tide of the campaign or make any significant impact.</p>\n</deployment>\n\n<history>\n<p>The Jump Bomber's design philosophy was rooted in expendability. Federated Boeing recognized that planetary militia pilots lacked the skills of elite aerospace jockeys, and the relatively simple, pilot-friendly craft was built to accommodate that reality. The Boeing X550 chassis was straightforward enough that even inexperienced pilots could operate it effectively after minimal training, and the integral diagnostic system inherited from the Guardian further reduced the technical demands on poorly equipped garrisons.</p><p>Proposed variants remained more theoretical than fact throughout the design's early service life. Commanders interested in the concept attempted to mount external one-shot short-range missile packs to the wings in place of bombs, providing air cover for other Jump Bombers when hostile aircraft were in the area. Others asked Federated Boeing to increase the fighter's weight slightly to carry more ordnance, but maintaining the same airspeed on an enlarged airframe would have required a fusion engine, more than tripling the cost and defeating the key selling point of such a niche design. No upgraded variants of the Boeing were known to exist, though most eventually took advantage of the greatly increased range of external stores available by the mid-thirty-first century.</p>\n</history>\n\n<manufacturer>\nFederated-Boeing Interstellar\n</manufacturer>\n\n<primaryFactory>\nGalax\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Boeing\nENGINE:GM\nARMOR:Boeing\nCOMMUNICATIONS:Boeing\nTARGETING:Boeing\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:X550\nENGINE:180 Turbine\nARMOR:Standard Plating\nCOMMUNICATIONS:A30\nTARGETING:200\n</systemModels>\n\n<source>\nTR:3039\n</source>\n\n<published>\nRS:3039u\n</published>\n\n<tonnage>\n20.0\n</tonnage>\n\n",
  'smallcraft/HBHK/Dragonstar Assault Transport (3060).blk':
    "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-e134-7d49-91c9-665c9a7f507c\n</UUID>\n\n<UnitType>\nSmallCraft\n</UnitType>\n\n<Name>\nDragonstar Assault Transport\n</Name>\n\n<Model>\n(3060)\n</Model>\n\n<mul id:>\n7766\n</mul id:>\n\n<year>\n3060\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nNone\n</role>\n\n<motion_type>\nSpheroid\n</motion_type>\n\n<transporters>\nbattlearmorbay:3.0:2:1::-1:0\n2ndclassquarters:0.0:0:-1::-1:0\ncrewquarters:0.0:0:-1::-1:0\n1stclassquarters:0.0:0:-1::-1:0\nsteeragequarters:20.0:0:-1::-1:0\ncargobay:4.5:0:6::-1:0\n</transporters>\n\n<SafeThrust>\n5\n</SafeThrust>\n\n<heatsinks>\n20\n</heatsinks>\n\n<sink_type>\n0\n</sink_type>\n\n<fuel>\n480\n</fuel>\n\n<engine_type>\n1\n</engine_type>\n\n<armor_type>\n41\n</armor_type>\n\n<armor_tech_rating>\n0\n</armor_tech_rating>\n\n<armor_tech_level>\n1\n</armor_tech_level>\n\n<armor>\n86\n73\n73\n56\n</armor>\n\n<Nose Equipment>\nISLargePulseLaser\nISERMediumLaser\n</Nose Equipment>\n\n<Left Side Equipment>\nISMediumPulseLaser\n</Left Side Equipment>\n\n<Right Side Equipment>\nISMediumPulseLaser\n</Right Side Equipment>\n\n<Aft Equipment>\nISERMediumLaser\nISERMediumLaser\n</Aft Equipment>\n\n<Hull Equipment>\n</Hull Equipment>\n\n<structural_integrity>\n6\n</structural_integrity>\n\n<capabilities>\n<p>The Dragonstar PT is a 150-ton civilian spheroid built to basic construction standards, with a fusion engine providing safe thrust of 2.5g and a maximum of 4g. This performance is adequate for intersystem runs but leaves little margin against faster military vessels. The hull carries standard armor, offering modest protection sufficient to deter casual piracy or discourage a boarding attempt, though the vessel is clearly not designed for sustained combat. Crew quarters consist of Steerage Compartments throughout, reflecting the design's budget construction philosophy.</p><p>The PT's armament is light but practical for its role. Two Large Lasers cover the nose and aft arcs, while four Medium Lasers are distributed to cover all remaining firing directions. This arrangement can discourage opportunistic attack without transforming the vessel into a true combat platform. The Jump Infantry Bay accommodates forty troopers or an equivalent load of civilian passengers. A small secondary cargo bay handles additional supplies. The overall balance favors capacity and cost over combat effectiveness, and the Dragonstar offers little resistance to a determined military opponent.</p>\n</capabilities>\n\n<overview>\n<p>The Dragonstar Passenger Transport is the backbone of the Draconis Combine's intersystem transit network, introduced in 2610 by Yakima Enterprises, a division of the Stellar Trek conglomerate. Designed as a low-cost, easy-to-produce spheroid shuttle, the Dragonstar has ferried government officials, DCMS troops, and civilian passengers between planetary surfaces and vessels waiting in orbit or at jump points for centuries. Despite a reputation for mechanical fragility and poor cost-effectiveness for repairs, the design has embedded itself so thoroughly in Combine logistics that most operators display near-fanatical loyalty to the product line. Its enduring commercial success rests not on technical excellence but on availability, affordability, and the cultural weight of its ancestry.</p>\n</overview>\n\n<deployment>\n<p>The Dragonstar Assault Transport is assigned to DCA naval formations and ground-attack support elements tasked with delivering battle armor to contested objectives. Its battle armor compartment accommodates twelve squads, making it a practical assault insertion platform for short-range operations within a system. The updated extended-range weapon systems provide improved engagement capability against light escorts and aerospace fighters, giving the AT better survivability than the passenger variant in contested space. The trade-off is a significantly reduced cargo capacity, limiting the AT to assault operations rather than general resupply. It is typically deployed from larger DropShips or from orbital stations during contested system operations rather than operating independently.</p>\n</deployment>\n\n<history>\n<p>The Dragonstar's origins lie in the Dragon's Stars vessels of the early Draconis Combine expansion era. Those older craft served as transports for Combine diplomats and dignitaries, shuttling officials to worlds being drawn into the growing realm. Over time they became symbols of the Dragon's diplomatic reach. When Yakima Enterprises developed the modern Dragonstar design in 2610, the company deliberately preserved the aesthetic lineage of its predecessor. Updated avionics and modernized systems gave the new vessel genuine utility, while the visual connection to the original helped position it as the natural continuation of Combine interstellar culture.</p><p>The vessel's commercial model is unusual. Dragonstars are cheap to build and notoriously prone to breakdown, with most transportation firms retiring examples after roughly 1,000 AU of service rather than paying escalating repair costs. Yakima is fully aware of this pattern and has built its business around it, combining heavy government subsidies with an active secondary market in salvaged parts stripped from retired hulls. Those recovered components frequently reappear in newly manufactured vessels, raising questions about quality but doing little to diminish the near-fanatical operator loyalty the design commands.</p><p>The vessel's military evolution came in 3059, when the Draconis Combine Admiralty approached Yakima to develop an assault transport variant. The proliferation of battle armor following the Clan Invasion and a renewed emphasis on naval operations revealed a gap in the Combine's assault transport inventory. With minimal changes to the existing platform, including updated weapon systems but retained armor protection and hull layout, Yakima delivered the Dragonstar Assault Transport to DCA installations barely a year later. The AT's rapid development cycle reflected both Yakima's familiarity with the base design and the Combine's characteristic tendency to militarize commercial platforms rather than develop purpose-built military craft from scratch.</p>\n</history>\n\n<manufacturer>\nYakima Enterprises\n</manufacturer>\n\n<primaryFactory>\nChatham\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nHB:HK\n</source>\n\n<published>\nHB:HK\n</published>\n\n<tonnage>\n150.0\n</tonnage>\n\n<designtype>\n1\n</designtype>\n\n<crew>\n22\n</crew>\n\n<officers>\n1\n</officers>\n\n<gunners>\n1\n</gunners>\n\n<passengers>\n0\n</passengers>\n\n<marines>\n0\n</marines>\n\n<battlearmor>\n0\n</battlearmor>\n\n<otherpassenger>\n0\n</otherpassenger>\n\n<life_boat>\n0\n</life_boat>\n\n<escape_pod>\n0\n</escape_pod>\n\n",
};
const aerospaceSources = [
  [
    'fighters/Golden Century/Tomahawk THK-63-EC.blk',
    '6c76be647626cfef71b7fc2e9ff4a6ef129e9e12414c14b67e909687d32fd6d4',
    'fighter',
    false,
    { type: 'DOUBLE', count: 14 },
  ],
  [
    'fighters/TRO3055U/Scytha A.blk',
    'abcdc2d46d2ae4359c32e149d9b500706bc86914c9378b1230d77b5a232bceed',
    'fighter',
    true,
    { type: 'DOUBLE', count: 24 },
  ],
  [
    'convfighter/3039u/Boeing Jump Bomber.blk',
    '9b7a098389b7da73c5c9151de8ec4de330debd9ddf6a103c119ae6c35f4823a6',
    'conventional',
    false,
    { type: 'SINGLE', count: 10 },
  ],
  [
    'smallcraft/XTRO/Primitives IV/Intrepid Assault Craft (2331).blk',
    '337565e66eeef6662422066491e6e10f42af52c1397d52d6b82ffe7893554771',
    'smallcraft',
    true,
    { type: 'SINGLE', count: 22 },
  ],
  [
    'smallcraft/HBHK/Dragonstar Assault Transport (3060).blk',
    '56a4a02297d3275e7a820634d64f320d1eade089a88d3f35f5bfe95ee1118a90',
    'smallcraft',
    false,
    { type: 'SINGLE', count: 20 },
  ],
  [
    'convfighter/3039u/Boomerang Spotter Plane.blk',
    '8afe27f87816f9a96dbc6c664bb4b531b4ff66f2dfafc6dd2c7cb42243dcda9f',
    'fixed-wing',
    false,
    { type: 'SINGLE', count: 0 },
  ],
  [
    'convfighter/TRO VAr/Comet Airliner ACL-800.blk',
    'b9ef07c29771c78363e5508a93e7f458d5255de3c5b2874e975d6cc18cc04eba',
    'fixed-wing',
    true,
    { type: 'SINGLE', count: 0 },
  ],
  [
    'vehicles/3085u/Cutting Edge/Zugvogel Omni Support Aircraft Prime.blk',
    'ebc4577f54219dc6099742aeb3f0125e06622e6144bd8b015b7deb9521e557db',
    'fixed-wing',
    false,
    { type: 'SINGLE', count: 0 },
  ],
] as const;

function aerospaceText(path: string): string {
  const text =
    additionalAerospaceText[path] ??
    aerospaceFixtures.rows.find((row) => row.path === path)?.content ??
    fixedWingFixtures.rows.find((row) => row.path === path)?.content;
  if (!text) throw new Error(`Missing pinned aerospace fixture: ${path}`);
  return text;
}

it.each(aerospaceSources)(
  'saves and reloads original aerospace bytes %s',
  async (path, sha256, kind, invalid, heatSinks) => {
    const text = aerospaceText(path);
    expect(createHash('sha256').update(text).digest('hex')).toBe(sha256);
    const parsed = new BlkParserService().parse(text);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const expected =
      kind === 'fighter'
        ? parseExpected(parsed.data.document, createAerospaceHandler())
        : kind === 'smallcraft'
          ? parseExpected(parsed.data.document, createSmallCraftHandler())
          : kind === 'fixed-wing'
            ? parseExpected(
                parsed.data.document,
                new FixedWingSupportUnitHandler(),
              )
            : parseExpected(
                parsed.data.document,
                createConventionalFighterHandler(),
              );
    const { unit } = expected;
    await expectSavedImport(
      'aerospace',
      text,
      parsed.data.document,
      expected,
      {
        armor: { byArc: unit.armorByArc },
        movement: unit.movement,
        fuel: unit.fuel,
        structuralIntegrity: unit.structuralIntegrity,
        heatSinks,
        ...(kind === 'fixed-wing' ? { isFixedWingSupport: true } : {}),
      },
      invalid,
      parsed.data.warnings,
    );
  },
);

// Original bytes from git show mm-data 50f7efe; hashes do not normalize line endings.
const battleArmorSources = [
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Achileus BA (Sqd 4) [David].blk',
    sha256: '15c04915ccd68cf444a4b01a9b46b3889be1743a64aacd8226ade7d91b09c85f',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a182-7f8d-a210-1cb31c1114cb\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nAchileus Light Battle Armor\n</Name>\n\n<Model>\n[David](Sqd4)\n</Model>\n\n<mul id:>\n7\n</mul id:>\n\n<year>\n3064\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nJump\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n33\n</armor_type>\n\n<armor_tech>\n3\n</armor_tech>\n\n<Squad Equipment>\nBADavidLightGaussRifle:RA\nBAAPMount:LA\nInfantryAssaultRifle:APM\nBABasicManipulator:LA\nBABasicManipulator:RA\nIS BA Stealth (Improved):Body\nIS BA Stealth (Improved):RA\nIS BA Stealth (Improved):Body\nIS BA Stealth (Improved):Body\nIS BA Stealth (Improved):Body\n</Squad Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<Trooper 4 Equipment>\n</Trooper 4 Equipment>\n\n<slotless_equipment>\nBAJumpJet\n</slotless_equipment>\n\n<capabilities>\n<p>This configuration replaces the standard modular weapon mount with a David light Gauss rifle, giving the Achileus a significant ranged punch. The light Gauss rifle fires magnetically accelerated projectiles at velocities sufficient to threaten light vehicles and other battle armor, marking a substantial upgrade in lethality over the suit's original weapon options. The left-arm anti-personnel weapon mount and basic manipulators on both arms remain standard. Jump jets provide 90-meter mobility, and 360 kilograms of improved stealth armor maintains the suit's sensor-evasion capability. The David configuration pushed the Achileus beyond pure scouting into a light striker role, though ammunition constraints require careful shot discipline during extended patrols.</p>\n</capabilities>\n\n<overview>\n<p>The Achileus is a light battle armor suit developed jointly by the Free Worlds League and the Word of Blake. Designed as a mass-produced alternative to custom-manufacture stealth suits, the Achileus combined offensive armament with electronic stealth capability in a package suitable for large-scale deployment. Entering service in 3057, the suit filled a critical gap in both the FWLM and Word of Blake Militia force structures, providing infantry formations with a jump-capable scout platform that could evade electronic detection. Production was handled by facilities on Irian and Gibson within the Free Worlds League.</p>\n</overview>\n\n<deployment>\n<p>Four-trooper squads armed with the David light Gauss rifle gave FWLM commanders a battle armor formation with genuine anti-armor capability. These squads were assigned to frontline units where they could engage enemy battle armor and light vehicles at range, a significant upgrade from the purely anti-personnel configurations that preceded them.</p>\n</deployment>\n\n<history>\n<p>Development of the Achileus began in October 3054 as a collaborative effort between Free Worlds League and Word of Blake research teams. The project used the Blakist Tornado PA(L) suit as its foundation, seeking to transform the specialized sneak suit into a more capable combat platform. Early prototypes produced in May 3055 struggled to balance armor protection, weaponry, and stealth performance. A breakthrough came when Word of Blake ROM allegedly acquired proprietary armor composite data from Defiance Industries and the New Avalon Institute of Science, enabling the team to meet FWLM protection standards without sacrificing stealth capability.</p><p>Production began at Irian BattleMechs Unlimited on Irian, with Free Worlds Defence Industries on Gibson later establishing a second line dedicated to Word of Blake variants. Defiance Industries protested the apparent theft of intellectual property before the Second Star League's Economic Council, but the FedCom Civil War and the League's eventual collapse left the matter unresolved. Both the FWLM and Word of Blake Militia fielded the Achileus extensively during the Jihad. The suit also saw adoption by other Inner Sphere powers in later decades as production continued at Irian facilities under new ownership, and a third manufacturing line on Washburn further expanded availability.</p>\n</history>\n\n<manufacturer>\nFree Worlds Defence Industries|Irian BattleMechs Unlimited|Irian BattleMechs Unlimited\n</manufacturer>\n\n<primaryFactory>\nGibson|Irian|Washburn\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<published>\nRS:3058Uu-C\n</published>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n3\n</jumpingMP>\n\n<armor>\n6\n</armor>\n\n<Trooper Count>\n4\n</Trooper Count>\n\n<weightclass>\n1\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 4,
      armorPerTrooper: 6,
      weightCode: 1,
      motion: 'Jump',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Elemental BA [APG] (Sqd3).blk',
    sha256: '13896e84945696c00e5e1bda167f43bedd8463c4449d6974318ee36a456f2f7a',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a1c0-7797-b255-14f94ffbeb6f\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nElemental Battle Armor\n</Name>\n\n<Model>\n[AP Gauss](Sqd3)\n</Model>\n\n<mul id:>\n9204\n</mul id:>\n\n<year>\n3069\n</year>\n\n<type>\nClan Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nJump\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n2\n</armor_tech>\n\n<Point Equipment>\nCLBAAPGaussRifle:RA\nCLBASRM2:Body\nBA-SRM2 Ammo:Body:Shots2#\nBAAPMount:LA\nInfantryAssaultRifle:APM:LA\nBABattleClaw:LA\n</Point Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<slotless_equipment>\nBAJumpJet\n</slotless_equipment>\n\n<capabilities>\n<p>The Elemental suit carries 250 kilograms of armor, sufficient to withstand multiple hits from BattleMech-scale weapons. Each trooper carries a detachable short-range missile pack holding four missiles across two volleys, which can be jettisoned after use to improve mobility. The suit's modular weapon mount accommodates a range of armament options including energy weapons, flamers, and ballistic weapons, while a secondary anti-personnel mount handles lighter threats. A battle claw on one arm generates enough force to tear through BattleMech armor plating or grip an OmniMech's transport handholds. Integral jump jets propel the suit up to ninety meters per leap, compensating for a modest ground speed of just under eleven kilometers per hour. The suit's heads-up display condenses a full 360-degree sensor picture into a 160-degree view, with mode switching controlled by eye tracking and voice commands. The design's primary weakness lies in its slow overland speed between jumps, leaving troopers exposed during repositioning across open terrain.</p>\n</capabilities>\n\n<overview>\n<p>The gold standard of Clan armored infantry, the Elemental battle armor was developed by Clan Wolf and first deployed in 2868. Adapted from pressurized diving suits built by Clan Goliath Scorpion, the Elemental was the first purpose-built battle armor to see widespread military use. Designed for the Clans' genetically bred Elemental warriors, the one-ton medium suit combines heavy protection, jump mobility, and modular weaponry into a general-purpose package that has remained in frontline service for over two centuries. Produced across dozens of Clan facilities, the suit's adaptable design has spawned numerous specialized configurations while the base platform continues to anchor Clan infantry doctrine.</p>\n</overview>\n\n<deployment>\n<p>Society cells equipped with the anti-personnel gauss rifle valued its combination of range and precision. Three-trooper teams conducting targeted elimination missions used the weapon's superior ballistic performance to engage specific individuals from distances that kept the operators beyond effective return fire from conventional weapons.</p>\n</deployment>\n\n<history>\n<p>The origins of modern battle armor trace back to pressurized diving suits developed by Clan Goliath Scorpion on the resource-rich world of Dagda. These Water Elemental Mining Suits featured myomer musculature, self-contained life support, and atmospherically sealed bodies designed for extreme underwater conditions. Clan Wolf recognized the military potential of these suits and directed their merchant caste to acquire several through trade rather than combat.</p><p>Wolf scientists began weaponizing the diving suits, adding armor plating, weapons, and small jump jets. While the Wolves experimented with specialist designs tailored to specific environments, they ultimately settled on a general-purpose configuration suited to most battlefield conditions. Those early specialist prototypes would later inspire the Gnome, Salamander, Sylph, and Undine designs.</p><p>The Wolves first deployed their new battle armor in 2868, winning a Trial of Possession against a Star of Clan Nova Cat light troops. Later that year, the Wolves entered a series of Trials with Clan Hell's Horses. The Horses had been breeding genetically enhanced conventional infantry, the precursors to the modern Elemental phenotype. When the Trials concluded, both Clans had gained what the other possessed: the Horses won battle armor technology, and the Wolves obtained the knowledge to breed their own Elementals. Almost immediately, each Clan combined their new acquisition with their existing strengths, creating the tradition of matching Elemental troops with battle armor. Within a short period, armored Elemental deployments spread across every Clan.</p><p>The suit remained largely unchanged for nearly two centuries, a reflection of its sound fundamental design. Clan Snow Raven developed a variant early in this period optimized for boarding actions and zero-gravity combat. The standard configuration served as the backbone of Clan infantry forces throughout the Golden Century and the Political Century that followed.</p><p>The appearance of battle-armored Elementals during the Clan Invasion of the Inner Sphere in 3050 struck genuine terror into the MechWarriors who first faced them. Swarms of armored infantry bouncing across the battlefield, shrugging off direct weapons fire, and literally tearing apart BattleMechs led many Inner Sphere soldiers to believe they were fighting aliens. Victor Steiner-Davion coined the nickname \"Toads,\" which persists among Spheroids to this day. Clan Wolf fielded a specialized reconnaissance configuration during the Invasion, optimized for extended operations behind enemy lines. The Inner Sphere scrambled to reverse-engineer captured suits, eventually producing the inferior but serviceable Inner Sphere Standard.</p><p>As decades passed and new battle armor designs proliferated across both Clan and Inner Sphere forces, the Elemental suit remained the gold standard of Clan armored infantry. Clan Jade Falcon engineers developed a heat-hardened configuration during the Jihad, while production expanded to Occupation Zone facilities as Clans established manufacturing on conquered territory.</p><p>Clan Hell's Horses, with their long tradition of combined-arms doctrine and infantry excellence, pursued the most ambitious evolution of the Elemental concept. Their engineers developed a prototype that traded the suit's characteristic jump capability for dramatically increased ground speed. The experimental design showed promise but suffered from weight penalties that limited its weaponry and prevented effective anti-BattleMech attacks. A refined production model entered service from the Csesztreg Industriplex Gamma, addressing many of the prototype's shortcomings while retaining the speed-focused approach. Shortly after, the Horses introduced a third-generation design from the same facility, returning to the original suit's jump-capable profile while incorporating advanced armor and sensor-defeating technology. These successive generations ensured the Elemental lineage remained at the forefront of Clan infantry technology well into the ilClan era.</p>\n</history>\n\n<manufacturer>\nAlbion Armor Works Delta|BA Facility Alpha|Bergan Industries BA Annex|Beta Plant 2W|Brim Battle Armor Plant III|Clan Diamond Shark IndustriPlex-C|Elemental Facility 4|Facility C-BA-32|Hades Industrial Complex|Hector MechWorks Facility Beta|Hoard Theta|Huntress Production Facility Gamma|Industrial Complex Raven Alpha|Industriplex Theta|Ironhold Beta Complex|Kindraa Payne-Beyl-Grant Main Production Facility|Manufacturing Plant DSF-33|New Kent Armorworks|Olivetti Weaponry|Swedenborg Heavy Industries|Trellshire Heavy Industries|W-7 Facilities|W-7 Facilities|WC Aux Site #2|WC Site 2|WC Site OZ-2\n</manufacturer>\n\n<primaryFactory>\nAlbion (Junction City)|Bearclaw|Alshain|Tamaron|Brim|Itabaiana|York|Sheridan|Dagda (Riva)|Hector|Hoard|Huntress (Myers)|Lum|Niles|Ironhold|Shadow|Strato Domingo|New Kent (Celebes)|Sudeten|Kirchbach|Twycross|Tranquil|Weingarten|Strana Mechty (Wolf Enclave)|Arc-Royal|Tamar\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<published>\nRS:3058Uu-C\n</published>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n3\n</jumpingMP>\n\n<armor>\n10\n</armor>\n\n<Trooper Count>\n3\n</Trooper Count>\n\n<weightclass>\n2\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 3,
      armorPerTrooper: 10,
      weightCode: 2,
      motion: 'Jump',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Undine BA (Sqd5).blk',
    sha256: '9606febb920e6cff8e7492eca17a7d571092d6576980dbfd09f68141a5253e51',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a353-7178-9fa6-922ac56c780e\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nUndine Battle Armor\n</Name>\n\n<Model>\n(Sqd5)\n</Model>\n\n<mul id:>\n8596\n</mul id:>\n\n<year>\n3059\n</year>\n\n<type>\nClan Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nUMU\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n2\n</armor_tech>\n\n<Point Equipment>\nCLBAERMicroLaser:RA\nCLBALRM5 (OS):Body\nBABattleClaw:RA\nBASearchlight:Body\n</Point Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<Trooper 4 Equipment>\n</Trooper 4 Equipment>\n\n<Trooper 5 Equipment>\n</Trooper 5 Equipment>\n\n<slotless_equipment>\nBAUMU\n</slotless_equipment>\n\n<capabilities>\n<p>The Undine centers its offensive capability on a single one-shot LRM-5 launcher loaded with amphibious multi-purpose missiles, allowing it to engage targets both above and below the waterline. An ER Micro Laser mounted in the right arm provides close-range firepower, while a battle claw on the left arm enables material manipulation and limited melee capability. A searchlight rounds out the suit's equipment for low-visibility underwater operations.</p><p>Three underwater maneuvering units propel the Undine at speeds exceeding thirty kilometers per hour when submerged, making it among the fastest underwater combatants in any arsenal. On land, the suit is limited to a walking pace. Two hundred kilograms of standard armor provide adequate protection, though this amounts to roughly twenty percent less coverage than the Elemental. The Undine cannot perform standard anti-BattleMech swarming attacks, restricting it to leg attacks against partially submerged targets. This narrow tactical profile limits the suit's utility outside aquatic environments.</p>\n</capabilities>\n\n<overview>\n<p>The Undine battle armor is a medium-weight underwater combat suit developed by Clan Goliath Scorpion. A direct descendant of the Water Elemental mining suit that spawned all Clan battle armor, the Undine was the first purpose-built military adaptation of the original exoskeleton's aquatic design. Entering service in 3059, the suit gave its operators unmatched combat capability in underwater and amphibious environments. Armed with a dual-purpose weapon system effective both above and below the waterline, the Undine filled a niche that no other Clan battle armor addressed. Its specialized nature limited broader adoption, but for those who mastered underwater warfare, the Undine had no equal.</p>\n</overview>\n\n<deployment>\n<p>Goliath Scorpion Points of Undine troopers excelled in defensive underwater Trials, leveraging the suit's aquatic mobility and amphibious armament to dominate engagements on their own terms. Five-trooper Points operated primarily from underwater facilities on Scorpion-held worlds, conducting patrols, defending mineral extraction sites, and securing naval installations against rival Clan incursions.</p>\n</deployment>\n\n<history>\n<p>Clan Goliath Scorpion had long sought to leverage their underwater expertise into a military advantage. Well before Operation Revival, Scorpion scientists began developing a specialized missile capable of functioning as both a conventional LRM and an underwater torpedo, paired with a combat suit designed to exploit this dual-purpose weapon. Adapting the ancestral Water Elemental mining suit for combat proved straightforward, but the missile/torpedo hybrid eluded engineers for years. When the Scorpions failed to secure a place in the Invasion, the project stalled.</p><p>A breakthrough in 3059 finally allowed the Scorpions to complete the design, christened the Undine after mythical water spirits. The suit gave the Goliath Scorpions unchallenged dominance in underwater Trials, though its specialized nature meant most Clans showed little interest in acquiring it. That changed in 3068, when Clan Diamond Shark aggressively pursued the Undine through multiple Trials of Possession. The Scorpions defended fiercely, but the Sharks eventually prevailed on Roche. Curiously, the Diamond Sharks never fielded the suits after winning them. The Federated Suns later acquired Undine suits through Diamond Shark trade channels and used the design as inspiration for their own Hauberk amphibious battle armor.</p>\n</history>\n\n<manufacturer>\nClan Goliath Scorpion|W-7 Facilities\n</manufacturer>\n\n<primaryFactory>\nDagda (Riva)|Weingarten\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<published>\nRS:3058Uu-C\n</published>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n3\n</jumpingMP>\n\n<armor>\n8\n</armor>\n\n<Trooper Count>\n5\n</Trooper Count>\n\n<weightclass>\n2\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 5,
      armorPerTrooper: 8,
      weightCode: 2,
      motion: 'UMU',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Sylph BA (Sqd6).blk',
    sha256: '2f7f2f547191cfa6872a7bfb59382d86a7720fccfdd99723f4d3d6d3cf358e55',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a34a-7fb7-8dd7-3a0514c1d3be\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nSylph Battle Armor\n</Name>\n\n<Model>\n(Sqd6)\n</Model>\n\n<mul id:>\n8951\n</mul id:>\n\n<year>\n3060\n</year>\n\n<type>\nClan Level 3\n</type>\n\n<role>\nScout\n</role>\n\n<motion_type>\nVTOL\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n2\n</armor_tech>\n\n<Point Equipment>\nCLBAMicroPulseLaser:RA\nCLBAMicroBomb:Body\nBABattleClaw:LA\n</Point Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<Trooper 4 Equipment>\n</Trooper 4 Equipment>\n\n<Trooper 5 Equipment>\n</Trooper 5 Equipment>\n\n<Trooper 6 Equipment>\n</Trooper 6 Equipment>\n\n<slotless_equipment>\nBAVTOL\n</slotless_equipment>\n\n<capabilities>\n<p>The Sylph mounts a fixed micro pulse laser in the right arm and a battle claw in the left, providing both ranged firepower and the ability to engage in anti-BattleMech swarming attacks or ride OmniMechs into combat. A single-use cluster bomb rack attached to the jump pack supplements this armament with a burst of area-effect ordnance. The suit's defining feature is its advanced VTOL propulsion system, adapted from standard battle armor jump jets. Computer-controlled directional exhaust ports regulate hovering and provide exceptional agility in flight, though pilots must manage a complex pedal and leg harness system to maintain stability. Any lapse in concentration risks an unrecoverable death spiral. The price of flight is significant: the Sylph carries roughly half the armor protection of an Elemental suit and a comparatively light weapons package, making it vulnerable in direct engagements against heavier battle armor.</p>\n</capabilities>\n\n<overview>\n<p>The Sylph is a light Clan battle armor suit developed by Clan Cloud Cobra as the first fully airborne infantry design in known space. Fielded in 3060, the suit was conceived to extend the Cloud Cobras' aerospace dominance into the battle armor domain, giving their touman an infantry capability no other Clan possessed. The Sylph's VTOL-capable propulsion system allows sustained flight at speeds exceeding fifty kilometers per hour, though this mobility comes at the cost of reduced armor protection and a limited weapon payload. The design earned its operators a level of respect typically reserved for fighter pilots within Clan Cloud Cobra's warrior caste.</p>\n</overview>\n\n<deployment>\n<p>ComStar and Word of Blake formations organized captured Clan battle armor into six-trooper Level I units. Sylph suits acquired through salvage or covert procurement fit this organizational structure, though the demanding pilot training requirements limited the number of troopers qualified to operate them effectively within Com Guard and Militia doctrine.</p>\n</deployment>\n\n<history>\n<p>Clan Cloud Cobra began development of the Sylph as part of a broader effort to extend their aerospace doctrine into the infantry domain. Khan Din Steiner ordered the program, but the Cloud Cobra scientist caste drove much of the early work out of religious conviction, viewing the creation of an airborne warrior as a spiritual imperative tied to their air-elemental faith. The name itself was drawn from mythological spirits of the air.</p><p>Progress proved difficult. Integrating a functional VTOL propulsion system into a battle armor chassis was something no Clan had accomplished before, and the Cloud Cobra scientists encountered persistent problems with the jump pack and thruster assembly. Several test pilots were killed during the secretive development phase. The scientists pushed through these setbacks, though the final production model achieved only limited flight capabilities rather than the full sustained flight originally envisioned.</p><p>The Sylph entered service in 3060 and quickly became a fixture within the Cloud Cobra touman. The Clan had invested heavily in the program even before production began, graduating sibkos of mixed Elemental and fighter pilot bloodlines specifically to operate the suit. Pilots who completed the demanding training regimen earned respect comparable to aerospace fighter pilots. Many Sylph operators now hail from sibkos employing a mix of Elemental and pilot genes, an interesting indicator of the Cloud Cobras' assessment of the technology's potential.</p><p>Adoption beyond the Cloud Cobras came slowly. Clan Snow Raven and Clan Diamond Shark each secured small numbers through Trials of Possession, limiting their use to trial deployments. Clan Star Adder proved more enthusiastic, integrating Sylphs into their Alpha and Beta Galaxies with reports of Tau Provisional Galaxy fielding them as well. The Blood Spirits attempted to acquire the design for years, but the Cloud Cobras refused every request.</p><p>The Snow Ravens eventually developed their own branch of Sylph technology. During the Jihad, CSR Battle Armor Facility Alpha on Ramora produced the experimental XR variant, which traded the VTOL system for myomer boosters and a ground-speed focus. This led to the production Enhanced Sylph, a refined ground-mobile design optimized for anti-infantry operations and urban combat in the Outworlds Alliance. The Sylph's VTOL technology also influenced other programs, with Snow Raven scientists adapting its propulsion concepts into the Extended Jump Jet system for ProtoMechs.</p>\n</history>\n\n<manufacturer>\nClan Cloud Cobra\n</manufacturer>\n\n<primaryFactory>\nBrim\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n5\n</jumpingMP>\n\n<armor>\n5\n</armor>\n\n<Trooper Count>\n6\n</Trooper Count>\n\n<weightclass>\n1\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 6,
      armorPerTrooper: 5,
      weightCode: 1,
      motion: 'VTOL',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Gnome BA (Sqd3).blk',
    sha256: '4b080b8ba1cda8b3b7577a99bfc6ff13e991c8a322f97367985bd97d9e127767',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a246-71cc-ba71-104390301867\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nGnome Battle Armor\n</Name>\n\n<Model>\n(Sqd3)\n</Model>\n\n<mul id:>\n9212\n</mul id:>\n\n<year>\n3056\n</year>\n\n<type>\nClan Level 2\n</type>\n\n<role>\nJuggernaut\n</role>\n\n<motion_type>\nJump\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n2\n</armor_tech>\n\n<Point Equipment>\nCLBAERSmallLaser:RA\nCLAdvancedSRM2:Body\nBA-Advanced SRM-2 Ammo:Body:Shots2#\nBAHeavyBattleClaw:LA\n</Point Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<slotless_equipment>\nBAJumpJet\n</slotless_equipment>\n\n<capabilities>\n<p>The Gnome carries a fixed armament of a Clan ER small laser in the right arm and an Advanced SRM 2 launcher that mimics the accuracy of a Streak system. The left arm terminates in a heavy battle claw capable of gripping OmniMech handholds for transport, though the claw lacks sufficient dexterity for anti-BattleMech swarming or leg attacks. Jump jets provide limited aerial mobility, allowing leaps of approximately sixty meters.</p><p>At 1,500 kilograms, the Gnome sits firmly in the heavy weight class. Its 350 kilograms of armor cannot survive a direct Clan ER PPC hit the way the Kanazuchi can, but it will absorb two shots from a Clan ER medium laser and keep the trooper inside functional. The trade-off between protection and firepower defines the suit's tactical identity: heavy enough to absorb punishment that would destroy lighter designs, fast enough to avoid the crippling lack of mobility that hampered earlier heavy suits.</p>\n</capabilities>\n\n<overview>\n<p>The Gnome was developed by Clan Hell's Horses as the first Clan-manufactured heavy battle armor design. Introduced in 3056, the suit was created in response to growing Inner Sphere battle armor capabilities that threatened Clan supremacy in armored infantry warfare. Classified as a heavy-weight assault platform, the Gnome combined substantial armor protection with jump capability and fixed weaponry, offering a heavier alternative to the ubiquitous Elemental without sacrificing all mobility. Named after the earth spirit of classical mythology in keeping with the Clan tradition for second-generation battlesuits, the Gnome quickly established itself as a cornerstone of Hell's Horses infantry doctrine and saw adoption by multiple Clans.</p>\n</overview>\n\n<deployment>\n<p>The three-trooper formation is associated with the Society, whose clandestine operations employed smaller tactical teams suited to covert and unconventional action. Society cells acquired Gnome suits through their embedded positions within Clan scientific and military establishments, fielding them in non-standard formations outside normal Clan doctrine.</p>\n</deployment>\n\n<history>\n<p>By the time of Operation Revival, battle armor development among the Clans had largely stagnated. The standard Elemental suit had proven so effective that few Clans saw reason to pursue alternatives. Clan Hell's Horses, however, had never abandoned their conviction that infantry diversity offered tactical advantages a single universal design could not match. When rumors reached the Clan homeworlds in 3054 that Inner Sphere powers were fielding specialized battle armor of their own, the Horses took particular notice. Reports of the Draconis Combine's Kanazuchi, an assault-weight suit capable of withstanding a direct hit from a Clan ER PPC, posed a direct challenge to Clan supremacy in armored infantry.</p><p>Khan Malavai Fletcher ordered his scientists to develop a Clan answer to the growing Inner Sphere threat. Rather than start from scratch, the Horse scientists revisited the Rhino, a heavy prototype from the Golden Century that had been shelved decades earlier due to mechanical reliability problems and the Elemental's dominance. Applying modern technological advances to the old design's framework, including advances in miniaturized armor technology, they produced a suit that was twice as fast as the Kanazuchi and carried heavier weaponry, though with slightly less armor protection. Following the Clan tradition of naming second-generation battlesuits after elemental spirits, the new design was designated the Gnome after the earth spirit of classical mythology.</p><p>The Gnome debuted in the spring of 3056, assigned initially to the Hell's Horses Alpha Keshik. Its first combat test came during Alpha's annual sparring exercise against Omega Keshik, and though the engagement was simulated, the Gnome-equipped troopers caused such disruption among Omega's traditional Elemental formations that Khan Fletcher ordered an immediate increase in production. Fletcher himself became an avid operator of the suit, and during the Horses' ill-fated intervention in the Combine-Ghost Bear War, he personally accumulated twenty-nine confirmed kills against both BattleMechs and Elementals while wearing Gnome armor.</p><p>The Gnome's introduction triggered a broader shift in Clan battle armor philosophy. Other Clans began experimenting with specialized suit designs of their own, producing the Sylph, Salamander, and Undine in relatively quick succession. The Gnome itself spread beyond the Horses' touman through Trials, finding service with multiple Clans. Though later eclipsed in sheer size by newer assault-weight designs, the Gnome remained a mainstay of Hell's Horses front-line Clusters and proved its durability across multiple conflicts.</p><p>Production centered on two facilities: Swedenborg Heavy Industries on Kirchbach and the Horses' research complex on Niles. The Upgrade program, introduced during the Jihad era, produced several reconfigured variants with modular weapon mounts and detachable missile systems, reflecting lessons learned from decades of operational use. A separate long-range modification carrying missile and anti-personnel systems emerged from field experience, expanding the suit's tactical envelope beyond its original close-combat role.</p>\n</history>\n\n<manufacturer>\nSwedenborg Heavy Industries|Clan Hell's Horses\n</manufacturer>\n\n<primaryFactory>\nKirchbach|Niles\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<published>\nRS:3058Uu-C\n</published>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n2\n</jumpingMP>\n\n<armor>\n14\n</armor>\n\n<Trooper Count>\n3\n</Trooper Count>\n\n<weightclass>\n3\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 3,
      armorPerTrooper: 14,
      weightCode: 3,
      motion: 'Jump',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3058Uu/Fenrir BA [ERML] (Sqd4).blk',
    sha256: '8d005e3f81b8604cb79d6a3d4609c75913011aa15ef42f14feaacd931906b4d3',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a21e-70c5-bece-b26217a6a946\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nFenrir Battle Armor\n</Name>\n\n<Model>\n[ERML](Sqd4)\n</Model>\n\n<mul id:>\n1038\n</mul id:>\n\n<year>\n3064\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nScout\n</role>\n\n<motion_type>\nLeg\n</motion_type>\n\n<cruiseMP>\n4\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n3\n</armor_tech>\n\n<Squad Equipment>\nISBAERMediumLaser:TU\n</Squad Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<Trooper 4 Equipment>\n</Trooper 4 Equipment>\n\n<capabilities>\n<p>The extended-range medium laser configuration arms the Fenrir with a single ER medium laser in the dorsal turret, providing engagement capability at distances that most battle armor cannot match. The longer effective range allows Fenrir operators to engage targets while remaining outside the reach of shorter-ranged opponents, a significant tactical advantage for a suit with only 250 kilograms of standard armor. The two-ton quad chassis achieves speeds over forty kilometers per hour, and the 300-degree turret arc permits firing on targets across a wide front. The quad frame prevents anti-BattleMech attacks and OmniMech transport. The ER medium laser generates considerable heat in the confined cockpit, limiting sustained fire rates, but its ability to reach out and damage armored targets at range makes it a valuable addition to mixed Fenrir formations that include shorter-ranged loadouts.</p>\n</capabilities>\n\n<overview>\n<p>The Fenrir was an assault-class battle armor produced by TharHes Industries on Tharkad for the Lyran Alliance Armed Forces. Entering production in 3060, the two-ton quadruped suit drew on lessons learned from the unsuccessful Sloth program, repurposing the quad chassis concept into a dedicated fire support platform. Equipped with a dorsal turret capable of mounting a variety of weapon packages, the Fenrir earned a reputation as one of the most flexible battlesuits in Lyran service, though its deliberately light armor made it reliant on firepower rather than protection to survive on the battlefield.</p>\n</overview>\n\n<deployment>\n<p>The extended-range medium laser configuration entered LAAF service during the later stages of the FedCom Civil War. Four-trooper squads valued the increased engagement distance, which allowed them to harass armored targets from positions where the Fenrir's light armor was less of a liability, particularly in open terrain.</p>\n</deployment>\n\n<history>\n<p>Development of the Fenrir began in the wake of the Lyran Alliance's secession from the Federated Commonwealth in 3057. Archon Katherine Steiner-Davion ordered the creation of a new battlesuit to distinguish the Lyran military from its former partner state. The design team drew heavily on the failed Sloth battle armor, which had been produced for the FedCom military but never gained wide acceptance, particularly among Federated Suns units. With a surplus of unwanted Sloth suits available for study, engineers identified the quad chassis's stability and capacity for heavy weapons loads as the only traits worth preserving. Work began on 9 November 3057, with the first prototype taking shape by 22 October 3058. Named for the demon-wolf of Teutonic mythology, the Fenrir entered mass production on 4 January 3060.</p><p>Rather than a traditional battlesuit, the Fenrir was conceived as a mobile fire support platform. The operator piloted the quad-legged design from a cramped internal cockpit, more akin to a small walking vehicle than conventional powered armor. A large configurable turret dominated the dorsal hull, accepting a range of weapon packages that could be swapped depending on mission requirements. This flexibility made the Fenrir one of the most adaptable battlesuits in Lyran service.</p><p>The LAAF embraced the new design quickly. In 3062, Archon Katherine directed six months of concentrated production into a single formation, making the Lyran Alliance the first Inner Sphere power to field a full regiment of battle armored infantry. Fenrir formations proved effective during the FedCom Civil War, where their interchangeable weapons allowed Lyran commanders to tailor squads against a variety of threats. Additional weapon configurations entered service during this period and the years that followed, expanding the suit's tactical range to include indirect fire and extended-range energy options.</p><p>The Fenrir's reputation grew further during the Jihad. Lyran forces deployed the suit extensively in the defense of critical industrial worlds. On Hesperus II, Fenrir-equipped units of the planetary militia fought a desperate action against Word of Blake forces assaulting the Defiance Industries complex. One platoon, known informally as the \"Black Lightning,\" waged a prolonged underground battle through the facility's bunker network, holding their positions for hours against Blakist infantry before being overwhelmed by an elite squad reportedly led by a Manei Domini warrior. The suit's performance during the Hesperus campaign earned it lasting respect within the LAAF.</p><p>Following the Jihad, TharHes Industries explored more specialized variants. An experimental hybrid refit replaced the configurable turret with a fixed mount carrying Clan-specification missile launchers and a battlefield coordination system recovered from Blakist technology caches on Tharkad. Production of these prototypes remained extremely limited due to the exotic components involved. The original Fenrir continued in widespread LAAF service for decades until the introduction of its heavier successor began a gradual transition away from the aging design.</p>\n</history>\n\n<manufacturer>\nTharHes Industries\n</manufacturer>\n\n<primaryFactory>\nTharkad\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3058U\n</source>\n\n<published>\nRS:3058Uu-C\n</published>\n\n<chassis>\nquad\n</chassis>\n\n<turret>\nModular:3\n</turret>\n\n<jumpingMP>\n0\n</jumpingMP>\n\n<armor>\n5\n</armor>\n\n<Trooper Count>\n4\n</Trooper Count>\n\n<weightclass>\n4\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 4,
      armorPerTrooper: 5,
      weightCode: 4,
      motion: 'Leg',
      chassis: 'quad',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/3085u/ONN/Nighthawk PA(L) Mk. XXX (BH (Sqd1).blk',
    sha256: '4be7e71297b9ba7bcf11c2b0a4196322cd7bee2dedff39b17319e805cf8e00fb',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a5aa-7ece-ba28-a90702909996\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nNighthawk PA(L)\n</Name>\n\n<Model>\nMk. XXX(Bounty Hunter)(Restored)\n</Model>\n\n<mul id:>\n4721\n</mul id:>\n\n<year>\n3061\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nJump\n</motion_type>\n\n<cruiseMP>\n3\n</cruiseMP>\n\n<armor_type>\n32\n</armor_type>\n\n<armor_tech>\n3\n</armor_tech>\n\n<Squad Equipment>\nBAArmoredGlove:LA\nBAArmoredGlove:RA\nLaser Rifle (Mauser 960):APM:RA\nIS BA Stealth (Standard):Body\nIS BA Stealth (Standard):Body\nIS BA Stealth (Standard):RA\nIS BA Stealth (Standard):LA\n</Squad Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<slotless_equipment>\nBAJumpJet\n</slotless_equipment>\n\n<capabilities>\n<p>The Bounty Hunter's personal Nighthawk is a fully restored Mk. XXX with its stealth systems and jump pack returned to operational condition after decades of degraded functionality. The suit features the same Standard Stealth armor and thirty kilometer per hour ground speed as the standard Mk. XXX, augmented by restored jump jets providing ninety meters of leap capability. The Bounty Hunter typically wields paired Sternsnacht Claymore heavy pistols through the suit's armored gloves, the power armor compensating for the weight and recoil of these oversized sidearms. Additional mission-specific heavy weapons are carried as needed.</p><p>The fully operational stealth suite allows the wearer to move undetected when operating outside a BattleMech cockpit, a capability leveraged for personal reconnaissance, target acquisition, and close-quarters operations throughout a career spanning multiple generations of the Bounty Hunter identity.</p>\n</capabilities>\n\n<overview>\n<p>The Nighthawk Mk. XXI PA(L) is the progenitor of modern battle armor, developed by the Terran Hegemony from commercial exoskeleton technology through one of the most challenging military engineering programs of the Star League era. Commissioned in 2720, the Nighthawk was designed as a light power armor suit for reconnaissance and covert operations. The suit entered service exclusively with the SLDF Special Forces Command, where it equipped elite special operations teams whose very existence remained classified. Classified as Power Armor (Light), the Nighthawk provided its operators with capabilities far beyond conventional infantry while maintaining the stealth profile necessary for behind-the-lines work, establishing the conceptual foundation for every battle armor design that followed.</p>\n</overview>\n\n<deployment>\n<p>This suit is the personal Nighthawk of the enigmatic Bounty Hunter, a priceless Star League-era Mk. XXX restored to full operational capability by the time of the FedCom Civil War. The Bounty Hunter wears the suit whenever expecting combat outside a BattleMech cockpit, using it for personal reconnaissance, target acquisition, and close-quarters engagements. The restored stealth and jump systems, combined with the wearer's formidable combat skills, make this single suit one of the most dangerous pieces of personal equipment operating in the Inner Sphere.</p>\n</deployment>\n\n<history>\n<p>The Nighthawk program grew from First Star League efforts to militarize commercial exoskeletons that had been in civilian use since the early space age. First Lord Jonathan Cameron's Terran Hegemony funded an ambitious development effort, though the technology proved stubbornly difficult to adapt for combat. Fifteen years of engineering work and twenty failed prototypes preceded the breakthrough that produced the Mk. XXI in 2718. After two years of field testing, the suit entered full production at Krupp Armament Works on Terra and was issued to the Special Forces Command in 2720.</p><p>The SLDF deployed Nighthawks exclusively through its Special Armed Services, the covert operators known as the Blackhearts. The deployment was never publicly acknowledged, and the suit's existence remained classified throughout its Star League service life. The men and women of the SAS operated with such skill that the other Star League Member States heard only vague rumors of some advanced sneak suit. Rumors persist that the Thirteenth Royal Infantry Division, stationed deep in the Draconis Combine, was among the first formations to field-test the Nighthawk, conducting secret exercises against another Royal infantry division somewhere in the Draconis Rift. Plans for a combat-oriented variant, the Mk. XXII, were drawn up for distribution to SLDF Royal Divisions. A working prototype reached completion in 2749, but the Amaris Coup and the collapse of the Star League prevented that version from entering standard production.</p><p>When the Succession Wars erupted, both variants were thought lost. The Nighthawk research, however, accompanied the SLDF on the Exodus, becoming the seed from which the Clans would eventually develop true battle armor. On Terra, Jerome Blake's newly formed ComStar uncovered a small number of surviving suits and used them to equip commando units following the creation of the Com Guards. ComStar lacked the manufacturing capability to produce replacements, and attempts to reverse-engineer the design yielded only the inferior Tornado PA(L).</p><p>The Gray Death Legion recovered several Nighthawk suits on Karbala during the later Succession Wars. Most were turned over to the New Avalon Institute of Science for study, providing Davion engineers with critical data on power armor technology. New production finally resumed in 3065 when the Word of Blake, working in conjunction with the Free Worlds League, overcame the technical challenges and restarted manufacturing on Terra and Gibson. ComStar responded by establishing a production facility on Tukayyid, sharing output with the Second Star League and deploying Mk. XXIs to several Fury Teams. That factory operated for barely two years before the Word of Blake destroyed it in 3067.</p><p>During the Jihad, the Word of Blake supplied Nighthawk suits to Protectorate Militia infantry units, using the light power armor to bolster garrison forces while reserving heavier battle armor designs for frontline formations. ComStar, crippled by the loss of Tukayyid and the casualties suffered during Case White, took years to restart production at Arc-Royal MechWorks. Even after the facility came online, output remained limited, with priority going to personnel engaged in covert operations.</p><p>The Niops Association provided an unexpected additional source beginning around 3071, when engineers discovered Star League-era production records in their archives. Niops Project Workshop III began manufacturing both the Mk. XXI and the Mk. XXII, primarily to defend against belligerent Periphery neighbors. The decision proved wise when the Marian Hegemony's VI Legio Ripariensis raided Niops V that same year. The legionnaires were completely unprepared for power-armored infantry, and the Nighthawk-equipped defenders routed the invaders. Small numbers of captured Nighthawks from Word of Blake stockpiles have since appeared on the open arms market, finding buyers among mercenary commands, private security firms, and militia forces willing to acquire any available battle armor technology.</p>\n</history>\n\n<manufacturer>\nUnknown\n</manufacturer>\n\n<primaryFactory>\nUnknown\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nJUMP_JET:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:3075\n</source>\n\n<published>\nRS:3085u-ONN\n</published>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n3\n</jumpingMP>\n\n<armor>\n2\n</armor>\n\n<Trooper Count>\n1\n</Trooper Count>\n\n<weightclass>\n0\n</weightclass>\n\n",
    invalid: false,
    facts: {
      squadSize: 1,
      armorPerTrooper: 2,
      weightCode: 0,
      motion: 'Jump',
      chassis: 'biped',
    },
  },
  {
    path: 'data/mekfiles/battlearmor/Golden Century/Water Elemental Mining Suit (Sqd4).blk',
    sha256: '1e064fc0c67a32d87098c753b36d42c5493a3f3d93244bb694e1ba7dcae365ba',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-a7d3-7211-8ea4-3267e20495ff\n</UUID>\n\n<UnitType>\nBattleArmor\n</UnitType>\n\n<Name>\nWater Elemental Mining Suit\n</Name>\n\n<Model>\n(Sqd4)\n</Model>\n\n<mul id:>\n7671\n</mul id:>\n\n<year>\n2842\n</year>\n\n<type>\nMixed (Clan Chassis) Experimental\n</type>\n\n<role>\nNone\n</role>\n\n<motion_type>\nUMU\n</motion_type>\n\n<cruiseMP>\n1\n</cruiseMP>\n\n<armor_type>\n28\n</armor_type>\n\n<armor_tech>\n2\n</armor_tech>\n\n<Point Equipment>\nBABasicManipulator:LA\nBAIndustrialDrill:RA\nBACuttingTorch:RA\nBACuttingTorch:LA\nBAExtendedLifeSupport:Body\nBAPowerpack:Body\nHHSearchlight\nMission Equipment Storage:Body:SIZE:200.0\n</Point Equipment>\n\n<Trooper 1 Equipment>\n</Trooper 1 Equipment>\n\n<Trooper 2 Equipment>\n</Trooper 2 Equipment>\n\n<Trooper 3 Equipment>\n</Trooper 3 Equipment>\n\n<Trooper 4 Equipment>\n</Trooper 4 Equipment>\n\n<slotless_equipment>\nBAUMU\nBAUMU\n</slotless_equipment>\n\n<capabilities>\n<p>Powered by myomer musculature and sealed against extreme underwater pressure, the Water Elemental mining suit achieved its remarkable performance through a network of synchronized micro thrusters linked to thousands of pressure sensors woven into the inner lining. Simple gestures from the operator translated into precise thrust commands, allowing the suit to reach speeds rivaling dedicated submersible transports. The thruster array could also lock the suit motionless against strong currents, enabling precision work in turbulent conditions. Additional buoyancy control devices and depth sensors prevented dangerous rapid ascents while monitoring remaining power and air supply.</p><p>As a purely industrial design, the suit carried no weapons. Its equipment loadout included cutting torches, an industrial drill, a basic manipulator for material handling, and a searchlight for low-visibility operations. Two hundred kilograms of standard armor protected the operator from environmental hazards, though this protection was never intended to withstand directed weapons fire. On land, the suit managed only modest walking speed, with its design optimized entirely for underwater mobility.</p>\n</capabilities>\n\n<overview>\n<p>The Water Elemental mining suit was a sophisticated submersible exoskeleton developed by Clan Goliath Scorpion for deep-sea industrial operations. Produced at the Hades Industrial Complex on Dagda beginning around 2842, the medium-weight design gave its operators the strength, mobility, and environmental protection needed for underwater mineral extraction and construction work at extreme depths. Though conceived as a purely civilian tool, the Water Elemental proved to be the most consequential industrial development in Clan history, providing the technical and engineering foundation from which all Clan battle armor would eventually descend.</p>\n</overview>\n\n<deployment>\n<p>Smaller four-trooper work crews proved effective in confined mining tunnels and narrow underwater passages where the standard five-trooper formation was impractical. Clan Wolf also employed reduced-size teams during their early examination of the suits, before developing the formal doctrine that would eventually produce the Elemental battle armor.</p>\n</deployment>\n\n<history>\n<p>Clan Goliath Scorpion's extensive underwater holdings demanded specialized equipment for deep-sea mineral extraction and construction. Around 2842, Scorpion scientists at the Hades Industrial Complex on Dagda produced the Water Elemental mining suit, a submersible exoskeleton that gave its operators far greater capability than any conventional diving apparatus. The suit's powered frame allowed workers to perform complex underwater tasks at depths and durations previously impossible. The Scorpions treated these suits as unremarkable industrial tools, deploying them across their underwater mining colonies with little thought to military applications.</p><p>That changed around 2860, when visiting Clan Wolf forces on Dagda learned of the Scorpions' mining programs and the exoskeletons powering them. A Wolf Star Captain, recognizing the suits' combat potential, issued a Trial of Possession for one of the units. Point Commander Sarah, assigned the defense, chose her ground carefully. She selected nearby wetlands featuring deep waterways, aggressive fauna, and treacherous footing. Clan Wolf bid a Star of jump infantry against Scorpion operators in their mining suits. Sarah exploited the terrain to devastating effect, using the Water Elementals' aquatic mobility to isolate and eliminate the Wolf warriors piecemeal. The Scorpions lost only a single pilot in the engagement.</p><p>Despite the Trial's outcome, Clan Wolf remained determined to acquire the technology. Through merchant caste trade channels, the Wolves obtained Water Elemental suits and began studying their military potential. Engineers added armor plating, jump jets, and weapon mounts to the basic exoskeleton frame. By 2868, these modifications produced a functional combat suit that Clan Wolf first deployed against the Nova Cats. The Elemental battle armor had been born, a design that would reshape Clan warfare for centuries. Clan Hell's Horses subsequently won the technology through Trials of their own, bringing their genetically bred Elemental phenotype warriors into the partnership of suit and soldier that defined Clan powered infantry.</p><p>The mining suit's influence extended far beyond the Elemental itself. While Clan Wolf pursued a general-purpose combat design, the specialist prototypes developed during early weaponization experiments inspired an entire family of role-specific suits. The Gnome, Salamander, Sylph, and Undine each traced their conceptual lineage back to those early variants, with the Undine being the most direct descendant of the original underwater design.</p><p>Throughout these developments, the Goliath Scorpions continued producing Water Elemental suits at the Hades Industrial Complex for their original mining purpose. Star Commander Vikram demonstrated the unmodified suits' latent combat potential during the Golden Century, pressing a Star of Water Elementals into service on Circe against Clan Mongoose in an unusual underwater engagement. Armed only with industrial tools against scuba infantry, Vikram's forces won a hard-fought battle in flooded terrain, with fierce currents and the exoskeletons' bulk proving as deadly as any weapon. Production at the Hades Industrial Complex continued under Goliath Scorpion control through the Jihad era. Following the Wars of Reaving, Clan Star Adder absorbed Scorpion holdings in the Homeworlds, and the Dagda facilities passed to new management, though the mining suits continued to serve their original industrial purpose.</p>\n</history>\n\n<manufacturer>\nHades Industrial Complex\n</manufacturer>\n\n<primaryFactory>\nDagda (Riva)\n</primaryFactory>\n\n<systemManufacturers>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemManufacturers>\n\n<systemModels>\nCHASSIS:Unknown\nENGINE:Unknown\nARMOR:Unknown\nCOMMUNICATIONS:Unknown\nTARGETING:Unknown\n</systemModels>\n\n<source>\nTR:GC\n</source>\n\n<chassis>\nbiped\n</chassis>\n\n<jumpingMP>\n2\n</jumpingMP>\n\n<armor>\n7\n</armor>\n\n<Trooper Count>\n4\n</Trooper Count>\n\n<weightclass>\n2\n</weightclass>\n\n",
    invalid: true,
    facts: {
      squadSize: 4,
      armorPerTrooper: 7,
      weightCode: 2,
      motion: 'UMU',
      chassis: 'biped',
    },
  },
] as const;

async function expectBattleArmorImport(
  source: (typeof battleArmorSources)[number],
  text: string = source.content,
) {
  const parsed = new BlkParserService().parse(text);
  if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
  const expected = parseExpected(
    parsed.data.document,
    createBattleArmorHandler(),
  );
  const { unit } = expected;
  await expectSavedImport(
    'battlearmor',
    text,
    parsed.data.document,
    expected,
    {
      tonnage: source.facts.squadSize,
      squadSize: source.facts.squadSize,
      weightClass: ['PAL', 'LIGHT', 'MEDIUM', 'HEAVY', 'ASSAULT'][
        source.facts.weightCode
      ],
      chassisType: source.facts.chassis.toUpperCase(),
      armorPerTrooper: source.facts.armorPerTrooper,
      armor: { perTrooper: source.facts.armorPerTrooper },
      movement: unit.movement,
      manipulators: {
        leftArm: unit.leftManipulator,
        rightArm: unit.rightManipulator,
      },
      hasAntiPersonnelMount: unit.hasAPMount,
      hasModularWeaponMount: unit.hasModularMount,
      equipment: unit.equipment.map((mount) => ({
        id: mount.equipmentId,
        name: mount.name,
        location: 'SQUAD',
        unitLocation: mount.unitLocation,
        isAPMMounted: mount.isAPMount,
      })),
    },
    source.invalid,
    parsed.data.warnings,
  );
  if (source.invalid) {
    expect(expected.diagnostics.errors.join('; ')).toMatch(/armor.*2863/i);
  }
}

it.each(battleArmorSources)(
  'saves and reloads original battle armor bytes $path',
  async (source) => {
    expect(createHash('sha256').update(source.content).digest('hex')).toBe(
      source.sha256,
    );
    await expectBattleArmorImport(source);
  },
);

it('saves and reloads a SYNTHETIC modular-mount source (not pinned corpus coverage)', async () => {
  // SYNTHETIC: pinned corpus scan found 0/1,188 equipment blocks encoding modular mounts.
  const source = battleArmorSources[0];
  const text =
    '# SYNTHETIC modular-mount retention fixture; not original mm-data bytes\n' +
    source.content +
    '\n<modularmount>\ntrue\n</modularmount>\n';
  await expectBattleArmorImport(source, text);
  const saved = getUnitRepository().list()[0];
  const loaded = await reload('battlearmor', saved.id);
  expect(loaded).toMatchObject({
    success: true,
    definition: {
      hasModularWeaponMount: true,
      blkSource: { text, handlerUnit: { hasModularMount: true } },
    },
  });
});

it('rejects a battle armor name conflict without overwriting source or armor', async () => {
  const text = battleArmorSources[0].content;
  expect((await post(text))._getStatusCode()).toBe(201);
  const before = getUnitRepository().list();
  const saved = getUnitRepository().getById(before[0].id);
  expect((await post('# conflict\n' + text))._getStatusCode()).toBe(409);
  expect(getUnitRepository().list()).toEqual(before);
  expect(getUnitRepository().getById(before[0].id)).toEqual(saved);
});

it('rejects an unrepresentable battle armor code with client diagnostics and no write', async () => {
  const text = battleArmorSources[0].content.replace(
    /<armor_type>[\s\S]*?<\/armor_type>/i,
    '<armor_type>999</armor_type>',
  );
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /armor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});

// Original bytes read with git show mm-data 50f7efe:<path>; SHA-256 does not normalize line endings.
const infantrySources = [
  {
    path: 'data/mekfiles/infantry/3085/Clan/Clan Heavy Foot Infantry Ebon Keshik Point.blk',
    sha256: 'c2cf5981b522fb1f00c6ae7a54bf3d74843645d532c7c12ca392377934d84530',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b61a-765c-a555-50871b5d2f58\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nClan Heavy Foot Infantry\n</Name>\n\n<Model>\nEbon Keshik Point\n</Model>\n\n<mul id:>\n608\n</mul id:>\n\n<year>\n2875\n</year>\n\n<type>\nClan Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nLeg\n</motion_type>\n\n<Troopers Equipment>\nClan Armor Kit (All)\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>The Ebon Keshik is a group of elite, black-clad Elementals who guard the most sacred sites on Strana Mechty. Battle armor is too bulky for these human-scale facilities, so these warriors are most commonly equipped as foot infantry in specially sculpted black body armor and armed with Clan-standard Mauser IIC assault systems. Unlikely to see combat, a warrior assigned to the Ebon Keshik has little to look forward to beyond a Trial of Position against a younger warrior and the inevitable relegation to a solahma unit. Patrolling the corridors of power on Strana Mechty is the ultimate achievement in the career of an Elemental, yet it is a tainted honor, marking the end of a warrior\'s useful service rather than a reward for distinguished performance.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n5\n</squad_size>\n\n<squadn>\n1\n</squadn>\n\n<Primary>\nLaser Rifle (Mauser IIC IAS)\n</Primary>\n\n',
    invalid: false,
    facts: {
      squadSize: 5,
      squadCount: 1,
      totalTroopers: 5,
      motion: 'Leg',
      primary: 'Laser Rifle (Mauser IIC IAS)',
      secondary: null,
      secondaryCount: 0,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Clan Armor Kit (All)'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Clan Armor Kit (All)',
          name: 'Clan Armor Kit (All)',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/FRR/Anti-Mech Jump Infantry Third Ueda Infantry.blk',
    sha256: '85809d71117f39fab7c2453b45696b8b171ed6e43b919e6ee562afdf6b81a914',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b63f-74a7-b312-5943434c11b9\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nAnti-'Mech Jump Infantry\n</Name>\n\n<Model>\nThird Ueda Infantry\n</Model>\n\n<mul id:>\n46\n</mul id:>\n\n<year>\n2600\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nJump\n</motion_type>\n\n<Troopers Equipment>\nFree Rasalhague Republic Infantry Kit\nAntiMekGear\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>The Third Ueda Infantry is a typical example of the Kungs\u00c9rm\u00e9 forces absorbed into the Rasalhague Dominion touman. Veterans of the grinding war against Clan Wolf, their numbers were culled through the Trials of Position required for integration into the Dominion military structure. The strongest warriors were seconded into the Third Drakon Cluster's battle armor Binaries, while those who remain provide conventional infantry support to the First Ueda Cavaliers. Low on the military hierarchy and without access to Clan equipment, the Third retains much of its old Inner Sphere gear, including Blazer rifles and heavy support lasers. This may make them appear less capable on paper, but appearances are deceptive. As jump infantry with dedicated anti-BattleMech training, they pose a serious threat to any force they can close with, and their years of combat experience against Clan opponents have taught them exactly how to exploit the weaknesses of heavier formations.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n7\n</squad_size>\n\n<squadn>\n3\n</squadn>\n\n<secondn>\n1\n</secondn>\n\n<Primary>\nLaser Rifle (Blazer)\n</Primary>\n\n<Secondary>\nSupport Laser (Heavy)\n</Secondary>\n\n",
    invalid: false,
    facts: {
      squadSize: 7,
      squadCount: 3,
      totalTroopers: 21,
      motion: 'Jump',
      primary: 'Laser Rifle (Blazer)',
      secondary: 'Support Laser (Heavy)',
      secondaryCount: 1,
      specializations: 0,
      augmentations: [],
      troopersEquipment: [
        'Free Rasalhague Republic Infantry Kit',
        'AntiMekGear',
      ],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Free Rasalhague Republic Infantry Kit',
          name: 'Free Rasalhague Republic Infantry Kit',
          location: 'TROOPERS',
        },
        {
          id: 'AntiMekGear',
          name: 'AntiMekGear',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/RAF/Motorized MG Galatean Support Wheels.blk',
    sha256: '95c78504ac7f3db5f01fb9444efb9ff9b78314f5b50da1100c63caed663a23a6',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b66e-7dcc-93e2-0705c87229c5\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nMotorized MG\n</Name>\n\n<Model>\nGalatean Support Wheels\n</Model>\n\n<mul id:>\n2234\n</mul id:>\n\n<year>\n2500\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nMotorized\n</motion_type>\n\n<Troopers Equipment>\nFlak, Standard\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Galatea\'s dune buggies and cross-country bikes have long seen field modifications and use by mercenary forces passing through the Hiring Hall world. When a Combine-born motorized infantry regiment was assigned to Galatea after the founding of the Republic, its soldiers quickly adopted these highly flexible local vehicles, driving new standardized models from Galatean manufacturers. Armed with auto rifles supplemented by semi-portable machine guns, the Galatean Support Wheels combine the speed of motorized transport with enough organic firepower to hold ground against light opposition. The GSW are considered the best example of RAF motorized infantry, a formation born from practical adaptation rather than central procurement.</p>\n</overview>\n\n<source>\nTR:3085S\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n7\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nInfantryAssaultRifle\n</Primary>\n\n<Secondary>\nMachine Gun (Portable)\n</Secondary>\n\n',
    invalid: false,
    facts: {
      squadSize: 7,
      squadCount: 4,
      totalTroopers: 28,
      motion: 'Motorized',
      primary: 'InfantryAssaultRifle',
      secondary: 'Machine Gun (Portable)',
      secondaryCount: 2,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Flak, Standard'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Flak, Standard',
          name: 'Flak, Standard',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/TW/Clan Points/Clan Mechanized Tracked Point (Laser).blk',
    sha256: 'b178a9d6e65272133b03446896916cfab51f58ae19c216e4b23139387cd3967c',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-bf75-7924-9ff2-ab7e9d53f0f8\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nClan Mechanized Tracked Point\n</Name>\n\n<Model>\n(Laser)\n</Model>\n\n<mul id:>\n624\n</mul id:>\n\n<year>\n2815\n</year>\n\n<type>\nClan Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nTracked\n</motion_type>\n\n<Troopers Equipment>\nClan Armor Kit (All)\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Clan mechanized tracked Points move five warriors in tracked APCs for all-terrain mechanized operations. Tracked vehicles handle the widest range of ground conditions, making these Points the most reliable mechanized infantry for garrison duty on worlds with varied or hostile terrain. Clan commanders assign tracked Points to sectors where wheeled or hover transport would struggle, and the armored carriers provide meaningful protection during transit. These formations anchor defensive positions and provide the mobile reserve that lighter Clan infantry elements lack.</p>\n</overview>\n\n<source>\nTW,TO:AUE\n</source>\n\n<squad_size>\n5\n</squad_size>\n\n<squadn>\n5\n</squadn>\n\n<Primary>\nLaser Rifle\n</Primary>\n\n',
    invalid: true,
    facts: {
      squadSize: 5,
      squadCount: 5,
      totalTroopers: 25,
      motion: 'Tracked',
      primary: 'Laser Rifle',
      secondary: null,
      secondaryCount: 0,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Clan Armor Kit (All)'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Clan Armor Kit (All)',
          name: 'Clan Armor Kit (All)',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Word of Blake/Mechanized Assault XCT Word of Blake Militia NBC.blk',
    sha256: '7cb51305b2a29aecf57742a6795e92fbcf04d976df91b7adec7b5fee49836a3b',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b681-7575-a78c-9ef4137492e8\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nMechanized Assault XCT\n</Name>\n\n<Model>\nWord of Blake Militia NBC\n</Model>\n\n<mul id:>\n2130\n</mul id:>\n\n<year>\n3065\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nWheeled\n</motion_type>\n\n<Troopers Equipment>\nEnvironment Suit, Marine\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>The Word of Blake's Nuclear, Biological, and Chemical Special Weapons Teams were the standard force for handling combat zones contaminated by weapons of mass destruction. Trained and equipped for operations in toxic environments, these mechanized assault platoons appeared during or immediately after Word of Blake strikes involving nuclear or chemical weapons, scouring irradiated ground for survivors and taking prisoners. Their environment suits provide protection against NBC hazards, while their wheeled mechanized transport carries decontamination gear alongside the platoon's Mauser 1200 LSS laser rifles and man-portable plasma rifles. NBC teams also operated in the aftermath of conventional raids, processing battlefields that conventional troops could not safely enter. Their willingness to work in lethal conditions made them a grim but essential component of the Word's military operations during the Jihad.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n6\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nLaser Rifle (Mauser 1200 LSS)\n</Primary>\n\n<Secondary>\nPlasma Rifle (Man-Portable)\n</Secondary>\n\n<spacesuit>\ntrue\n</spacesuit>\n\n<specialization>\n2048\n</specialization>\n\n",
    invalid: false,
    facts: {
      squadSize: 6,
      squadCount: 4,
      totalTroopers: 24,
      motion: 'Wheeled',
      primary: 'Laser Rifle (Mauser 1200 LSS)',
      secondary: 'Plasma Rifle (Man-Portable)',
      secondaryCount: 2,
      specializations: 2048,
      augmentations: [],
      troopersEquipment: ['Environment Suit, Marine'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Environment Suit, Marine',
          name: 'Environment Suit, Marine',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Corporations/Hover Assault Infantry Johnston Industries Rapid Response Force.blk',
    sha256: 'cd20cad4580e3178ccd7e0fe19acd1e20bdacdb010351e9960cc49d465a06bed',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b630-7cac-81a8-7e96ad1f2ee5\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nHover Assault Infantry\n</Name>\n\n<Model>\nJohnston Industries Rapid Response Force\n</Model>\n\n<mul id:>\n1549\n</mul id:>\n\n<year>\n2500\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nHover\n</motion_type>\n\n<Troopers Equipment>\nGeneric Infantry Kit\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Johnston Industries, one of the Federated Suns' largest military manufacturers, relies on Rapid Response Forces as its first line of reinforcement for factory security. Riding small, lightly armored hover bikes, RRF troopers combine speed with dismounted flexibility, able to cover the sprawling factory complexes that span dozens of kilometers across worlds like New Syrtis and Benet III. Armed with assault rifles and infantry LRM launchers, these platoons can respond to incursions faster than conventional garrison troops while delivering both direct and indirect fire support. The hover bikes trade protection for mobility, leaving troopers vulnerable if forced into sustained engagements, but Johnston's security doctrine emphasizes rapid reinforcement over static defense.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n5\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nInfantryAssaultRifle\n</Primary>\n\n<Secondary>\nInfantryLRM\n</Secondary>\n\n",
    invalid: false,
    facts: {
      squadSize: 5,
      squadCount: 4,
      totalTroopers: 20,
      motion: 'Hover',
      primary: 'InfantryAssaultRifle',
      secondary: 'InfantryLRM',
      secondaryCount: 2,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Generic Infantry Kit'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Generic Infantry Kit',
          name: 'Generic Infantry Kit',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Corporations/VTOL Infantry Hachiman Taro Enterprise Extraction Force.blk',
    sha256: 'f70862fec518410a7f042794e2b0b88c912e1f5848080cd9cdd3a9943ad0353c',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b633-7a49-a3a4-b18a89545a01\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nVTOL Infantry\n</Name>\n\n<Model>\nHachiman Taro Enterprise Extraction Force\n</Model>\n\n<mul id:>\n3457\n</mul id:>\n\n<year>\n3045\n</year>\n\n<type>\nIS Level 4\n</type>\n\n<role>\nStriker\n</role>\n\n<motion_type>\nMicrocopter\n</motion_type>\n\n<Troopers Equipment>\nMyomer, Vest\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Hachiman Taro Enterprises, the Draconis Combine electronics conglomerate founded by Chandrasekhar Kurita, fields its Extraction Force as a specialized rapid-response security unit. Each trooper is equipped with a cutting-edge one-man VTOL microcopter, granting the platoon an extraordinary degree of insertion and extraction capability. The HTE Extraction Force specializes in recovering kidnapped corporate assets and personnel from hostile situations, often completing operations before alarms are raised. Armed only with auto-rifles, the sixteen-trooper platoon carries no secondary weapons due to the bulk of their individual flight systems. This trade-off limits their sustained combat power, but the unit's value lies in speed and stealth rather than firepower. The explosive growth of HTE under Chandrasekhar's stewardship brought powerful enemies, making a dedicated extraction capability essential to protecting the company's leadership and key personnel.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n4\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<Primary>\nInfantryAssaultRifle\n</Primary>\n\n",
    invalid: false,
    facts: {
      squadSize: 4,
      squadCount: 4,
      totalTroopers: 16,
      motion: 'Microcopter',
      primary: 'InfantryAssaultRifle',
      secondary: null,
      secondaryCount: 0,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Myomer, Vest'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Myomer, Vest',
          name: 'Myomer, Vest',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Davion/Frogmen Blue Water Marine Response Teams (Frogmen).blk',
    sha256: 'ceaed7452a4da2adec92fbc2a7e2a108f1d0a02eb59bf78df1979d840ec63310',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b637-7026-9456-5fce8e25b59c\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nFrogmen\n</Name>\n\n<Model>\nBlue Water Marine Response Teams (Frogmen)\n</Model>\n\n<mul id:>\n1153\n</mul id:>\n\n<year>\n2500\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nMotorized SCUBA\n</motion_type>\n\n<Troopers Equipment>\nFlak, Standard\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>The AFFS Frogmen are special operations troops drawn from the blue water marine community, trained extensively in sub-surface warfare and amphibious combat. Riding electric-cell underwater sleds, these operators conduct demolitions, reconnaissance, and direct action missions in riverine and coastal environments where conventional ground forces cannot follow. Equipped with laser rifles and heavy support lasers suited for both surface and near-surface engagements, the Frogmen prove the old adage that no coastline is ever truly secure. Their training pipeline is demanding enough that the AFFS maintains only a small number of active teams, but those who earn the qualification are among the most capable waterborne combatants in the Inner Sphere.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n6\n</squad_size>\n\n<squadn>\n2\n</squadn>\n\n<secondn>\n1\n</secondn>\n\n<Primary>\nInfantryFederatedBarrettM61A\n</Primary>\n\n<Secondary>\nSupport Laser\n</Secondary>\n\n<specialization>\n4096\n</specialization>\n\n',
    invalid: false,
    facts: {
      squadSize: 6,
      squadCount: 2,
      totalTroopers: 12,
      motion: 'Motorized SCUBA',
      primary: 'InfantryFederatedBarrettM61A',
      secondary: 'Support Laser',
      secondaryCount: 1,
      specializations: 4096,
      augmentations: [],
      troopersEquipment: ['Flak, Standard'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Flak, Standard',
          name: 'Flak, Standard',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Mercenary/Submersible Mechanized Infantry Kraken Unleashed - The Mermen.blk',
    sha256: 'f79adda034afd7c2cec285634bccbb6d3d8718a1601fc6755eac06b06a3b2321',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b65f-7cb9-8f22-b595699f3c16\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nSubmersible Mechanized Infantry\n</Name>\n\n<Model>\nKraken Unleashed - The Mermen\n</Model>\n\n<mul id:>\n3116\n</mul id:>\n\n<year>\n2600\n</year>\n\n<type>\nIS Level 2\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nSubmarine\n</motion_type>\n\n<Troopers Equipment>\nEnvironment Suit, Marine\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Kraken Unleashed is a mercenary regiment specializing in amphibious, underwater, and naval combat. Stationed on the Capellan world of Principia, the command worked with local shipwright industries to develop a new infantry capability: the Submersible Mechanized Infantry. Using locally produced Harpoon parasubs, five-trooper squads operate from unpressurized submersibles equipped with small torpedo launchers. Troopers fire their gyroslug rifles from the safety of the armored hull while the parasub provides propulsion and additional firepower. Unlike full-sized combat submarines, the Harpoon is compact enough to load into a transport and deploy anywhere on a planet within hours. The Mermen, Kraken Unleashed\'s dedicated infantry component, field these parasubs as their primary combat platform, bringing firepower sufficient to threaten even concerted underwater BattleMech assaults.</p>\n</overview>\n\n<source>\nTR:3085S\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n5\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nGyroslug Rifle\n</Primary>\n\n<Secondary>\nInfantryStandardSRM\n</Secondary>\n\n<spacesuit>\ntrue\n</spacesuit>\n\n<specialization>\n4096\n</specialization>\n\n',
    invalid: false,
    facts: {
      squadSize: 5,
      squadCount: 4,
      totalTroopers: 20,
      motion: 'Submarine',
      primary: 'Gyroslug Rifle',
      secondary: 'InfantryStandardSRM',
      secondaryCount: 2,
      specializations: 4096,
      augmentations: [],
      troopersEquipment: ['Environment Suit, Marine'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Environment Suit, Marine',
          name: 'Environment Suit, Marine',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Taurian/Field Gun Infantry Motorized Batteries.blk',
    sha256: 'eb303bff6e97f5c7a8e252dc309b22aa22199c35f7e2764c7c2da4df22617117',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b67a-7f39-a5d0-2cbe1967da03\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nField Gun Infantry\n</Name>\n\n<Model>\n(Motorized Batteries)\n</Model>\n\n<mul id:>\n1061\n</mul id:>\n\n<year>\n2500\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nMotorized\n</motion_type>\n\n<Troopers Equipment>\nTaurian Concordat/Calderon Infantry Kit\n</Troopers Equipment>\n\n<Field Guns Equipment>\nLight Auto Cannon/5\nIS Ammo LAC/5\nLight Auto Cannon/5\nIS Ammo LAC/5\nLight Auto Cannon/5\nIS Ammo LAC/5\nLight Auto Cannon/5\nIS Ammo LAC/5\nLight Auto Cannon/5\nIS Ammo LAC/5\nLight Auto Cannon/5\nIS Ammo LAC/5\n</Field Guns Equipment>\n\n<overview>\n<p>The motorized field gun batteries of the Taurian Defense Force are a direct outgrowth of the Concordat's combined-arms doctrine, which pairs infantry firepower with armored formations wherever possible. Units of the First Taurian Lancers, a multiregiment combined-arms command fielded since 3020, pioneered the integration of field gun batteries alongside their motorized companies. Each battery fields six light autocannons mounted on towed carriages, crewed by teams of five soldiers apiece, with auto-rifles as personal sidearms for the gun crews.</p><p>These platoons deliver direct fire support that conventional infantry cannot match. The light autocannons engage armored vehicles and hardened positions at ranges well beyond personal weapon reach, providing organic heavy firepower to infantry formations that would otherwise depend entirely on attached armor or BattleMech support. Support particle projection cannons give the batteries an additional energy weapon capability against heavier targets. Transported by motorized vehicles, the batteries can reposition quickly enough to support offensive operations rather than being limited to static garrison defense. The Concordat's limited BattleMech inventory makes these field guns a critical force multiplier for TDF ground commanders.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n10\n</squad_size>\n\n<squadn>\n3\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nInfantryAssaultRifle\n</Primary>\n\n<Secondary>\nParticle Cannon (Support)\n</Secondary>\n\n",
    invalid: false,
    facts: {
      squadSize: 10,
      squadCount: 3,
      totalTroopers: 30,
      motion: 'Motorized',
      primary: 'InfantryAssaultRifle',
      secondary: 'Particle Cannon (Support)',
      secondaryCount: 2,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Taurian Concordat/Calderon Infantry Kit'],
      fieldEquipment: [
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
        'Light Auto Cannon/5',
        'IS Ammo LAC/5',
      ],
      equipment: [
        {
          id: 'Taurian Concordat/Calderon Infantry Kit',
          name: 'Taurian Concordat/Calderon Infantry Kit',
          location: 'TROOPERS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'Light Auto Cannon/5',
          name: 'Light Auto Cannon/5',
          location: 'FIELD_GUNS',
        },
        {
          id: 'IS Ammo LAC/5',
          name: 'IS Ammo LAC/5',
          location: 'FIELD_GUNS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Kurita/Mechanized Field Artillery 71st Mechanized.blk',
    sha256: '2897d69bffa68f2bbddbe81f8ff08eadff85ab206daed705a868b2c3a2a5f429',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b64f-7ba7-8305-a1f052c15b6b\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nMechanized Field Artillery\n</Name>\n\n<Model>\n71st Mechanized\n</Model>\n\n<mul id:>\n2131\n</mul id:>\n\n<year>\n2500\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<role>\nMissile Boat\n</role>\n\n<motion_type>\nWheeled\n</motion_type>\n\n<Troopers Equipment>\nDraconis Combine Infantry Kit\n</Troopers Equipment>\n\n<Field Guns Equipment>\nISThumper\nISThumperAmmo\n</Field Guns Equipment>\n\n<overview>\n<p>The Sword of Light brigade has long represented the elite of the Draconis Combine Mustered Soldiery's combat arm, with membership requiring five years of flawless service and rigorous testing. Despite the advent of battle armor in the Inner Sphere, certain Sword of Light units have vehemently resisted incorporating battlesuits into their tables of organization. The Seventy-first Mechanized field artillery battalion embodies that philosophy, assigned to the Ninth Sword of Light after remaining loyal through the Second Sword of Light's betrayal. The battalion stubbornly continued to demonstrate that conventional infantry could deliver firepower without battlesuits. Each soldier carries a TK assault rifle, with support weapons specialists manning semi-portable autocannons to provide suppressive fire. The pride of the Seventy-first is its Thumper artillery piece, a traditional field gun whose indirect fire capability still exceeds what battle armor can deliver.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n6\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nRifle (TK Assault)\n</Primary>\n\n<Secondary>\nAutocannon (Semi-Portable)\n</Secondary>\n\n",
    invalid: false,
    facts: {
      squadSize: 6,
      squadCount: 4,
      totalTroopers: 24,
      motion: 'Wheeled',
      primary: 'Rifle (TK Assault)',
      secondary: 'Autocannon (Semi-Portable)',
      secondaryCount: 2,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Draconis Combine Infantry Kit'],
      fieldEquipment: ['ISThumper', 'ISThumperAmmo'],
      equipment: [
        {
          id: 'Draconis Combine Infantry Kit',
          name: 'Draconis Combine Infantry Kit',
          location: 'TROOPERS',
        },
        {
          id: 'ISThumper',
          name: 'ISThumper',
          location: 'FIELD_GUNS',
        },
        {
          id: 'ISThumperAmmo',
          name: 'ISThumperAmmo',
          location: 'FIELD_GUNS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Steiner/HALO Paratrooper Lyran Paratrooper Corps.blk',
    sha256: '5c95d201a7fbe72b284cb78ef276cd6aceeabd098c757da5308123da588ee697',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b677-7fd4-9cd1-8942e77f872e\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nHALO Paratrooper\n</Name>\n\n<Model>\nLyran Paratrooper Corps\n</Model>\n\n<mul id:>\n1364\n</mul id:>\n\n<year>\n3045\n</year>\n\n<type>\nIS Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nLeg\n</motion_type>\n\n<Troopers Equipment>\nLyran Alliance/Lyran Commonwealth (3060+) Infantry Kit\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Most Lyran troops undergo some form of paratrooper training during their service, but the soldiers who actually deploy with the Lyran Paratrooper Corps are a cut above. Experienced, talented, and organized into three-squad platoons of twenty-one troopers, the Corps operates as a strategic asset rather than a tactical one. Armed with Mauser and Gray G-150 rifles and backed by heavy recoilless rifles, paratroopers like those attached to the Third Skye CMR can deploy at a moment's notice from the Commonwealth's extensive inventory of fixed-wing transport craft. Their ability to conduct atmospheric drops gives them access to battlefields that ground-bound formations simply cannot reach in time.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n7\n</squad_size>\n\n<squadn>\n3\n</squadn>\n\n<secondn>\n2\n</secondn>\n\n<Primary>\nRifle (M&G G-150)\n</Primary>\n\n<Secondary>\nInfantryHRR\n</Secondary>\n\n<armordivisor>\n2.0\n</armordivisor>\n\n<specialization>\n512\n</specialization>\n\n",
    invalid: false,
    facts: {
      squadSize: 7,
      squadCount: 3,
      totalTroopers: 21,
      motion: 'Leg',
      primary: 'Rifle (M&G G-150)',
      secondary: 'InfantryHRR',
      secondaryCount: 2,
      specializations: 512,
      augmentations: [],
      troopersEquipment: [
        'Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit',
      ],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit',
          name: 'Lyran Alliance/Lyran Commonwealth (3060+) Infantry Kit',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Clan/Clan Space Marine Clan Snow Raven Space Marines.blk',
    sha256: 'cba3202ca3a4226c4cbd27693afd50cbd22ce70d10af3ee0d0d67710ad1254f3',
    content:
      '# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft\'s "Game Content Usage Rules"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b61d-74cd-a4d7-2952f17014ef\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nClan Space Marine\n</Name>\n\n<Model>\nClan Snow Raven Space Marines\n</Model>\n\n<mul id:>\n3662\n</mul id:>\n\n<year>\n3015\n</year>\n\n<type>\nClan Level 3\n</type>\n\n<role>\nAmbusher\n</role>\n\n<motion_type>\nLeg\n</motion_type>\n\n<Troopers Equipment>\nEnvironment Suit, Marine\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Navies throughout history have sought dedicated marines, soldiers they can tailor to suit shipboard needs and requirements. Clan Snow Raven continues this tradition, fielding Space Marine Points drawn from warriors of all phenotypes to guard its fleet from internal threats. Unlike battle armor troops, these marines have limited mobility and are best suited to defensive operations, providing security and boarding defense on spacecraft ranging from WarShips to observation stations. Armed with Mauser IIC assault systems and fitted with marine environment suits, they can fight effectively in zero-gravity and vacuum conditions. The introduction of the Aerie power armor has raised questions about the future of unarmored marines within the Snow Raven touman, but the Aerie\'s prohibitive cost ensures that conventional marines will continue to fill shipboard security roles for the foreseeable future.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n5\n</squad_size>\n\n<squadn>\n4\n</squadn>\n\n<Primary>\nLaser Rifle (Mauser IIC IAS)\n</Primary>\n\n<armordivisor>\n2.0\n</armordivisor>\n\n<spacesuit>\ntrue\n</spacesuit>\n\n',
    invalid: false,
    facts: {
      squadSize: 5,
      squadCount: 4,
      totalTroopers: 20,
      motion: 'Leg',
      primary: 'Laser Rifle (Mauser IIC IAS)',
      secondary: null,
      secondaryCount: 0,
      specializations: 0,
      augmentations: [],
      troopersEquipment: ['Environment Suit, Marine'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Environment Suit, Marine',
          name: 'Environment Suit, Marine',
          location: 'TROOPERS',
        },
      ],
    },
  },
  {
    path: 'data/mekfiles/infantry/3085/Word of Blake/Tau Wraith Manei Domini Recon Squad.blk',
    sha256: 'b01ffb9814f27d0cbfaed17040eb0cf3617cd88c0da1d29a31f46fc16de6a23d',
    content:
      "# MegaMek Data (C) 2025-2026 by The MegaMek Team is licensed under CC BY-NC-SA 4.0.\n# To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/\n#\n# NOTICE: The MegaMek organization is a non-profit group of volunteers\n# creating free software for the BattleTech community.\n#\n# MechWarrior, BattleMech, `Mech and AeroTech are registered trademarks\n# of The Topps Company, Inc. All Rights Reserved.\n#\n# Catalyst Game Labs and the Catalyst Game Labs logo are trademarks of\n# InMediaRes Productions, LLC.\n#\n# MechWarrior Copyright Microsoft Corporation. MegaMek Data was created under\n# Microsoft's \"Game Content Usage Rules\"\n# <https://www.xbox.com/en-US/developers/rules> and it is not endorsed by or\n# affiliated with Microsoft.\n\n#Saved from version 0.51.01 on 2026-07-12\n<UUID>\n019f583e-b685-7571-8a26-5fbf95e62b10\n</UUID>\n\n<UnitType>\nInfantry\n</UnitType>\n\n<Name>\nManei Domini Recon Squad\n</Name>\n\n<Model>\n'Tau Wraith'\n</Model>\n\n<mul id:>\n3166\n</mul id:>\n\n<year>\n3065\n</year>\n\n<type>\nIS Level 4\n</type>\n\n<role>\nScout\n</role>\n\n<motion_type>\nLeg\n</motion_type>\n\n<Troopers Equipment>\nSneak Suit (Camo/IR/ECM)\n</Troopers Equipment>\n\n<Field Guns Equipment>\n</Field Guns Equipment>\n\n<overview>\n<p>Tau Wraith reconnaissance squads served as the Manei Domini's eyes on the battlefield, operating from the shadows to coordinate friendly forces and provide targeting telemetry for heavier units. Where Tau Zombies overwhelmed through brute cybernetic force, Wraiths relied on stealth and information superiority. Each six-trooper squad wore Sneak Suits incorporating camouflage, ECM, and infrared baffling that rendered them invisible to standard detection equipment, including active probes. Their boosted communicator implants allowed Wraiths to link directly into friendly C3 networks, sharing real-time battlefield data without the need for external communications gear. Armed with Mauser 1200 LSS laser rifles and equipped with paratrooper drop capability, Wraith squads could insert behind enemy lines and remain undetected while guiding strikes from friendly formations. Few conventional forces could match their combination of stealth, communications integration, and cybernetic enhancement.</p>\n</overview>\n\n<source>\nTR:3085\n</source>\n\n<published>\nRS:3085u-CE\n</published>\n\n<squad_size>\n6\n</squad_size>\n\n<squadn>\n1\n</squadn>\n\n<Primary>\nLaser Rifle (Mauser 1200 LSS)\n</Primary>\n\n<sneakcamo>\ntrue\n</sneakcamo>\n\n<sneakir>\ntrue\n</sneakir>\n\n<sneakecm>\ntrue\n</sneakecm>\n\n<specialization>\n512\n</specialization>\n\n<augmentation>\nboost_comm_implant\ncyber_imp_visual\ncyber_imp_laser\ngas_effuser_pheromone\ngas_effuser_toxin\n</augmentation>\n\n",
    invalid: false,
    facts: {
      squadSize: 6,
      squadCount: 1,
      totalTroopers: 6,
      motion: 'Leg',
      primary: 'Laser Rifle (Mauser 1200 LSS)',
      secondary: null,
      secondaryCount: 0,
      specializations: 512,
      augmentations: [
        'boost_comm_implant',
        'cyber_imp_visual',
        'cyber_imp_laser',
        'gas_effuser_pheromone',
        'gas_effuser_toxin',
      ],
      troopersEquipment: ['Sneak Suit (Camo/IR/ECM)'],
      fieldEquipment: [],
      equipment: [
        {
          id: 'Sneak Suit (Camo/IR/ECM)',
          name: 'Sneak Suit (Camo/IR/ECM)',
          location: 'TROOPERS',
        },
      ],
    },
  },
] as const;

it.each(infantrySources)(
  'saves and reloads original infantry bytes $path',
  async (source) => {
    expect(createHash('sha256').update(source.content).digest('hex')).toBe(
      source.sha256,
    );
    const parsed = new BlkParserService().parse(source.content);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const expected = parseExpected(
      parsed.data.document,
      createInfantryHandler(),
    );
    const { unit } = expected;
    const facts = source.facts;
    const loaded = await expectSavedImport(
      'infantry',
      source.content,
      parsed.data.document,
      expected,
      {
        platoon: {
          squadSize: facts.squadSize,
          squadCount: facts.squadCount,
          totalTroopers: facts.totalTroopers,
        },
        motionType: unit.motionType.toUpperCase(),
        motiveType: facts.motion,
        primaryWeapon: { id: facts.primary, name: facts.primary },
        ...(facts.secondary
          ? {
              secondaryWeapon: {
                id: facts.secondary,
                name: facts.secondary,
                count: facts.secondaryCount,
              },
            }
          : {}),
        damageDivisor: unit.damageDivisor,
        specializations: unit.bvOffense?.specializations,
        augmentations: facts.augmentations,
        effectiveArmorFlags: unit.bvArmorFlags,
        equipment: facts.equipment,
      },
      source.invalid,
      parsed.data.warnings,
    );
    if (!facts.secondary)
      expect(loaded.definition.secondaryWeapon).toBeUndefined();
    expect(mapInfantryDefinition(loaded.definition)).toMatchObject({
      squadSize: facts.squadSize,
      numberOfSquads: facts.squadCount,
      platoonComposition: {
        squads: facts.squadCount,
        troopersPerSquad: facts.squadSize,
      },
      primaryWeapon: facts.primary,
      secondaryWeaponCount: facts.secondaryCount,
      librarySource: loaded.definition,
    });
    if (source.invalid) {
      expect(loaded.definition.blkSource).toMatchObject({
        diagnostics: { isValid: false, errors: ['Maximum squad count is 4'] },
      });
    }
  },
);

it('rejects an infantry name conflict without overwriting its source or platoon', async () => {
  const text = infantrySources[0].content;
  expect((await post(text))._getStatusCode()).toBe(201);
  const before = getUnitRepository().list();
  const saved = getUnitRepository().getById(before[0].id);
  expect((await post('# conflict\n' + text))._getStatusCode()).toBe(409);
  expect(getUnitRepository().list()).toEqual(before);
  expect(getUnitRepository().getById(before[0].id)).toEqual(saved);
});

it('retains infantry source-loading diagnostics without writing a rejected source', async () => {
  const text =
    infantrySources[0].content + '\n<armordivisor>\n0\n</armordivisor>\n';
  const res = await post(text);
  expect(res._getStatusCode()).toBe(400);
  expect(parseImportResponse(res).error?.validationErrors?.join('; ')).toMatch(
    /damage divisor/i,
  );
  expect(getUnitRepository().list()).toHaveLength(0);
});
