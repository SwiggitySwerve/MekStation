# Spec Delta: Simulation System

## ADDED Requirements

### Requirement: BiomeGenerator Always Returns a Valid Biome

The BiomeGenerator SHALL always return a valid biome value drawn from the four canonical variants (`temperate`, `desert`, `mountain`, `urban`). The previous placeholder value `'none'` is removed from the type union and rejected at the scenario-config validator boundary; legacy callers that pass `'none'` receive a deterministic fallback to `'temperate'` with a `console.warn`. This closes playtest gap #5 (the placeholder was excluded from Phase-1 swarm sweeps because no meaningful terrain could be generated for it).

**Priority**: Low

#### Scenario: Biome enum no longer accepts 'none'

**GIVEN** TypeScript code that attempts `const b: Biome = 'none'`
**WHEN** the compiler runs
**THEN** the compile SHALL fail with a type error (the `'none'` variant is no longer part of the `Biome` union)

#### Scenario: Legacy config with biome: 'none' falls back to temperate

**GIVEN** a legacy swarm config or scenario JSON that contains `biome: 'none'`
**WHEN** the BiomeGenerator processes the config
**THEN** the generator SHALL emit a `console.warn` identifying the offending caller
**AND** SHALL generate a `temperate`-biome scenario
**AND** SHALL NOT silently corrupt the run (the warning ensures regressions in legacy data surface in CI)

#### Scenario: Scenario-config validator rejects 'none'

**GIVEN** an external caller that POSTs a scenario config with `biome: 'none'` to the API boundary
**WHEN** the validator runs
**THEN** the validator SHALL reject the config with an error like `biome 'none' is no longer supported — use one of temperate, desert, mountain, urban`
**AND** the error message SHALL reference this OpenSpec change as the migration path

#### Scenario: Phase-1 swarm matrix runs without 'none' references

**GIVEN** the Phase-1 swarm-config sweep
**WHEN** the matrix re-runs after migration
**THEN** zero configs SHALL reference `biome: 'none'`
**AND** zero `console.warn` calls SHALL fire from the BiomeGenerator legacy-fallback path during the sweep
