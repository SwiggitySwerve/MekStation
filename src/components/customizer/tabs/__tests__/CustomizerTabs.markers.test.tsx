/**
 * CustomizerTabs — dirty marker + error marker rendering tests
 *
 * Covers:
 *   Spec § Requirement: Tab Dirty Tracking
 *     – Scenario: Dirty marker appears on edit
 *   Spec § Requirement: Validation Error Markers
 *     – Scenario: Error marker on validation failure
 *
 * @spec openspec/changes/add-per-type-customizer-tabs/specs/multi-unit-tabs/spec.md
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { CustomizerTabs, CustomizerTabConfig } from "../CustomizerTabs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TABS: CustomizerTabConfig[] = [
  { id: "overview", label: "Overview" },
  { id: "armor", label: "Armor" },
  { id: "equipment", label: "Equipment" },
];

function renderTabs(
  overrides: Partial<React.ComponentProps<typeof CustomizerTabs>> = {},
) {
  const onTabChange = jest.fn();
  const result = render(
    <CustomizerTabs
      tabs={TABS}
      activeTab="overview"
      onTabChange={onTabChange}
      {...overrides}
    />,
  );
  return { ...result, onTabChange };
}

// ---------------------------------------------------------------------------
// Dirty marker tests
// ---------------------------------------------------------------------------

describe("CustomizerTabs — dirty markers", () => {
  it("renders no dirty markers when dirtyTabs is not provided", () => {
    renderTabs();
    expect(
      screen.queryAllByRole("img", { name: "Unsaved changes" }),
    ).toHaveLength(0);
  });

  it("renders no dirty markers when dirtyTabs is empty", () => {
    renderTabs({ dirtyTabs: new Set() });
    expect(
      screen.queryAllByRole("img", { name: "Unsaved changes" }),
    ).toHaveLength(0);
  });

  it("renders a dirty marker only on the tab present in dirtyTabs", () => {
    renderTabs({ dirtyTabs: new Set(["armor"]) });

    const markers = screen.getAllByRole("img", { name: "Unsaved changes" });
    expect(markers).toHaveLength(1);
    // The marker should be inside the Armor button
    const armorBtn = screen.getByRole("tab", { name: "Armor" });
    expect(armorBtn).toContainElement(markers[0]);
  });

  it("renders dirty markers on multiple dirty tabs", () => {
    renderTabs({ dirtyTabs: new Set(["armor", "equipment"]) });

    const markers = screen.getAllByRole("img", { name: "Unsaved changes" });
    expect(markers).toHaveLength(2);
  });

  it("dirty marker has yellow color class", () => {
    renderTabs({ dirtyTabs: new Set(["armor"]) });

    const marker = screen.getByRole("img", { name: "Unsaved changes" });
    expect(marker).toHaveClass("text-yellow-400");
  });

  it("dirty marker carries an accessible title", () => {
    renderTabs({ dirtyTabs: new Set(["armor"]) });

    const marker = screen.getByRole("img", { name: "Unsaved changes" });
    expect(marker).toHaveAttribute("title", "Unsaved changes");
  });
});

// ---------------------------------------------------------------------------
// Error marker tests
// ---------------------------------------------------------------------------

describe("CustomizerTabs — error markers", () => {
  it("renders no error markers when errorTabs is not provided", () => {
    renderTabs();
    expect(
      screen.queryAllByRole("img", { name: "Validation error" }),
    ).toHaveLength(0);
  });

  it("renders no error markers when errorTabs is empty", () => {
    renderTabs({ errorTabs: new Set() });
    expect(
      screen.queryAllByRole("img", { name: "Validation error" }),
    ).toHaveLength(0);
  });

  it("renders an error marker only on the tab present in errorTabs", () => {
    renderTabs({ errorTabs: new Set(["armor"]) });

    const markers = screen.getAllByRole("img", { name: "Validation error" });
    expect(markers).toHaveLength(1);
    const armorBtn = screen.getByRole("tab", { name: "Armor" });
    expect(armorBtn).toContainElement(markers[0]);
  });

  it("renders error markers on multiple error tabs", () => {
    renderTabs({ errorTabs: new Set(["armor", "equipment"]) });

    const markers = screen.getAllByRole("img", { name: "Validation error" });
    expect(markers).toHaveLength(2);
  });

  it("error marker has red color class", () => {
    renderTabs({ errorTabs: new Set(["armor"]) });

    const marker = screen.getByRole("img", { name: "Validation error" });
    expect(marker).toHaveClass("text-red-500");
  });

  it("error marker carries an accessible title", () => {
    renderTabs({ errorTabs: new Set(["armor"]) });

    const marker = screen.getByRole("img", { name: "Validation error" });
    expect(marker).toHaveAttribute("title", "Validation error");
  });
});

// ---------------------------------------------------------------------------
// Both markers coexist
// ---------------------------------------------------------------------------

describe("CustomizerTabs — dirty + error markers coexist", () => {
  it("renders both markers independently when a tab is both dirty and has errors", () => {
    renderTabs({
      dirtyTabs: new Set(["armor"]),
      errorTabs: new Set(["armor"]),
    });

    expect(
      screen.getAllByRole("img", { name: "Unsaved changes" }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole("img", { name: "Validation error" }),
    ).toHaveLength(1);
  });

  it("renders dirty marker on one tab and error on another independently", () => {
    renderTabs({
      dirtyTabs: new Set(["armor"]),
      errorTabs: new Set(["equipment"]),
    });

    const dirtyMarker = screen.getByRole("img", { name: "Unsaved changes" });
    const errorMarker = screen.getByRole("img", { name: "Validation error" });

    const armorBtn = screen.getByRole("tab", { name: "Armor" });
    const equipmentBtn = screen.getByRole("tab", { name: "Equipment" });

    expect(armorBtn).toContainElement(dirtyMarker);
    expect(equipmentBtn).toContainElement(errorMarker);
  });
});

// ---------------------------------------------------------------------------
// Tab change still fires
// ---------------------------------------------------------------------------

describe("CustomizerTabs — tab clicks still fire onTabChange", () => {
  it("calls onTabChange when a non-active tab is clicked", async () => {
    const user = userEvent.setup();
    const { onTabChange } = renderTabs({ dirtyTabs: new Set(["overview"]) });

    await user.click(screen.getByRole("tab", { name: "Armor" }));
    expect(onTabChange).toHaveBeenCalledWith("armor");
  });
});
