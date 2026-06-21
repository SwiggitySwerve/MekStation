import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { runSpecPurposeLint, type SpecPurposeConfig } from './spec-purpose-lint';

function writeSpec(root: string, capability: string, purpose: string): void {
  const dir = path.join(root, capability);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'spec.md'),
    [
      `# ${capability} Specification`,
      '',
      '## Purpose',
      '',
      purpose,
      '',
      '## Requirements',
      '',
      '### Requirement: Example',
      '',
      'The system SHALL have a testable requirement.',
      '',
      '#### Scenario: Example',
      '',
      '- **WHEN** validation runs',
      '- **THEN** validation passes',
      '',
    ].join('\n'),
  );
}

function writeConfig(root: string, config: SpecPurposeConfig): string {
  const configPath = path.join(root, 'spec-purpose-allowlist.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

function baseConfig(): SpecPurposeConfig {
  return {
    version: 1,
    placeholderAllowlist: [],
    duplicateOwnerAllowlist: [],
    codeHomeClaims: [],
    activeChangeOwnershipOrder: [],
  };
}

describe('spec-purpose-lint', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-purpose-lint-'));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('rejects a fresh archive placeholder Purpose', () => {
    const specRoot = path.join(tempRoot, 'specs');
    writeSpec(
      specRoot,
      'fresh-placeholder',
      'TBD - created by archiving change some-change. Update Purpose after archive.',
    );
    const configPath = writeConfig(tempRoot, baseConfig());

    const result = runSpecPurposeLint({
      root: tempRoot,
      specRoot,
      configPath,
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: 'fresh-placeholder',
          kind: 'archive-placeholder-purpose',
        }),
      ]),
    );
  });

  it('accepts a real Purpose', () => {
    const specRoot = path.join(tempRoot, 'specs');
    writeSpec(
      specRoot,
      'real-purpose',
      'Defines source-of-truth validation behavior for a concrete capability.',
    );
    const configPath = writeConfig(tempRoot, baseConfig());

    const result = runSpecPurposeLint({
      root: tempRoot,
      specRoot,
      configPath,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.trackedDebt).toHaveLength(0);
  });

  it('tracks an allowlisted placeholder without hiding new placeholders', () => {
    const specRoot = path.join(tempRoot, 'specs');
    writeSpec(
      specRoot,
      'legacy-placeholder',
      'TBD - created by archiving change old-change. Update Purpose after archive.',
    );
    writeSpec(
      specRoot,
      'fresh-placeholder',
      'TBD - created by archiving change new-change. Update Purpose after archive.',
    );
    const config = baseConfig();
    config.placeholderAllowlist.push({
      capability: 'legacy-placeholder',
      path: 'openspec/specs/legacy-placeholder/spec.md',
      owningChange: 'old-change',
      reason: 'Legacy placeholder tracked for backfill.',
    });
    const configPath = writeConfig(tempRoot, config);

    const result = runSpecPurposeLint({
      root: tempRoot,
      specRoot,
      configPath,
    });

    expect(result.trackedDebt).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: 'legacy-placeholder',
          kind: 'archive-placeholder-purpose',
          severity: 'tracked',
        }),
      ]),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: 'fresh-placeholder',
          kind: 'archive-placeholder-purpose',
          severity: 'error',
        }),
      ]),
    );
  });

  it('prefers canonical ## Purpose over legacy ### Purpose fallback', () => {
    const specRoot = path.join(tempRoot, 'specs');
    const dir = path.join(specRoot, 'duplicate-purpose');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'spec.md'),
      [
        '# duplicate-purpose Specification',
        '',
        '## Overview',
        '',
        '### Purpose',
        '',
        'This overview purpose is real but is not the canonical section.',
        '',
        '## Purpose',
        '',
        'TBD - created by archiving change duplicate-change. Update Purpose after archive.',
        '',
        '## Requirements',
        '',
      ].join('\n'),
    );
    const configPath = writeConfig(tempRoot, baseConfig());

    const result = runSpecPurposeLint({
      root: tempRoot,
      specRoot,
      configPath,
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: 'duplicate-purpose',
          kind: 'archive-placeholder-purpose',
        }),
      ]),
    );
  });
});
