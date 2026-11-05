import * as fs from 'fs';
import * as path from 'path';

import {
  expectJavaCatalogAddition,
  javaCatalogAdditionById,
} from '@/__tests__/helpers/equipmentJavaAdditions.test-helpers';
import { registryPreviousId } from '@/utils/construction/equipmentBVCatalogData';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

// Known missing targets: these DIRECT_ALIAS_MAP entries point to catalog IDs that
// don't exist yet. They are documented here so the test suite passes while tracking
// the gaps. When catalog entries are added, remove them from this set.
const KNOWN_MISSING_TARGETS = new Set([
  'rac-10', // rotary-ac-10 → rac-10 (catalog only has rac-2, rac-5)
  'rocket-launcher-10', // multiple aliases → rocket-launcher-10 (catalog uses rl10)
  'rocket-launcher-15', // clrocketlauncher15prototype → rocket-launcher-15 (catalog uses rl15)
  'rocket-launcher-20', // multiple aliases → rocket-launcher-20 (catalog uses rl20)
]);

// Known conflicts: DIRECT_ALIAS_MAP keys that also exist in name-mappings.json
// but map to DIFFERENT targets. DIRECT_ALIAS_MAP takes priority (checked first
// in normalizeEquipmentId), so these are intentional overrides. The name-mappings
// targets are often BA (Battle Armor) variants while DIRECT_ALIAS_MAP targets are
// standard Mech-scale equivalents.
const KNOWN_CONFLICTS = new Set([
  'isbpod', // Java ISBPod addition; source facts asserted below, old b-pod lookup retained.
  'clbpod', // Java ISBPod owns the Clan lookup spelling too.
  'issrm4os', // Java ISSRM4OS addition; old srm-4 lookup retained.
  'islongtomcannon', // Java ISLongTomCannon addition; old long-tom lookup retained.
  'sniper', // Approved native Sniper artillery reroute; artillery/Sniper.java, BV 85.
  // These legacy name mappings target absent IDs; the aliases select the
  // represented pinned Java identity (covered by sourceAliases tests).
  'binary laser (blazer) cannon',
  'issmallvsplaser',
  'ismediumvsplaser',
  'islargevsplaser',
  'clheavymediumlaser',
  'clheavylargelaser',
  'isplasmarifle',
  'clplasmacannon',
  'clheavysmalllaser',
  'clmicropulselaser',
  'clermediumpulselaser',
  'clerlargepulselaser',
  'clerflamer',
  'flamer (vehicle)', // name map -> absent flamer-vehicle; Java ISVehicleFlamer is vehicle-flamer.
]);

interface AliasEntry {
  key: string;
  target: string;
}

