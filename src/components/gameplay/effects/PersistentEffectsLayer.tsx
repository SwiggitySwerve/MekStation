import React, { useMemo } from 'react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { TokenUnitType } from '@/types/gameplay';

import {
  DAMAGE_EFFECT_FIRE_SYMBOL_ID,
  DAMAGE_EFFECT_SMOKE_SYMBOL_ID,
  destroyedLocationsFromArmorState,
  destroyedLocationsFromEvent,
  effectAnchorForLocation,
  isEngineCriticalEvent,
  isLocationDestroyedEvent,
  isUnitDestroyedEvent,
  toDomToken,
  uniqueEffectLocations,
  type EffectLocation,
} from './damageEffectHelpers';
import { DebrisCloud } from './DebrisCloud';
import { EngineFire } from './EngineFire';
import { SmokePuff } from './SmokePuff';

export interface PersistentEffectsLayerProps {
  readonly tokens: readonly IUnitToken[];
  readonly events?: readonly IGameEvent[];
  readonly prefersReducedMotion?: boolean;
}

interface UnitPersistentEffectState {
  readonly token: IUnitToken;
  readonly x: number;
  readonly y: number;
  readonly destroyed: boolean;
  readonly smokeLocations: readonly EffectLocation[];
  readonly engineCritCount: number;
}

export function PersistentEffectsLayer({
  tokens,
  events = [],
  prefersReducedMotion,
}: PersistentEffectsLayerProps): React.ReactElement | null {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = prefersReducedMotion ?? systemPrefersReducedMotion;
  const effectStates = useMemo(
    () => projectPersistentEffects(tokens, events),
    [events, tokens],
  );

  if (effectStates.length === 0) return null;

  return (
    <g
      data-testid="persistent-effects-layer"
      // add-damage-feedback-effects task 7.3 chose the delta-spec path:
      // selected/target rings remain token-local, so this layer documents
      // the actual map order instead of pretending it is split inside tokens.
      data-layer-position="above-token-layer-below-attack-effects"
      pointerEvents="none"
    >
      <DamageEffectDefinitions prefersReducedMotion={reducedMotion} />
      {effectStates.map((state) =>
        state.destroyed ? (
          <React.Fragment key={state.token.unitId}>
            <WreckMarker token={state.token} x={state.x} y={state.y} />
            <SmokePuff
              unitId={state.token.unitId}
              location="wreck"
              variant="wreck"
              x={state.x}
              y={state.y}
              prefersReducedMotion={reducedMotion}
            />
            <DebrisCloud
              unitId={state.token.unitId}
              events={events}
              x={state.x}
              y={state.y}
              prefersReducedMotion={reducedMotion}
            />
          </React.Fragment>
        ) : (
          <React.Fragment key={state.token.unitId}>
            {state.smokeLocations.map((location) => (
              <SmokePuff
                key={`${state.token.unitId}-${location}`}
                unitId={state.token.unitId}
                location={location}
                x={state.x}
                y={state.y}
                prefersReducedMotion={reducedMotion}
              />
            ))}
            <EngineFire
              unitId={state.token.unitId}
              engineCritCount={state.engineCritCount}
              x={state.x}
              y={state.y}
              prefersReducedMotion={reducedMotion}
            />
          </React.Fragment>
        ),
      )}
    </g>
  );
}

export function projectPersistentEffects(
  tokens: readonly IUnitToken[],
  events: readonly IGameEvent[],
): readonly UnitPersistentEffectState[] {
  const destroyedUnitIds = new Set<string>();
  const smokeLocationsByUnit = new Map<string, EffectLocation[]>();
  const engineCritCountsByUnit = new Map<string, number>();

  for (const event of events) {
    if (isUnitDestroyedEvent(event)) {
      destroyedUnitIds.add(event.payload.unitId);
      continue;
    }

    if (isLocationDestroyedEvent(event)) {
      const existing = smokeLocationsByUnit.get(event.payload.unitId) ?? [];
      smokeLocationsByUnit.set(event.payload.unitId, [
        ...existing,
        ...destroyedLocationsFromEvent(event.payload),
      ]);
      continue;
    }

    if (isEngineCriticalEvent(event)) {
      engineCritCountsByUnit.set(
        event.payload.unitId,
        (engineCritCountsByUnit.get(event.payload.unitId) ?? 0) + 1,
      );
    }
  }

  return tokens
    .map((token) => {
      const { x, y } = hexToPixel(token.position);
      const destroyed = token.isDestroyed || destroyedUnitIds.has(token.unitId);
      // armorPipState lives on the Mech variant only — narrow before
      // accessing so the discriminated union stays sound. Non-mech tokens
      // contribute no per-location smoke from prior structure damage.
      const armorPipState =
        token.unitType === TokenUnitType.Mech ? token.armorPipState : undefined;
      const smokeLocations = destroyed
        ? []
        : uniqueEffectLocations([
            ...destroyedLocationsFromArmorState(armorPipState),
            ...(smokeLocationsByUnit.get(token.unitId) ?? []),
          ]);
      const engineCritCount = destroyed
        ? 0
        : (engineCritCountsByUnit.get(token.unitId) ?? 0);

      return {
        token,
        x,
        y,
        destroyed,
        smokeLocations,
        engineCritCount,
      };
    })
    .filter(
      (state) =>
        state.destroyed ||
        state.smokeLocations.length > 0 ||
        state.engineCritCount > 0,
    );
}

