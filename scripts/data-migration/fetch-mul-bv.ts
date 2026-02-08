#!/usr/bin/env ts-node
/**
 * Fetch BV values from the Master Unit List (MUL) API.
 *
 * Usage:
 *   npx tsx scripts/data-migration/fetch-mul-bv.ts              # Fetch and cache
 *   npx tsx scripts/data-migration/fetch-mul-bv.ts --update      # Also update index.json
 *   npx tsx scripts/data-migration/fetch-mul-bv.ts --resume      # Resume from cache
 */

import * as fs from 'fs';
import * as path from 'path';

const INDEX_PATH = path.resolve('public/data/units/battlemechs/index.json');
const CACHE_PATH = path.resolve('scripts/data-migration/mul-bv-cache.json');
const MUL_API_BASE = 'http://masterunitlist.info/Unit/QuickList';

const DELAY_MS = 300;
const MAX_RETRIES = 3;

interface IndexEntry {
  id: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  year: number;
  role: string;
  path: string;
  rulesLevel?: string;
  cost?: number;
  bv?: number;
}

interface IndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: IndexEntry[];
}

interface MULUnit {
  Id: number;
  Name: string;
  Class: string;
  Variant: string;
  Tonnage: number;
  BattleValue: number;
  Cost: number;
  Rules: string;
  Technology: { Id: number; Name: string };
  Type: { Id: number; Name: string };
}

interface MULResponse {
  Units: MULUnit[];
}

interface CacheEntry {
  mulId: number | null;
  mulName: string | null;
  mulBV: number | null;
  ourName: string;
  matchType: 'exact' | 'fuzzy' | 'not-found' | 'error';
  fetchedAt: string;
}

