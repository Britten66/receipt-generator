/*
  themes.js — palette system for InvoicePrepper

  Security: applyPalette() only accepts a key from PALETTE_KEYS.
  Values are never taken from user input — everything comes from PALETTES below.
  CSS vars are written via setProperty(); calling clearPalette() removes them so
  App.css :root / [data-theme="dark"] defaults take over.

  Declaration order matters for Rollup's production build — it converts function
  declarations to const assignments, so callee must come before caller.
  Order: PALETTE_KEYS → MANAGED_VARS → PALETTES → PALETTE_META → PALETTE_ENTRIES
       → clearPalette → applyPalette → readPaletteFromStorage
*/

// Hardcoded allowlist — never computed from PALETTES to avoid init-order issues
export const PALETTE_KEYS = new Set(["earth", "water", "fire", "forest", "dusk", "stone"]);

// The CSS vars we manage. Any others are left alone (status colors, fonts, etc.)
const MANAGED_VARS = [
  "--bg", "--surface", "--surface-2",
  "--border", "--border-light",
  "--text", "--text-dim", "--text-muted",
  "--accent", "--accent-dim",
];

const PALETTES = {
  // Warm parchment — aged paper, ink, cognac accent
  earth: {
    light: {
      "--bg":           "#f0e8d8",
      "--surface":      "#e6dcc8",
      "--surface-2":    "#f8f4ec",
      "--border":       "#b8a080",
      "--border-light": "#d4c4a4",
      "--text":         "#1e1408",
      "--text-dim":     "#3c2c18",
      "--text-muted":   "#8c7454",
      "--accent":       "#9c3a10",
      "--accent-dim":   "rgba(156,58,16,0.10)",
    },
    dark: {
      "--bg":           "#181008",
      "--surface":      "#221808",
      "--surface-2":    "#2c2010",
      "--border":       "#4a3018",
      "--border-light": "#382410",
      "--text":         "#f4e8d0",
      "--text-dim":     "#d0b888",
      "--text-muted":   "#806040",
      "--accent":       "#e8883c",
      "--accent-dim":   "rgba(232,136,60,0.14)",
    },
  },

  // Deep navy — executive, legal, finance
  water: {
    light: {
      "--bg":           "#eef2f8",
      "--surface":      "#e0e8f4",
      "--surface-2":    "#f6f8fd",
      "--border":       "#8caccc",
      "--border-light": "#b8cce0",
      "--text":         "#080e1c",
      "--text-dim":     "#1a2a44",
      "--text-muted":   "#4a6480",
      "--accent":       "#1a4a8c",
      "--accent-dim":   "rgba(26,74,140,0.10)",
    },
    dark: {
      "--bg":           "#080c14",
      "--surface":      "#0e1520",
      "--surface-2":    "#141e2c",
      "--border":       "#1e3050",
      "--border-light": "#182440",
      "--text":         "#d8e8f8",
      "--text-dim":     "#8aaac8",
      "--text-muted":   "#3a5878",
      "--accent":       "#4a90d8",
      "--accent-dim":   "rgba(74,144,216,0.14)",
    },
  },

  // Ember — warm charcoal, ember orange, not garish
  fire: {
    light: {
      "--bg":           "#f2ece4",
      "--surface":      "#e8dfd4",
      "--surface-2":    "#faf6f0",
      "--border":       "#c09070",
      "--border-light": "#d8b898",
      "--text":         "#180800",
      "--text-dim":     "#302010",
      "--text-muted":   "#806040",
      "--accent":       "#b83808",
      "--accent-dim":   "rgba(184,56,8,0.10)",
    },
    dark: {
      "--bg":           "#140800",
      "--surface":      "#1e0e04",
      "--surface-2":    "#28160a",
      "--border":       "#5c2408",
      "--border-light": "#401804",
      "--text":         "#fce8d4",
      "--text-dim":     "#d4986c",
      "--text-muted":   "#885030",
      "--accent":       "#f05c1c",
      "--accent-dim":   "rgba(240,92,28,0.14)",
    },
  },

  // Sage — muted botanical, linen white, dark green accent
  forest: {
    light: {
      "--bg":           "#e8ede4",
      "--surface":      "#dce4d6",
      "--surface-2":    "#f4f7f2",
      "--border":       "#8aaa80",
      "--border-light": "#b0c8a8",
      "--text":         "#080e08",
      "--text-dim":     "#182818",
      "--text-muted":   "#507050",
      "--accent":       "#1e6038",
      "--accent-dim":   "rgba(30,96,56,0.10)",
    },
    dark: {
      "--bg":           "#060c06",
      "--surface":      "#0c1408",
      "--surface-2":    "#121c0e",
      "--border":       "#1e4020",
      "--border-light": "#142c14",
      "--text":         "#d4ecd4",
      "--text-dim":     "#7ab87a",
      "--text-muted":   "#407040",
      "--accent":       "#50cc68",
      "--accent-dim":   "rgba(80,204,104,0.14)",
    },
  },

  // Noir violet — luxury, deep plum, electric lavender
  dusk: {
    light: {
      "--bg":           "#ede8f6",
      "--surface":      "#e2daf0",
      "--surface-2":    "#f6f3fc",
      "--border":       "#9880c0",
      "--border-light": "#c0acd8",
      "--text":         "#0c0818",
      "--text-dim":     "#1c1430",
      "--text-muted":   "#6850a0",
      "--accent":       "#5418b0",
      "--accent-dim":   "rgba(84,24,176,0.10)",
    },
    dark: {
      "--bg":           "#0a0610",
      "--surface":      "#120c1c",
      "--surface-2":    "#1a1228",
      "--border":       "#3c1c68",
      "--border-light": "#281448",
      "--text":         "#ece4fc",
      "--text-dim":     "#b898e8",
      "--text-muted":   "#7858b0",
      "--accent":       "#a060f0",
      "--accent-dim":   "rgba(160,96,240,0.14)",
    },
  },

  // Graphite — cool slate, near-white, cobalt accent. Clean and modern.
  stone: {
    light: {
      "--bg":           "#eceef2",
      "--surface":      "#e2e5eb",
      "--surface-2":    "#f7f8fa",
      "--border":       "#9098a8",
      "--border-light": "#bcc4d0",
      "--text":         "#0c0e12",
      "--text-dim":     "#1e2430",
      "--text-muted":   "#5c6878",
      "--accent":       "#1c4acc",
      "--accent-dim":   "rgba(28,74,204,0.10)",
    },
    dark: {
      "--bg":           "#0e1014",
      "--surface":      "#161920",
      "--surface-2":    "#1e2228",
      "--border":       "#2c3440",
      "--border-light": "#202830",
      "--text":         "#dce4f0",
      "--text-dim":     "#98a8bc",
      "--text-muted":   "#5a6878",
      "--accent":       "#4d80e8",
      "--accent-dim":   "rgba(77,128,232,0.14)",
    },
  },
};

