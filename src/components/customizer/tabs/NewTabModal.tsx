import React, { useMemo, useState } from 'react';

import { UNIT_TEMPLATES, UnitTemplate } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  AEROSPACE_TEMPLATES,
  BATTLE_ARMOR_TEMPLATES,
  INFANTRY_TEMPLATES,
  PROTOMECH_TEMPLATES,
  VEHICLE_TEMPLATES,
  type AerospaceTemplate,
  type BattleArmorTemplate,
  type CreationMode,
  type InfantryTemplate,
  type ProtoMechTemplate,
  type SupportedUnitType,
  type VehicleTemplate,
} from './NewTabModal.constants';
import { NewTabModalNewMode } from './NewTabModalNewMode';

interface NewTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUnit: (
    tonnage: number,
    techBase?: TechBase,
    unitType?: UnitType,
  ) => string;
}

export function NewTabModal({
  isOpen,
  onClose,
  onCreateUnit,
}: NewTabModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<CreationMode>('new');
  const [unitType, setUnitType] = useState<SupportedUnitType>(
    UnitType.BATTLEMECH,
  );
  const [selectedMechTemplate, setSelectedMechTemplate] =
    useState<UnitTemplate>(UNIT_TEMPLATES[1]);
  const [selectedVehicleTemplate, setSelectedVehicleTemplate] =
    useState<VehicleTemplate>(VEHICLE_TEMPLATES[1]);
  const [selectedAerospaceTemplate, setSelectedAerospaceTemplate] =
    useState<AerospaceTemplate>(AEROSPACE_TEMPLATES[1]);
  const [selectedBattleArmorTemplate, setSelectedBattleArmorTemplate] =
    useState<BattleArmorTemplate>(BATTLE_ARMOR_TEMPLATES[0]);
  const [selectedInfantryTemplate, setSelectedInfantryTemplate] =
    useState<InfantryTemplate>(INFANTRY_TEMPLATES[0]);
  const [selectedProtoMechTemplate, setSelectedProtoMechTemplate] =
    useState<ProtoMechTemplate>(PROTOMECH_TEMPLATES[1]);
  const [techBase, setTechBase] = useState<TechBase>(TechBase.INNER_SPHERE);

  const selectedTonnage = useMemo(() => {
    switch (unitType) {
      case UnitType.BATTLEMECH:
        return selectedMechTemplate.tonnage;
      case UnitType.VEHICLE:
        return selectedVehicleTemplate.tonnage;
      case UnitType.AEROSPACE:
        return selectedAerospaceTemplate.tonnage;
      case UnitType.BATTLE_ARMOR:
      case UnitType.INFANTRY:
        return 0;
      case UnitType.PROTOMECH:
        return selectedProtoMechTemplate.tonnage;
      default:
        return 50;
    }
  }, [
    unitType,
    selectedMechTemplate,
    selectedVehicleTemplate,
    selectedAerospaceTemplate,
    selectedProtoMechTemplate,
  ]);

  const effectiveTechBase = useMemo(() => {
    if (unitType === UnitType.PROTOMECH) {
      return TechBase.CLAN;
    }
    if (
      unitType === UnitType.BATTLE_ARMOR &&
      selectedBattleArmorTemplate.techBase === TechBase.CLAN
    ) {
      return TechBase.CLAN;
    }
    return techBase;
  }, [unitType, techBase, selectedBattleArmorTemplate]);

  if (!isOpen) {
    return null;
  }

  const handleCreate = () => {
    onCreateUnit(selectedTonnage, effectiveTechBase, unitType);
    onClose();
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface-base border-border-theme-subtle mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border shadow-xl">
        <div className="border-border-theme-subtle bg-surface-base sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Create New Unit</h2>
          <button
            onClick={onClose}
            className="text-text-theme-secondary transition-colors hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="border-border-theme-subtle flex border-b">
          {(['new', 'copy', 'import'] as CreationMode[]).map((tabMode) => (
            <button
              key={tabMode}
              onClick={() => setMode(tabMode)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === tabMode
                  ? 'bg-blue-600 text-white'
                  : 'text-text-theme-secondary hover:bg-surface-raised hover:text-white'
              }`}
            >
              {tabMode === 'new' && 'New Unit'}
              {tabMode === 'copy' && 'Copy Current'}
              {tabMode === 'import' && 'Import Data'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {mode === 'new' && (
            <NewTabModalNewMode
              unitType={unitType}
              setUnitType={setUnitType}
              selectedMechTemplate={selectedMechTemplate}
              setSelectedMechTemplate={setSelectedMechTemplate}
              selectedVehicleTemplate={selectedVehicleTemplate}
              setSelectedVehicleTemplate={setSelectedVehicleTemplate}
              selectedAerospaceTemplate={selectedAerospaceTemplate}
              setSelectedAerospaceTemplate={setSelectedAerospaceTemplate}
              selectedBattleArmorTemplate={selectedBattleArmorTemplate}
              setSelectedBattleArmorTemplate={setSelectedBattleArmorTemplate}
              selectedInfantryTemplate={selectedInfantryTemplate}
              setSelectedInfantryTemplate={setSelectedInfantryTemplate}
              selectedProtoMechTemplate={selectedProtoMechTemplate}
              setSelectedProtoMechTemplate={setSelectedProtoMechTemplate}
              techBase={techBase}
              setTechBase={setTechBase}
            />
          )}

          {mode === 'copy' && (
            <div className="text-text-theme-secondary py-8 text-center">
              <p>Creates a copy of the currently active unit.</p>
              <p className="mt-2 text-sm">
                Select this option when you want to create a variant.
              </p>
            </div>
          )}

          {mode === 'import' && (
            <div className="text-text-theme-secondary py-8 text-center">
              <p>Import from MTF, SSW, or MegaMek formats.</p>
              <p className="mt-2 text-sm">(Coming soon)</p>
            </div>
          )}
        </div>

        <div className="border-border-theme-subtle flex justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={mode === 'import'}
            className="bg-accent hover:bg-accent-hover rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Unit
          </button>
        </div>
      </div>
    </div>
  );
}
