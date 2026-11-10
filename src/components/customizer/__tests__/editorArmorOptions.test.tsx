/**
 * Pins the exact armor options every editor armor selector offers. Each list
 * is read from the function or constant the selector itself reads (named per
 * family below), never from a flag on the armor definitions, so this file
 * passes unchanged on the tree before the native-only armor types were added.
 *
 *   mech        ArmorTab.tsx:324          filteredOptions.armors <- useTechBaseSync.ts:217 filterArmors (:186)
 *   mech (API)  techBaseValidation.ts:299 getAvailableArmorTypes (option source for tech-base validation)
 *   mech (valid) techBaseValidation.ts:89-93 getValidArmorTypes / isArmorTypeValid / getDefaultArmorType
 *               (COMPONENT_VALIDATORS.armor, techBaseValidation.types.ts:97 <- techBaseValidation.filters.ts:74 filterArmorTypes);
 *               read by getValidatedSelections (techBaseValidation.helpers.ts:99-105)
 *   vehicle     VehicleArmorTab.tsx:143   VehicleArmorTab.constants.ts:3 ARMOR_TYPE_OPTIONS
 *   aerospace   AerospaceArmorTab.tsx:204 ARMOR_TYPE_OPTIONS (:37), read from the rendered select
 *   protomech   ProtoMechArmorTab.sections.tsx:119 PROTO_ARMOR_TYPE_OPTIONS (ProtoMechStructureTab.logic.ts:58)
 *
 * No armor-type selector exists for battle armor (BattleArmorStructureTab.tsx
 * selects chassis, weight class, motion and manipulators only), infantry (armor
 * kit, a separate vocabulary: InfantryBuildTab.logic.ts:323) or capital ships
 * (CapitalShipCustomizer.tsx:194 only displays the type).
 */
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import React from 'react';

import { AerospaceArmorTab } from '@/components/customizer/aerospace/AerospaceArmorTab';
import { PROTO_ARMOR_TYPE_OPTIONS } from '@/components/customizer/protomech/ProtoMechStructureTab.logic';
import { ARMOR_TYPE_OPTIONS as VEHICLE_ARMOR_TYPE_OPTIONS } from '@/components/customizer/vehicle/VehicleArmorTab.constants';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import { TechBase } from '@/types/enums/TechBase';
import { getAvailableArmorTypes } from '@/utils/construction/techBaseValidation';
import {
  getDefaultArmorType,
  getValidArmorTypes,
  isArmorTypeValid,
} from '@/utils/techBaseValidation';

import {
  createClanComponentTechBases,
  createISComponentTechBases,
} from '../../../__tests__/helpers/storeTestHelpers';

afterEach(cleanup);

const IS_MECH = [
  'Standard',
  'Ferro-Fibrous (IS)',
  'Ferro-Fibrous Prototype',
  'Light Ferro-Fibrous',
  'Heavy Ferro-Fibrous',
  'Stealth',
  'Reactive',
  'Reflective',
  'Hardened',
  'Ferro-Lamellor',
  'Ballistic-Reinforced',
  'Commercial',
];
const CLAN_MECH = ['Standard', 'Ferro-Fibrous (Clan)'];