function extractAliasTable(fileName: string, tableName: string): AliasEntry[] {
  const srcPath = path.resolve(
    __dirname,
    '../../../../utils/construction/equipmentBV',
    fileName,
  );
  const src = fs.readFileSync(srcPath, 'utf8');

  const startIdx = src.indexOf(`const ${tableName}`);
  if (startIdx === -1) throw new Error(`${tableName} not found in source`);

  const braceStart = src.indexOf('{', startIdx);
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }
  if (braceEnd === -1)
    throw new Error('Could not find end of DIRECT_ALIAS_MAP');

  const block = src.substring(braceStart + 1, braceEnd);
  const entries: AliasEntry[] = [];
  const lineRe = /^\s*(?:['"]([^'"]+)['"]|([^'":\s]+))\s*:\s*'([^']+)'/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(block)) !== null) {
    entries.push({ key: (m[1] ?? m[2]).trim(), target: m[3] });
  }

  return entries;
}

function extractDirectAliasMap(): AliasEntry[] {
  return [
    ...extractAliasTable('normalizationPatterns.ts', 'DIRECT_ALIAS_MAP'),
    ...extractAliasTable('sourceLookupAliases.ts', 'SOURCE_LOOKUP_ALIASES'),
  ];
}

interface CatalogFile {
  items: Array<{ id: string; [k: string]: unknown }>;
}

function buildCatalogIdSet(): Set<string> {
  const basePath = path.resolve(
    __dirname,
    '../../../../../public/data/equipment/official',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const indexData = require(path.join(basePath, 'index.json')) as {
    files: Record<string, Record<string, string>>;
  };

  const ids = new Set<string>();
  for (const category of [
    'weapons',
    'ammunition',
    'electronics',
    'miscellaneous',
  ]) {
    const files = Object.values(indexData.files[category]);
    for (const file of files) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const data = require(path.join(basePath, file)) as CatalogFile;
      if (data?.items) {
        for (const item of data.items) {
          ids.add(item.id);
        }
      }
    }
  }

  return ids;
}

function loadNameMappingsLowerIndex(): Map<string, string> {
  const nmPath = path.resolve(
    __dirname,
    '../../../../../public/data/equipment/name-mappings.json',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(nmPath) as Record<string, string>;
  const index = new Map<string, string>();
  for (const [key, value] of Object.entries(raw)) {
    if (key === '$schema') continue;
    const lower = key.toLowerCase();
    if (!index.has(lower)) {
      index.set(lower, value);
    }
  }
  return index;
}

describe('DIRECT_ALIAS_MAP validation', () => {
  let aliasEntries: AliasEntry[];
  let catalogIds: Set<string>;
  let nameMappingsIndex: Map<string, string>;

  beforeAll(() => {
    aliasEntries = extractDirectAliasMap();
    catalogIds = buildCatalogIdSet();
    nameMappingsIndex = loadNameMappingsLowerIndex();
  });

  it('should have extracted a reasonable number of entries (>200)', () => {
    expect(aliasEntries.length).toBeGreaterThan(200);
  });

  it('should have loaded a populated equipment catalog (>1000 IDs)', () => {
    expect(catalogIds.size).toBeGreaterThan(1000);
  });

  describe('target validity', () => {
    it('every DIRECT_ALIAS_MAP target should exist in the equipment catalog (excluding known missing)', () => {
      const unexpectedMissing: AliasEntry[] = [];
      const expectedMissing: AliasEntry[] = [];

      for (const entry of aliasEntries) {
        if (!catalogIds.has(entry.target)) {
          if (KNOWN_MISSING_TARGETS.has(entry.target)) {
            expectedMissing.push(entry);
          } else {
            unexpectedMissing.push(entry);
          }
        }
      }

      if (unexpectedMissing.length > 0) {
        const details = unexpectedMissing
          .map((e) => `  ${e.key} → ${e.target}`)
          .join('\n');
        throw new Error(
          `Found ${unexpectedMissing.length} DIRECT_ALIAS_MAP entries with targets NOT in equipment catalog:\n${details}`,
        );
      }
    });

    it('known missing targets should still be tracked', () => {
      const actualMissing = new Set(
        aliasEntries
          .filter((e) => !catalogIds.has(e.target))
          .map((e) => e.target),
      );
      Array.from(KNOWN_MISSING_TARGETS).forEach((known) => {
        expect(actualMissing.has(known)).toBe(true);
      });
    });

    it('should not have duplicate keys in DIRECT_ALIAS_MAP', () => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const entry of aliasEntries) {
        if (seen.has(entry.key)) dupes.push(entry.key);
        seen.add(entry.key);
      }
      expect(dupes).toEqual([]);
    });

    it('no target should be empty or whitespace', () => {
      const bad = aliasEntries.filter(
        (e) => !e.target || e.target.trim() === '',
      );
      expect(bad).toEqual([]);
    });
  });

  describe('name-mappings.json conflict detection', () => {
    it('should have no NEW conflicts between DIRECT_ALIAS_MAP and name-mappings.json', () => {
      const unexpectedConflicts: Array<{
        key: string;
        aliasTarget: string;
        nameMappingTarget: string;
      }> = [];

      for (const entry of aliasEntries) {
        const nmTarget = nameMappingsIndex.get(entry.key.toLowerCase());
        if (!catalogIds.has(entry.target) && nmTarget) {
          // A formerly missing variant is now a pinned Java addition, not a fuzzy substitution.
          expect(javaCatalogAdditionById.has(nmTarget)).toBe(true);
          expectJavaCatalogAddition(getEquipmentEntry(entry.key), 'bv');
          continue;
        }
        if (
          nmTarget &&
          javaCatalogAdditionById.has(nmTarget) &&
          catalogIds.has(entry.target)
        ) {
          expectJavaCatalogAddition(getEquipmentEntry(nmTarget), 'bv');
          // Only an approved route (registry-routing.json nativeNames) moves the
          // name to its Java record; every other alias keeps its catalog target.
          expect(getEquipmentEntry(entry.key)?.id).toBe(
            registryPreviousId(nmTarget, entry.key) ? nmTarget : entry.target,
          );
        }
        if (entry.key.toLowerCase() === 'sniper')
          expectJavaCatalogAddition(getEquipmentEntry('Sniper'), 'bv');
        if (nmTarget && nmTarget !== entry.target) {
          if (!KNOWN_CONFLICTS.has(entry.key.toLowerCase())) {
            unexpectedConflicts.push({
              key: entry.key,
              aliasTarget: entry.target,
              nameMappingTarget: nmTarget,
            });
          }
        }
      }

      if (unexpectedConflicts.length > 0) {
        const details = unexpectedConflicts
          .map(
            (c) =>
              `  ${c.key}: ALIAS→${c.aliasTarget} vs NAME-MAP→${c.nameMappingTarget}`,
          )
          .join('\n');
        throw new Error(
          `Found ${unexpectedConflicts.length} NEW conflicts between DIRECT_ALIAS_MAP and name-mappings.json:\n${details}`,
        );
      }
    });

    it('known conflicts should still exist (remove from KNOWN_CONFLICTS when resolved)', () => {
      for (const knownKey of Array.from(KNOWN_CONFLICTS)) {
        const entry = aliasEntries.find(
          (e) => e.key.toLowerCase() === knownKey,
        );
        if (!entry) continue; // entry was removed from DIRECT_ALIAS_MAP
        const nmTarget = nameMappingsIndex.get(knownKey);
        if (nmTarget) {
          expect(nmTarget).not.toBe(entry.target);
        }
      }
    });
  });

  describe('alias map structural integrity', () => {
    it('all keys should be lowercase/kebab-case or concatenated lowercase', () => {
      const badKeys = aliasEntries.filter(
        (e) => e.key !== e.key.toLowerCase() && !/\[/.test(e.key),
      );
      expect(badKeys).toEqual([]);
    });

    it('all targets should be lowercase kebab-case or concatenated lowercase', () => {
      const badTargets = aliasEntries.filter(
        (e) => e.target !== e.target.toLowerCase(),
      );
      expect(badTargets).toEqual([]);
    });

    it('no key should map to itself unnecessarily (target should differ from key, unless identity mapping for clarity)', () => {
      const selfMaps = aliasEntries.filter((e) => e.key === e.target);
      // Identity mappings are acceptable when used for explicit documentation
      // (e.g., 'heavy-ppc': 'heavy-ppc') but should be few
      expect(selfMaps.length).toBeLessThan(15);
    });
  });
});
