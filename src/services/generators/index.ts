/**
 * Generator Services Index
 * Exports all generator services for scenario creation.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

export * from './OpForGeneratorService';
export * from './ScenarioGeneratorService';

// Export singleton instances
export { opForGenerator } from './OpForGeneratorService';
export { scenarioGenerator } from './ScenarioGeneratorService';
