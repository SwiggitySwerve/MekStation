/**
 * New Tab Modal Component
 *
 * Modal dialog for creating new unit tabs.
 * Supports all unit types: BattleMech, Vehicle, Aerospace, Battle Armor, Infantry, ProtoMech.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import React, { useState, useMemo } from 'react';

import { UNIT_TEMPLATES, UnitTemplate } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

type CreationMode = 'new' | 'copy' | 'import';

type SupportedUnitType =
  | UnitType.BATTLEMECH
  | UnitType.VEHICLE
  | UnitType.AEROSPACE
  | UnitType.BATTLE_ARMOR
  | UnitType.INFANTRY
  | UnitType.PROTOMECH;

// =============================================================================
// Templates
// =============================================================================

interface VehicleTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly cruiseMP: number;
}

interface AerospaceTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly safeThrust: number;
}

interface BattleArmorTemplate {
  readonly id: string;
  readonly name: string;
  readonly squadSize: number;
  readonly techBase: TechBase;
}

interface InfantryTemplate {
  readonly id: string;
  readonly name: string;
  readonly squadSize: number;
  readonly numberOfSquads: number;
  readonly techBase: TechBase;
}

interface ProtoMechTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
}

const VEHICLE_TEMPLATES: readonly VehicleTemplate[] = [
  {
    id: 'light-veh',
    name: 'Light Vehicle',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 6,
  },
  {
    id: 'medium-veh',
    name: 'Medium Vehicle',
    tonnage: 40,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 5,
  },
  {
    id: 'heavy-veh',
    name: 'Heavy Vehicle',
    tonnage: 60,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 4,
  },
  {
    id: 'assault-veh',
    name: 'Assault Vehicle',
    tonnage: 80,
    techBase: TechBase.INNER_SPHERE,
    cruiseMP: 3,
  },
];

const AEROSPACE_TEMPLATES: readonly AerospaceTemplate[] = [
  {
    id: 'light-aero',
    name: 'Light Fighter',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 7,
  },
  {
    id: 'medium-aero',
    name: 'Medium Fighter',
    tonnage: 45,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 5,
  },
  {
    id: 'heavy-aero',
    name: 'Heavy Fighter',
    tonnage: 75,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 4,
  },
  {
    id: 'assault-aero',
    name: 'Assault Fighter',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    safeThrust: 3,
  },
];

const BATTLE_ARMOR_TEMPLATES: readonly BattleArmorTemplate[] = [
  {
    id: 'light-ba',
    name: 'Light BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'medium-ba',
    name: 'Medium BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'heavy-ba',
    name: 'Heavy BA (4-trooper)',
    squadSize: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'clan-ba',
    name: 'Clan Elemental (5-point)',
    squadSize: 5,
    techBase: TechBase.CLAN,
  },
];

const INFANTRY_TEMPLATES: readonly InfantryTemplate[] = [
  {
    id: 'rifle-platoon',
    name: 'Rifle Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'laser-platoon',
    name: 'Laser Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'jump-platoon',
    name: 'Jump Platoon',
    squadSize: 7,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
  {
    id: 'mechanized-platoon',
    name: 'Mechanized Platoon',
    squadSize: 6,
    numberOfSquads: 4,
    techBase: TechBase.INNER_SPHERE,
  },
];

const PROTOMECH_TEMPLATES: readonly ProtoMechTemplate[] = [
  { id: 'light-proto', name: 'Light ProtoMech', tonnage: 3 },
  { id: 'medium-proto', name: 'Medium ProtoMech', tonnage: 5 },
  { id: 'heavy-proto', name: 'Heavy ProtoMech', tonnage: 7 },
  { id: 'assault-proto', name: 'Assault ProtoMech', tonnage: 9 },
];

// =============================================================================
// Unit Type Button Config
// =============================================================================

interface UnitTypeConfig {
  type: SupportedUnitType;
  label: string;
  color: string;
  activeColor: string;
}

const UNIT_TYPE_CONFIGS: UnitTypeConfig[] = [
  {
    type: UnitType.BATTLEMECH,
    label: 'BattleMech',
    color: 'amber',
    activeColor: 'border-amber-500 bg-amber-900/30 text-amber-300',
  },
  {
    type: UnitType.VEHICLE,
    label: 'Vehicle',
    color: 'cyan',
    activeColor: 'border-cyan-500 bg-cyan-900/30 text-cyan-300',
  },
  {
    type: UnitType.AEROSPACE,
    label: 'Aerospace',
    color: 'sky',
    activeColor: 'border-sky-500 bg-sky-900/30 text-sky-300',
  },
  {
    type: UnitType.BATTLE_ARMOR,
    label: 'Battle Armor',
    color: 'purple',
    activeColor: 'border-purple-500 bg-purple-900/30 text-purple-300',
  },
  {
    type: UnitType.INFANTRY,
    label: 'Infantry',
    color: 'emerald',
    activeColor: 'border-emerald-500 bg-emerald-900/30 text-emerald-300',
  },
  {
    type: UnitType.PROTOMECH,
    label: 'ProtoMech',
    color: 'rose',
    activeColor: 'border-rose-500 bg-rose-900/30 text-rose-300',
  },
];

// =============================================================================
// Component Props
// =============================================================================

interface NewTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUnit: (
    tonnage: number,
    techBase?: TechBase,
    unitType?: UnitType,
  ) => string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * New unit tab creation modal
 */
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

  // Calculate selected tonnage based on unit type
  const selectedTonnage = useMemo(() => {
    switch (unitType) {
      case UnitType.BATTLEMECH:
        return selectedMechTemplate.tonnage;
      case UnitType.VEHICLE:
        return selectedVehicleTemplate.tonnage;
      case UnitType.AEROSPACE:
        return selectedAerospaceTemplate.tonnage;
      case UnitType.BATTLE_ARMOR:
        return 0; // BA doesn't use tonnage in the same way
      case UnitType.INFANTRY:
        return 0; // Infantry doesn't use tonnage
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

  // Determine effective tech base (ProtoMech forces Clan)
  const effectiveTechBase = useMemo(() => {
    if (unitType === UnitType.PROTOMECH) return TechBase.CLAN;
    if (
      unitType === UnitType.BATTLE_ARMOR &&
      selectedBattleArmorTemplate.techBase === TechBase.CLAN
    )
      return TechBase.CLAN;
    return techBase;
  }, [unitType, techBase, selectedBattleArmorTemplate]);

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreateUnit(selectedTonnage, effectiveTechBase, unitType);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
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
        {/* Header */}
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

        {/* Mode tabs */}
        <div className="border-border-theme-subtle flex border-b">
          {(['new', 'copy', 'import'] as CreationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-text-theme-secondary hover:bg-surface-raised hover:text-white'
              }`}
            >
              {m === 'new' && 'New Unit'}
              {m === 'copy' && 'Copy Current'}
              {m === 'import' && 'Import Data'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'new' && (
            <div className="space-y-4">
              {/* Unit Type Selection - Grid of 6 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Unit Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {UNIT_TYPE_CONFIGS.map((config) => (
                    <button
                      key={config.type}
                      onClick={() => setUnitType(config.type)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        unitType === config.type
                          ? config.activeColor
                          : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template selection - BattleMechs */}
              {unitType === UnitType.BATTLEMECH && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {UNIT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedMechTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedMechTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.tonnage}t • {template.walkMP}/
                          {Math.ceil(template.walkMP * 1.5)}/{template.jumpMP}{' '}
                          MP
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - Vehicles */}
              {unitType === UnitType.VEHICLE && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VEHICLE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedVehicleTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedVehicleTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.tonnage}t • {template.cruiseMP}/
                          {Math.floor(template.cruiseMP * 1.5)} MP
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - Aerospace */}
              {unitType === UnitType.AEROSPACE && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AEROSPACE_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedAerospaceTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedAerospaceTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.tonnage}t • Thrust {template.safeThrust}/
                          {Math.floor(template.safeThrust * 1.5)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - Battle Armor */}
              {unitType === UnitType.BATTLE_ARMOR && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BATTLE_ARMOR_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedBattleArmorTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedBattleArmorTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.squadSize} troopers •{' '}
                          {template.techBase === TechBase.CLAN ? 'Clan' : 'IS'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - Infantry */}
              {unitType === UnitType.INFANTRY && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INFANTRY_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedInfantryTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedInfantryTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.squadSize * template.numberOfSquads} troops
                          ({template.numberOfSquads} squads)
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template selection - ProtoMech */}
              {unitType === UnitType.PROTOMECH && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Select Template
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROTOMECH_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedProtoMechTemplate(template)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedProtoMechTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-border-theme hover:border-border-theme-subtle'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">
                          {template.name}
                        </div>
                        <div className="text-text-theme-secondary text-xs">
                          {template.tonnage}t • Clan Tech
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech base selection (not for ProtoMech) */}
              {unitType !== UnitType.PROTOMECH && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Tech Base
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTechBase(TechBase.INNER_SPHERE)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        techBase === TechBase.INNER_SPHERE
                          ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                          : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                      }`}
                    >
                      Inner Sphere
                    </button>
                    <button
                      onClick={() => setTechBase(TechBase.CLAN)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        techBase === TechBase.CLAN
                          ? 'border-green-500 bg-green-900/30 text-green-300'
                          : 'border-border-theme text-text-theme-secondary hover:border-border-theme-subtle'
                      }`}
                    >
                      Clan
                    </button>
                  </div>
                </div>
              )}
            </div>
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

        {/* Footer */}
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
