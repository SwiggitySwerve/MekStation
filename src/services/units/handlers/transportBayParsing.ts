import { BayType, ITransportBay } from '@/types/unit/CapitalShipInterfaces';

export interface ITransportBayTypeRule {
  readonly tokens: readonly string[];
  readonly type: BayType;
}

export const DEFAULT_CAPITAL_TRANSPORT_BAY_RULES: readonly ITransportBayTypeRule[] =
  [
    { tokens: ['mech'], type: BayType.MECH },
    { tokens: ['vehicle'], type: BayType.VEHICLE },
    { tokens: ['fighter', 'asf'], type: BayType.FIGHTER },
    { tokens: ['smallcraft'], type: BayType.SMALL_CRAFT },
    { tokens: ['cargo'], type: BayType.CARGO },
  ];

export function parseCapitalTransporterString(
  transporter: string,
  bayNumber: number,
  rules: readonly ITransportBayTypeRule[] = DEFAULT_CAPITAL_TRANSPORT_BAY_RULES,
): ITransportBay | null {
  const parts = transporter.toLowerCase().split(':');
  if (parts.length < 2) return null;

  const [typeStr, rawCapacity, rawDoors] = parts;
  const type =
    rules.find((rule) => rule.tokens.some((token) => typeStr.includes(token)))
      ?.type ?? BayType.CARGO;

  return {
    type,
    capacity: parseFloat(rawCapacity) || 0,
    doors: rawDoors !== undefined ? parseInt(rawDoors, 10) : 1,
    bayNumber,
  };
}
