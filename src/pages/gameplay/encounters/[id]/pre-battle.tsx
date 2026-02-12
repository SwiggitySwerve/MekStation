/**
 * Pre-Battle Screen
 * Shows force comparison, scenario info, and mode selection before launching an encounter.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';

import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';

import { useToast } from '@/components/shared/Toast';
import { PageLayout, Card, Badge } from '@/components/ui';
import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { useEncounterStore } from '@/stores/useEncounterStore';
import { useForceStore } from '@/stores/useForceStore';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  SCENARIO_TEMPLATES,
  type IEncounter,
  type IForceReference,
} from '@/types/encounter';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Force Card Component
// =============================================================================

interface ForceCardProps {
  title: string;
  forceRef: IForceReference;
  force: IForce | undefined;
  side: 'player' | 'opponent';
}

function ForceCard({
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
        {/* Force name & BV */}
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

        {/* Unit list from force assignments */}
        {force && force.assignments.length > 0 ? (
          <div className="space-y-2" data-testid={`${side}-unit-list`}>
            {force.assignments
              .filter((a) => a.unitId)
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

// =============================================================================
// BV Comparison Bar
// =============================================================================

interface BVComparisonProps {
  playerBV: number;
  opponentBV: number;
}

function BVComparison({
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

// =============================================================================
// Mode Selection Component
// =============================================================================

interface ModeSelectionProps {
  onAutoResolve: () => void;
  onInteractive: () => void;
  isResolving: boolean;
}

function ModeSelection({
  onAutoResolve,
  onInteractive,
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Auto-Resolve */}
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

          {/* Play Manually */}
          <button
            onClick={onInteractive}
            disabled={isResolving}
            className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left opacity-75 transition-all hover:border-amber-500/50 hover:bg-amber-500/5 disabled:cursor-not-allowed"
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
            <Badge variant="amber" className="mt-2">
              Coming Soon
            </Badge>
          </button>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PreBattlePage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();

  const {
    getEncounter,
    loadEncounters,
    isLoading: encountersLoading,
  } = useEncounterStore();
  const { forces, loadForces } = useForceStore();
  const { pilots, loadPilots } = usePilotStore();
  const { setSession } = useGameplayStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const encounter: IEncounter | undefined =
    id && typeof id === 'string' ? getEncounter(id) : undefined;

  const template = encounter?.template
    ? SCENARIO_TEMPLATES.find((t) => t.type === encounter.template)
    : null;

  // Get force data for both sides
  const playerForce = encounter?.playerForce
    ? forces.find((f) => f.id === encounter.playerForce?.forceId)
    : undefined;
  const opponentForce = encounter?.opponentForce
    ? forces.find((f) => f.id === encounter.opponentForce?.forceId)
    : undefined;

  // Load data on mount
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadEncounters(), loadForces(), loadPilots()]);
      setIsInitialized(true);
    };
    initialize();
  }, [loadEncounters, loadForces, loadPilots]);

  // Auto-resolve battle
  const startAutoResolve = useCallback(async () => {
    if (!encounter || !encounter.playerForce || !encounter.opponentForce) {
      showToast({
        message: 'Encounter forces not configured',
        variant: 'error',
      });
      return;
    }

    setIsResolving(true);

    try {
      // Get unit IDs from force assignments
      const playerUnitIds: string[] = [];
      const opponentUnitIds: string[] = [];

      if (playerForce) {
        for (const assignment of playerForce.assignments) {
          if (assignment.unitId) {
            playerUnitIds.push(assignment.unitId);
          }
        }
      }

      if (opponentForce) {
        for (const assignment of opponentForce.assignments) {
          if (assignment.unitId) {
            opponentUnitIds.push(assignment.unitId);
          }
        }
      }

      if (playerUnitIds.length === 0 || opponentUnitIds.length === 0) {
        showToast({
          message: 'Both forces need at least one unit assigned',
          variant: 'error',
        });
        setIsResolving(false);
        return;
      }

      // Look up pilot skills for each assignment
      const getPilotSkills = (
        pilotId: string | null,
      ): { gunnery: number; piloting: number } => {
        if (!pilotId) return { gunnery: 4, piloting: 5 };
        const pilot = pilots.find((p) => p.id === pilotId);
        if (!pilot) return { gunnery: 4, piloting: 5 };
        return {
          gunnery: pilot.skills.gunnery,
          piloting: pilot.skills.piloting,
        };
      };

      // Adapt player units
      const playerAdapted: IAdaptedUnit[] = [];
      const playerAssignments =
        playerForce?.assignments.filter((a) => a.unitId) ?? [];
      for (const assignment of playerAssignments) {
        if (!assignment.unitId) continue;
        const skills = getPilotSkills(assignment.pilotId);
        const adapted = await adaptUnit(assignment.unitId, {
          side: GameSide.Player,
          gunnery: skills.gunnery,
          piloting: skills.piloting,
        });
        if (adapted) {
          playerAdapted.push(adapted);
        }
      }

      // Adapt opponent units
      const opponentAdapted: IAdaptedUnit[] = [];
      const opponentAssignments =
        opponentForce?.assignments.filter((a) => a.unitId) ?? [];
      for (const assignment of opponentAssignments) {
        if (!assignment.unitId) continue;
        const skills = getPilotSkills(assignment.pilotId);
        const adapted = await adaptUnit(assignment.unitId, {
          side: GameSide.Opponent,
          gunnery: skills.gunnery,
          piloting: skills.piloting,
        });
        if (adapted) {
          opponentAdapted.push(adapted);
        }
      }

      if (playerAdapted.length === 0 || opponentAdapted.length === 0) {
        showToast({
          message: 'Failed to load unit data for one or both forces',
          variant: 'error',
        });
        setIsResolving(false);
        return;
      }

      // Build game units
      const gameUnits: IGameUnit[] = [
        ...playerAssignments.map((a, i) => ({
          id: playerAdapted[i]?.id ?? a.unitId ?? a.id,
          name: playerAdapted[i]?.id ?? `Player Unit ${i + 1}`,
          side: GameSide.Player as GameSide,
          unitRef: a.unitId ?? '',
          pilotRef: a.pilotId ?? 'Unknown',
          gunnery: getPilotSkills(a.pilotId).gunnery,
          piloting: getPilotSkills(a.pilotId).piloting,
        })),
        ...opponentAssignments.map((a, i) => ({
          id: opponentAdapted[i]?.id ?? a.unitId ?? a.id,
          name: opponentAdapted[i]?.id ?? `Opponent Unit ${i + 1}`,
          side: GameSide.Opponent as GameSide,
          unitRef: a.unitId ?? '',
          pilotRef: a.pilotId ?? 'Unknown',
          gunnery: getPilotSkills(a.pilotId).gunnery,
          piloting: getPilotSkills(a.pilotId).piloting,
        })),
      ];

      // Run engine
      const engine = new GameEngine({ seed: Date.now() });
      const session = engine.runToCompletion(
        playerAdapted,
        opponentAdapted,
        gameUnits,
      );

      // Store session in gameplay store
      setSession(session);

      logger.info('Auto-resolve complete', {
        sessionId: session.id,
        turns: session.currentState.turn,
        result: session.currentState.result,
      });

      showToast({
        message: 'Battle resolved! Reviewing results...',
        variant: 'success',
      });

      // Navigate to game session page (shows CompletedGame for finished sessions)
      router.push(`/gameplay/games/${session.id}`);
    } catch (err) {
      logger.error('Auto-resolve failed:', err);
      showToast({
        message:
          err instanceof Error ? err.message : 'Failed to resolve battle',
        variant: 'error',
      });
    } finally {
      setIsResolving(false);
    }
  }, [
    encounter,
    playerForce,
    opponentForce,
    pilots,
    showToast,
    setSession,
    router,
  ]);

  // Interactive mode placeholder
  const startInteractive = useCallback(() => {
    showToast({
      message: 'Interactive mode coming in PR 5',
      variant: 'info',
    });
  }, [showToast]);

  // Loading state
  if (!isInitialized || encountersLoading) {
    return (
      <PageLayout
        title="Loading..."
        backLink={`/gameplay/encounters/${id ?? ''}`}
        backLabel="Back to Encounter"
      >
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <p className="text-text-theme-muted">Loading encounter data...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Not found
  if (!encounter) {
    return (
      <PageLayout
        title="Encounter Not Found"
        backLink="/gameplay/encounters"
        backLabel="Back to Encounters"
      >
        <Card>
          <p className="text-text-theme-secondary">
            The requested encounter could not be found.
          </p>
          <Link
            href="/gameplay/encounters"
            className="text-accent mt-4 inline-block hover:underline"
          >
            Return to Encounters
          </Link>
        </Card>
      </PageLayout>
    );
  }

  // Missing forces
  if (!encounter.playerForce || !encounter.opponentForce) {
    return (
      <PageLayout
        title="Incomplete Encounter"
        backLink={`/gameplay/encounters/${id as string}`}
        backLabel="Back to Encounter"
      >
        <Card>
          <p className="text-text-theme-secondary">
            Both player and opponent forces must be configured before battle.
          </p>
          <Link
            href={`/gameplay/encounters/${id as string}`}
            className="text-accent mt-4 inline-block hover:underline"
          >
            Configure Encounter
          </Link>
        </Card>
      </PageLayout>
    );
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Encounters', href: '/gameplay/encounters' },
    { label: encounter.name, href: `/gameplay/encounters/${id as string}` },
    { label: 'Pre-Battle' },
  ];

  return (
    <>
      <Head>
        <title>Pre-Battle: {encounter.name} | MekStation</title>
      </Head>

      <PageLayout
        title={`Pre-Battle: ${encounter.name}`}
        subtitle="Review forces and choose your battle mode"
        breadcrumbs={breadcrumbs}
        backLink={`/gameplay/encounters/${id as string}`}
        backLabel="Back to Encounter"
        data-testid="pre-battle-page"
      >
        {/* Scenario Template */}
        {template && (
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
        )}

        {/* Force Comparison */}
        <div
          className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          data-testid="forces-comparison"
        >
          <ForceCard
            title="Player Force"
            forceRef={encounter.playerForce}
            force={playerForce}
            side="player"
          />
          <ForceCard
            title="Opponent Force"
            forceRef={encounter.opponentForce}
            force={opponentForce}
            side="opponent"
          />
        </div>

        {/* BV Comparison */}
        <div className="mb-6">
          <BVComparison
            playerBV={encounter.playerForce.totalBV}
            opponentBV={encounter.opponentForce.totalBV}
          />
        </div>

        {/* Map & Terrain Info */}
        <Card className="mb-6" data-testid="map-info-card">
          <div className="p-4">
            <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
              Battlefield
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-text-theme-muted">Map Size</p>
                <p className="text-text-theme-primary">
                  {encounter.mapConfig.radius * 2 + 1}x
                  {encounter.mapConfig.radius * 2 + 1} hex grid
                </p>
              </div>
              <div>
                <p className="text-text-theme-muted">Terrain</p>
                <p className="text-text-theme-primary capitalize">
                  {encounter.mapConfig.terrain.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-text-theme-muted">Deployment</p>
                <p className="text-text-theme-primary capitalize">
                  {encounter.mapConfig.playerDeploymentZone} vs{' '}
                  {encounter.mapConfig.opponentDeploymentZone}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Mode Selection */}
        <div className="mb-6">
          <ModeSelection
            onAutoResolve={startAutoResolve}
            onInteractive={startInteractive}
            isResolving={isResolving}
          />
        </div>
      </PageLayout>
    </>
  );
}
