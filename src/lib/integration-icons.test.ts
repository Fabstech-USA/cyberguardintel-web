import { describe, expect, it } from "vitest";

import { INTEGRATION_CATALOG } from "@/lib/integration-catalog";
import {
  getIntegrationIconPath,
  hasIntegrationIcon,
  INTEGRATION_ICON_PATHS,
} from "@/lib/integration-icons";

describe("integration icons", () => {
  it("has an icon path for every catalog entry", () => {
    expect(Object.keys(INTEGRATION_ICON_PATHS)).toHaveLength(
      INTEGRATION_CATALOG.length
    );
    for (const entry of INTEGRATION_CATALOG) {
      expect(hasIntegrationIcon(entry.id), entry.id).toBe(true);
      expect(getIntegrationIconPath(entry.id)).toMatch(
        /^\/integrations\/icons\//
      );
    }
  });
});