// Derived from PALETTES — single source of truth for swatch display colors.
// label is titleCase of the key; accent/bg come directly from the palette data.
export const PALETTE_META = Object.fromEntries(
  Object.entries(PALETTES).map(([key, modes]) => [
    key,
    {
      label:       key[0].toUpperCase() + key.slice(1),
      lightAccent: modes.light["--accent"],
      darkAccent:  modes.dark["--accent"],
      lightBg:     modes.light["--bg"],
      darkBg:      modes.dark["--bg"],
    },
  ])
);

// Precomputed — avoids creating a new array on every render that maps over palettes.
export const PALETTE_ENTRIES = Object.entries(PALETTE_META);

export function clearPalette() {
  const root = document.documentElement;
  MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
}

export function applyPalette(key, mode) {
  if (!key || key === "default" || !PALETTE_KEYS.has(key)) {
    clearPalette();
    return;
  }
  const vars = PALETTES[key][mode === "dark" ? "dark" : "light"];
  const root = document.documentElement;
  MANAGED_VARS.forEach((v) => {
    if (vars[v] !== undefined) root.style.setProperty(v, vars[v]);
  });
}

// Reads a saved palette key from localStorage; returns null if absent or invalid.
export function readPaletteFromStorage(storageKey) {
  const saved = localStorage.getItem(storageKey);
  return saved && PALETTE_KEYS.has(saved) ? saved : null;
}
