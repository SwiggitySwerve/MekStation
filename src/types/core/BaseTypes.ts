/**
 * Legacy compatibility barrel for foundational BattleTech types.
 * Re-exports the canonical enums from `src/types` and provides the small
 * application-level helpers (`Result`, service interfaces, etc.) that the
 * rest of the app still consumes.
 */

import { TechBase, TechBaseFilter, RulesLevel, TechLevel } from '../TechBase';
import {
  ComponentType,
  ComponentCategory,
  EquipmentCategory,
} from '../ComponentType';
import type { ComponentConfiguration } from '../ComponentConfiguration';
import type {
  UnitType,
  UnitRole,
  UnitConfig,
  UnitQuirk,
} from '../Unit';
import { Severity } from '../Validation';

export { TechBase, TechBaseFilter, RulesLevel, TechLevel };
export { ComponentType, ComponentCategory, EquipmentCategory };
export { Severity };
export type { ComponentConfiguration, UnitType, UnitRole, UnitConfig, UnitQuirk };

export type EntityId = string | number;

type SuccessResult<T> = { readonly ok: true; readonly value: T };
type FailureResult<E> = { readonly ok: false; readonly error: E };

export type Result<T, E = Error> = SuccessResult<T> | FailureResult<E>;

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function failure<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface IService {
  readonly name: string;
  initialize?(): Promise<void> | void;
  cleanup?(): Promise<void> | void;
}

export interface IServiceEvent<TPayload = unknown> {
  readonly source: string;
  readonly type: string;
  readonly timestamp: Date;
  readonly data?: TPayload;
}

export type ServiceListener<TPayload = unknown> = (
  event: IServiceEvent<TPayload>,
) => void;

export interface IObservableService<TEvent extends IServiceEvent = IServiceEvent>
  extends IService {
  subscribe(listener: ServiceListener<TEvent>): () => void;
  unsubscribe(listener: ServiceListener<TEvent>): void;
}

export interface IServiceRegistry {
  register<T>(
    name: string,
    factory: () => T,
    lifetime?: 'singleton' | 'transient' | 'scoped',
    dependencies?: readonly string[],
    version?: string,
    description?: string,
  ): void;
  resolve<T>(name: string, scopeId?: EntityId): T | null;
  isRegistered(name: string): boolean;
  unregister(name: string): boolean;
  getRegisteredServices(): string[];
  getServiceInfo(name: string): unknown;
  initializeAll(): Promise<Result<void>>;
  cleanup(): Promise<void>;
  createScope(): EntityId;
  disposeScope(scopeId: EntityId): Promise<void>;
}

export function isValidTechBase(value: unknown): value is TechBase {
  return typeof value === 'string' && (
    value === TechBase.INNER_SPHERE ||
    value === TechBase.CLAN
  );
}

export function isValidTechBaseFilter(value: unknown): value is TechBaseFilter {
  return typeof value === 'string' && (
    value === TechBaseFilter.INNER_SPHERE ||
    value === TechBaseFilter.CLAN ||
    value === TechBaseFilter.MIXED
  );
}

export function isValidRulesLevel(value: unknown): value is RulesLevel {
  return typeof value === 'string' && (Object.values(RulesLevel) as string[]).includes(value);
}

export type TechBaseCode = 'IS' | 'Clan' | 'Mixed';

export const TechBaseUtil = {
  normalize(input: string | null | undefined, fallback: TechBase = TechBase.INNER_SPHERE): TechBase {
    if (!input) {
      return fallback;
    }
    const normalized = input.trim().toLowerCase();
    if (normalized === 'clan') {
      return TechBase.CLAN;
    }
    if (normalized === 'inner sphere' || normalized === 'is') {
      return TechBase.INNER_SPHERE;
    }
    if (normalized.startsWith('mixed') || normalized === 'both') {
      console.warn(`Mixed tech base "${input}" encountered; falling back to ${fallback}`);
      return fallback;
    }
    console.warn(`Unknown tech base "${input}", defaulting to ${fallback}`);
    return fallback;
  },

  /**
   * Convert free-form value into filter enum (Inner Sphere, Clan, Mixed).
   */
  toFilter(value: string | TechBase | TechBaseFilter | null | undefined): TechBaseFilter {
    if (!value) {
      return TechBaseFilter.INNER_SPHERE;
    }
    if (value === TechBaseFilter.MIXED) {
      return TechBaseFilter.MIXED;
    }
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : String(value).toLowerCase();
    if (normalized === 'clan') {
      return TechBaseFilter.CLAN;
    }
    if (normalized.startsWith('mixed') || normalized === 'both') {
      return TechBaseFilter.MIXED;
    }
    return TechBaseFilter.INNER_SPHERE;
  },

  toCode(techBase: TechBase | TechBaseFilter): TechBaseCode {
    if (techBase === TechBaseFilter.MIXED) {
      return 'Mixed';
    }
    return techBase === TechBase.CLAN ? 'Clan' : 'IS';
  },

  isValid(value: string): boolean {
    return isValidTechBaseFilter(value);
  },

  /**
   * Filter options (`Inner Sphere`, `Clan`, `Mixed`)
   */
  all(): TechBaseFilter[] {
    return [
      TechBaseFilter.INNER_SPHERE,
      TechBaseFilter.CLAN,
      TechBaseFilter.MIXED,
    ];
  },

  /**
   * Concrete tech base options (`Inner Sphere`, `Clan`)
   */
  bases(): TechBase[] {
    return [TechBase.INNER_SPHERE, TechBase.CLAN];
  },
};


