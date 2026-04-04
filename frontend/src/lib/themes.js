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
  earth: {
    light: {
      "--bg":          "#ede0cc",
      "--surface":     "#d4c0a4",
      "--surface-2":   "#f5ede0",
      "--border":      "#9c7c58",
      "--border-light":"#c0a07c",
      "--text":        "#2a1800",
      "--text-dim":    "#4a3010",
      "--text-muted":  "#7a5c3c",
      "--accent":      "#8b3a0f",
      "--accent-dim":  "rgba(139,58,15,0.12)",
    },
    dark: {
      "--bg":          "#1a100a",
      "--surface":     "#0e0804",
      "--surface-2":   "#261810",
      "--border":      "#5c3018",
      "--border-light":"#3c2010",
      "--text":        "#f0e0c4",
      "--text-dim":    "#c8a878",
      "--text-muted":  "#907050",
      "--accent":      "#d4803c",
      "--accent-dim":  "rgba(212,128,60,0.15)",
    },
  },

  water: {
    light: {
      "--bg":          "#d8e8f4",
      "--surface":     "#b8d0e8",
      "--surface-2":   "#e8f2fc",
      "--border":      "#5880a8",
      "--border-light":"#80a8cc",
      "--text":        "#0a1828",
      "--text-dim":    "#1c3048",
      "--text-muted":  "#486888",
      "--accent":      "#0e5c9c",
      "--accent-dim":  "rgba(14,92,156,0.12)",
    },
    dark: {
      "--bg":          "#060e1a",
      "--surface":     "#040810",
      "--surface-2":   "#0c1828",
      "--border":      "#18385c",
      "--border-light":"#102440",
      "--text":        "#c8e0f4",
      "--text-dim":    "#80b0d0",
      "--text-muted":  "#406888",
      "--accent":      "#4898d8",
      "--accent-dim":  "rgba(72,152,216,0.15)",
    },
  },

  fire: {
    light: {
      "--bg":          "#ede4d8",
      "--surface":     "#d4c4b0",
      "--surface-2":   "#f4ece0",
      "--border":      "#a87050",
      "--border-light":"#cc9878",
      "--text":        "#200800",
      "--text-dim":    "#3c1808",
      "--text-muted":  "#7c4828",
      "--accent":      "#c82c08",
      "--accent-dim":  "rgba(200,44,8,0.12)",
    },
    dark: {
      "--bg":          "#180800",
      "--surface":     "#0c0400",
      "--surface-2":   "#240e04",
      "--border":      "#5c1c08",
      "--border-light":"#3c1004",
      "--text":        "#f8dcc8",
      "--text-dim":    "#d09070",
      "--text-muted":  "#906040",
      "--accent":      "#f04820",
      "--accent-dim":  "rgba(240,72,32,0.15)",
    },
  },

  forest: {
    light: {
      "--bg":          "#d8e8d4",
      "--surface":     "#b8d0b0",
      "--surface-2":   "#e8f4e4",
      "--border":      "#507850",
      "--border-light":"#78a870",
      "--text":        "#081808",
      "--text-dim":    "#183018",
      "--text-muted":  "#407840",
      "--accent":      "#1a6828",
      "--accent-dim":  "rgba(26,104,40,0.12)",
    },
    dark: {
      "--bg":          "#060e04",
      "--surface":     "#040804",
      "--surface-2":   "#0c180a",
      "--border":      "#1c401c",
      "--border-light":"#102c10",
      "--text":        "#c8f0c8",
      "--text-dim":    "#88c880",
      "--text-muted":  "#488048",
      "--accent":      "#4cc860",
      "--accent-dim":  "rgba(76,200,96,0.15)",
    },
  },

  dusk: {
    light: {
      "--bg":          "#e4daf0",
      "--surface":     "#c8b8e0",
      "--surface-2":   "#f0e8fc",
      "--border":      "#7050a0",
      "--border-light":"#9878c8",
      "--text":        "#100818",
      "--text-dim":    "#201030",
      "--text-muted":  "#604878",
      "--accent":      "#5820a0",
      "--accent-dim":  "rgba(88,32,160,0.12)",
    },
    dark: {
      "--bg":          "#0c0614",
      "--surface":     "#08040c",
      "--surface-2":   "#160a1e",
      "--border":      "#381060",
      "--border-light":"#240840",
      "--text":        "#ecdcf8",
      "--text-dim":    "#b090d8",
      "--text-muted":  "#806898",
      "--accent":      "#9060e0",
      "--accent-dim":  "rgba(144,96,224,0.15)",
    },
  },

  stone: {
    light: {
      "--bg":          "#d8dade",
      "--surface":     "#c0c4ca",
      "--surface-2":   "#eaecf0",
      "--border":      "#6a7080",
      "--border-light":"#909aaa",
      "--text":        "#101418",
      "--text-dim":    "#202830",
      "--text-muted":  "#546070",
      "--accent":      "#2a4060",
      "--accent-dim":  "rgba(42,64,96,0.12)",
    },
    dark: {
      "--bg":          "#10141a",
      "--surface":     "#08090e",
      "--surface-2":   "#1c2028",
      "--border":      "#2c3440",
      "--border-light":"#1c2430",
      "--text":        "#d0d8e4",
      "--text-dim":    "#9098a8",
      "--text-muted":  "#5c6878",
      "--accent":      "#6090c8",
      "--accent-dim":  "rgba(96,144,200,0.15)",
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
