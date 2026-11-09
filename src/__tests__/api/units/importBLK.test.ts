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
import aerospaceFixtures from '@/services/units/handlers/__tests__/fixtures/aerospace-capital-validity.json';
import fixedWingFixtures from '@/services/units/handlers/__tests__/fixtures/fixed-wing-support.json';
import locationFixtures from '@/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import { createAerospaceHandler } from '@/services/units/handlers/AerospaceUnitHandler';
import { createConventionalFighterHandler } from '@/services/units/handlers/ConventionalFighterUnitHandler';
import { FixedWingSupportUnitHandler } from '@/services/units/handlers/FixedWingSupportUnitHandler';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { createSmallCraftHandler } from '@/services/units/handlers/SmallCraftUnitHandler';
import { createSupportVehicleHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { createVehicleHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { createVTOLHandler } from '@/services/units/handlers/VTOLUnitHandler';
import vehicleFixtures from '@/services/units/unitLoaderService/__tests__/fixtures/vehicles.pinned.json';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

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
  readonly equipment: readonly (IUnitMountedEquipmentIdentity & {
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
    equipment: unit.equipment.map((mount) => ({
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

it.each(['DropShip', 'BattleArmor', 'Infantry', 'BattleMech'])(
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
