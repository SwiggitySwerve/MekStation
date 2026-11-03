import { spawnSync } from 'node:child_process';
/** Reproduce the portable fixtures through the production family serializers. */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import {
  mapBattleArmorDefinitionToState,
  mapProtoMechDefinitionToState,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { UNIT_FAMILIES, type UnitFamily } from '@/types/unit/UnitIndex';
import { mapInfantryDefinition } from '@/utils/construction/infantry/libraryMapping';
import {
  serializeCustomUnitState,
  serializeCustomVehicleState,
  serializeCustomAerospaceState,
  serializeCustomSmallUnitState,
} from '@/utils/serialization/CustomUnitSerializer';
import { serializePortableUnitDocument } from '@/utils/serialization/portableUnitDocument';
import { getEraForYear } from '@/utils/temporal/eraUtils';

export const PORTABLE_EXAMPLE_SOURCES = {
  battlemechs: 'battlemechs/2-star-league/standard/Atlas AS7-D.json',
  vehicles: 'vehicles/Scorpion Light Tank.json',
  aerospace: 'aerospace/Chippewa CHP-W5.json',
  capital: 'capital/Invader JumpShip (2631).json',
  battlearmor: 'battlearmor/Achileus Light Battle Armor (WoB)(Sqd4).json',
  infantry: 'infantry/bandit-motorized-point-rifle.json',
  protomechs: 'protomechs/Basilisk.json',
} as const satisfies Record<UnitFamily, string>;

function savedDefinition(source: IUnitContract, family: UnitFamily) {
  if (!source.chassis || !source.year)
    throw new Error('Example requires catalog identity and year');
  const era = getEraForYear(source.year);
  if (!era) throw new Error('Example requires a known era');
  const identity = {
    id: source.id,
    chassis: source.chassis,
    variant: source.model ?? '',
    era,
  };
  switch (family) {
    case 'battlemechs':
      return serializeCustomUnitState(
        new UnitLoaderService().mapToUnitState(parseUnit(source), false),
        identity,
      );
    case 'vehicles':
      return serializeCustomVehicleState(mapToVehicleState(source), identity);
    case 'aerospace':
      if (!isDefinitionForFamily('aerospace', source))
        throw new Error('Example family mismatch');
      return serializeCustomAerospaceState(
        mapAerospaceDefinitionToState(source),
        identity,
      );
    case 'infantry':
      return serializeCustomSmallUnitState(
        { ...createDefaultInfantryState(), ...mapInfantryDefinition(source) },
        identity,
      );
    case 'protomechs': {
      const state = mapProtoMechDefinitionToState(source);
      return serializeCustomSmallUnitState(
        {
          ...state,
          equipment: state.equipment.map((mount, i) => ({
            ...mount,
            id: `mount-${i}`,
          })),
        },
        identity,
      );
    }
    case 'battlearmor': {
      const state = mapBattleArmorDefinitionToState(source);
      return serializeCustomSmallUnitState(
        {
          ...state,
          equipment: state.equipment.map((mount, i) => ({
            ...mount,
            id: `mount-${i}`,
          })),
        },
        identity,
      );
    }
    // Capital has no editable store; preserve its validated construction directly.
    case 'capital':
      return source;
  }
}

export async function generatePortableUnitExamples(): Promise<
  Record<UnitFamily, string>
> {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  return Object.fromEntries(
    UNIT_FAMILIES.map((family) => {
      const sourcePath = PORTABLE_EXAMPLE_SOURCES[family];
      const bytes = fs.readFileSync(
        path.join(process.cwd(), 'public/data/units', sourcePath),
      );
      const source = UnitContract.parse(JSON.parse(bytes.toString('utf8')));
      const definition = {
        ...savedDefinition(source, family),
        'org.mekstation:example': {
          source: sourcePath,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
      };
      const formatted = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), 'node_modules/oxfmt/bin/oxfmt'),
          '--stdin-filepath',
          `${family}.json`,
        ],
        {
          input: serializePortableUnitDocument(definition, {
            id: source.id,
            family,
          }),
          encoding: 'utf8',
        },
      );
      if (formatted.status !== 0)
        throw new Error(formatted.stderr || 'Example formatting failed');
      return [family, formatted.stdout];
    }),
  ) as Record<UnitFamily, string>;
}

if (require.main === module) {
  generatePortableUnitExamples()
    .then((examples) => {
      const directory = path.join(process.cwd(), 'docs/data/examples');
      const check = process.argv.includes('--check');
      if (!check) fs.mkdirSync(directory, { recursive: true });
      for (const family of UNIT_FAMILIES) {
        const file = path.join(directory, `${family}.json`);
        if (check) {
          if (fs.readFileSync(file, 'utf8') !== examples[family])
            throw new Error(`Example drift: ${family}`);
        } else fs.writeFileSync(file, examples[family]);
      }
    })
    .catch((error: unknown) => {
      process.stderr.write(String(error) + '\n');
      process.exitCode = 1;
    });
}
