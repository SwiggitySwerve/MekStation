import React from 'react';

import { ArmorPipRail } from './ArmorPipRail';
import { LOCATION_NAMES, getStatusColor } from './recordSheet.helpers';

// =============================================================================
// Location Status Row
// =============================================================================

interface LocationStatusRowProps {
  location: string;
  armor: number;
  maxArmor: number;
  structure: number;
  maxStructure: number;
  destroyed: boolean;
  rearArmor?: number;
  maxRearArmor?: number;
  /**
   * Per `add-damage-feedback-ui` task 2.4: monotonic count of
   * `DamageApplied` events this unit has absorbed at this location.
   * Each increment triggers a sequential animation — armor rail
   * flashes first (0ms delay, 400ms flash), then the structure rail
   * flashes when the armor flash completes (400ms delay, 400ms flash)
   * so total animation time stays under the 900ms spec budget.
   *
   * Per spec scenario "Unselected unit's damage does not animate" the
   * parent (`RecordSheetDisplay`) only passes a non-zero count for
   * the currently-selected unit — unselected units see no counter
   * increment because the parent keys the projection by unitId.
   */
  damageHitCount?: number;
}

export function LocationStatusRow({
  location,
  armor,
  maxArmor,
  structure,
  maxStructure,
  destroyed,
  rearArmor,
  maxRearArmor,
  damageHitCount = 0,
}: LocationStatusRowProps): React.ReactElement {
  const displayName = LOCATION_NAMES[location] || location;
  const armorColor = getStatusColor(armor, maxArmor);
  const structureColor = getStatusColor(structure, maxStructure);
  const rearArmorColor =
    rearArmor !== undefined && maxRearArmor !== undefined
      ? getStatusColor(rearArmor, maxRearArmor)
      : '';

  return (
    <div
      className={`px-3 py-2 md:px-2 md:py-1 ${destroyed ? 'line-through opacity-50' : ''}`}
      data-testid={`location-row-${location}`}
    >
      <div className="md:flex md:items-center">
        <div className="mb-1 flex items-center justify-between md:mb-0 md:w-28">
          <span className="text-text-theme-primary text-base font-medium md:text-sm">
            {displayName}
          </span>
          {destroyed && (
            <span
              className="text-xs font-bold text-red-600 md:hidden"
              data-testid={`location-destroyed-${location}-mobile`}
            >
              DESTROYED
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:flex md:flex-1 md:items-center md:gap-4">
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              AR:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${armorColor}`}
              data-testid={`location-armor-${location}`}
            >
              {armor}/{maxArmor}
            </span>
          </div>
          {rearArmor !== undefined && maxRearArmor !== undefined ? (
            <div className="flex items-center gap-1">
              <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
                RR:
              </span>
              <span
                className={`font-mono text-base md:w-8 md:text-right md:text-sm ${rearArmorColor}`}
                data-testid={`location-armor-${location}_rear`}
              >
                {rearArmor}/{maxRearArmor}
              </span>
            </div>
          ) : (
            <div className="md:hidden" />
          )}
          <div className="flex items-center gap-1">
            <span className="text-text-theme-secondary text-sm md:w-6 md:text-xs">
              IS:
            </span>
            <span
              className={`font-mono text-base md:w-8 md:text-right md:text-sm ${structureColor}`}
              data-testid={`location-structure-${location}`}
            >
              {structure}/{maxStructure}
            </span>
          </div>
        </div>

        {destroyed && (
          <span
            className="ml-2 hidden text-xs font-bold text-red-600 md:inline"
            data-testid={`location-destroyed-${location}`}
          >
            DESTROYED
          </span>
        )}
      </div>

      {/*
        Per § 5.1 the panel renders armor pips for every location so
        players can see remaining protection at a glance without
        parsing numbers. The numeric row above is preserved because
        many players (and existing tests) key on it directly.
      */}
      <div
        className="mt-1 flex flex-col gap-0.5"
        data-testid={`location-pips-${location}`}
      >
        {/*
          Per task 2.4: armor rail flashes first on a DamageApplied
          hit (0ms delay), then the structure rail flashes 400ms
          later. Total animation time is 400ms (armor) + 400ms
          (structure) = 800ms, inside the 900ms spec budget. The
          rear-armor rail shares the armor flash window because
          rear damage is still "armor" damage for animation purposes
          (structure comes after all armor is depleted).
        */}
        <ArmorPipRail
          label="AR"
          current={armor}
          max={maxArmor}
          destroyed={destroyed}
          kind="armor"
          testId={`armor-pips-${location}`}
          flashCount={damageHitCount}
          flashDelayMs={0}
        />
        {rearArmor !== undefined && maxRearArmor !== undefined && (
          <ArmorPipRail
            label="RR"
            current={rearArmor}
            max={maxRearArmor}
            destroyed={destroyed}
            kind="armor"
            testId={`armor-pips-${location}_rear`}
            flashCount={damageHitCount}
            flashDelayMs={0}
          />
        )}
        <ArmorPipRail
          label="IS"
          current={structure}
          max={maxStructure}
          destroyed={destroyed}
          kind="structure"
          testId={`structure-pips-${location}`}
          flashCount={damageHitCount}
          flashDelayMs={400}
        />
      </div>
    </div>
  );
}
