import { describe, it, expect } from "vitest";
import { colourForBundle, appInitial, lightenColour } from "../lib/colours.ts";

describe("colourForBundle", () => {
  it("returns green for Terminal", () => {
    expect(colourForBundle("com.apple.Terminal")).toBe("#00ff41");
  });

  it("returns blue for VS Code", () => {
    expect(colourForBundle("com.microsoft.VSCode")).toBe("#007acc");
  });

  it("returns google blue for Chrome", () => {
    expect(colourForBundle("com.google.Chrome")).toBe("#4285f4");
  });

  it("returns slack purple for Slack", () => {
    expect(colourForBundle("com.tinyspeck.slackmacgap")).toBe("#4a154b");
  });

  it("returns figma orange for Figma", () => {
    expect(colourForBundle("com.figma.Desktop")).toBe("#f24e1e");
  });

  it("returns default grey for unknown bundle", () => {
    expect(colourForBundle("com.unknown.app")).toBe("#6c757d");
  });

  it("returns default grey for empty string", () => {
    expect(colourForBundle("")).toBe("#6c757d");
  });
});

describe("appInitial", () => {
  it("returns first letter uppercased", () => {
    expect(appInitial("Terminal")).toBe("T");
  });

  it("handles lowercase app names", () => {
    expect(appInitial("finder")).toBe("F");
  });

  it("strips LTR marks", () => {
    expect(appInitial("\u200eWhatsApp")).toBe("W");
  });
});

describe("lightenColour", () => {
  it("returns a valid hex colour", () => {
    const result = lightenColour("#007acc");
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("lightens a dark colour", () => {
    const original = "#007acc";
    const lightened = lightenColour(original, 0.5);
    // The lightened version should have higher RGB values
    const origR = parseInt(original.slice(1, 3), 16);
    const lightR = parseInt(lightened.slice(1, 3), 16);
    expect(lightR).toBeGreaterThan(origR);
  });

  it("does not exceed #ffffff", () => {
    const result = lightenColour("#ffffff", 0.5);
    expect(result).toBe("#ffffff");
  });
});