export interface DamageEffectDefinitionsProps {
  readonly prefersReducedMotion?: boolean;
}

export function DamageEffectDefinitions({
  prefersReducedMotion = false,
}: DamageEffectDefinitionsProps): React.ReactElement {
  return (
    <defs data-testid="damage-effect-definitions">
      <g id={DAMAGE_EFFECT_SMOKE_SYMBOL_ID}>
        <circle cx={-5} cy={2} r={6} fill="#9ca3af" opacity={0.58}>
          {!prefersReducedMotion && (
            <>
              <animate
                attributeName="cy"
                values="6;-8"
                dur="1200ms"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.3;0.68;0"
                dur="1200ms"
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
        <circle cx={5} cy={-2} r={8} fill="#6b7280" opacity={0.42}>
          {!prefersReducedMotion && (
            <>
              <animate
                attributeName="cy"
                values="4;-12"
                dur="1450ms"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.24;0.55;0"
                dur="1450ms"
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      </g>
      <g id={DAMAGE_EFFECT_FIRE_SYMBOL_ID}>
        <path
          d="M 0 -18 C 10 -8 12 4 0 16 C -12 5 -9 -8 0 -18 Z"
          fill="#f97316"
          opacity={0.95}
        >
          {!prefersReducedMotion && (
            <animate
              attributeName="fill"
              values="#f97316;#facc15;#ef4444;#f97316"
              dur="760ms"
              repeatCount="indefinite"
            />
          )}
        </path>
        <path
          d="M 0 -8 C 5 -2 5 6 0 12 C -5 6 -4 -2 0 -8 Z"
          fill="#fef3c7"
          opacity={0.86}
        />
      </g>
    </defs>
  );
}

function WreckMarker({
  token,
  x,
  y,
}: {
  readonly token: IUnitToken;
  readonly x: number;
  readonly y: number;
}): React.ReactElement {
  const unitToken = toDomToken(token.unitId);
  const wreckAnchor = effectAnchorForLocation('wreck');
  const archetype = resolveWreckArchetype(token);

  return (
    <g
      data-testid={`wreck-marker-${unitToken}`}
      data-archetype={archetype}
      transform={`translate(${x}, ${y})`}
      pointerEvents="none"
      role="img"
      aria-label={`${token.name} wreck`}
    >
      <path
        data-testid={`wreck-silhouette-${unitToken}`}
        d={wreckPathForArchetype(archetype)}
        fill="#4b5563"
        stroke="#111827"
        strokeWidth={2}
        opacity={0.5}
      />
      <text
        data-testid={`wreck-badge-${unitToken}`}
        x={wreckAnchor.x}
        y={wreckAnchor.y + 7}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill="#ffffff"
        stroke="#111827"
        strokeWidth={0.8}
        paintOrder="stroke fill"
        pointerEvents="none"
      >
        WRECK
      </text>
    </g>
  );
}

type WreckArchetype = 'humanoid' | 'quad' | 'lam';

function resolveWreckArchetype(token: IUnitToken): WreckArchetype {
  // chassisArchetype / isQuad / isLAM live on the Mech variant only.
  // Non-mech wrecks fall back to the humanoid silhouette — the wreck
  // marker is only ever wired for mechs today; if a vehicle/aero wreck
  // surface ships later, route to a per-type wreck silhouette here.
  if (token.unitType !== TokenUnitType.Mech) return 'humanoid';
  if (token.chassisArchetype) return token.chassisArchetype;
  if (token.isQuad) return 'quad';
  if (token.isLAM) return 'lam';
  return 'humanoid';
}

function wreckPathForArchetype(archetype: WreckArchetype): string {
  switch (archetype) {
    case 'quad':
      return 'M -28 -8 L -12 -18 L 10 -16 L 28 -6 L 20 10 L 8 18 L -10 16 L -24 8 Z';
    case 'lam':
      return 'M -30 -6 L -12 -22 L 0 -12 L 13 -23 L 31 -5 L 13 16 L -2 12 L -17 17 Z';
    case 'humanoid':
    default:
      return 'M -24 -10 L -10 -24 L 6 -18 L 21 -8 L 18 14 L 2 22 L -18 16 Z';
  }
}

export default PersistentEffectsLayer;
