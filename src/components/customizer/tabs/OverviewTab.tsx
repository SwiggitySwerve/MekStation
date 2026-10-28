/**
 * Overview Tab Component
 *
 * Build overview for the current unit: a build summary with readiness checks
 * beside the identity fields and component technology.
 * Uses the contextual unit store - no tabId prop needed.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback } from 'react';

import type { CustomizerTabId } from '@/hooks/useCustomizerRouter';

import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import { TECH_BASE_MODE_LABELS } from '@/types/construction/TechBaseConfiguration';
import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';

import { customizerStyles as cs } from '../styles';
import { BuildSummaryCard } from './overview/BuildSummaryCard';
import { ComponentTechnologyCard } from './overview/ComponentTechnologyCard';
import { OverviewIssueSummary } from './overview/OverviewIssueSummary';
import { useBuildReadiness } from './overview/useBuildReadiness';
import { useOverviewBuildSummary } from './overview/useOverviewBuildSummary';
import { OverviewOmniControls } from './OverviewTab.omni';

// =============================================================================
// Types
// =============================================================================

interface OverviewTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Opens another customizer tab, e.g. from a readiness row. */
  onNavigate?: (tabId: CustomizerTabId) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Overview tab showing the unit's build summary and identity.
 *
 * Wide canvases put Identity and component technology on the left and the
 * build summary on the right; the technology card stretches (its rows share
 * the extra height) so both columns end on the same line. Narrow canvases
 * stack Identity first, then the build summary, then component technology,
 * so the unit's identity is on screen before the state of the build. On
 * phones a build with errors or warnings opens with a short list of what
 * needs attention (the failing readiness rows and their fix links) above
 * Identity; a passing build keeps Identity first.
 */
export function OverviewTab({
  readOnly = false,
  className = '',
  onNavigate,
}: OverviewTabProps): React.ReactElement {
  const summary = useOverviewBuildSummary();
  const readiness = useBuildReadiness(summary);

  return (
    <div className={`@container p-4 ${className}`}>
      {/* DOM order is the narrow reading order. On wide canvases the summary
          spans both left rows; the second row takes the leftover height. */}
      <div className="grid gap-4 @4xl:grid-cols-2 @4xl:grid-rows-[auto_1fr]">
        <OverviewIssueSummary readiness={readiness} onNavigate={onNavigate} />

        <div className="min-w-0 @4xl:col-start-1 @4xl:row-start-1">
          <IdentityCard readOnly={readOnly} />
        </div>

        <div className="flex min-w-0 flex-col gap-4 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:self-start">
          <BuildSummaryCard data={summary} onNavigate={onNavigate} />
        </div>

        <div className="flex min-w-0 flex-col @4xl:col-start-1 @4xl:row-start-2">
          <ComponentTechnologyCard
            readOnly={readOnly}
            onNavigate={onNavigate}
          />
        </div>

        {readOnly && (
          <div className={`${cs.panel.notice} @4xl:col-span-2`}>
            This unit is in read-only mode. Changes cannot be made.
          </div>
        )}
      </div>
    </div>
  );
}

