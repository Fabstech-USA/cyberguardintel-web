import { describe, expect, it } from "vitest";

import {
  filterCatalog,
  getCatalogEntry,
  groupAvailableByCategory,
  INTEGRATION_CATALOG,
  matchesCatalogSearch,
} from "@/lib/integration-catalog";

describe("integration catalog", () => {
  it("contains 50 catalog entries", () => {
    expect(INTEGRATION_CATALOG).toHaveLength(50);
  });

  it("uses google-workspace id for Google Workspace", () => {
    const entry = getCatalogEntry("google-workspace");
    expect(entry?.name).toBe("Google Workspace");
    expect(entry?.connectable).toBe(true);
  });

  it("marks aws as connectable", () => {
    expect(getCatalogEntry("aws")?.connectable).toBe(true);
  });

  it("marks all 10 MVP integrations as connectable", () => {
    const mvpIds = [
      "aws",
      "google-workspace",
      "microsoft-365",
      "okta",
      "github",
      "slack",
      "zoom",
      "dropbox",
      "box",
      "1password",
    ];
    for (const id of mvpIds) {
      expect(getCatalogEntry(id)?.connectable, id).toBe(true);
    }
  });

  it("searches by HIPAA control reference", () => {
    const aws = getCatalogEntry("aws");
    expect(aws).toBeDefined();
    expect(matchesCatalogSearch(aws!, "164.312(b)")).toBe(true);
  });

  it("filters by category", () => {
    const cloud = filterCatalog(INTEGRATION_CATALOG, { category: "cloud" });
    expect(cloud.length).toBeGreaterThan(0);
    expect(cloud.every((entry) => entry.category === "cloud")).toBe(true);
  });

  it("groups available entries by category", () => {
    const available = INTEGRATION_CATALOG.filter((entry) => entry.id !== "aws");
    const groups = groupAvailableByCategory([...available]);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => group.entries.length > 0)).toBe(true);
  });
});
