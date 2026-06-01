import type {
  IGameEvent,
  IRuntimeMovementStateChangedPayload,
} from '@/types/gameplay';

export function formatRuntimeMovementStateChangedEvent(event: IGameEvent): {
  readonly text: string;
  readonly unitId?: string;
} {
  const payload = event.payload as IRuntimeMovementStateChangedPayload;
  if (payload.source === 'automatic_wige_landing') {
    return {
      text: 'Automatic WiGE landing',
      unitId: payload.unitId,
    };
  }

  if (payload.lamAirMekLandingControlRequired === undefined) {
    return {
      text: event.type.replace(/_/g, ' '),
      unitId: payload.unitId,
    };
  }

  const reason =
    payload.lamAirMekLandingControlReason ?? 'Check not required for landing';
  if (!payload.lamAirMekLandingControlRequired) {
    return {
      text: `AirMek landing control: ${reason}`,
      unitId: payload.unitId,
    };
  }

  const modifier = payload.lamAirMekLandingControlModifier ?? 0;
  const modifierText = modifier > 0 ? ` (+${modifier})` : '';
  const details = [
    reason,
    ...(payload.lamAirMekLandingControlModifierDetails ?? []),
  ].join('; ');
  return {
    text: `AirMek landing control: roll required${modifierText} (${details})`,
    unitId: payload.unitId,
  };
}
