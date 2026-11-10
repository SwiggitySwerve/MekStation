import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';

import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';

import { TargetedSaveUnitDialog } from '@/components/customizer/tabs/MultiUnitTabs';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { importMTFDefinition } from '@/services/units/importMTFDefinition';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import {
  UnitLoaderService,
  unitLoaderService,
} from '@/services/units/unitLoaderService/unitLoader';
import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
} from '@/stores/unit/unitEditSnapshot';
import {
  clearAllStores,
  createUnitFromFullState,
} from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { UnitStoreContext } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { Era } from '@/types/temporal/Era';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import zeus from '../../../../../public/data/units/battlemechs/4-clan-invasion/standard/Zeus-X ZEU-X.json';
import mtfSources from '../../../../services/conversion/__tests__/MTFParser.pinned-sources.json';
import { EditorLoadDiagnostics } from '../UnrecoveredCriticalSlotsNotice';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: jest.fn(async () => ({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    })),
    buildFullName: (chassis: string, variant: string) =>
      `${chassis} ${variant}`,
  },
}));
// Isolate the save-loss gate from independent construction errors in catalog units.
jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: () => ({
    isValid: true,
    isLoading: false,
    isValidating: false,
    errorCount: 0,
  }),
}));
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
afterEach(() => {
  jest.restoreAllMocks();
  clearAllStores();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  localStorage.clear();
});

const cases = [
  ['HEAVY_INDUSTRIAL', '2-star-league/advanced/Copper CPK-19 SecurityMech'],
  ['PRIMITIVE', '1-age-of-war/experimental/Gladiator GLD-1R'],
  ['INDUSTRIAL', '1-age-of-war/advanced/DemolitionMech WI-DM'],
  ['IMPACT_RESISTANT', '6-dark-age/experimental/Storm Raider STM-R4'],
  ['PATCHWORK', '4-clan-invasion/standard/Zeus-X ZEU-X'],
  ['HEAT_DISSIPATING', '6-dark-age/experimental/Striker STC-2L'],
  ['ANTI_PENETRATIVE_ABLATION', '6-dark-age/experimental/Nyx NX-110'],
] as const;

