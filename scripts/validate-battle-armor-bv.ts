#!/usr/bin/env npx tsx
/**
 * Battle Armor BV Parity Harness
 *
 * Loads BA unit JSONs from `public/data/units/battlearmor/`, runs the
 * `calculateBattleArmorBV` calculator against each squad, compares the
 * result to the `mulBV` / `bv` field embedded in the unit JSON, and emits
 * a parity report at `validation-output/battle-armor-bv-validation-report.json`.
 *
 * If the data directory is missing or empty (which is the expected state
 * pre-ingest — BA unit JSONs are a follow-up task) the harness still emits
 * a valid report documenting the defer so downstream tooling and CI can
 * rely on its presence.
 *
 * Usage:
 *   npx tsx scripts/validate-battle-armor-bv.ts
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 *       Requirement: BA BV Parity Harness
 */

import * as fs from 'fs';
import * as path from 'path';

import { BAArmorType, BAManipulator, BAWeightClass } from '../src/types/unit/BattleArmorInterfaces';
import {
  calculateBattleArmorBV,
  type BAAmmoBVMount,
  type BAWeaponBVMount,
  type IBattleArmorBVInput,
} from '../src/utils/construction/battlearmor/battleArmorBV';

// =============================================================================
// Paths
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data', 'units', 'battlearmor');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'validation-output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'battle-armor-bv-validation-report.json');

// =============================================================================
// Report Types
// =============================================================================

/**
 * Per-squad validation entry. `mulBV` is the reference (MegaMekLab / MUL),
 * `computedBV` is what our calculator produced.
 */
interface BASquadResult {
  unitId: string;
  chassis: string;
  model: string;
  weightClass: string;
  squadSize: number;
  mulBV: number | null;
  computedBV: number;
  delta: number | null;
  deltaPct: number | null;
}

type ReportStatus = 'ok' | 'deferred';

interface BAValidationReport {
  generatedAt: string;
  status: ReportStatus;
  reason?: string;
  dataDir: string;
  summary: {
    total: number;
    within1pct: number;
    within5pct: number;
    exact: number;
    missingReference: number;
  };
  squads: BASquadResult[];
}

// =============================================================================
// Unit JSON shape (permissive — we only read what we need)
// =============================================================================

/**
 * Minimal BA unit JSON shape. Only the fields the BV harness consumes are
 * typed; extra fields are ignored. The real shape is locked down once a
 * BA unit JSON ingest task lands (tracked in the change notepad).
 */
interface BAUnitJSON {
  id?: string;
  chassis?: string;
  model?: string;
  name?: string;
  weightClass?: string;
  squadSize?: number;
  /** Reference BV from MUL / MegaMekLab. Either field may be used. */
  mulBV?: number;
  bv?: number;
  /** Ground MP per trooper. */
  groundMP?: number;
  /** Jump MP per trooper. */
  jumpMP?: number;
  /** UMU MP per trooper. */
  umuMP?: number;
  /** Armor points per trooper. */
  armorPointsPerTrooper?: number;
  /** Armor type — string matching BAArmorType values (e.g. "Standard BA"). */
  armorType?: string;
  /** Manipulator per arm — matches BAManipulator values. */
  leftManipulator?: string;
  rightManipulator?: string;
  /** Weapons per trooper. */
  weapons?: Array<string | { id: string; bvOverride?: number }>;
  /** Ammo bins per trooper. */
  ammo?: Array<string | { id: string; bvOverride?: number }>;
  /** Swarm-capable (Magnetic Clamp). */
  hasMagneticClamp?: boolean;
  /** Pilot skill overrides — default to 4/5 baseline. */
  gunnery?: number;
  piloting?: number;
}

// =============================================================================
// Enum coercion
// =============================================================================

/**
 * Coerce a permissive string from a unit JSON into a `BAWeightClass`. Falls
 * back to `LIGHT` if the string doesn't match a known class.
 */
