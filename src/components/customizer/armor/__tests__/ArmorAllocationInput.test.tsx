/**
 * Tests for ArmorAllocationInput primitive.
 *
 * Covers:
 *   - Clamps values to [min, max]
 *   - Calls onChange with the clamped value
 *   - Arrow-key navigation hops to sibling inputs in the same group
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Shared Armor Pip Primitive
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { ArmorAllocationInput } from "../ArmorAllocationInput";

describe("ArmorAllocationInput", () => {
  it("clamps values above max", () => {
    const onChange = jest.fn();
    render(
      <ArmorAllocationInput
        label="Front"
        value={5}
        max={10}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText(
      "Front armor value",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "50" } });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("clamps values below min (default 0)", () => {
    const onChange = jest.fn();
    render(
      <ArmorAllocationInput
        label="Rear"
        value={5}
        max={10}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Rear armor value") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-3" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("passes through valid values inside range", () => {
    const onChange = jest.fn();
    render(
      <ArmorAllocationInput
        label="Turret"
        value={2}
        max={10}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText(
      "Turret armor value",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("arrow-right at end-of-input focuses next sibling within the group", () => {
    const onChange = jest.fn();
    render(
      <div>
        <ArmorAllocationInput
          label="A"
          value={0}
          max={10}
          groupId="g1"
          onChange={onChange}
          data-testid="a"
        />
        <ArmorAllocationInput
          label="B"
          value={0}
          max={10}
          groupId="g1"
          onChange={onChange}
          data-testid="b"
        />
      </div>,
    );
    const a = screen.getByTestId("a") as HTMLInputElement;
    const b = screen.getByTestId("b") as HTMLInputElement;
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(document.activeElement).toBe(b);
  });

  it("arrow-left at start-of-input focuses previous sibling within the group", () => {
    const onChange = jest.fn();
    render(
      <div>
        <ArmorAllocationInput
          label="A"
          value={0}
          max={10}
          groupId="g1"
          onChange={onChange}
          data-testid="a"
        />
        <ArmorAllocationInput
          label="B"
          value={0}
          max={10}
          groupId="g1"
          onChange={onChange}
          data-testid="b"
        />
      </div>,
    );
    const a = screen.getByTestId("a") as HTMLInputElement;
    const b = screen.getByTestId("b") as HTMLInputElement;
    b.focus();
    fireEvent.keyDown(b, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(a);
  });
});