describe('mech armor selector (ArmorTab.tsx:324 <- useTechBaseSync.ts:217)', () => {
  it('offers exactly this list for an Inner Sphere armor tech base', () => {
    const { result } = renderHook(() =>
      useTechBaseSync(createISComponentTechBases()),
    );
    expect(result.current.filteredOptions.armors.map((a) => a.type)).toEqual(
      IS_MECH,
    );
  });

  it('offers exactly this list for a Clan armor tech base', () => {
    const { result } = renderHook(() =>
      useTechBaseSync(createClanComponentTechBases()),
    );
    expect(result.current.filteredOptions.armors.map((a) => a.type)).toEqual(
      CLAN_MECH,
    );
  });

  // Values observed on the base tree (3e96c2283). Note the base quirk: a Clan
  // armor tech base without mixed tech already lists every type here.
  const ALL_TYPES = [
    'Standard',
    'Ferro-Fibrous (IS)',
    'Ferro-Fibrous (Clan)',
    'Ferro-Fibrous Prototype',
    'Light Ferro-Fibrous',
    'Heavy Ferro-Fibrous',
    'Stealth',
    'Reactive',
    'Reflective',
    'Hardened',
    'Ferro-Lamellor',
    'Ballistic-Reinforced',
    'Commercial',
  ];
  const IS_NO_MIXED = [
    'Standard',
    'Ferro-Fibrous (IS)',
    'Ferro-Fibrous Prototype',
    'Light Ferro-Fibrous',
    'Heavy Ferro-Fibrous',
    'Stealth',
    'Reactive',
    'Reflective',
    'Hardened',
    'Ballistic-Reinforced',
    'Commercial',
  ];
  it.each([
    [TechBase.INNER_SPHERE, false, IS_NO_MIXED],
    [TechBase.INNER_SPHERE, true, ALL_TYPES],
    [TechBase.CLAN, false, ALL_TYPES],
    [TechBase.CLAN, true, ALL_TYPES],
  ])(
    'getAvailableArmorTypes(%s, mixed=%s) (techBaseValidation.ts:299)',
    (techBase, mixed, expected) => {
      expect(getAvailableArmorTypes(techBase, mixed)).toEqual(expected);
    },
  );
});

describe('mech valid-armor validator (techBaseValidation.filters.ts:74 filterArmorTypes)', () => {
  it('lists exactly these types per tech base', () => {
    expect(getValidArmorTypes(TechBase.INNER_SPHERE)).toEqual(IS_MECH);
    expect(getValidArmorTypes(TechBase.CLAN)).toEqual(CLAN_MECH);
  });

  it('defaults to Standard and treats only listed types as valid', () => {
    expect(getDefaultArmorType(TechBase.INNER_SPHERE)).toBe('Standard');
    expect(getDefaultArmorType(TechBase.CLAN)).toBe('Standard');
    expect(
      isArmorTypeValid('Ferro-Fibrous (IS)' as never, TechBase.INNER_SPHERE),
    ).toBe(true);
    expect(isArmorTypeValid('Ferro-Fibrous (IS)' as never, TechBase.CLAN)).toBe(
      false,
    );
    expect(isArmorTypeValid('Primitive' as never, TechBase.INNER_SPHERE)).toBe(
      false,
    );
    expect(isArmorTypeValid('Patchwork' as never, TechBase.INNER_SPHERE)).toBe(
      false,
    );
  });
});

describe('vehicle armor selector (VehicleArmorTab.tsx:143)', () => {
  it('offers exactly this list', () => {
    expect(VEHICLE_ARMOR_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'Standard',
      'Ferro-Fibrous (IS)',
      'Ferro-Fibrous (Clan)',
      'Light Ferro-Fibrous',
      'Heavy Ferro-Fibrous',
      'Stealth',
      'Hardened',
      'Reactive',
      'Reflective',
      'Ferro-Lamellor',
      'Ballistic-Reinforced',
    ]);
  });
});

describe('aerospace armor selector (AerospaceArmorTab.tsx:204, rendered)', () => {
  it('offers exactly this list', () => {
    const store = createNewAerospaceStore({
      name: 'Test Fighter',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      isSmallCraft: false,
    });
    render(
      <AerospaceStoreContext.Provider value={store}>
        <AerospaceArmorTab />
      </AerospaceStoreContext.Provider>,
    );
    const select = screen.getByTestId('aerospace-armor-type-select');
    const values = Array.from(select.querySelectorAll('option')).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(values).toEqual([
      'Standard',
      'Ferro-Fibrous (IS)',
      'Ferro-Fibrous (Clan)',
      'Light Ferro-Fibrous',
      'Heavy Ferro-Fibrous',
      'Stealth',
    ]);
  });
});

describe('protomech armor selector (ProtoMechArmorTab.sections.tsx:119)', () => {
  it('offers exactly these two pinned types', () => {
    expect(PROTO_ARMOR_TYPE_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      [PROTO_ARMOR_TYPE_OPTIONS[0].value, 'Standard ProtoMech'],
      [
        PROTO_ARMOR_TYPE_OPTIONS[1].value,
        'Electric Discharge ProtoMech (Experimental)',
      ],
    ]);
    expect(PROTO_ARMOR_TYPE_OPTIONS).toHaveLength(2);
  });
});
