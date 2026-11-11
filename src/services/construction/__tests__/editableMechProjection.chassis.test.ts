import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';

import { buildEditableMech } from '@/components/customizer/tabs/PreviewTab.builders';
import { normalizeUnitConfiguration } from '@/services/units/unitLoaderService/normalizeUnitConfiguration';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import {
  TechBaseComponent,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';

import {
  buildEditableMechBVInput,
  buildEditableMechProjectionInput,
  projectEditableMech,
} from '../editableMechProjection';
import { chassisDesign as design } from './editableMechProjection.chassis.test-helpers';

function bv(input: ReturnType<typeof buildEditableMechBVInput>) {
  return calculateUnitBV(input, input.id);
}

// Source headers verified at mm-data 50f7efe. All 43 are in C1's legacy Clan list,
// but their MTF says Mixed (IS Chassis). No catalog or pinned fixture is changed.
const listedISChassis = [
  [
    'archer-arc-7c',
    'public/data/units/battlemechs/6-dark-age/advanced/Archer ARC-7C.json',
  ],
  [
    'atlas-ii-as7-dk-h',
    'public/data/units/battlemechs/6-dark-age/advanced/Atlas II AS7-DK-H.json',
  ],
  [
    'atlas-iii-as7-d2',
    'public/data/units/battlemechs/6-dark-age/standard/Atlas III AS7-D2.json',
  ],
  [
    'atlas-iii-as7-d3',
    'public/data/units/battlemechs/6-dark-age/standard/Atlas III AS7-D3.json',
  ],
  [
    'avalanche-avl-1or',
    'public/data/units/battlemechs/6-dark-age/standard/Avalanche AVL-1OR.json',
  ],
  [
    'avatar-av1-or',
    'public/data/units/battlemechs/4-clan-invasion/experimental/Avatar AV1-OR.json',
  ],
  [
    'black-hawk-ku-bhku-or',
    'public/data/units/battlemechs/4-clan-invasion/standard/Black Hawk-KU BHKU-OR.json',
  ],
  [
    'blackjack-bj2-or',
    'public/data/units/battlemechs/4-clan-invasion/standard/Blackjack BJ2-OR.json',
  ],
  [
    'dervish-dv-11dk',
    'public/data/units/battlemechs/6-dark-age/experimental/Dervish DV-11DK.json',
  ],
  [
    'firestarter-fs9-or',
    'public/data/units/battlemechs/4-clan-invasion/standard/Firestarter FS9-OR.json',
  ],
  [
    'griffin-grf-6s2',
    'public/data/units/battlemechs/6-dark-age/experimental/Griffin GRF-6S2.json',
  ],
  [
    'grigori-c-grg-os-caelestis',
    'public/data/units/battlemechs/5-civil-war/standard/Grigori C-GRG-OS Caelestis.json',
  ],
  [
    'hauptmann-ha1-ot',
    'public/data/units/battlemechs/6-dark-age/experimental/Hauptmann HA1-OT.json',
  ],
  [
    'hermes-ii-her-7a',
    'public/data/units/battlemechs/6-dark-age/advanced/Hermes II HER-7A.json',
  ],
  [
    'highlander-hgn-732-jorgensson',
    'public/data/units/battlemechs/3-succession-wars/standard/Highlander HGN-732 (Jorgensson).json',
  ],
  [
    'inferno-inf-nor',
    'public/data/units/battlemechs/6-dark-age/advanced/Inferno INF-NOR.json',
  ],
  [
    'jagermech-jm7-dd',
    'public/data/units/battlemechs/6-dark-age/advanced/JagerMech JM7-DD.json',
  ],
  [
    'javelin-jvn-12n',
    'public/data/units/battlemechs/6-dark-age/advanced/Javelin JVN-12N.json',
  ],
  [
    'juliano-jln-5a',
    'public/data/units/battlemechs/6-dark-age/advanced/Juliano JLN-5A.json',
  ],
  [
    'juliano-jln-5c',
    'public/data/units/battlemechs/6-dark-age/advanced/Juliano JLN-5C.json',
  ],
  [
    'marauder-bounty-hunter-3138',
    'public/data/units/battlemechs/6-dark-age/advanced/Marauder (Bounty Hunter-3138).json',
  ],
  [
    'naja-kto-19b-ec',
    'public/data/units/battlemechs/3-succession-wars/standard/Naja KTO-19b-EC.json',
  ],
  [
    'orion-c',
    'public/data/units/battlemechs/6-dark-age/experimental/Orion C.json',
  ],
  [
    'orion-c-2',
    'public/data/units/battlemechs/6-dark-age/advanced/Orion C 2.json',
  ],
  [
    'pillager-plg-6z',
    'public/data/units/battlemechs/6-dark-age/advanced/Pillager PLG-6Z.json',
  ],
  [
    'prowler-pwr-1x1',
    'public/data/units/battlemechs/5-civil-war/standard/Prowler PWR-1X1.json',
  ],
  [
    'scarecrow-ucu-f4',
    'public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json',
  ],
  [
    'stalker-stk-9f',
    'public/data/units/battlemechs/6-dark-age/experimental/Stalker STK-9F.json',
  ],
  [
    'stealth-sth-5x',
    'public/data/units/battlemechs/5-civil-war/standard/Stealth STH-5X.json',
  ],
  [
    'strider-sr1-oh',
    'public/data/units/battlemechs/6-dark-age/experimental/Strider SR1-OH.json',
  ],
  [
    'strider-sr1-or',
    'public/data/units/battlemechs/4-clan-invasion/standard/Strider SR1-OR.json',
  ],
  [
    'sunder-sd1-of',
    'public/data/units/battlemechs/6-dark-age/experimental/Sunder SD1-OF.json',
  ],
  [
    'sunder-sd1-og',
    'public/data/units/battlemechs/6-dark-age/experimental/Sunder SD1-OG.json',
  ],
  [
    'sunder-sd1-or',
    'public/data/units/battlemechs/4-clan-invasion/standard/Sunder SD1-OR.json',
  ],
  [
    'templar-tlr1-or',
    'public/data/units/battlemechs/6-dark-age/experimental/Templar TLR1-OR.json',
  ],
  [
    'templar-iii-tlr2-od',
    'public/data/units/battlemechs/6-dark-age/standard/Templar III TLR2-OD.json',
  ],
  [
    'thug-thg-11e-reich',
    'public/data/units/battlemechs/5-civil-war/standard/Thug THG-11E (Reich).json',
  ],
  [
    'thunderbolt-tdr-12r',
    'public/data/units/battlemechs/6-dark-age/experimental/Thunderbolt TDR-12R.json',
  ],
  [
    'thunderbolt-tdr-9w',
    'public/data/units/battlemechs/4-clan-invasion/experimental/Thunderbolt TDR-9W.json',
  ],
  [
    'trebuchet-tbt-9n',
    'public/data/units/battlemechs/6-dark-age/standard/Trebuchet TBT-9N.json',
  ],
  [
    'trebuchet-tbt-9r',
    'public/data/units/battlemechs/6-dark-age/experimental/Trebuchet TBT-9R.json',
  ],
  [
    'valkyrie-vlk-qd5',
    'public/data/units/battlemechs/6-dark-age/experimental/Valkyrie VLK-QD5.json',
  ],
  [
    'xanthos-xnt-7o',
    'public/data/units/battlemechs/6-dark-age/experimental/Xanthos XNT-7O.json',
  ],
] as const;

function project(source: IRawSerializedUnit) {
  const state = normalizeUnitConfiguration(source, []);
  return buildEditableMechBVInput(
    projectEditableMech(buildEditableMechProjectionInput(state), 4),
  );
}

it('gives an unlisted explicit Mixed Clan chassis native CASE through the editor', () => {
  const input = project(design('CLAN'));
  expect(input.techBase).toBe('MIXED');
  expect(input.componentTechBases?.chassis).toBe('CLAN');
  expect(bv(input).breakdown?.explosivePenalty).toBe(0);
  expect(bv(project(design('INNER_SPHERE'))).breakdown?.explosivePenalty).toBe(
    15,
  );
});

it('does not turn the loader IS default into evidence for a legacy listed Clan design', () => {
  const source = design(undefined, 'alpha-wolf-a');
  const state = normalizeUnitConfiguration(source, []);
  expect(state.componentTechBases.chassis).toBe(TechBase.INNER_SPHERE);
  expect(state.techBaseMode).toBe(TechBaseMode.MIXED);
  const input = buildEditableMechBVInput(
    projectEditableMech(buildEditableMechProjectionInput(state), 4),
  );
  expect(input).not.toHaveProperty('componentTechBases');
  expect(bv(input)).toEqual(
    bv({ ...input, componentTechBases: { chassis: 'CLAN' } }),
  );
  expect(bv(input).breakdown?.explosivePenalty).toBe(0);
});

it.each(listedISChassis)(
  'uses explicit IS chassis instead of the legacy list for %s',
  (id, file) => {
    const definition = parseUnit(
      JSON.parse(readFileSync(join(process.cwd(), file), 'utf8')),
    );
    expect(definition.id).toBe(id);
    const input = project({
      ...definition,
      componentTechBases: {
        ...definition.componentTechBases,
        chassis: 'INNER_SPHERE',
      },
    });
    expect(input.componentTechBases?.chassis).toBe('INNER_SPHERE');
    expect(bv(input)).toEqual(
      bv({
        ...input,
        componentTechBases: { chassis: 'INNER_SPHERE' },
      }),
    );
  },
);

it('uses live chassis edits only after the source establishes explicit provenance', () => {
  const state = normalizeUnitConfiguration(design('CLAN'), []);
  const changed = {
    ...state,
    componentTechBases: {
      ...state.componentTechBases,
      [TechBaseComponent.CHASSIS]: TechBase.INNER_SPHERE,
    },
  };
  expect(
    buildEditableMechBVInput(
      projectEditableMech(buildEditableMechProjectionInput(changed), 4),
    ).componentTechBases?.chassis,
  ).toBe('INNER_SPHERE');
  expect(
    buildEditableMechBVInput(
      projectEditableMech(buildEditableMechProjectionInput(state), 4),
    ).componentTechBases?.chassis,
  ).toBe('CLAN');
});

it('does not infer chassis from structure or unrelated component technology', () => {
  const source = design(undefined);
  const state = normalizeUnitConfiguration(source, []);
  const altered = {
    ...state,
    componentTechBases: {
      ...state.componentTechBases,
      chassis: TechBase.CLAN,
      armor: TechBase.CLAN,
    },
  };
  expect(
    buildEditableMechBVInput(
      projectEditableMech(buildEditableMechProjectionInput(altered), 4),
    ),
  ).not.toHaveProperty('componentTechBases');
});

it('carries only chassis evidence into Preview without adding a full source-BV context', () => {
  const source = design('CLAN');
  const state = {
    ...normalizeUnitConfiguration(source, []),
    bvContext: undefined,
    chassisSource: source,
  };
  const mech = buildEditableMech(state, 4);
  expect(mech.bvContext).toBeUndefined();
  const input = buildEditableMechBVInput(mech);
  expect(input.techBase).toBe('MIXED');
  expect(input.componentTechBases?.chassis).toBe('CLAN');
});

it.each(['INNER_SPHERE', 'CLAN'] as const)(
  'keeps pure %s chassis behaviour without adding a component fact',
  (techBase) => {
    const input = project({ ...design(), techBase });
    expect(input.techBase).toBe(techBase);
    expect(input).not.toHaveProperty('componentTechBases');
  },
);
