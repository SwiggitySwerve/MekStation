import { FACTION_NAMES } from '@/constants/scenario/rats';
import {
  BiomeType,
  OpForSkillLevel,
  ScenarioObjectiveType,
} from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

export interface GeneratorConfig {
  scenarioType: ScenarioObjectiveType | '';
  faction: string;
  era: Era;
  biome: BiomeType | '';
  difficulty: number;
  skillLevel: OpForSkillLevel;
  maxModifiers: number;
  allowNegativeModifiers: boolean;
}

export const SCENARIO_TYPE_OPTIONS = [
  { value: '', label: 'Random (Any Type)' },
  { value: ScenarioObjectiveType.Destroy, label: 'Standup Fight' },
  { value: ScenarioObjectiveType.Capture, label: 'Base Assault' },
  { value: ScenarioObjectiveType.Defend, label: 'Defensive Hold' },
  { value: ScenarioObjectiveType.Escort, label: 'Convoy Escort' },
  { value: ScenarioObjectiveType.Recon, label: 'Reconnaissance' },
  { value: ScenarioObjectiveType.Breakthrough, label: 'Breakthrough' },
];

export const FACTION_OPTIONS = Object.entries(FACTION_NAMES).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const ERA_OPTIONS = [
  {
    value: Era.LATE_SUCCESSION_WARS,
    label: 'Late Succession Wars (2901-3019)',
  },
  { value: Era.RENAISSANCE, label: 'Renaissance (3020-3049)' },
  { value: Era.CLAN_INVASION, label: 'Clan Invasion (3050-3061)' },
  { value: Era.CIVIL_WAR, label: 'Civil War (3062-3067)' },
  { value: Era.JIHAD, label: 'Jihad (3068-3081)' },
  { value: Era.DARK_AGE, label: 'Dark Age (3082-3150)' },
  { value: Era.IL_CLAN, label: 'ilClan (3151+)' },
];

export const BIOME_OPTIONS = [
  { value: '', label: 'Random (Based on Scenario)' },
  { value: BiomeType.Plains, label: 'Plains' },
  { value: BiomeType.Forest, label: 'Forest' },
  { value: BiomeType.Urban, label: 'Urban' },
  { value: BiomeType.Desert, label: 'Desert' },
  { value: BiomeType.Badlands, label: 'Badlands' },
  { value: BiomeType.Arctic, label: 'Arctic' },
  { value: BiomeType.Swamp, label: 'Swamp' },
  { value: BiomeType.Jungle, label: 'Jungle' },
  { value: BiomeType.Mountains, label: 'Mountains' },
  { value: BiomeType.Volcanic, label: 'Volcanic' },
];

export const DIFFICULTY_OPTIONS = [
  { value: '0.5', label: 'Easy (50% BV)' },
  { value: '0.75', label: 'Normal-Easy (75% BV)' },
  { value: '1.0', label: 'Normal (100% BV)' },
  { value: '1.25', label: 'Hard (125% BV)' },
  { value: '1.5', label: 'Very Hard (150% BV)' },
  { value: '2.0', label: 'Extreme (200% BV)' },
];

export const SKILL_LEVEL_OPTIONS = [
  { value: OpForSkillLevel.Green, label: 'Green (5/6)' },
  { value: OpForSkillLevel.Regular, label: 'Regular (4/5)' },
  { value: OpForSkillLevel.Veteran, label: 'Veteran (3/4)' },
  { value: OpForSkillLevel.Elite, label: 'Elite (2/3)' },
  { value: OpForSkillLevel.Legendary, label: 'Legendary (1/2)' },
  { value: OpForSkillLevel.Mixed, label: 'Mixed (Varied)' },
];

export const MODIFIER_COUNT_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: '1 Modifier' },
  { value: '2', label: '2 Modifiers' },
  { value: '3', label: '3 Modifiers' },
];