function coerceWeightClass(v: string | undefined): BAWeightClass {
  if (!v) return BAWeightClass.LIGHT;
  const norm = v.trim().toLowerCase();
  if (norm === 'pa(l)' || norm === 'pa_l' || norm === 'pal') return BAWeightClass.PA_L;
  if (norm === 'light') return BAWeightClass.LIGHT;
  if (norm === 'medium') return BAWeightClass.MEDIUM;
  if (norm === 'heavy') return BAWeightClass.HEAVY;
  if (norm === 'assault') return BAWeightClass.ASSAULT;
  return BAWeightClass.LIGHT;
}

/**
 * Coerce a permissive armor-type string onto a `BAArmorType`. Unknown
 * values fall through to `STANDARD` (BV multiplier 1.0).
 */
function coerceArmorType(v: string | undefined): BAArmorType {
  if (!v) return BAArmorType.STANDARD;
  const norm = v.trim().toLowerCase().replace(/\s|-/g, '');
  if (norm.includes('stealthbasic')) return BAArmorType.STEALTH_BASIC;
  if (norm.includes('stealthimproved')) return BAArmorType.STEALTH_IMPROVED;
  if (norm.includes('stealthprototype')) return BAArmorType.STEALTH_PROTOTYPE;
  if (norm === 'stealth') return BAArmorType.STEALTH_BASIC;
  if (norm.includes('mimetic')) return BAArmorType.MIMETIC;
  if (norm.includes('reactive')) return BAArmorType.REACTIVE;
  if (norm.includes('reflective')) return BAArmorType.REFLECTIVE;
  if (norm.includes('fireresistant')) return BAArmorType.FIRE_RESISTANT;
  return BAArmorType.STANDARD;
}

/**
 * Coerce a manipulator string onto a `BAManipulator`. We only recognise
 * the melee-relevant classes; anything else maps to `NONE` (zero melee BV).
 */
function coerceManipulator(v: string | undefined): BAManipulator {
  if (!v) return BAManipulator.NONE;
  const norm = v.trim().toLowerCase().replace(/\s|-/g, '');
  if (norm.includes('vibroclaw')) return BAManipulator.VIBRO_CLAW;
  if (norm.includes('heavyclaw') || norm.includes('heavybattle')) return BAManipulator.HEAVY_CLAW;
  if (norm.includes('battleclaw') || norm === 'battle') return BAManipulator.BATTLE_CLAW;
  if (norm.includes('basicclaw')) return BAManipulator.BASIC_CLAW;
  return BAManipulator.NONE;
}

// =============================================================================
// Weapon / Ammo mount coercion
// =============================================================================

function coerceWeaponMounts(
  v: BAUnitJSON['weapons'],
): BAWeaponBVMount[] {
  if (!v) return [];
  return v.map((w) => {
    if (typeof w === 'string') return { id: w };
    return { id: w.id, bvOverride: w.bvOverride };
  });
}

function coerceAmmoMounts(v: BAUnitJSON['ammo']): BAAmmoBVMount[] {
  if (!v) return [];
  return v.map((a) => {
    if (typeof a === 'string') return { id: a };
    return { id: a.id, bvOverride: a.bvOverride };
  });
}

// =============================================================================
// Unit JSON -> BV input
// =============================================================================

/**
 * Build an `IBattleArmorBVInput` from a permissive BA unit JSON. Defaults
 * match the test-suite baseline (Medium / 5 troopers / 5 armor / baseline
 * pilot) so minimal JSONs still produce a meaningful computed BV.
 */
function jsonToBVInput(unit: BAUnitJSON): IBattleArmorBVInput {
  return {
    weightClass: coerceWeightClass(unit.weightClass),
    squadSize: unit.squadSize ?? 5,
    groundMP: unit.groundMP ?? 1,
    jumpMP: unit.jumpMP ?? 0,
    umuMP: unit.umuMP ?? 0,
    armorPointsPerTrooper: unit.armorPointsPerTrooper ?? 5,
    armorType: coerceArmorType(unit.armorType),
    manipulators: {
      left: coerceManipulator(unit.leftManipulator),
      right: coerceManipulator(unit.rightManipulator),
    },
    weapons: coerceWeaponMounts(unit.weapons),
    ammo: coerceAmmoMounts(unit.ammo),
    hasMagneticClamp: unit.hasMagneticClamp ?? false,
    gunnery: unit.gunnery,
    piloting: unit.piloting,
  };
}

