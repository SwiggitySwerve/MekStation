/**
 * Aerospace Structure Tab — Chassis Section
 *
 * Sub-type, tonnage, tech base display, and OmniFighter toggle.
 * Extracted from AerospaceStructureTab.tsx during section decomposition.
 */

import React, { useCallback, useMemo } from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import { customizerStyles as cs } from '../styles';
import { SelectOptions, toSelectOptions } from '../tabs/SelectOptions';
import {
  SMALL_CRAFT_TONNAGE_OPTIONS,
  SUBTYPE_OPTIONS,
  TONNAGE_OPTIONS,
} from './AerospaceStructureTab.constants';

interface ChassisSectionProps {
  readOnly: boolean;
}

export function ChassisSection({
  readOnly,
}: ChassisSectionProps): React.ReactElement {
  const tonnage = useAerospaceStore((s) => s.tonnage);
  const techBase = useAerospaceStore((s) => s.techBase);
  const aerospaceSubType = useAerospaceStore((s) => s.aerospaceSubType);
  const isOmni = useAerospaceStore((s) => s.isOmni);

  const setTonnage = useAerospaceStore((s) => s.setTonnage);
  const setAerospaceSubType = useAerospaceStore((s) => s.setAerospaceSubType);
  const setIsOmni = useAerospaceStore((s) => s.setIsOmni);

  const isSmallCraft = aerospaceSubType === AerospaceSubType.SMALL_CRAFT;

  // Which tonnage options to show based on sub-type
  const tonnageOptions = useMemo(
    () => (isSmallCraft ? SMALL_CRAFT_TONNAGE_OPTIONS : TONNAGE_OPTIONS),
    [isSmallCraft],
  );
  const tonnageSelectOptions = useMemo(
    () => toSelectOptions(tonnageOptions, (t) => `${t} tons`),
    [tonnageOptions],
  );

  const handleTonnageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTonnage(Number(e.target.value));
    },
    [setTonnage],
  );

  const handleSubTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setAerospaceSubType(e.target.value as AerospaceSubType);
    },
    [setAerospaceSubType],
  );

  return (
    <section data-testid="aerospace-chassis-section">
      <h3 className={cs.text.sectionTitle}>Chassis</h3>

      {/* Sub-Type */}
      <div className="mb-4">
        <label className={cs.text.label}>Unit Sub-Type</label>
        <select
          value={aerospaceSubType}
          onChange={handleSubTypeChange}
          disabled={readOnly}
          className={`${cs.select.full} mt-1`}
          data-testid="aerospace-subtype-select"
        >
          <SelectOptions options={SUBTYPE_OPTIONS} />
        </select>
      </div>

      {/* Tonnage */}
      <div className="mb-4">
        <label className={cs.text.label}>Tonnage</label>
        <select
          value={tonnage}
          onChange={handleTonnageChange}
          disabled={readOnly}
          className={`${cs.select.full} mt-1`}
          data-testid="aerospace-tonnage-select"
        >
          <SelectOptions options={tonnageSelectOptions} />
        </select>
      </div>

      {/* Tech Base (read-only display) */}
      <div className="mb-4">
        <label className={cs.text.label}>Tech Base</label>
        <div
          className={`${cs.input.full} bg-surface-base mt-1 cursor-not-allowed`}
        >
          {techBase === TechBase.INNER_SPHERE ? 'Inner Sphere' : 'Clan'}
        </div>
      </div>

      {/* OmniFighter Toggle */}
      <div className="mb-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isOmni}
            onChange={(e) => setIsOmni(e.target.checked)}
            disabled={readOnly}
            className="h-4 w-4"
            data-testid="aerospace-omni-checkbox"
          />
          <span className={cs.text.label}>OmniFighter</span>
        </label>
        <p className="text-text-theme-secondary mt-1 text-xs">
          OmniFighters can swap pod-mounted equipment between missions
        </p>
      </div>
    </section>
  );
}
