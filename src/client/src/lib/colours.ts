/** App-to-colour mapping by bundle ID. */

const COLOUR_MAP: Record<string, string> = {
  // Terminals
  "com.apple.Terminal": "#00ff41",
  "com.googlecode.iterm2": "#00ff41",
  "dev.warp.Warp-Stable": "#00ff41",
  "io.alacritty": "#00ff41",

  // Editors
  "com.microsoft.VSCode": "#007acc",
  "dev.zed.Zed": "#007acc",
  "com.todesktop.230313mzl4w4u92": "#007acc", // Cursor

  // Browsers
  "com.google.Chrome": "#4285f4",
  "company.thebrowser.Browser": "#4285f4", // Arc
  "org.mozilla.firefox": "#ff7139",
  "com.apple.Safari": "#006cff",

  // System
  "com.apple.finder": "#a2aaad",

  // Communication
  "com.tinyspeck.slackmacgap": "#4a154b",
  "com.apple.MobileSMS": "#34c759",
  "com.apple.mail": "#007aff",

  // Creative
  "com.figma.Desktop": "#f24e1e",

  // Media
  "com.spotify.client": "#1db954",

  // Notes
  "md.obsidian": "#7c3aed",
};

const DEFAULT_COLOUR = "#6c757d";

/** Get the colour for a bundle ID. Falls back to default grey. */
export function colourForBundle(bundleId: string): string {
  return COLOUR_MAP[bundleId] ?? DEFAULT_COLOUR;
}

/** Get the first letter of the app name, uppercased. */
export function appInitial(appName: string): string {
  const cleaned = appName.replace(/^\u200e/, ""); // Strip LTR mark
  return cleaned.charAt(0).toUpperCase();
}

/**
 * Lighten a hex colour for text readability.
 * Returns a lighter version of the colour for text on the block.
 */
export function lightenColour(hex: string, amount = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));

  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
