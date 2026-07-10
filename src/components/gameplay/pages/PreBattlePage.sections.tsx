import { useEffect, useMemo, useState } from 'react';

import type { IForceReference, IMapConfiguration } from '@/types/encounter';
import type { IForce } from '@/types/force';

import { Badge, Card } from '@/components/ui';
import { TerrainPreset } from '@/types/encounter';

function useCanonicalUnitNameById(
  force: IForce | undefined,
): ReadonlyMap<string, string> {
  const assignedUnitIds = useMemo(
    () =>
      Array.from(
        new Set(
          force?.assignments
            .map((assignment) => assignment.unitId)
            .filter((unitId): unitId is string => Boolean(unitId)) ?? [],
        ),
      ),
    [force],
  );
  const assignedUnitKey = assignedUnitIds.join('\n');
  const [unitNameById, setUnitNameById] = useState<ReadonlyMap<string, string>>(
    new Map(),
  );

  useEffect(() => {
    const requestedUnitIds =
      assignedUnitKey.length > 0 ? assignedUnitKey.split('\n') : [];
    if (requestedUnitIds.length === 0) {
      setUnitNameById(new Map());
      return;
    }

    let cancelled = false;
    const loadUnitNames = async () => {
      try {
        const { unitSearchService } =
          await import('@/services/units/UnitSearchService');
        const assignedIds = new Set(requestedUnitIds);
        await unitSearchService.initialize();
        const nextUnitNameById = new Map<string, string>();
        for (const id of Array.from(assignedIds)) {
          const entry = unitSearchService.getUnitById(id);
          if (entry) {
            nextUnitNameById.set(entry.id, entry.name);
          }
        }
        if (!cancelled) {
          setUnitNameById(nextUnitNameById);
        }
      } catch {
        if (!cancelled) {
          setUnitNameById(new Map());
        }
      }
    };
    void loadUnitNames();
    return () => {
      cancelled = true;
    };
  }, [assignedUnitKey]);

  return unitNameById;
}

interface ForceCardProps {
  title: string;
  forceRef: IForceReference;
  force: IForce | undefined;
  side: 'player' | 'opponent';
}

