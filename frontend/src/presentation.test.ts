import { describe, expect, it } from "vitest";
import { localizedUserName, normalizeSanCristobal } from "./presentation";

describe("visible localization normalization", () => {
  it("renders the official San Cristóbal spelling for legacy values", () => {
    expect(normalizeSanCristobal("San Cristobal")).toBe("San Cristóbal");
    expect(normalizeSanCristobal("Observation - San Cristobal")).toBe(
      "Observation - San Cristóbal",
    );
  });

  it("localizes the administrator demo display name by language", () => {
    expect(
      localizedUserName("Demo Administrator", "demo-admin", "es"),
    ).toBe("Demo Administrador");
    expect(
      localizedUserName("Demo Administrator", "demo-admin", "en"),
    ).toBe("Demo Administrator");
  });
});
