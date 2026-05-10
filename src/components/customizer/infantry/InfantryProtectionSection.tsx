import React from 'react';

import type {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';

import { customizerStyles as cs } from '../styles';

interface InfantryProtectionSectionProps {
  readOnly: boolean;
  armorKit: InfantryArmorKit;
  armorKitOptions: readonly InfantryArmorKit[];
  specialization: InfantrySpecialization;
  specializationOptions: readonly InfantrySpecialization[];
  hasAntiMechTraining: boolean;
  showSneakSuitError: boolean;
  setArmorKit: (kit: InfantryArmorKit) => void;
  setSpecialization: (specialization: InfantrySpecialization) => void;
  setAntiMechTraining: (enabled: boolean) => void;
}

export function InfantryProtectionSection({
  readOnly,
  armorKit,
  armorKitOptions,
  specialization,
  specializationOptions,
  hasAntiMechTraining,
  showSneakSuitError,
  setArmorKit,
  setSpecialization,
  setAntiMechTraining,
}: InfantryProtectionSectionProps): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Protection & Specialization</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className={cs.text.label}>Armor Kit</label>
          <select
            value={armorKit}
            onChange={(event) =>
              !readOnly && setArmorKit(event.target.value as InfantryArmorKit)
            }
            disabled={readOnly}
            className={cs.select.full}
          >
            {armorKitOptions.map((kit) => (
              <option key={kit} value={kit}>
                {kit}
              </option>
            ))}
          </select>
          {showSneakSuitError && (
            <p className="mt-1 text-xs text-red-400">
              Sneak suits require Foot motive (VAL-INF-ARMOR-KIT)
            </p>
          )}
        </div>
        <div>
          <label className={cs.text.label}>Specialization</label>
          <select
            value={specialization}
            onChange={(event) =>
              !readOnly &&
              setSpecialization(event.target.value as InfantrySpecialization)
            }
            disabled={readOnly}
            className={cs.select.full}
          >
            {specializationOptions.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={hasAntiMechTraining}
              onChange={(event) =>
                !readOnly && setAntiMechTraining(event.target.checked)
              }
              disabled={readOnly}
              className="border-border-theme bg-surface-raised rounded"
            />
            <span className="text-sm text-white">Anti-Mech Training</span>
          </label>
        </div>
      </div>
    </div>
  );
}
