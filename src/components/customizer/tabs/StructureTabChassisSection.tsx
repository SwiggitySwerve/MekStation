import React from 'react';

import { BATTLEMECH_TONNAGE } from '@/services/construction/constructionConstants';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import type {
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';

interface StructureTabChassisSectionProps {
  readonly readOnly: boolean;
  readonly tonnage: number;
  readonly isSuperheavy: boolean;
  readonly isOmni: boolean;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly internalStructureType: InternalStructureType;
  readonly cockpitType: CockpitType;
  readonly heatSinkType: HeatSinkType;
  readonly heatSinkCount: number;
  readonly baseChassisHeatSinks: number;
  readonly calculations: StructureTabCalculations;
  readonly filteredOptions: StructureTabFilteredOptions;
  readonly engineRating: number;
  readonly isAtMaxEngineRating: boolean;
  readonly handleTonnageChange: (newTonnage: number) => void;
  readonly handleEngineTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleGyroTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleStructureTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleCockpitTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
  readonly handleBaseChassisHeatSinksChange: (newCount: number) => void;
}

export function StructureTabChassisSection({
  readOnly,
  tonnage,
  isSuperheavy,
  isOmni,
  engineType,
  gyroType,
  internalStructureType,
  cockpitType,
  heatSinkType,
  heatSinkCount,
  baseChassisHeatSinks,
  calculations,
  filteredOptions,
  engineRating,
  isAtMaxEngineRating,
  handleTonnageChange,
  handleEngineTypeChange,
  handleGyroTypeChange,
  handleStructureTypeChange,
  handleCockpitTypeChange,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
  handleBaseChassisHeatSinksChange,
}: StructureTabChassisSectionProps): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Chassis</h3>

      <div className={cs.layout.formStack}>
        <div className={cs.layout.field}>
          <label className={cs.text.label}>Tonnage</label>
          <div className={cs.layout.rowGap}>
            <button
              onClick={() =>
                handleTonnageChange(tonnage - BATTLEMECH_TONNAGE.step)
              }
              disabled={readOnly || tonnage <= BATTLEMECH_TONNAGE.min}
              className={cs.button.stepperMd}
            >
              -
            </button>
            <input
              type="number"
              value={tonnage}
              onChange={(e) =>
                handleTonnageChange(
                  parseInt(e.target.value, 10) || BATTLEMECH_TONNAGE.min,
                )
              }
              disabled={readOnly}
              min={BATTLEMECH_TONNAGE.min}
              max={BATTLEMECH_TONNAGE.max}
              step={BATTLEMECH_TONNAGE.step}
              className={`w-20 ${cs.input.base} text-center ${cs.input.noSpinners}`}
            />
            <button
              onClick={() =>
                handleTonnageChange(tonnage + BATTLEMECH_TONNAGE.step)
              }
              disabled={readOnly || tonnage >= BATTLEMECH_TONNAGE.max}
              className={cs.button.stepperMd}
            >
              +
            </button>
          </div>
          {isSuperheavy && (
            <div className="mt-1 rounded border border-amber-600/40 bg-amber-900/20 px-2 py-1 text-xs text-amber-300">
              Superheavy: double-slot crits, SUPERHEAVY cockpit/gyro required
            </div>
          )}
        </div>

        <div className={cs.layout.field}>
          <div className={cs.layout.rowBetween}>
            <label className={cs.text.label}>Engine</label>
            <span className={cs.text.secondary}>
              {calculations.engineWeight}t / {calculations.engineSlots} slots
            </span>
          </div>
          <select
            className={cs.select.compact}
            disabled={readOnly}
            value={engineType}
            onChange={handleEngineTypeChange}
          >
            {filteredOptions.engines.map((engine) => (
              <option key={engine.type} value={engine.type}>
                {engine.name}
              </option>
            ))}
          </select>
        </div>

        <div className={cs.layout.field}>
          <div className={cs.layout.rowBetween}>
            <label className={cs.text.label}>Gyro</label>
            <span className={cs.text.secondary}>
              {calculations.gyroWeight}t / {calculations.gyroSlots} slots
            </span>
          </div>
          <select
            className={cs.select.compact}
            disabled={readOnly}
            value={gyroType}
            onChange={handleGyroTypeChange}
          >
            {filteredOptions.gyros.map((gyro) => (
              <option key={gyro.type} value={gyro.type}>
                {gyro.name}
              </option>
            ))}
          </select>
        </div>

        <div className={cs.layout.field}>
          <div className={cs.layout.rowBetween}>
            <label className={cs.text.label}>Structure</label>
            <span className={cs.text.secondary}>
              {calculations.structureWeight}t / {calculations.structureSlots}{' '}
              slots
            </span>
          </div>
          <select
            className={cs.select.compact}
            disabled={readOnly}
            value={internalStructureType}
            onChange={handleStructureTypeChange}
          >
            {filteredOptions.structures.map((structure) => (
              <option key={structure.type} value={structure.type}>
                {structure.name}
              </option>
            ))}
          </select>
        </div>

        <div className={cs.layout.field}>
          <div className={cs.layout.rowBetween}>
            <label className={cs.text.label}>Cockpit</label>
            <span className={cs.text.secondary}>
              {calculations.cockpitWeight}t / {calculations.cockpitSlots} slots
            </span>
          </div>
          <select
            className={cs.select.compact}
            disabled={readOnly}
            value={cockpitType}
            onChange={handleCockpitTypeChange}
          >
            {filteredOptions.cockpits.map((cockpit) => (
              <option key={cockpit.type} value={cockpit.type}>
                {cockpit.name}
              </option>
            ))}
          </select>
        </div>

        <div className={cs.layout.divider}>
          <div className={cs.layout.rowBetween}>
            <span className={`text-sm ${cs.text.label}`}>Engine Rating</span>
            <span
              className={`text-sm ${isAtMaxEngineRating ? 'text-accent font-bold' : cs.text.valueHighlight}`}
            >
              {engineRating}
              {isAtMaxEngineRating && ' (MAX)'}
            </span>
          </div>
          {isAtMaxEngineRating && (
            <p className="text-accent mt-1 text-xs">
              Warning: Maximum engine rating reached. Cannot increase Walk MP
              further.
            </p>
          )}
        </div>

        <div className={`${cs.layout.divider} mt-2`}>
          <div className={cs.layout.rowBetween}>
            <h4 className="text-sm font-semibold text-slate-300">Heat Sinks</h4>
            <span className={cs.text.secondary}>
              {calculations.heatSinkWeight}t / {calculations.heatSinkSlots}{' '}
              slots
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <select
              className={`${cs.select.compact} flex-1`}
              disabled={readOnly}
              value={heatSinkType}
              onChange={handleHeatSinkTypeChange}
            >
              {filteredOptions.heatSinks.map((hs) => (
                <option key={hs.type} value={hs.type}>
                  {hs.name}
                </option>
              ))}
            </select>
            <div className="flex items-center">
              <button
                onClick={() => handleHeatSinkCountChange(heatSinkCount - 1)}
                disabled={readOnly || heatSinkCount <= 10}
                className={cs.button.stepperLeft}
              >
                -
              </button>
              <input
                type="number"
                value={heatSinkCount}
                onChange={(e) =>
                  handleHeatSinkCountChange(parseInt(e.target.value, 10) || 10)
                }
                disabled={readOnly}
                min={10}
                className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
              />
              <button
                onClick={() => handleHeatSinkCountChange(heatSinkCount + 1)}
                disabled={readOnly}
                className={cs.button.stepperRight}
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-surface-deep/50 rounded p-2">
              <div className={`text-lg font-bold ${cs.text.valuePositive}`}>
                {calculations.integralHeatSinks}
              </div>
              <div className="text-text-theme-muted text-[10px]">Free</div>
            </div>
            <div className="bg-surface-deep/50 rounded p-2">
              <div
                className={`text-lg font-bold ${calculations.externalHeatSinks > 0 ? cs.text.valueWarning : cs.text.value}`}
              >
                {calculations.externalHeatSinks}
              </div>
              <div className="text-text-theme-muted text-[10px]">External</div>
            </div>
            <div className="bg-surface-deep/50 rounded p-2">
              <div className={`text-lg font-bold ${cs.text.valueHighlight}`}>
                {calculations.totalHeatDissipation}
              </div>
              <div className="text-text-theme-muted text-[10px]">
                Dissipation
              </div>
            </div>
          </div>

          {isOmni && (
            <div className="border-border-theme-subtle mt-3 border-t pt-3">
              <div className={cs.layout.rowBetween}>
                <label className={cs.text.label}>Base Chassis Heat Sinks</label>
                <span className={cs.text.secondary}>
                  {baseChassisHeatSinks === -1
                    ? 'Auto'
                    : `${baseChassisHeatSinks} fixed`}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleBaseChassisHeatSinksChange(-1)}
                  disabled={readOnly}
                  className={`rounded px-2 py-1 text-xs ${
                    baseChassisHeatSinks === -1
                      ? 'bg-accent text-white'
                      : 'bg-surface-deep text-text-theme-muted hover:bg-surface-hover'
                  }`}
                >
                  Auto
                </button>
                <div className="flex flex-1 items-center">
                  <button
                    onClick={() =>
                      handleBaseChassisHeatSinksChange(
                        (baseChassisHeatSinks === -1
                          ? calculations.integralHeatSinks
                          : baseChassisHeatSinks) - 1,
                      )
                    }
                    disabled={readOnly || baseChassisHeatSinks <= 1}
                    className={cs.button.stepperLeft}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={
                      baseChassisHeatSinks === -1
                        ? calculations.integralHeatSinks
                        : baseChassisHeatSinks
                    }
                    onChange={(e) =>
                      handleBaseChassisHeatSinksChange(
                        parseInt(e.target.value, 10) || 10,
                      )
                    }
                    disabled={readOnly}
                    min={1}
                    max={heatSinkCount}
                    className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
                  />
                  <button
                    onClick={() =>
                      handleBaseChassisHeatSinksChange(
                        (baseChassisHeatSinks === -1
                          ? calculations.integralHeatSinks
                          : baseChassisHeatSinks) + 1,
                      )
                    }
                    disabled={
                      readOnly ||
                      (baseChassisHeatSinks !== -1 &&
                        baseChassisHeatSinks >= heatSinkCount)
                    }
                    className={cs.button.stepperRight}
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-text-theme-muted mt-1 text-[10px]">
                Heat sinks permanently fixed to the base chassis (cannot be
                pod-mounted)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
