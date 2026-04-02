/*
  themes.js — palette system for InvoicePrepper

  Security: applyPalette() only accepts a key from PALETTE_KEYS.
  Values are never taken from user input — everything comes from PALETTES below.
  CSS vars are written via setProperty(); calling clearPalette() removes them so
  App.css :root / [data-theme="dark"] defaults take over.

  Declaration order matters for Rollup's production build — it converts function
  declarations to const assignments, so callee must come before caller.
  Order: PALETTE_KEYS → MANAGED_VARS → PALETTE_META → PALETTES → clearPalette → applyPalette
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

// Display info for the picker UI — swatch bg and accent per mode
export const PALETTE_META = {
  earth:  { label: "Earth",  lightAccent: "#8b3a0f", darkAccent: "#d4803c", lightBg: "#ede0cc", darkBg: "#1a100a" },
  water:  { label: "Water",  lightAccent: "#0e5c9c", darkAccent: "#4898d8", lightBg: "#d8e8f4", darkBg: "#060e1a" },
  fire:   { label: "Fire",   lightAccent: "#c82c08", darkAccent: "#f04820", lightBg: "#ede4d8", darkBg: "#180800" },
  forest: { label: "Forest", lightAccent: "#1a6828", darkAccent: "#4cc860", lightBg: "#d8e8d4", darkBg: "#060e04" },
  dusk:   { label: "Dusk",   lightAccent: "#5820a0", darkAccent: "#9060e0", lightBg: "#e4daf0", darkBg: "#0c0614" },
  stone:  { label: "Stone",  lightAccent: "#2a4060", darkAccent: "#6090c8", lightBg: "#d8dade", darkBg: "#10141a" },
};

const PALETTES = {
  earth: {
    light: {
      "--bg":          "#ede0cc",   /* warm parchment */
      "--surface":     "#d4c0a4",   /* clay tan — left nav */
      "--surface-2":   "#f5ede0",   /* cream — top nav, cards */
      "--border":      "#9c7c58",
      "--border-light":"#c0a07c",
      "--text":        "#2a1800",
      "--text-dim":    "#4a3010",
      "--text-muted":  "#7a5c3c",
      "--accent":      "#8b3a0f",   /* burnt sienna */
      "--accent-dim":  "rgba(139,58,15,0.12)",
    },
    dark: {
      "--bg":          "#1a100a",   /* very dark clay */
      "--surface":     "#0e0804",   /* near-black brown */
      "--surface-2":   "#261810",   /* dark clay */
      "--border":      "#5c3018",
      "--border-light":"#3c2010",
      "--text":        "#f0e0c4",
      "--text-dim":    "#c8a878",
      "--text-muted":  "#907050",
      "--accent":      "#d4803c",   /* warm amber */
      "--accent-dim":  "rgba(212,128,60,0.15)",
    },
  },

  water: {
    light: {
      "--bg":          "#d8e8f4",   /* pale ocean */
      "--surface":     "#b8d0e8",   /* slate blue — left nav */
      "--surface-2":   "#e8f2fc",   /* light seafoam — top nav, cards */
      "--border":      "#5880a8",
      "--border-light":"#80a8cc",
      "--text":        "#0a1828",
      "--text-dim":    "#1c3048",
      "--text-muted":  "#486888",
      "--accent":      "#0e5c9c",   /* deep ocean */
      "--accent-dim":  "rgba(14,92,156,0.12)",
    },
    dark: {
      "--bg":          "#060e1a",   /* near-black navy */
      "--surface":     "#040810",   /* deepest navy */
      "--surface-2":   "#0c1828",   /* dark ocean */
      "--border":      "#18385c",
      "--border-light":"#102440",
      "--text":        "#c8e0f4",
      "--text-dim":    "#80b0d0",
      "--text-muted":  "#406888",
      "--accent":      "#4898d8",   /* bright ocean */
      "--accent-dim":  "rgba(72,152,216,0.15)",
    },
  },

  fire: {
    light: {
      "--bg":          "#ede4d8",   /* warm ash */
      "--surface":     "#d4c4b0",   /* ash gray — left nav */
      "--surface-2":   "#f4ece0",   /* pale smoke — top nav, cards */
      "--border":      "#a87050",
      "--border-light":"#cc9878",
      "--text":        "#200800",
      "--text-dim":    "#3c1808",
      "--text-muted":  "#7c4828",
      "--accent":      "#c82c08",   /* hot ember */
      "--accent-dim":  "rgba(200,44,8,0.12)",
    },
    dark: {
      "--bg":          "#180800",   /* charcoal black-red */
      "--surface":     "#0c0400",   /* near black */
      "--surface-2":   "#240e04",   /* dark coal */
      "--border":      "#5c1c08",
      "--border-light":"#3c1004",
      "--text":        "#f8dcc8",
      "--text-dim":    "#d09070",
      "--text-muted":  "#906040",
      "--accent":      "#f04820",   /* hot orange-red */
      "--accent-dim":  "rgba(240,72,32,0.15)",
    },
  },

  forest: {
    light: {
      "--bg":          "#d8e8d4",   /* pale sage */
      "--surface":     "#b8d0b0",   /* soft moss — left nav */
      "--surface-2":   "#e8f4e4",   /* light fern — top nav, cards */
      "--border":      "#507850",
      "--border-light":"#78a870",
      "--text":        "#081808",
      "--text-dim":    "#183018",
      "--text-muted":  "#407840",
      "--accent":      "#1a6828",   /* deep forest */
      "--accent-dim":  "rgba(26,104,40,0.12)",
    },
    dark: {
      "--bg":          "#060e04",   /* near-black green */
      "--surface":     "#040804",   /* deepest woodland */
      "--surface-2":   "#0c180a",   /* dark fern */
      "--border":      "#1c401c",
      "--border-light":"#102c10",
      "--text":        "#c8f0c8",
      "--text-dim":    "#88c880",
      "--text-muted":  "#488048",
      "--accent":      "#4cc860",   /* bright fern */
      "--accent-dim":  "rgba(76,200,96,0.15)",
    },
  },

  dusk: {
    light: {
      "--bg":          "#e4daf0",   /* pale lavender */
      "--surface":     "#c8b8e0",   /* muted purple — left nav */
      "--surface-2":   "#f0e8fc",   /* soft violet — top nav, cards */
      "--border":      "#7050a0",
      "--border-light":"#9878c8",
      "--text":        "#100818",
      "--text-dim":    "#201030",
      "--text-muted":  "#604878",
      "--accent":      "#5820a0",   /* deep indigo */
      "--accent-dim":  "rgba(88,32,160,0.12)",
    },
    dark: {
      "--bg":          "#0c0614",   /* near-black purple */
      "--surface":     "#08040c",   /* deepest indigo */
      "--surface-2":   "#160a1e",   /* dark violet */
      "--border":      "#381060",
      "--border-light":"#240840",
      "--text":        "#ecdcf8",
      "--text-dim":    "#b090d8",
      "--text-muted":  "#806898",
      "--accent":      "#9060e0",   /* bright violet */
      "--accent-dim":  "rgba(144,96,224,0.15)",
    },
  },

  stone: {
    light: {
      "--bg":          "#d8dade",   /* cool concrete */
      "--surface":     "#c0c4ca",   /* steel gray — left nav */
      "--surface-2":   "#eaecf0",   /* light slate — top nav, cards */
      "--border":      "#6a7080",
      "--border-light":"#909aaa",
      "--text":        "#101418",
      "--text-dim":    "#202830",
      "--text-muted":  "#546070",
      "--accent":      "#2a4060",   /* dark steel blue */
      "--accent-dim":  "rgba(42,64,96,0.12)",
    },
    dark: {
      "--bg":          "#10141a",   /* dark steel */
      "--surface":     "#08090e",   /* near-black slate */
      "--surface-2":   "#1c2028",   /* dark concrete */
      "--border":      "#2c3440",
      "--border-light":"#1c2430",
      "--text":        "#d0d8e4",
      "--text-dim":    "#9098a8",
      "--text-muted":  "#5c6878",
      "--accent":      "#6090c8",   /* bright steel blue */
      "--accent-dim":  "rgba(96,144,200,0.15)",
    },
  },
};

/*
  clearPalette() — declared before applyPalette so Rollup's const-inlining
  doesn't hit a TDZ when applyPalette calls it.
*/
export function clearPalette() {
  const root = document.documentElement;
  MANAGED_VARS.forEach((v) => root.style.removeProperty(v));
}

/*
  applyPalette(key, mode)
  key  — a PALETTE_KEYS value, or null/"default" to reset
  mode — "light" | "dark"

  Only call when the user is inside the app (entered === true).
  Never call with raw user-supplied colour values.
*/
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
