import type {
  IForceReference,
  IMapConfiguration,
  IScenarioTemplate,
} from '@/types/encounter';
import type { IForce } from '@/types/force';

import { Badge, Card } from '@/components/ui';
import { TerrainPreset } from '@/types/encounter';

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
                    Slot {assignment.slot}
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

interface ScenarioTemplateCardProps {
  template: IScenarioTemplate;
}

export function ScenarioTemplateCard({
  template,
}: ScenarioTemplateCardProps): React.ReactElement {
  return (
    <Card
      className="border-accent/20 bg-accent/5 mb-6"
      data-testid="scenario-template-card"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-accent text-sm font-medium">
              Scenario: {template.name}
            </h3>
            <p className="text-text-theme-muted mt-1 text-sm">
              {template.description}
            </p>
          </div>
          <Badge variant="cyan">{template.type}</Badge>
        </div>
      </div>
    </Card>
  );
}

interface ModeSelectionProps {
  onAutoResolve: () => void;
  onInteractive: () => void;
  onSpectate: () => void;
  isResolving: boolean;
}

export function ModeSelection({
  onAutoResolve,
  onInteractive,
  onSpectate,
  isResolving,
}: ModeSelectionProps): React.ReactElement {
  return (
    <Card data-testid="mode-selection">
      <div className="p-6">
        <h2 className="text-text-theme-primary mb-2 text-lg font-medium">
          Choose Battle Mode
        </h2>
        <p className="text-text-theme-muted mb-6 text-sm">
          Select how you want to resolve this encounter.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            onClick={onAutoResolve}
            disabled={isResolving}
            className="group border-border-theme-subtle hover:border-accent rounded-lg border-2 p-6 text-left transition-all hover:bg-cyan-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="auto-resolve-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              {isResolving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              {isResolving ? 'Resolving Battle...' : 'Auto-Resolve Battle'}
            </h3>
            <p className="text-text-theme-muted text-sm">
              Simulate the entire battle instantly. The engine resolves all
              combat rounds and shows you the results.
            </p>
          </button>

          <button
            onClick={onInteractive}
            disabled={isResolving}
            className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="play-manually-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              Play Manually
            </h3>
            <p className="text-text-theme-muted text-sm">
              Take command and make tactical decisions each turn. Move units,
              choose targets, and manage heat.
            </p>
          </button>

          <button
            onClick={onSpectate}
            disabled={isResolving}
            className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="simulate-battle-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              Simulate Battle
            </h3>
            <p className="text-text-theme-muted text-sm">
              Watch AI control both sides. Playback controls let you pause,
              step, and adjust speed.
            </p>
          </button>
        </div>
      </div>
    </Card>
  );
}
