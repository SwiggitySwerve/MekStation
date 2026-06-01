import React from 'react';

import type { IGameEvent, IHexCoordinate, IUnitToken } from '@/types/gameplay';

import { TokenUnitType } from '@/types/gameplay';

import { BattleArmorToken } from './BattleArmorToken';
import { projectEvents } from './UnitTokenForType.projectors';

export type BattleArmorPassengerToken = Extract<
  IUnitToken,
  { readonly unitType: TokenUnitType.BattleArmor }
>;

export type BattleArmorPassengerSlot = NonNullable<
  BattleArmorPassengerToken['passengerBadge']
>['slot'];

const BA_PASSENGER_SLOT_OFFSETS: Record<
  BattleArmorPassengerSlot,
  { readonly x: number; readonly y: number }
> = {
  shoulder: { x: 18, y: -18 },
  side: { x: 24, y: 0 },
  back: { x: -18, y: 18 },
};

interface ElectedSpotterSummary {
  readonly spotterId: string;
}

export function isBattleArmorPassengerToken(
  token: IUnitToken,
): token is BattleArmorPassengerToken {
  return token.unitType === TokenUnitType.BattleArmor;
}

export function battleArmorPassengerHostId(
  token: BattleArmorPassengerToken,
): string | undefined {
  return token.passengerBadge?.hostTokenId ?? token.mountedOn;
}

export function battleArmorPassengerSlot(
  token: BattleArmorPassengerToken,
): BattleArmorPassengerSlot {
  return token.passengerBadge?.slot ?? 'shoulder';
}

export function findBattleArmorPassengerHost(
  token: BattleArmorPassengerToken,
  allTokens: readonly IUnitToken[] | undefined,
): IUnitToken | undefined {
  const hostId = battleArmorPassengerHostId(token);
  if (!hostId) return undefined;
  return allTokens?.find((candidate) => candidate.unitId === hostId);
}

function battleArmorPassengersForHost(
  hostToken: IUnitToken,
  allTokens: readonly IUnitToken[] | undefined,
): readonly BattleArmorPassengerToken[] {
  if (!allTokens) return [];
  return allTokens.filter(
    (candidate): candidate is BattleArmorPassengerToken =>
      isBattleArmorPassengerToken(candidate) &&
      battleArmorPassengerHostId(candidate) === hostToken.unitId,
  );
}

function formatTokenHex(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

function passengerTokenMetadata(
  token: BattleArmorPassengerToken,
  displayPosition: IHexCoordinate,
): Record<string, string | number | undefined> {
  const passengerHostId = battleArmorPassengerHostId(token);
  return {
    'data-unit-type': token.unitType,
    'data-token-map-position': formatTokenHex(displayPosition),
    'data-token-source-position': formatTokenHex(token.position),
    'data-token-facing': token.facing,
    'data-mounted-on': token.mountedOn,
    'data-passenger-host': passengerHostId,
    'data-passenger-slot': passengerHostId
      ? battleArmorPassengerSlot(token)
      : undefined,
  };
}

function formatPassengerAriaLabel({
  token,
  displayPosition,
  isSpotter,
}: {
  readonly token: BattleArmorPassengerToken;
  readonly displayPosition: IHexCoordinate;
  readonly isSpotter: boolean;
}): string {
  const passengerHostId = battleArmorPassengerHostId(token);
  return [
    `Unit ${token.name}`,
    `id ${token.unitId}`,
    `side ${token.side}`,
    `type ${token.unitType}`,
    `position ${formatTokenHex(displayPosition)}`,
    `source position ${formatTokenHex(token.position)}`,
    `facing ${token.facing}`,
    passengerHostId ? `mounted on ${passengerHostId}` : null,
    passengerHostId
      ? `passenger slot ${battleArmorPassengerSlot(token)}`
      : null,
    isSpotter ? 'indirect-fire spotter' : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('; ');
}

export interface BattleArmorPassengerBadgesProps {
  readonly hostToken: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly allTokens?: readonly IUnitToken[];
  readonly events?: readonly IGameEvent[];
  readonly electedSpotters: readonly ElectedSpotterSummary[];
  readonly onClick: (unitId: string) => void;
  readonly onDoubleClick?: (unitId: string) => void;
}

export function BattleArmorPassengerBadges({
  hostToken,
  displayPosition,
  allTokens,
  events,
  electedSpotters,
  onClick,
  onDoubleClick,
}: BattleArmorPassengerBadgesProps): React.ReactElement {
  return (
    <>
      {battleArmorPassengersForHost(hostToken, allTokens).map((passenger) => {
        const slot = battleArmorPassengerSlot(passenger);
        const offset = BA_PASSENGER_SLOT_OFFSETS[slot];
        const passengerEventState = projectEvents(passenger.unitId, events);
        const passengerIsSpotter = electedSpotters.some(
          (spotter) => spotter.spotterId === passenger.unitId,
        );
        const passengerAriaLabel = formatPassengerAriaLabel({
          token: passenger,
          displayPosition,
          isSpotter: passengerIsSpotter,
        });

        return (
          <g
            key={`mounted-ba-${passenger.unitId}`}
            transform={`translate(${offset.x}, ${offset.y})`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(passenger.unitId);
            }}
            onDoubleClick={(e) => {
              if (!onDoubleClick) return;
              e.stopPropagation();
              onDoubleClick(passenger.unitId);
            }}
            style={{ cursor: 'pointer' }}
            data-testid={`unit-token-${passenger.unitId}`}
            aria-label={passengerAriaLabel}
            {...passengerTokenMetadata(passenger, displayPosition)}
          >
            <title>{passengerAriaLabel}</title>
            <BattleArmorToken
              token={passenger}
              eventState={passengerEventState}
              mountedBadge
            />
          </g>
        );
      })}
    </>
  );
}