export function ForceCard({
  title,
  forceRef,
  force,
  side,
}: ForceCardProps): React.ReactElement {
  const isOpponent = side === 'opponent';
  const accentColor = isOpponent ? 'red' : 'cyan';
  const unitNameById = useCanonicalUnitNameById(force);

  return (
    <Card
      className={`border-${accentColor}-500/30`}
      data-testid={`${side}-force-card`}
    >
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3
            className={`font-medium ${isOpponent ? 'text-red-400' : 'text-cyan-400'}`}
          >
            {title}
          </h3>
          <Badge variant={isOpponent ? 'red' : 'cyan'}>
            {forceRef.unitCount} {forceRef.unitCount === 1 ? 'unit' : 'units'}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p
            className="text-text-theme-primary font-medium"
            data-testid={`${side}-force-name`}
          >
            {forceRef.forceName}
          </p>
          <p
            className="text-text-theme-muted mt-1 text-sm"
            data-testid={`${side}-force-bv`}
          >
            {forceRef.totalBV.toLocaleString()} Battle Value
          </p>
        </div>

        {force && force.assignments.length > 0 ? (
          <div className="space-y-2" data-testid={`${side}-unit-list`}>
            {force.assignments
              .filter((assignment) => assignment.unitId)
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-surface-raised border-border-theme-subtle flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="text-text-theme-primary text-sm">
                    {assignment.unitId
                      ? (unitNameById.get(assignment.unitId) ??
                        `Slot ${assignment.slot}`)
                      : `Slot ${assignment.slot}`}
                    {assignment.pilotId && (
                      <span className="text-text-theme-muted ml-2 text-xs">
                        (pilot assigned)
                      </span>
                    )}
                  </div>
                  <div className="text-text-theme-muted text-xs">
                    {assignment.position}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-text-theme-muted text-sm">
            {forceRef.unitCount} units assigned
          </p>
        )}
      </div>
    </Card>
  );
}

interface BVComparisonProps {
  playerBV: number;
  opponentBV: number;
}

export function BVComparison({
  playerBV,
  opponentBV,
}: BVComparisonProps): React.ReactElement {
  const totalBV = playerBV + opponentBV;
  const playerPercent = totalBV > 0 ? (playerBV / totalBV) * 100 : 50;

  return (
    <Card className="bg-surface-raised/50" data-testid="bv-comparison">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Force Balance
        </h3>
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-700">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-500 transition-all duration-500"
            style={{ width: `${playerPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-cyan-400">
            Player: {playerBV.toLocaleString()} BV
          </span>
          <span className="text-red-400">
            Opponent: {opponentBV.toLocaleString()} BV
          </span>
        </div>
        {totalBV > 0 && (
          <p className="text-text-theme-muted mt-2 text-center text-xs">
            Ratio:{' '}
            {playerBV > 0 ? ((opponentBV / playerBV) * 100).toFixed(0) : '∞'}%
            opponent vs player
          </p>
        )}
      </div>
    </Card>
  );
}

interface BattlefieldCardProps {
  mapConfig: IMapConfiguration;
}

export function BattlefieldCard({
  mapConfig,
}: BattlefieldCardProps): React.ReactElement {
  return (
    <Card className="mb-6" data-testid="map-info-card">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Battlefield
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-theme-muted">Map Size</p>
            <p className="text-text-theme-primary">
              {mapConfig.radius * 2 + 1}x{mapConfig.radius * 2 + 1} hex grid
            </p>
          </div>
          <div>
            <p className="text-text-theme-muted">Terrain</p>
            <p className="text-text-theme-primary capitalize">
              {mapConfig.terrain.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-text-theme-muted">Deployment</p>
            <p className="text-text-theme-primary capitalize">
              {mapConfig.playerDeploymentZone} vs{' '}
              {mapConfig.opponentDeploymentZone}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Per `add-skirmish-setup-ui` tasks 4 + 5: interactive editor for the
 * battlefield's hex radius and terrain preset. Surfaces the existing
 * encounter `mapConfig` as a controlled form and emits changes via
 * `onChange` so the parent can persist via `useEncounterStore.updateEncounter`.
 *
 * Discrete radius options are 5 / 8 / 12 / 17 (canonical sizes per the
 * roadmap; default 8 = 17×17 hex grid). Terrain presets are loaded
 * from the `TerrainPreset` enum so adding a new preset there
 * automatically surfaces here.
 */
interface MapConfigEditorProps {
  mapConfig: IMapConfiguration;
  onChange: (next: Partial<IMapConfiguration>) => void;
  disabled?: boolean;
}

export const MAP_RADIUS_OPTIONS = [5, 8, 12, 17] as const;

export function MapConfigEditor({
  mapConfig,
  onChange,
  disabled = false,
}: MapConfigEditorProps): React.ReactElement {
  const hexCount = (radius: number) => 1 + 3 * radius * (radius + 1);

  return (
    <Card className="mb-6" data-testid="map-config-editor">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Battlefield Configuration
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="map-radius-select"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Hex Radius
            </label>
            <select
              id="map-radius-select"
              data-testid="map-radius-select"
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={mapConfig.radius}
              disabled={disabled}
              onChange={(e) => onChange({ radius: Number(e.target.value) })}
            >
              {MAP_RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} ({hexCount(r)} hexes)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="terrain-preset-select"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Terrain Preset
            </label>
            <select
              id="terrain-preset-select"
              data-testid="terrain-preset-select"
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={mapConfig.terrain}
              disabled={disabled}
              onChange={(e) =>
                onChange({ terrain: e.target.value as TerrainPreset })
              }
            >
              {Object.values(TerrainPreset).map((preset) => (
                <option key={preset} value={preset}>
                  {preset
                    .replace('_', ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** BV imbalance threshold above which a warning is shown (spec § 8). */

export { ModeSelection } from './ModeSelection';
export {
  ScenarioRulesEditor,
  SCENARIO_OPTIONAL_RULES,
} from './ScenarioRulesEditor';
export { ScenarioTemplateCard } from './ScenarioTemplateCard';
export { SkirmishLauncher } from './SkirmishLauncher';
