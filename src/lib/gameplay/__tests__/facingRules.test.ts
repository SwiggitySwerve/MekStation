/**
 * Tests for per-type facing rules.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Facing Rules
 */

import { TokenUnitType } from "@/types/gameplay";
import {
  getFacingRules,
  hex6ToRotationDeg,
  cardinal8ToRotationDeg,
  velocityVectorEndpoint,
  facingLabel,
  HEX6_LABELS,
  CARDINAL8_LABELS,
} from "../facingRules";

// =============================================================================
// hex6ToRotationDeg — 6 canonical hex facings
// =============================================================================

describe("hex6ToRotationDeg", () => {
  const cases: Array<{ facing: number; expectedDeg: number; label: string }> = [
    { facing: 0, expectedDeg: 0, label: "North" },
    { facing: 1, expectedDeg: 60, label: "Northeast" },
    { facing: 2, expectedDeg: 120, label: "Southeast" },
    { facing: 3, expectedDeg: 180, label: "South" },
    { facing: 4, expectedDeg: 240, label: "Southwest" },
    { facing: 5, expectedDeg: 300, label: "Northwest" },
  ];

  it.each(cases)(
    "facing $facing ($label) → $expectedDeg°",
    ({ facing, expectedDeg }) => {
      expect(hex6ToRotationDeg(facing)).toBe(expectedDeg);
    },
  );

  it("wraps values >= 6 back to the correct quadrant", () => {
    // 6 mod 6 = 0 → 0°
    expect(hex6ToRotationDeg(6)).toBe(0);
    // 7 mod 6 = 1 → 60°
    expect(hex6ToRotationDeg(7)).toBe(60);
  });

  it("handles negative facing values gracefully via modulo normalisation", () => {
    // (-1 % 6) * 60 = -60; (-60 + 360) % 360 = 300 (= Northwest = facing 5)
    expect(hex6ToRotationDeg(-1)).toBe(300);
  });
});

// =============================================================================
// cardinal8ToRotationDeg — 8 cardinal directions
// =============================================================================

describe("cardinal8ToRotationDeg", () => {
  const cases: Array<{ dir: number; expectedDeg: number; label: string }> = [
    { dir: 0, expectedDeg: 0, label: "N" },
    { dir: 1, expectedDeg: 45, label: "NE" },
    { dir: 2, expectedDeg: 90, label: "E" },
    { dir: 3, expectedDeg: 135, label: "SE" },
    { dir: 4, expectedDeg: 180, label: "S" },
    { dir: 5, expectedDeg: 225, label: "SW" },
    { dir: 6, expectedDeg: 270, label: "W" },
    { dir: 7, expectedDeg: 315, label: "NW" },
  ];

  it.each(cases)(
    "direction $dir ($label) → $expectedDeg°",
    ({ dir, expectedDeg }) => {
      expect(cardinal8ToRotationDeg(dir)).toBe(expectedDeg);
    },
  );

  it("wraps direction 8 back to 0°", () => {
    expect(cardinal8ToRotationDeg(8)).toBe(0);
  });
});

// =============================================================================
// velocityVectorEndpoint — heading × velocity × scale
// =============================================================================

describe("velocityVectorEndpoint", () => {
  // Tolerance for floating-point comparison (±0.001).
  const TOLERANCE = 0.001;

  it("velocity 0 always returns (0,0) regardless of heading", () => {
    const result = velocityVectorEndpoint(0, 0);
    expect(result.x).toBeCloseTo(0, 3);
    expect(result.y).toBeCloseTo(0, 3);
  });

  it("heading North (0°), velocity 1 → (x≈0, y≈−4) with default 4px/unit scale", () => {
    // North in SVG: x=0, y=−length (up). length = 1 × 4 = 4.
    const { x, y } = velocityVectorEndpoint(0, 1);
    expect(Math.abs(x)).toBeLessThan(TOLERANCE);
    expect(y).toBeCloseTo(-4, 3);
  });

  it("heading East (90°), velocity 1 → (x≈4, y≈0)", () => {
    const { x, y } = velocityVectorEndpoint(90, 1);
    expect(x).toBeCloseTo(4, 3);
    expect(Math.abs(y)).toBeLessThan(TOLERANCE);
  });

  it("heading South (180°), velocity 1 → (x≈0, y≈4)", () => {
    const { x, y } = velocityVectorEndpoint(180, 1);
    expect(Math.abs(x)).toBeLessThan(TOLERANCE);
    expect(y).toBeCloseTo(4, 3);
  });

  it("heading West (270°), velocity 1 → (x≈−4, y≈0)", () => {
    const { x, y } = velocityVectorEndpoint(270, 1);
    expect(x).toBeCloseTo(-4, 3);
    expect(Math.abs(y)).toBeLessThan(TOLERANCE);
  });

  it("velocity 6 scales the vector length by 6", () => {
    // North heading: y should be −6 × scale (default 4 → −24).
    const { x, y } = velocityVectorEndpoint(0, 6);
    expect(Math.abs(x)).toBeLessThan(TOLERANCE);
    expect(y).toBeCloseTo(-24, 3);
  });

  it("custom pixelsPerUnit scales correctly", () => {
    // heading North, velocity 1, scale 10 → y = −10.
    const { x, y } = velocityVectorEndpoint(0, 1, 10);
    expect(Math.abs(x)).toBeLessThan(TOLERANCE);
    expect(y).toBeCloseTo(-10, 3);
  });

  it("heading NE (45°), velocity 1 → x and y are equal in magnitude, positive x, negative y", () => {
    // NE: 45° clockwise from North → sin(45°−90°) has components x>0, y<0.
    const { x, y } = velocityVectorEndpoint(45, 1);
    // x and y should be equal magnitude (sin = cos at 45°).
    expect(Math.abs(Math.abs(x) - Math.abs(y))).toBeLessThan(TOLERANCE);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
  });
});

