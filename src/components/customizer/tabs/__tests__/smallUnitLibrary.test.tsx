import { cleanup, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';

import { UnitTypeRouter } from '@/components/customizer/UnitTypeRouter';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  resetCanonicalUnitService,
  getCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import {
  getBattleArmorStore,
  clearAllBattleArmorStores,
} from '@/stores/battleArmorStoreRegistry';
import { computeProtoMechBVFromState } from '@/stores/protoMechState';
import {
  getProtoMechStore,
  clearAllProtoMechStores,
} from '@/stores/protoMechStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { UnitContract } from '@/types/contracts';
import { calculateBattleArmorBVFromState } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import { loadUnitIntoTab } from '../useMultiUnitTabsController.helpers';

const read = (file: string) =>
  JSON.parse(fs.readFileSync(path.join('public', file), 'utf8'));
beforeEach(async () => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const file = decodeURIComponent(
      new URL(url, 'http://localhost').pathname,
    ).slice(1);
    return { ok: true, json: async () => read(file) } as Response;
  });
  await getEquipmentRegistry().initialize();
  resetCanonicalUnitService();
});
afterEach(() => {
  cleanup();
  clearAllProtoMechStores(true);
  clearAllBattleArmorStores(true);
  localStorage.clear();
});

it.each(['protomechs', 'battlearmor'] as const)(
  'opens real %s in its own shell with catalog figures',
  async (family) => {
    const entries = await getCanonicalUnitService().getIndex({
      family,
      strict: true,
    });
    expect(entries).toHaveLength(family === 'protomechs' ? 86 : 1188);
    const sampleIds =
      family === 'protomechs'
        ? ['centaur', 'basilisk-protomech-quad-b', 'centaur-z']
        : [
            'achileus-light-battle-armor-wobsqd4',
            'ailette-rescue-pal-sqd4',
            'fa-shih-battle-armor-2-[mg]sqd4',
          ];
    const selected =
      process.env.SMALL_CATALOG === '1'
        ? entries
        : entries.filter((entry) => sampleIds.includes(entry.id));
    expect(selected.length).toBeGreaterThan(0);
    const records: Array<{
      id: string;
      opened: boolean;
      error?: string;
      bv?: number;
    }> = [];
    for (const entry of selected) {
      try {
        const definition = UnitContract.parse(
          await getCanonicalUnitService().getById(entry.id, {
            family,
            strict: true,
          }),
        );
        const toast = jest.fn();
        const navigate = jest.fn();
        useTabManagerStore.setState({ tabs: [], activeTabId: null });
        await loadUnitIntoTab({
          unit: entry,
          source: 'canonical',
          createTab: jest.fn(),
          navigateToTab: navigate,
          setIsLoadDialogOpen: jest.fn(),
          setIsLoadingUnit: jest.fn(),
          showToast: toast,
        });
        if (toast.mock.calls.at(-1)?.[0]?.variant !== 'success')
          throw new Error(JSON.stringify(toast.mock.calls));
        expect(toast.mock.calls.at(-1)?.[0]).toMatchObject({
          variant: 'success',
        });
        const [tab] = useTabManagerStore.getState().tabs;
        expect(navigate).toHaveBeenCalledWith(tab.id);
        expect(tab.unitType).toBe(entry.unitType);
        render(
          <UnitTypeRouter
            activeTab={tab}
            activeTabId="overview"
            onTabChange={jest.fn()}
          />,
        );
        const shell = screen.getByTestId(
          family === 'protomechs'
            ? 'protomech-customizer'
            : 'battlearmor-customizer',
        );
        expect(shell).toBeInTheDocument();
        expect(
          screen.queryByTestId('customizer-workbench'),
        ).not.toBeInTheDocument();
        const status = () => shell.querySelectorAll('span');
        const expectFigure = (label: string, value: string | number) => {
          const term = [...status()].find((el) => el.textContent === label);
          expect(term?.nextElementSibling?.textContent).toBe(String(value));
        };
        if (family === 'protomechs') {
          const state = getProtoMechStore(tab.id)!.getState();
          expect(state.name).toBe(
            `${definition.chassis} ${definition.model ?? ''}`.trim(),
          );
          expect(state.techBase).toBe(
            definition.techBase === 'CLAN' ? 'Clan' : 'Inner Sphere',
          );
          expect(state.chassis).toBe(definition.chassis);
          expect(state.year).toBe(definition.year);
          expect(state.mulId).toBe(String(definition.mulId ?? -1));
          expect(state.hasMainGun).toBe(definition.hasMainGun);
          if (entry.id === 'centaur') expect(state.engineRating).toBe(45);
          if (entry.id === 'centaur-z')
            expect(state.hasMagneticClamps).toBe(true);
          if (entry.id === 'basilisk-protomech-quad-b')
            expect(state.hasMyomerBooster).toBe(true);
          expect(state.equipment.map((e) => e.equipmentId)).toEqual(
            [...(definition.equipment ?? [])].map((e) => e.name ?? e.id),
          );
          expect(state.chassisType === 'Quad').toBe(definition.isQuad);
          expect(state.chassisType === 'Glider').toBe(definition.isGlider);
          expect(state.armorType).toBe(
            definition.armor?.type === 'ELECTRIC_DISCHARGE' ? 18 : 42,
          );
          expect(state.tonnage).toBe(definition.tonnage);
          expect(state.walkMP).toBe(definition.movement?.cruiseMP);
          expect(state.jumpMP).toBe(definition.movement?.jumpMP);
          expect(
            Object.values(state.armorByLocation).reduce((a, b) => a + b, 0),
          ).toBe(
            Object.values(definition.armor?.byLocation ?? {}).reduce(
              (a, b) => a + b,
              0,
            ),
          );
          expect(state.equipment).toHaveLength(
            definition.equipment?.length ?? 0,
          );
          expectFigure('Tonnage', `${state.tonnage.toFixed(1)} t`);
          expectFigure(
            'Movement',
            `${state.walkMP}/${state.flankMP}${state.jumpMP > 0 ? `/${state.jumpMP}J` : ''}`,
          );
          expectFigure(
            'Armor',
            Object.values(state.armorByLocation).reduce((a, b) => a + b, 0),
          );
          expectFigure('BV', computeProtoMechBVFromState(state).final);
        } else {
          const state = getBattleArmorStore(tab.id)!.getState();
          expect(state.name).toBe(
            `${definition.chassis} ${definition.model ?? ''}`.trim(),
          );
          expect(state.techBase).toBe(
            definition.techBase === 'CLAN' ? 'Clan' : 'Inner Sphere',
          );
          expect(state.chassis).toBe(definition.chassis);
          expect(state.year).toBe(definition.year);
          expect(state.hasAPMount).toBe(definition.hasAntiPersonnelMount);
          if (entry.id === 'ailette-rescue-pal-sqd4')
            expect(state.hasMechanicalJumpBoosters).toBe(true);
          if (entry.id === 'fa-shih-battle-armor-2-[mg]sqd4')
            expect(state.leftManipulator).toBe('Basic/Mine Clearance');
          state.equipment.forEach((mount, i) => {
            const original = definition.equipment?.[i];
            expect(mount.unitLocation).toBe(original?.unitLocation);
            expect(mount.isAPMount).toBe(original?.isAPMMounted ?? false);
            expect(mount.equipmentId.includes(':DWP')).toBe(
              original?.isDWPMounted ?? false,
            );
            expect(mount.equipmentId.includes(':SSWM')).toBe(
              original?.isSquadSupportWeapon ?? false,
            );
          });
          expect(state.hasModularMount).toBe(definition.hasModularWeaponMount);
          expect(state.squadSize).toBe(definition.squadSize);
          if (entry.id === 'achileus-light-battle-armor-wobsqd4') {
            expect(state.armorType).toBe(33);
            expect(state.baArmorType).toBe('Stealth (Improved)');
            expect(state.leftManipulator).toBe('Basic');
          }
          expect(state.equipment.map((e) => e.name)).toEqual(
            [...(definition.equipment ?? [])].map((e) => e.name ?? e.id),
          );
          expect(state.groundMP).toBe(definition.movement?.groundMP);
          expect(state.jumpMP).toBe(definition.movement?.jumpMP);
          expect(state.armorPerTrooper).toBe(definition.armorPerTrooper);
          expect(state.equipment).toHaveLength(
            definition.equipment?.length ?? 0,
          );
          expectFigure('Troopers', state.squadSize);
          expectFigure('Armor/Trooper', state.armorPerTrooper);
          expectFigure(
            'Movement',
            `${state.groundMP}/${state.jumpMP}J/${state.umuMP}U`,
          );
          expect(state.bvBreakdown?.final).toBe(
            calculateBattleArmorBVFromState(state).final,
          );
          expectFigure('BV', state.bvBreakdown?.final ?? 'Unavailable');
          expect(Number.isFinite(state.bvBreakdown?.final)).toBe(true);
        }
        const state =
          family === 'protomechs'
            ? getProtoMechStore(tab.id)?.getState()
            : getBattleArmorStore(tab.id)?.getState();
        records.push({
          id: entry.id,
          opened: true,
          bv: state?.bvBreakdown?.final,
        });
      } catch (error) {
        records.push({ id: entry.id, opened: false, error: String(error) });
      } finally {
        cleanup();
        clearAllProtoMechStores(true);
        clearAllBattleArmorStores(true);
        localStorage.clear();
      }
    }
    if (process.env.SMALL_REPORT)
      fs.writeFileSync(
        `${process.env.SMALL_REPORT}-${family}.json`,
        JSON.stringify(records, null, 2),
      );
    expect(records.filter((record) => !record.opened)).toEqual([]);
  },
  180000,
);