// =============================================================================
// Data loader
// =============================================================================

/**
 * Walk `public/data/units/battlearmor/` for `.json` files. Returns an empty
 * array (not an error) if the directory doesn't exist — the harness then
 * emits a deferred report.
 */
function loadUnitJSONs(dir: string): { path: string; unit: BAUnitJSON }[] {
  if (!fs.existsSync(dir)) return [];

  const files: { path: string; unit: BAUnitJSON }[] = [];

  const walk = (d: string): void => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.json')) continue;
      try {
        const raw = fs.readFileSync(full, 'utf8');
        const parsed = JSON.parse(raw) as BAUnitJSON;
        files.push({ path: full, unit: parsed });
      } catch (err) {
        // Skip malformed files — surface them via console and keep going.
        // eslint-disable-next-line no-console
        console.warn(`[validate-battle-armor-bv] skipping ${full}: ${String(err)}`);
      }
    }
  };

  walk(dir);
  return files;
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  const files = loadUnitJSONs(DATA_DIR);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // --- Deferred path: no data -> valid empty-but-structured report ---------
  if (files.length === 0) {
    const report: BAValidationReport = {
      generatedAt: new Date().toISOString(),
      status: 'deferred',
      reason: fs.existsSync(DATA_DIR)
        ? 'public/data/units/battlearmor/ is empty — no BA unit JSONs to validate.'
        : 'BA unit JSONs not yet in public/data/units/battlearmor/',
      dataDir: path.relative(PROJECT_ROOT, DATA_DIR).replace(/\\/g, '/'),
      summary: {
        total: 0,
        within1pct: 0,
        within5pct: 0,
        exact: 0,
        missingReference: 0,
      },
      squads: [],
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.log(
      `[validate-battle-armor-bv] deferred: ${report.reason}\n` +
        `  wrote ${path.relative(PROJECT_ROOT, OUTPUT_FILE).replace(/\\/g, '/')}`,
    );
    return;
  }

  // --- Happy path: compute BV for each squad and compare --------------------
  const squads: BASquadResult[] = [];

  for (const { path: filePath, unit } of files) {
    const ref = unit.mulBV ?? unit.bv ?? null;
    const input = jsonToBVInput(unit);
    const breakdown = calculateBattleArmorBV(input);
    const computed = breakdown.final;
    const delta = ref != null ? computed - ref : null;
    const deltaPct =
      ref != null && ref !== 0 ? (delta! / ref) * 100 : null;

    squads.push({
      unitId: unit.id ?? path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
      chassis: unit.chassis ?? unit.name ?? 'Unknown',
      model: unit.model ?? '',
      weightClass: input.weightClass,
      squadSize: input.squadSize,
      mulBV: ref,
      computedBV: computed,
      delta,
      deltaPct: deltaPct != null ? Math.round(deltaPct * 100) / 100 : null,
    });
  }

  const totalWithRef = squads.filter((s) => s.mulBV != null).length;
  const within1 = squads.filter(
    (s) => s.deltaPct != null && Math.abs(s.deltaPct) <= 1,
  ).length;
  const within5 = squads.filter(
    (s) => s.deltaPct != null && Math.abs(s.deltaPct) <= 5,
  ).length;
  const exact = squads.filter((s) => s.delta === 0).length;

  const report: BAValidationReport = {
    generatedAt: new Date().toISOString(),
    status: 'ok',
    dataDir: path.relative(PROJECT_ROOT, DATA_DIR).replace(/\\/g, '/'),
    summary: {
      total: squads.length,
      within1pct: within1,
      within5pct: within5,
      exact,
      missingReference: squads.length - totalWithRef,
    },
    squads,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // eslint-disable-next-line no-console
  console.log(
    `[validate-battle-armor-bv] ${squads.length} squads, ` +
      `within 1%: ${within1}/${totalWithRef}, ` +
      `within 5%: ${within5}/${totalWithRef}, ` +
      `exact: ${exact}\n` +
      `  wrote ${path.relative(PROJECT_ROOT, OUTPUT_FILE).replace(/\\/g, '/')}`,
  );
}

main();
