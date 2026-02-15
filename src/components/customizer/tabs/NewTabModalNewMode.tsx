import React from 'react';

import { UNIT_TEMPLATES, UnitTemplate } from '@/stores/useMultiUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  AEROSPACE_TEMPLATES,
  BATTLE_ARMOR_TEMPLATES,
  INFANTRY_TEMPLATES,
  PROTOMECH_TEMPLATES,
  UNIT_TYPE_CONFIGS,
  VEHICLE_TEMPLATES,
  type AerospaceTemplate,
  type BattleArmorTemplate,
  type InfantryTemplate,
  type ProtoMechTemplate,
  type SupportedUnitType,
  type VehicleTemplate,
} from './NewTabModal.constants';

interface NewTabModalNewModeProps {
  unitType: SupportedUnitType;
  setUnitType: (unitType: SupportedUnitType) => void;
  selectedMechTemplate: UnitTemplate;
  setSelectedMechTemplate: (template: UnitTemplate) => void;
  selectedVehicleTemplate: VehicleTemplate;
  setSelectedVehicleTemplate: (template: VehicleTemplate) => void;
  selectedAerospaceTemplate: AerospaceTemplate;
  setSelectedAerospaceTemplate: (template: AerospaceTemplate) => void;
  selectedBattleArmorTemplate: BattleArmorTemplate;
  setSelectedBattleArmorTemplate: (template: BattleArmorTemplate) => void;
  selectedInfantryTemplate: InfantryTemplate;
  setSelectedInfantryTemplate: (template: InfantryTemplate) => void;
  selectedProtoMechTemplate: ProtoMechTemplate;
  setSelectedProtoMechTemplate: (template: ProtoMechTemplate) => void;
  techBase: TechBase;
  setTechBase: (techBase: TechBase) => void;
}

export function NewTabModalNewMode({
  unitType,
  setUnitType,
  selectedMechTemplate,
  setSelectedMechTemplate,
  selectedVehicleTemplate,
  setSelectedVehicleTemplate,
  selectedAerospaceTemplate,
  setSelectedAerospaceTemplate,
  selectedBattleArmorTemplate,
  setSelectedBattleArmorTemplate,
  selectedInfantryTemplate,
  setSelectedInfantryTemplate,
  selectedProtoMechTemplate,
  setSelectedProtoMechTemplate,
  techBase,
  setTechBase,
}: NewTabModalNewModeProps): React.ReactElement {
  return (
    <div className="space-y-4">
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
                  {Math.ceil(template.walkMP * 1.5)}/{template.jumpMP} MP
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
                  {template.squadSize * template.numberOfSquads} troops (
                  {template.numberOfSquads} squads)
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
  );
}