function IdentityCard({
  readOnly,
}: {
  readonly readOnly: boolean;
}): React.ReactElement {
  const unitId = useUnitStore((s) => s.id);
  const chassis = useUnitStore((s) => s.chassis);
  const clanName = useUnitStore((s) => s.clanName);
  const model = useUnitStore((s) => s.model);
  const mulId = useUnitStore((s) => s.mulId);
  const year = useUnitStore((s) => s.year);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const techBaseMode = useUnitStore((s) => s.techBaseMode);

  const setChassis = useUnitStore((s) => s.setChassis);
  const setClanName = useUnitStore((s) => s.setClanName);
  const setModel = useUnitStore((s) => s.setModel);
  const setMulId = useUnitStore((s) => s.setMulId);
  const setYear = useUnitStore((s) => s.setYear);
  const setRulesLevel = useUnitStore((s) => s.setRulesLevel);

  const renameTab = useTabManagerStore((s) => s.renameTab);

  // Keep the unit tab's name in step with chassis/model edits.
  const updateTabName = useCallback(
    (newChassis: string, newModel: string) => {
      const newName = `${newChassis}${newModel ? ' ' + newModel : ''}`;
      renameTab(unitId, newName);
    },
    [unitId, renameTab],
  );

  const handleChassisChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChassis = e.target.value;
      setChassis(newChassis);
      updateTabName(newChassis, model);
    },
    [setChassis, model, updateTabName],
  );

  const handleClanNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setClanName(e.target.value);
    },
    [setClanName],
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newModel = e.target.value;
      setModel(newModel);
      updateTabName(chassis, newModel);
    },
    [setModel, chassis, updateTabName],
  );

  const handleMulIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow numbers and hyphens only, store as string (-1 for custom units)
      const value = e.target.value.replace(/[^0-9-]/g, '');
      setMulId(value === '' ? '-1' : value);
    },
    [setMulId],
  );

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value > 0) {
        setYear(value);
      }
    },
    [setYear],
  );

  const handleRulesLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setRulesLevel(e.target.value as RulesLevel);
    },
    [setRulesLevel],
  );

  return (
    <section
      aria-labelledby="overview-identity-title"
      className={`${cs.panel.main} @container`}
    >
      <div className="border-border-theme mb-4 flex flex-col gap-1 border-b pb-3 @sm:flex-row @sm:items-baseline @sm:justify-between">
        <h3 id="overview-identity-title" className={cs.text.cardTitle}>
          Identity
        </h3>
        {/* Tech base only: the Tech Level field below shows the rules level.
            The same meta style as the Build Summary's "100.0 / 100.0 t used". */}
        <p className="text-text-theme-secondary text-sm @sm:text-right">
          {TECH_BASE_MODE_LABELS[techBaseMode]}
        </p>
      </div>

      <div className="space-y-4">
        {/* Chassis, model, year and tech level lead in two rows of two; the
            optional fields follow as a third row. Three rows on wide cards
            too, so Identity and Component Technology together fill the
            column beside the Build Summary at a 44px component-row pitch. */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 @lg:gap-x-4">
          <div className={cs.layout.field}>
            <label className={cs.text.label}>Chassis</label>
            <input
              type="text"
              aria-label="Chassis"
              value={chassis}
              onChange={handleChassisChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="New"
            />
          </div>

          <div className={cs.layout.field}>
            <label className={cs.text.label}>Model</label>
            <input
              type="text"
              aria-label="Model"
              value={model}
              onChange={handleModelChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="Mek"
            />
          </div>

          <div className={cs.layout.field}>
            <label className={cs.text.label}>Year</label>
            <input
              type="number"
              aria-label="Year"
              value={year}
              onChange={handleYearChange}
              disabled={readOnly}
              min={2000}
              max={3200}
              className={`${cs.input.full} ${cs.input.noSpinners}`}
            />
          </div>

          <div className={cs.layout.field}>
            <label className={cs.text.label}>Tech Level</label>
            <select
              aria-label="Tech Level"
              value={rulesLevel}
              onChange={handleRulesLevelChange}
              disabled={readOnly}
              className={cs.select.full}
            >
              {ALL_RULES_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className={cs.layout.field}>
            <label className={cs.text.label}>
              Clan Name{' '}
              <span className="text-text-theme-muted text-sm">(Optional)</span>
            </label>
            <input
              type="text"
              aria-label="Clan Name"
              value={clanName}
              onChange={handleClanNameChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder=""
            />
          </div>

          <div className={cs.layout.field}>
            <label className={cs.text.label}>MUL ID</label>
            <input
              type="text"
              aria-label="MUL ID"
              value={mulId}
              onChange={handleMulIdChange}
              disabled={readOnly}
              className={cs.input.full}
              placeholder="-1"
            />
          </div>
        </div>

        <OverviewOmniControls readOnly={readOnly} />
      </div>
    </section>
  );
}