interface CacheFile {
  fetchedAt: string;
  totalFetched: number;
  chassisFetched: string[];
  entries: Record<string, CacheEntry>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries: number = MAX_RETRIES,
): Promise<MULResponse | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 429) {
          const backoff = Math.pow(2, attempt) * 1000;
          console.warn(`  Rate limited, backing off ${backoff}ms...`);
          await sleep(backoff);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as MULResponse;
    } catch (error) {
      if (attempt === retries) {
        console.error(`  Failed after ${retries} attempts: ${error}`);
        return null;
      }
      await sleep(1000 * attempt);
    }
  }
  return null;
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[''`\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatch(
  mulUnits: MULUnit[],
  chassis: string,
  model: string,
  tonnage: number,
): { unit: MULUnit; matchType: 'exact' | 'fuzzy' } | null {
  const ourFullName = normalizeName(`${chassis} ${model}`);
  const ourChassis = normalizeName(chassis);
  const ourModel = normalizeName(model);

  const mechs = mulUnits.filter(
    (u) => u.Type && u.Type.Name === 'BattleMech',
  );

  for (const unit of mechs) {
    if (normalizeName(unit.Name) === ourFullName) {
      return { unit, matchType: 'exact' };
    }
  }

  for (const unit of mechs) {
    if (
      normalizeName(unit.Class) === ourChassis &&
      normalizeName(unit.Variant) === ourModel
    ) {
      return { unit, matchType: 'exact' };
    }
  }

  for (const unit of mechs) {
    if (
      unit.Tonnage === tonnage &&
      normalizeName(unit.Name).includes(ourModel)
    ) {
      return { unit, matchType: 'fuzzy' };
    }
  }

  return null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldUpdate = args.includes('--update');
  const shouldResume = args.includes('--resume');

  console.log('=== MUL BV Fetcher (by chassis) ===');
  console.log(`Mode: ${shouldUpdate ? 'FETCH + UPDATE' : 'FETCH ONLY'}\n`);

  const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
  const index: IndexFile = JSON.parse(indexContent);
  console.log(`Loaded ${index.units.length} units from index.json`);

  let cache: CacheFile;
  if (shouldResume && fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    console.log(`Resuming: ${cache.chassisFetched.length} chassis already done`);
  } else {
    cache = {
      fetchedAt: new Date().toISOString(),
      totalFetched: 0,
      chassisFetched: [],
      entries: {},
    };
  }

  const chassisGroups = new Map<string, IndexEntry[]>();
  for (const unit of index.units) {
    const group = chassisGroups.get(unit.chassis) || [];
    group.push(unit);
    chassisGroups.set(unit.chassis, group);
  }

  const fetchedSet = new Set(cache.chassisFetched);
  const toFetch = [...chassisGroups.keys()].filter((c) => !fetchedSet.has(c));
  console.log(
    `Chassis: ${chassisGroups.size} total, ${toFetch.length} to fetch\n`,
  );

  if (toFetch.length > 0) {
    let chassisDone = 0;
    let matched = 0;
    let notFound = 0;
    let errors = 0;

    for (const chassis of toFetch) {
      const units = chassisGroups.get(chassis)!;
      const url = `${MUL_API_BASE}?Name=${encodeURIComponent(chassis)}`;

      const response = await fetchWithRetry(url);

      if (!response) {
        for (const unit of units) {
          cache.entries[unit.id] = {
            mulId: null,
            mulName: null,
            mulBV: null,
            ourName: `${unit.chassis} ${unit.model}`,
            matchType: 'error',
            fetchedAt: new Date().toISOString(),
          };
          errors++;
        }
      } else {
        for (const unit of units) {
          const match = findMatch(
            response.Units,
            unit.chassis,
            unit.model,
            unit.tonnage,
          );

          if (match) {
            cache.entries[unit.id] = {
              mulId: match.unit.Id,
              mulName: match.unit.Name,
              mulBV: match.unit.BattleValue,
              ourName: `${unit.chassis} ${unit.model}`,
              matchType: match.matchType,
              fetchedAt: new Date().toISOString(),
            };
            matched++;
          } else {
            cache.entries[unit.id] = {
              mulId: null,
              mulName: null,
              mulBV: null,
              ourName: `${unit.chassis} ${unit.model}`,
              matchType: 'not-found',
              fetchedAt: new Date().toISOString(),
            };
            notFound++;
          }
        }
      }

      cache.chassisFetched.push(chassis);
      chassisDone++;
      cache.totalFetched = Object.keys(cache.entries).length;

      if (chassisDone % 25 === 0 || chassisDone === toFetch.length) {
        const pct = ((chassisDone / toFetch.length) * 100).toFixed(1);
        console.log(
          `  [${pct}%] Chassis: ${chassisDone}/${toFetch.length} | Matched: ${matched} | Not found: ${notFound} | Errors: ${errors}`,
        );
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      }

      await sleep(DELAY_MS);
    }

    cache.fetchedAt = new Date().toISOString();
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`\nCache saved: ${CACHE_PATH}`);
  }

  const entries = Object.values(cache.entries);
  const exactMatches = entries.filter((e) => e.matchType === 'exact');
  const fuzzyMatches = entries.filter((e) => e.matchType === 'fuzzy');
  const notFoundEntries = entries.filter((e) => e.matchType === 'not-found');
  const errorEntries = entries.filter((e) => e.matchType === 'error');
  const withBV = entries.filter((e) => e.mulBV !== null && e.mulBV > 0);
  const zeroBV = entries.filter((e) => e.mulBV === 0);

  console.log('\n=== SUMMARY ===');
  console.log(`Total cached: ${entries.length}`);
  console.log(`Exact matches: ${exactMatches.length}`);
  console.log(`Fuzzy matches: ${fuzzyMatches.length}`);
  console.log(`Not found: ${notFoundEntries.length}`);
  console.log(`Errors: ${errorEntries.length}`);
  console.log(`With BV > 0: ${withBV.length}`);
  console.log(`With BV = 0: ${zeroBV.length}`);

  if (withBV.length > 0) {
    let within1 = 0;
    let within5 = 0;
    let total = 0;

    for (const unit of index.units) {
      const entry = cache.entries[unit.id];
      if (!entry || !entry.mulBV || entry.mulBV === 0) continue;
      total++;
      const pctDiff =
        entry.mulBV > 0
          ? (Math.abs((unit.bv ?? 0) - entry.mulBV) / entry.mulBV) * 100
          : 0;
      if (pctDiff <= 1) within1++;
      if (pctDiff <= 5) within5++;
    }

    console.log(`\nOld index BV vs MUL BV (${total} units):`);
    console.log(
      `  Within 1%: ${within1} (${((within1 / total) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  Within 5%: ${within5} (${((within5 / total) * 100).toFixed(1)}%)`,
    );

    type Mismatch = {
      name: string;
      oldBV: number;
      mulBV: number;
      diff: number;
      pct: number;
    };
    const mismatches: Mismatch[] = [];
    for (const unit of index.units) {
      const entry = cache.entries[unit.id];
      if (!entry || !entry.mulBV || entry.mulBV === 0) continue;
      const diff = (unit.bv ?? 0) - entry.mulBV;
      const pct = entry.mulBV > 0 ? (diff / entry.mulBV) * 100 : 0;
      mismatches.push({
        name: `${unit.chassis} ${unit.model}`,
        oldBV: unit.bv ?? 0,
        mulBV: entry.mulBV,
        diff,
        pct,
      });
    }

    mismatches.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    console.log('\nTop 20 worst mismatches (old index vs MUL):');
    console.log(
      'Unit                                    Old BV   MUL BV    Diff      %',
    );
    for (const m of mismatches.slice(0, 20)) {
      const name = m.name.padEnd(40).slice(0, 40);
      const oldBV = String(m.oldBV).padStart(8);
      const mulBV = String(m.mulBV).padStart(8);
      const diff = (m.diff >= 0 ? '+' : '') + String(m.diff).padStart(6);
      const pct =
        (m.pct >= 0 ? '+' : '') + m.pct.toFixed(1).padStart(6) + '%';
      console.log(`${name}${oldBV}${mulBV}${diff}${pct}`);
    }
  }

  if (shouldUpdate) {
    console.log('\n=== UPDATING INDEX.JSON ===');
    let updated = 0;
    let unchanged = 0;
    let noMulBV = 0;

    for (const unit of index.units) {
      const entry = cache.entries[unit.id];
      if (!entry || entry.mulBV === null || entry.mulBV === 0) {
        noMulBV++;
        continue;
      }
      if (unit.bv !== entry.mulBV) {
        unit.bv = entry.mulBV;
        updated++;
      } else {
        unchanged++;
      }
    }

    index.generatedAt = new Date().toISOString();
    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${unchanged}`);
    console.log(`No MUL BV: ${noMulBV}`);
    console.log(`Saved: ${INDEX_PATH}`);
  }

  if (notFoundEntries.length > 0) {
    console.log(`\n=== NOT FOUND (${notFoundEntries.length}) ===`);
    const show = notFoundEntries.slice(0, 50);
    for (const entry of show) {
      console.log(`  ${entry.ourName}`);
    }
    if (notFoundEntries.length > 50) {
      console.log(`  ... and ${notFoundEntries.length - 50} more`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
