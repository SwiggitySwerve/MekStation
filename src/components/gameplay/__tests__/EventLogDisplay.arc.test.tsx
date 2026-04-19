/**
 * EventLogDisplay — firing arc display (wire-firing-arc-resolution task 8.1)
 *
 * Confirms the event log renders the `attackerArc` string from
 * `AttackResolved` payloads so players can see which hit-location table
 * + armor side was consulted.
 *
 * @spec openspec/changes/wire-firing-arc-resolution/specs/combat-resolution/spec.md
 */

import { render, screen } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";

import { GameEventType, GamePhase, type IGameEvent } from "@/types/gameplay";

import { EventLogDisplay } from "../EventLogDisplay";

function makeAttackResolved(
  arc: "front" | "left" | "right" | "rear" | undefined,
  hit: boolean,
  id = "evt-1",
): IGameEvent {
  return {
    id,
    sessionId: "session-1",
    sequence: 1,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    type: GameEventType.AttackResolved,
    timestamp: new Date().toISOString(),
    payload: {
      attackerId: "unit-1",
      targetId: "unit-2",
      weaponId: "ml-1",
      roll: 10,
      toHitNumber: 7,
      hit,
      location: hit ? "CenterTorso" : undefined,
      damage: hit ? 5 : undefined,
      heat: 3,
      attackerArc: arc,
    },
  } as unknown as IGameEvent;
}

describe("EventLogDisplay — firing arc", () => {
  it("renders [front arc] suffix on a successful hit", () => {
    const events = [makeAttackResolved("front", true)];
    render(<EventLogDisplay events={events} />);
    const row = screen.getByTestId("event-text");
    expect(row.textContent).toMatch(/\[front arc\]/);
  });

  it("renders [rear arc] suffix on a rear-arc hit", () => {
    const events = [makeAttackResolved("rear", true)];
    render(<EventLogDisplay events={events} />);
    const row = screen.getByTestId("event-text");
    expect(row.textContent).toMatch(/\[rear arc\]/);
  });

  it("renders arc suffix even when the attack missed", () => {
    const events = [makeAttackResolved("left", false)];
    render(<EventLogDisplay events={events} />);
    const row = screen.getByTestId("event-text");
    expect(row.textContent).toMatch(/MISSED/);
    expect(row.textContent).toMatch(/\[left arc\]/);
  });

  it("omits suffix gracefully when attackerArc is missing (legacy event)", () => {
    // Regression: legacy AttackResolved events in saved sessions / replays
    // may predate arc wiring. Display must not crash and must not emit
    // "undefined" string.
    const events = [makeAttackResolved(undefined, true)];
    render(<EventLogDisplay events={events} />);
    const row = screen.getByTestId("event-text");
    expect(row.textContent).not.toMatch(/undefined/i);
    expect(row.textContent).not.toMatch(/\[.*arc\]/);
  });
});