// =============================================================================
// facingLabel — human-readable label per mode
// =============================================================================

describe("facingLabel", () => {
  it("returns HEX6 labels for a Mech (hex6 mode)", () => {
    expect(facingLabel(TokenUnitType.Mech, 0)).toBe("N");
    expect(facingLabel(TokenUnitType.Mech, 1)).toBe("NE");
    expect(facingLabel(TokenUnitType.Mech, 3)).toBe("S");
    expect(facingLabel(TokenUnitType.Mech, 5)).toBe("NW");
  });

  it("returns HEX6 labels for a ProtoMech (hex6 mode)", () => {
    expect(facingLabel(TokenUnitType.ProtoMech, 2)).toBe("SE");
  });

  it("returns CARDINAL8 labels for a Vehicle (cardinal8 mode)", () => {
    expect(facingLabel(TokenUnitType.Vehicle, 0)).toBe("N");
    expect(facingLabel(TokenUnitType.Vehicle, 1)).toBe("NE");
    expect(facingLabel(TokenUnitType.Vehicle, 6)).toBe("W");
    expect(facingLabel(TokenUnitType.Vehicle, 7)).toBe("NW");
  });

  it("returns empty string for Aerospace (vector mode)", () => {
    expect(facingLabel(TokenUnitType.Aerospace, 0)).toBe("");
  });

  it("returns empty string for Infantry (none mode)", () => {
    expect(facingLabel(TokenUnitType.Infantry, 0)).toBe("");
  });

  it("returns empty string for BattleArmor (none mode)", () => {
    expect(facingLabel(TokenUnitType.BattleArmor, 0)).toBe("");
  });

  it("wraps out-of-range facing via modulo for hex6", () => {
    // 7 % 6 = 1 → 'NE'
    expect(facingLabel(TokenUnitType.Mech, 7)).toBe("NE");
  });

  it("wraps out-of-range facing via modulo for cardinal8", () => {
    // 9 % 8 = 1 → 'NE'
    expect(facingLabel(TokenUnitType.Vehicle, 9)).toBe("NE");
  });
});

// =============================================================================
// getFacingRules — per-type mode assignment
// =============================================================================

describe("getFacingRules", () => {
  it("Mech → hex6, stateCount 6, tokenRotates true", () => {
    const rules = getFacingRules(TokenUnitType.Mech);
    expect(rules.mode).toBe("hex6");
    expect(rules.stateCount).toBe(6);
    expect(rules.tokenRotates).toBe(true);
  });

  it("ProtoMech → hex6 (same as Mech)", () => {
    const rules = getFacingRules(TokenUnitType.ProtoMech);
    expect(rules.mode).toBe("hex6");
    expect(rules.stateCount).toBe(6);
    expect(rules.tokenRotates).toBe(true);
  });

  it("Vehicle → cardinal8, stateCount 8, tokenRotates true", () => {
    const rules = getFacingRules(TokenUnitType.Vehicle);
    expect(rules.mode).toBe("cardinal8");
    expect(rules.stateCount).toBe(8);
    expect(rules.tokenRotates).toBe(true);
  });

  it("Aerospace → vector, stateCount Infinity, tokenRotates true", () => {
    const rules = getFacingRules(TokenUnitType.Aerospace);
    expect(rules.mode).toBe("vector");
    expect(rules.stateCount).toBe(Infinity);
    expect(rules.tokenRotates).toBe(true);
  });

  it("Infantry → none, stateCount 0, tokenRotates false", () => {
    const rules = getFacingRules(TokenUnitType.Infantry);
    expect(rules.mode).toBe("none");
    expect(rules.stateCount).toBe(0);
    expect(rules.tokenRotates).toBe(false);
  });

  it("BattleArmor → none, stateCount 0, tokenRotates false", () => {
    const rules = getFacingRules(TokenUnitType.BattleArmor);
    expect(rules.mode).toBe("none");
    expect(rules.stateCount).toBe(0);
    expect(rules.tokenRotates).toBe(false);
  });

  it("undefined falls back to Mech rules", () => {
    const rules = getFacingRules(undefined);
    expect(rules.mode).toBe("hex6");
    expect(rules.stateCount).toBe(6);
  });

  it("every unit type returns a non-empty indicatorLabel", () => {
    const types = Object.values(TokenUnitType);
    for (const t of types) {
      expect(getFacingRules(t).indicatorLabel.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Label array integrity checks
// =============================================================================

describe("HEX6_LABELS", () => {
  it("contains exactly 6 entries", () => {
    expect(HEX6_LABELS).toHaveLength(6);
  });

  it("starts with N and ends with NW (clockwise 6-hex order)", () => {
    expect(HEX6_LABELS[0]).toBe("N");
    expect(HEX6_LABELS[5]).toBe("NW");
  });
});

describe("CARDINAL8_LABELS", () => {
  it("contains exactly 8 entries", () => {
    expect(CARDINAL8_LABELS).toHaveLength(8);
  });

  it("starts with N and ends with NW (clockwise 8-cardinal order)", () => {
    expect(CARDINAL8_LABELS[0]).toBe("N");
    expect(CARDINAL8_LABELS[7]).toBe("NW");
  });
});
