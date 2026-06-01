import React from 'react';

import type { MovementTweenFrame } from '@/components/gameplay/animation/useMovementTween';
import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { AmmoExplosionAura } from '@/components/gameplay/effects/AmmoExplosionAura';
import { HeatGlow } from '@/components/gameplay/effects/HeatGlow';
import { HitLocationFlash } from '@/components/gameplay/effects/HitLocationFlash';
import { ShutdownOverlay } from '@/components/gameplay/effects/ShutdownOverlay';
import { StartupPulse } from '@/components/gameplay/effects/StartupPulse';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { MovementType } from '@/types/gameplay';

import type { UnitThermalVisualState } from './UnitTokenForType.projectors';

export type IsometricVisibilityRule = 'hidden' | 'lastKnown';

export function renderFogMarker(token: IUnitToken): React.ReactElement | null {
  if (token.fogStatus !== 'hidden' && token.fogStatus !== 'lastKnown') {
    return null;
  }

  const stroke = token.fogStatus === 'hidden' ? '#64748b' : '#f59e0b';
  const fill = token.fogStatus === 'hidden' ? '#0f172a' : '#1f2937';
  const title =
    token.fogStatus === 'hidden' ? 'Hidden contact' : 'Last known contact';

  return (
    <g
      data-testid={`fog-marker-${token.unitId}`}
      pointerEvents="none"
      aria-label={title}
    >
      <title>{title}</title>
      <circle r={14} fill={fill} stroke={stroke} strokeWidth={2} />
      <text
        x={0}
        y={5}
        textAnchor="middle"
        fontSize={18}
        fontWeight={700}
        fill="#f8fafc"
      >
        ?
      </text>
    </g>
  );
}

export function renderIsometricVisibilityRuleBadge(
  unitId: string,
  rule: IsometricVisibilityRule | undefined,
  reason: string | undefined,
): React.ReactElement | null {
  if (!rule || !reason) return null;

  const label = rule === 'hidden' ? 'FOG' : 'LAST';
  const stroke = rule === 'hidden' ? '#94a3b8' : '#f59e0b';

  return (
    <g
      pointerEvents="none"
      data-testid={`isometric-visibility-rule-${unitId}`}
      data-isometric-visibility-rule={rule}
      data-isometric-visibility-rule-reason={reason}
    >
      <title>{reason}</title>
      <rect
        x={-20}
        y={-61}
        width={40}
        height={14}
        rx={3}
        fill="#111827"
        fillOpacity={0.94}
        stroke={stroke}
        strokeWidth={1}
      />
      <text
        x={0}
        y={-51}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {label}
      </text>
    </g>
  );
}

export function TokenVisualEffects({
  token,
  events,
  thermalVisualState,
  children,
}: {
  readonly token: IUnitToken;
  readonly events?: readonly IGameEvent[];
  readonly thermalVisualState: UnitThermalVisualState;
  readonly children: React.ReactElement;
}): React.ReactElement {
  const idSuffix = token.unitId;

  return (
    <>
      <AmmoExplosionAura
        active={thermalVisualState.ammoExplosionRisk}
        heat={thermalVisualState.heat}
        idSuffix={idSuffix}
      />
      {thermalVisualState.hasHeatEvent && (
        <HeatGlow
          heat={thermalVisualState.heat}
          idSuffix={idSuffix}
          isShutdown={thermalVisualState.isShutdown}
        />
      )}
      {children}
      <ShutdownOverlay
        active={thermalVisualState.isShutdown}
        idSuffix={idSuffix}
        unitName={token.name}
      />
      <StartupPulse
        attemptId={thermalVisualState.startupAttemptId}
        success={thermalVisualState.startupSucceeded}
      />
      <HitLocationFlash unitId={token.unitId} events={events} />
    </>
  );
}

export function renderJumpArc(
  unitId: string,
  movementAnimation: TacticalAnimation | undefined,
  tween: MovementTweenFrame,
): React.ReactElement | null {
  const path = movementAnimation?.path;
  if (!path || path.length <= 1) return null;
  if (movementAnimation.mode !== MovementType.Jump) return null;
  if (tween.reducedMotion || tween.arcOpacity <= 0) return null;

  const start = hexToPixel(path[0]);
  const end = hexToPixel(path[path.length - 1]);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const lift = Math.max(24, distance * 0.2);
  const control = {
    x: start.x + (end.x - start.x) / 2,
    y: start.y + (end.y - start.y) / 2 - lift,
  };

  return (
    <path
      data-testid={`jump-arc-${unitId}`}
      d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray="5 5"
      opacity={Math.min(0.45, tween.arcOpacity * 0.45)}
      pointerEvents="none"
      aria-hidden="true"
    />
  );
}
