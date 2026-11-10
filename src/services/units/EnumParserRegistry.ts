/**
 * Legacy equipment technology and rules parsers.
 *
 * Unit loading uses its source adapters. These two exports remain the shared
 * equipment-loading boundary until their separately owned parity changes land.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

const TECH_BASE_MAP = new Map<string, TechBase>([
  ['CLAN', TechBase.CLAN],
  ['INNER_SPHERE', TechBase.INNER_SPHERE],
  ['INNER-SPHERE', TechBase.INNER_SPHERE],
  ['IS', TechBase.INNER_SPHERE],
  // MIXED/BOTH default to IS per spec
  ['BOTH', TechBase.INNER_SPHERE],
  ['MIXED', TechBase.INNER_SPHERE],
]);

const RULES_LEVEL_MAP = new Map<string, RulesLevel>([
  ['INTRODUCTORY', RulesLevel.INTRODUCTORY],
  ['STANDARD', RulesLevel.STANDARD],
  ['ADVANCED', RulesLevel.ADVANCED],
  ['EXPERIMENTAL', RulesLevel.EXPERIMENTAL],
  ['UNOFFICIAL', RulesLevel.EXPERIMENTAL],
]);

function parseFromMap<T>(
  value: string,
  map: Map<string, T>,
  defaultValue: T,
): T {
  const normalized = value.toUpperCase().trim();
  return map.get(normalized) ?? defaultValue;
}

export const parseTechBase = (value: string): TechBase =>
  parseFromMap(value, TECH_BASE_MAP, TechBase.INNER_SPHERE);

export const parseRulesLevel = (value: string): RulesLevel =>
  parseFromMap(value, RULES_LEVEL_MAP, RulesLevel.STANDARD);
