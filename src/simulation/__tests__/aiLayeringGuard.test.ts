/**
 * Layering guard for the terrain-aware AI modules.
 *
 * Covers the `Shared Terrain Movement-Cost Utility` requirement scenario
 * "Simulation layer does not import rendering code" — the AI pathfinder and
 * move scorer must source terrain cost from the shared sim utility and never
 * resolve an import into the rendering layer (`src/components/`).
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Shared Terrain Movement-Cost Utility
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/** Project-root-relative paths of the AI modules touched by this change. */
const AI_MODULE_FILES = [
  'src/simulation/ai/AITerrainPathfinder.ts',
  'src/simulation/ai/AITierRegistry.ts',
  'src/simulation/ai/MoveAI.ts',
  'src/simulation/ai/types.ts',
  'src/simulation/ai/behaviorVariants.ts',
  // Per `add-ai-coordination-tactics` (A3a): the lance-coordination modules
  // must source everything from the simulation layer — never rendering.
  'src/simulation/ai/AIThreatMap.ts',
  'src/simulation/ai/AIFireCoordinator.ts',
  'src/simulation/ai/AILancePlanner.ts',
  // Per `add-ai-advanced-systems` (A4): the advanced-systems modules consume
  // the electronic-warfare and fog-of-war primitives but must never import
  // rendering code or the multiplayer server layer.
  'src/simulation/ai/AIJumpTactics.ts',
  'src/simulation/ai/AIElectronicWarfareAdvisor.ts',
  'src/simulation/ai/AIVisionAdvisor.ts',
  'src/simulation/ai/BotPlayer.ts',
];

/**
 * Matches an ES import / re-export specifier — `from '...'` or `from "..."`.
 * Captures the module specifier so we can assert it does not reach into the
 * rendering layer.
 */
const IMPORT_SPECIFIER = /\bfrom\s+['"]([^'"]+)['"]/g;

describe('AI module layering — no rendering imports', () => {
  it.each(AI_MODULE_FILES)(
    '%s does not import from the rendering layer (src/components/)',
    (relativePath) => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf-8');
      const specifiers: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = IMPORT_SPECIFIER.exec(source)) !== null) {
        specifiers.push(match[1]);
      }

      for (const specifier of specifiers) {
        expect(specifier).not.toMatch(/(^|\/)components\//);
        expect(specifier).not.toContain('HexMapDisplay');
        expect(specifier).not.toContain('renderHelpers');
      }
    },
  );

  it('the AI pathfinder sources terrain cost from the shared sim utility', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/simulation/ai/AITerrainPathfinder.ts'),
      'utf-8',
    );
    expect(source).toContain('@/utils/gameplay/terrainMovementCost');
  });
});
