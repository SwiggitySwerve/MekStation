import { IHexCoordinate } from '@/types/gameplay';

export type ECMType = 'guardian' | 'angel' | 'clan';

export type ECMMode = 'ecm' | 'eccm' | 'off';

export interface IECMSuite {
  readonly type: ECMType;
  readonly mode: ECMMode;
  readonly operational: boolean;
  readonly entityId: string;
  readonly teamId: string;
  readonly position: IHexCoordinate;
}

export type ActiveProbeType =
  | 'beagle'
  | 'bloodhound'
  | 'clan-active-probe'
  | 'light-active-probe'
  | 'watchdog-cews'
  | 'nova-cews';

export interface IActiveProbe {
  readonly type: ActiveProbeType;
  readonly operational: boolean;
  readonly entityId: string;
  readonly teamId: string;
  readonly position: IHexCoordinate;
}

export interface IStealthArmor {
  readonly equipped: boolean;
  readonly entityId: string;
  readonly teamId: string;
}

export interface IECMStatus {
  readonly ecmProtected: boolean;
  readonly ecmDisrupted: boolean;
  readonly electronicsNullified: boolean;
  readonly friendlyECMSources: readonly string[];
  readonly enemyECMSources: readonly string[];
  readonly eccmSources: readonly string[];
  readonly bapCounterSources: readonly string[];
}

export interface IStealthModifier {
  readonly modifier: number;
  readonly active: boolean;
  readonly description: string;
}

export interface IElectronicWarfareState {
  readonly ecmSuites: readonly IECMSuite[];
  readonly activeProbes: readonly IActiveProbe[];
}

export type StealthRangeBracket = 'short' | 'medium' | 'long';