function open(file: string, sourceOnlyDraft = false) {
  const source = parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${file}.json`),
        'utf8',
      ),
    ),
  );
  return openSource(source, 'canonical', sourceOnlyDraft);
}

function openSource(
  source: IRawSerializedUnit,
  sourceKind: 'canonical' | 'custom',
  sourceOnlyDraft = false,
) {
  const state = new UnitLoaderService().mapToUnitState(source, true, {
    source: sourceKind,
    id: source.id,
  });
  if (sourceOnlyDraft) {
    jest
      .spyOn(unitLoaderService, 'loadCanonicalUnit')
      .mockResolvedValue({ success: true, state });
  }
  const store = createUnitFromFullState(state);
  if (sourceOnlyDraft)
    store.setState({
      bvContext: undefined,
      sourceDefinition: { source: 'canonical', id: source.id },
    });
  useTabManagerStore.setState({
    tabs: [
      {
        id: state.id,
        name: state.name,
        tonnage: state.tonnage,
        techBase: state.techBase,
        unitType: state.unitType,
      },
    ],
    activeTabId: state.id,
  });
  const onSave = jest.fn();
  function Editor() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <UnitStoreContext.Provider value={store}>
        <EditorLoadDiagnostics />
        <button onClick={() => setIsOpen(true)}>Begin save</button>
        <TargetedSaveUnitDialog
          isOpen={isOpen}
          initialChassis={state.chassis}
          initialVariant={state.model}
          currentUnitId={state.id}
          onSave={onSave}
          onCancel={() => setIsOpen(false)}
        />
      </UnitStoreContext.Provider>
    );
  }
  render(<Editor />);
  return {
    store,
    source,
    onSave,
    openSaveDialog: () =>
      fireEvent.click(screen.getByRole('button', { name: 'Begin save' })),
  };
}

it.each(cases)(
  'warns and requires confirmation before %s armor is lost',
  async (type, file) => {
    const { store, source, onSave, openSaveDialog } = open(file);
    const before = store.getState();
    expect(source.armor?.type).toBe(type);
    expect(before.sourceDefinition).toEqual({
      source: 'canonical',
      id: source.id,
    });
    expect(before.armorType).toBe(ArmorTypeEnum.STANDARD);
    // The editor warning is visible before opening any save UI or taking a save action.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
    const draft = getUnitDraftFingerprint(before),
      library = getUnitLibraryFingerprint(before);
    const warnings = screen.getAllByRole('note', {
      name: 'Armor configuration lost on save',
    });
    expect(warnings).toHaveLength(1);
    for (const warning of warnings) {
      expect(warning).toHaveTextContent(
        `Armor type ${type} is not kept; this design is shown and will be saved with Standard armor, so its displayed weight and BV may differ from the original.`,
      );
      expect(warning).toHaveTextContent(
        type === 'PATCHWORK'
          ? 'BV can change after saving and reopening.'
          : 'Effect on the unit not established.',
      );
    }
    if (type === 'PATCHWORK') {
      expect(
        within(warnings[0])
          .getAllByRole('listitem')
          .map((item) => item.textContent),
      ).toEqual([
        'Left Arm: REACTIVE',
        'Right Arm: REACTIVE',
        'Left Torso: STANDARD',
        'Right Torso: STANDARD',
        'Center Torso: STANDARD',
        'Head: STANDARD',
        'Left Leg: REACTIVE',
        'Right Leg: REACTIVE',
      ]);
    }
    if (type === 'PRIMITIVE') {
      expect(before.unrecoveredCriticalSlots).toEqual([]);
      expect(
        screen.queryByRole('note', {
          name: 'Critical-slot entries lost on save',
        }),
      ).toBeNull();
    }
    openSaveDialog();
    expect(
      screen.getAllByRole('note', {
        name: 'Armor configuration lost on save',
      }),
    ).toHaveLength(2);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      screen.getByRole('dialog', { name: 'Save with armor loss?' }),
    ).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState()).toBe(before);
    expect(getUnitDraftFingerprint(store.getState())).toBe(draft);
    expect(getUnitLibraryFingerprint(store.getState())).toBe(library);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = serializeCustomUnitState(before, {
      id: 'armor-roundtrip',
      chassis: before.chassis,
      variant: before.model,
      era: Era.LATE_SUCCESSION_WARS,
    });
    expect(saved.armor.type).toBe('STANDARD');
    expect(saved.armor).not.toHaveProperty('typeByLocation');
    const reopened = new UnitLoaderService().mapToUnitState(
      parseUnit(saved),
      false,
    );
    expect(reopened.bvContext?.source.armor?.type).toBe('STANDARD');
  },
);

it('shows no armor warning or confirmation for supported Standard armor', async () => {
  const { onSave, openSaveDialog } = open(
    '3-succession-wars/standard/King Crab KGC-0000',
  );
  expect(
    screen.queryByRole('note', { name: 'Armor configuration lost on save' }),
  ).toBeNull();
  openSaveDialog();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Save anyway' })).toBeNull();
});

it('Striker STC-2L keeps armor loss after its native marker cells are recovered', async () => {
  const { store, source, onSave, openSaveDialog } = open(
    '6-dark-age/experimental/Striker STC-2L',
  );
  expect(source.id).toBe('striker-stc-2l');
  expect(source.armor?.type).toBe('HEAT_DISSIPATING');
  expect(store.getState().unrecoveredCriticalSlots).toEqual([]);
  expect(
    store
      .getState()
      .equipment.filter((item) => item.name === 'IS Heat-Dissipating'),
  ).toHaveLength(6);
  function expectArmorConsequence(container: HTMLElement) {
    const scope = within(container);
    const armor = scope.getByRole('note', {
      name: 'Armor configuration lost on save',
    });
    expect(
      within(armor).getByText(
        'Armor type HEAT_DISSIPATING is not kept; this design is shown and will be saved with Standard armor, so its displayed weight and BV may differ from the original.',
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      scope.queryByRole('note', {
        name: 'Critical-slot entries lost on save',
      }),
    ).toBeNull();
  }
  expect(screen.queryByRole('dialog')).toBeNull();
  expectArmorConsequence(document.body);
  expect(onSave).not.toHaveBeenCalled();
  openSaveDialog();
  expectArmorConsequence(screen.getByRole('dialog', { name: 'Save Unit' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expectArmorConsequence(
    screen.getByRole('dialog', { name: 'Save with armor loss?' }),
  );
  expect(screen.getByRole('button', { name: 'Save anyway' })).toBeVisible();
  expect(onSave).not.toHaveBeenCalled();
});

it('proves Patchwork source identity and per-location types are lost on save/reopen', () => {
  const loader = new UnitLoaderService();
  const state = loader.mapToUnitState(parseUnit(zeus), true);
  expect(state.bvContext?.source.armor?.typeByLocation).toEqual(
    zeus.armor.typeByLocation,
  );
  const saved = serializeCustomUnitState(state, {
    id: zeus.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.LATE_SUCCESSION_WARS,
  });
  const reopened = loader.mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(saved))),
    false,
  );
  expect(reopened.bvContext?.source.armor?.type).toBe('STANDARD');
  expect(reopened.bvContext?.source.armor).not.toHaveProperty('typeByLocation');
  // This is the whole real round trip, not an assertion that armor alone causes
  // its entire BV delta. Root's isolated/data-splice evidence is cited by the owner.
  expect(calculateUnitBV(saved, zeus.id).bv).not.toBe(
    calculateUnitBV(zeus, zeus.id).bv,
  );
});

it('updates the warning when the user selects a different supported armor type', async () => {
  const { store, onSave, openSaveDialog } = open(
    '1-age-of-war/experimental/Gladiator GLD-1R',
  );
  expect(
    screen.getAllByRole('note', { name: 'Armor configuration lost on save' }),
  ).toHaveLength(1);
  act(() => store.getState().setArmorType(ArmorTypeEnum.REACTIVE));
  expect(
    screen.queryByRole('note', { name: 'Armor configuration lost on save' }),
  ).toBeNull();
  openSaveDialog();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onSave).toHaveBeenCalledTimes(1);
});

it('refreshes armor source for a catalog draft even when its critical-slot list is known empty', async () => {
  const { store, openSaveDialog } = open(
    '1-age-of-war/experimental/Gladiator GLD-1R',
    true,
  );
  const before = getUnitDraftFingerprint(store.getState());
  await waitFor(() =>
    expect(
      screen.getAllByRole('note', { name: 'Armor configuration lost on save' }),
    ).toHaveLength(1),
  );
  expect(unitLoaderService.loadCanonicalUnit).toHaveBeenCalledTimes(1);
  expect(store.getState().bvContext).toBeUndefined();
  expect(getUnitDraftFingerprint(store.getState())).toBe(before);
  openSaveDialog();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('button', { name: 'Save anyway' })).toBeVisible();
});

// Append Heat-Dissipating here when #3345 lands; Heavy Industrial is already
// accepted by main's parser and exercises the same real custom-source path.
it.each([['Heavy Industrial', 'HEAVY_INDUSTRIAL']] as const)(
  'warns on open after importing %s MTF armor, before any save action',
  async (mtfArmor, type) => {
    const mtf = Buffer.from(mtfSources.rows[0].base64, 'base64')
      .toString('utf8')
      .replace(/^Armor:.*$/im, `Armor:${mtfArmor}`);
    const imported = await importMTFDefinition(mtf);
    if (!imported.success) throw new Error(imported.error.message);
    const source = parseUnit(imported.data.definition);
    const { store, onSave, openSaveDialog } = openSource(source, 'custom');
    expect(store.getState().sourceDefinition).toEqual({
      source: 'custom',
      id: source.id,
    });
    expect(store.getState().bvContext?.source.armor?.type).toBe(type);
    expect(store.getState().armorType).toBe(ArmorTypeEnum.STANDARD);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('note', { name: 'Armor configuration lost on save' }),
    ).toHaveTextContent(
      `Armor type ${type} is not kept; this design is shown and will be saved with Standard armor, so its displayed weight and BV may differ from the original.`,
    );
    expect(onSave).not.toHaveBeenCalled();
    openSaveDialog();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('button', { name: 'Save anyway' })).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  },
);
