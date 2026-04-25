/**
 * Tests for `getEffectiveWalkMP` — the combined integration of TSM bonus and
 * heat-induced movement penalty against base walk MP.
 *
 * Closes the verifier PARTIAL on archived `wire-heat-generation-and-effects`
 * task 7.2 by exercising the three canonical combined-state cases.
 *
 * @spec openspec/changes/tier5-audit-cleanup/specs/heat-management-system/spec.md
 */

import { describe, expect, it } from "@jest/globals";

import { getEffectiveWalkMP } from "@/utils/gameplay/movement/calculations";

describe("getEffectiveWalkMP — TSM + heat-penalty interaction", () => {
  describe("TSM-active mech at heat 9 (TSM activation threshold)", () => {
    it("combines +2 TSM bonus and −1 heat penalty against base 4 walk MP", () => {
      // Heat 9 triggers BOTH effects: TSM (+2) and heat penalty (floor(9/5) = 1).
      // Net: 4 + 2 − 1 = 5.
      expect(getEffectiveWalkMP(4, 9, true)).toBe(5);
    });

    it("still combines correctly with a different base walk MP", () => {
      // Sanity: the formula is base-relative, not anchored to 4.
      expect(getEffectiveWalkMP(6, 9, true)).toBe(7); // 6 + 2 − 1
    });
  });

  describe("TSM-active mech at heat 0 (TSM dormant below threshold)", () => {
    it("returns base walk MP unchanged when TSM is installed but inactive", () => {
      // Below heat 9 the TSM bonus does NOT apply, and below heat 5 the
      // heat penalty is 0. Net: walk MP equals base.
      expect(getEffectiveWalkMP(4, 0, true)).toBe(4);
    });
  });

  describe("Non-TSM mech at heat 9", () => {
    it("applies only the heat penalty (floor(heat/5) = 1) to base 4 walk MP", () => {
      // No TSM equipment → no +2 bonus, only the heat penalty applies.
      // Net: 4 − floor(9/5) = 4 − 1 = 3.
      expect(getEffectiveWalkMP(4, 9, false)).toBe(3);
    });
  });

  describe("Edge cases", () => {
    it("floors effective walk MP at 0 for severe overheat", () => {
      // Heat 30 → penalty floor(30/5) = 6, exceeds base 4. Result clamps to 0.
      expect(getEffectiveWalkMP(4, 30, false)).toBe(0);
    });

    it("does NOT apply heat penalty below the heat-5 threshold", () => {
      // Heat 4 is below MOVEMENT_PENALTY threshold; penalty = 0.
      expect(getEffectiveWalkMP(4, 4, false)).toBe(4);
    });

    it("applies heat penalty exactly at the heat-5 threshold", () => {
      // Heat 5 → floor(5/5) = 1 penalty.
      expect(getEffectiveWalkMP(4, 5, false)).toBe(3);
    });

    it("TSM bonus + heat penalty stack additively at heat 10", () => {
      // Heat 10 → TSM active (+2), penalty floor(10/5) = 2.
      // Net: 4 + 2 − 2 = 4 (TSM exactly cancels the penalty).
      expect(getEffectiveWalkMP(4, 10, true)).toBe(4);
    });

    it("TSM bonus exists at heat 9 but penalty grows faster at higher heat", () => {
      // Heat 15 → TSM active (+2), penalty floor(15/5) = 3.
      // Net: 4 + 2 − 3 = 3.
      expect(getEffectiveWalkMP(4, 15, true)).toBe(3);
    });
  });
});
