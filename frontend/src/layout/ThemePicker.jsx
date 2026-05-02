/*
  ThemePicker.jsx: Pro-only site theme picker in the sidebar.

  Collapsed by default behind a "Theme ▾" toggle button.
  When open, shows 8 zone dots in a single horizontal row.
  Clicking a dot expands its 4 variation dots directly below the row.
  The active dot for a zone gets a highlight ring.
  Picking a variation collapses everything.

  applyZoneVars writes to .app-shell CSS vars only: landing page is unaffected.
*/

import { useState } from "react";

const ZONES = [
  {
    id: "background",
    label: "Background",
    circle: "#b8b0a4",
    vars: ["--bg", "--surface-2"],
    variations: [
      {
        label: "Sand",
        light: { "--bg": "#dcdcda", "--surface-2": "#f0f0ed" },
        dark: { "--bg": "#2c3032", "--surface-2": "#26292b" },
      },
      {
        label: "Bone",
        light: { "--bg": "#e0dbd2", "--surface-2": "#f2ede6" },
        dark: { "--bg": "#282624", "--surface-2": "#222018" },
      },
      {
        label: "Mist",
        light: { "--bg": "#d4d8dc", "--surface-2": "#e8ecf0" },
        dark: { "--bg": "#242830", "--surface-2": "#1e2228" },
      },
      {
        label: "Smoke",
        light: { "--bg": "#d8d8d8", "--surface-2": "#ececec" },
        dark: { "--bg": "#282828", "--surface-2": "#242424" },
      },
    ],
  },
  {
    id: "panels",
    label: "Panels",
    circle: "#d0c8bc",
    vars: ["--surface"],
    variations: [
      {
        label: "Natural",
        light: { "--surface": "#e8e8e5" },
        dark: { "--surface": "#181a1b" },
      },
      {
        label: "Warm",
        light: { "--surface": "#ede8e0" },
        dark: { "--surface": "#1e1a16" },
      },
      {
        label: "Cool",
        light: { "--surface": "#e0e6ec" },
        dark: { "--surface": "#141e26" },
      },
      {
        label: "Tinted",
        light: { "--surface": "#e8e4f0" },
        dark: { "--surface": "#16141e" },
      },
    ],
  },
  {
    id: "accent",
    label: "Accent",
    circle: "#c87d30",
    vars: ["--accent", "--accent-dim"],
    variations: [
      {
        label: "Copper",
        light: {
          "--accent": "#a06830",
          "--accent-dim": "rgba(160,104,48,0.12)",
        },
        dark: {
          "--accent": "#c8924a",
          "--accent-dim": "rgba(200,146,74,0.14)",
        },
      },
      {
        label: "Slate",
        light: {
          "--accent": "#4a6fa5",
          "--accent-dim": "rgba(74,111,165,0.12)",
        },
        dark: {
          "--accent": "#6a90c8",
          "--accent-dim": "rgba(106,144,200,0.14)",
        },
      },
      {
        label: "Forest",
        light: {
          "--accent": "#3a7a52",
          "--accent-dim": "rgba(58,122,82,0.12)",
        },
        dark: {
          "--accent": "#5aaa78",
          "--accent-dim": "rgba(90,170,120,0.14)",
        },
      },
      {
        label: "Violet",
        light: {
          "--accent": "#7a68a8",
          "--accent-dim": "rgba(122,104,168,0.12)",
        },
        dark: {
          "--accent": "#9a88c8",
          "--accent-dim": "rgba(154,136,200,0.14)",
        },
      },
    ],
  },
  {
    id: "text",
    label: "Text",
    circle: "#1e1e1c",
    vars: ["--text", "--text-dim", "--text-muted"],
    variations: [
      {
        label: "Pure",
        light: {
          "--text": "#111110",
          "--text-dim": "#3a3a38",
          "--text-muted": "#555553",
        },
        dark: {
          "--text": "#e8dcc8",
          "--text-dim": "#c4b99a",
          "--text-muted": "#989896",
        },
      },
      {
        label: "Warm",
        light: {
          "--text": "#18120c",
          "--text-dim": "#40301e",
          "--text-muted": "#70604e",
        },
        dark: {
          "--text": "#f0e4d0",
          "--text-dim": "#cca880",
          "--text-muted": "#7a6050",
        },
      },
      {
        label: "Cool",
        light: {
          "--text": "#0e1218",
          "--text-dim": "#2a3040",
          "--text-muted": "#5a6a78",
        },
        dark: {
          "--text": "#d8e4f0",
          "--text-dim": "#a8bcd0",
          "--text-muted": "#6880a0",
        },
      },
      {
        label: "Ink",
        light: {
          "--text": "#0c0c0e",
          "--text-dim": "#282830",
          "--text-muted": "#585860",
        },
        dark: {
          "--text": "#f0f0f0",
          "--text-dim": "#c8c8c8",
          "--text-muted": "#888888",
        },
      },
    ],
  },
  {
    id: "buttons",
    label: "Buttons",
    circle: "#2a2826",
    vars: ["--btn-bg", "--btn-text", "--btn-border", "--btn-hover-bg"],
    variations: [
      {
        label: "Classic",
        light: {
          "--btn-bg": "#1a1a1a",
          "--btn-text": "#f5f4f0",
          "--btn-border": "#1a1a1a",
          "--btn-hover-bg": "#333333",
        },
        dark: {
          "--btn-bg": "#e7ddc7",
          "--btn-text": "#1a1a1a",
          "--btn-border": "#c8b89a",
          "--btn-hover-bg": "#d6ccb4",
        },
      },
      {
        label: "Navy",
        light: {
          "--btn-bg": "#1a2a4a",
          "--btn-text": "#e8f0f8",
          "--btn-border": "#1a2a4a",
          "--btn-hover-bg": "#243860",
        },
        dark: {
          "--btn-bg": "#b8d0e8",
          "--btn-text": "#0a1828",
          "--btn-border": "#8ab0d0",
          "--btn-hover-bg": "#a0bcd8",
        },
      },
      {
        label: "Forest",
        light: {
          "--btn-bg": "#1a3a28",
          "--btn-text": "#e8f4ec",
          "--btn-border": "#1a3a28",
          "--btn-hover-bg": "#254e36",
        },
        dark: {
          "--btn-bg": "#a8d8b8",
          "--btn-text": "#0a2418",
          "--btn-border": "#80c098",
          "--btn-hover-bg": "#90c8a8",
        },
      },
      {
        label: "Wine",
        light: {
          "--btn-bg": "#3a0c18",
          "--btn-text": "#f4e8ec",
          "--btn-border": "#3a0c18",
          "--btn-hover-bg": "#521224",
        },
        dark: {
          "--btn-bg": "#e8b0c0",
          "--btn-text": "#280818",
          "--btn-border": "#c88098",
          "--btn-hover-bg": "#d8a0b0",
        },
      },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    circle: "#3d6699",
    vars: ["--nav-active"],
    variations: [
      {
        label: "Copper",
        light: { "--nav-active": "#a06830" },
        dark: { "--nav-active": "#c8924a" },
      },
      {
        label: "Blue",
        light: { "--nav-active": "#4a6fa5" },
        dark: { "--nav-active": "#6a90c8" },
      },
      {
        label: "Green",
        light: { "--nav-active": "#3a7a52" },
        dark: { "--nav-active": "#5aaa78" },
      },
      {
        label: "Rose",
        light: { "--nav-active": "#a04858" },
        dark: { "--nav-active": "#c86878" },
      },
    ],
  },
  {
    id: "borders",
    label: "Borders",
    circle: "#78807a",
    vars: ["--border", "--border-light"],
    variations: [
      {
        label: "Natural",
        light: { "--border": "#888884", "--border-light": "#a8a8a4" },
        dark: { "--border": "#3d4145", "--border-light": "#2e3235" },
      },
      {
        label: "Warm",
        light: { "--border": "#9a8870", "--border-light": "#b8a890" },
        dark: { "--border": "#453828", "--border-light": "#342c20" },
      },
      {
        label: "Cool",
        light: { "--border": "#7a8898", "--border-light": "#9aaabb" },
        dark: { "--border": "#2c3848", "--border-light": "#222c38" },
      },
      {
        label: "Strong",
        light: { "--border": "#606060", "--border-light": "#808080" },
        dark: { "--border": "#4a4a4a", "--border-light": "#383838" },
      },
    ],
  },
  {
    id: "status",
    label: "Status",
    circle: "#2e8c58",
    vars: ["--paid", "--sent", "--draft", "--voided"],
    variations: [
      {
        label: "Classic",
        light: {
          "--paid": "#1a5c3a",
          "--sent": "#1a3060",
          "--draft": "#555552",
          "--voided": "#7a1a1a",
        },
        dark: {
          "--paid": "#2e9e5e",
          "--sent": "#4a70c0",
          "--draft": "#888884",
          "--voided": "#c04a4a",
        },
      },
      {
        label: "Vivid",
        light: {
          "--paid": "#148040",
          "--sent": "#1040a0",
          "--draft": "#484844",
          "--voided": "#a01010",
        },
        dark: {
          "--paid": "#30cc70",
          "--sent": "#3060e0",
          "--draft": "#808080",
          "--voided": "#e03030",
        },
      },
      {
        label: "Muted",
        light: {
          "--paid": "#3a6a50",
          "--sent": "#3a5080",
          "--draft": "#606060",
          "--voided": "#804040",
        },
        dark: {
          "--paid": "#4a9068",
          "--sent": "#5878b0",
          "--draft": "#787878",
          "--voided": "#a06060",
        },
      },
      {
        label: "Earthy",
        light: {
          "--paid": "#2a5a30",
          "--sent": "#2a4068",
          "--draft": "#6a6460",
          "--voided": "#6a3020",
        },
        dark: {
          "--paid": "#3a9850",
          "--sent": "#4a6898",
          "--draft": "#887e78",
          "--voided": "#985838",
        },
      },
    ],
  },
];

// Write vars to .app-shell only: never touches :root so landing page is safe
function applyZoneVars(vars) {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  Object.entries(vars).forEach(([k, v]) => shell.style.setProperty(k, v));
}

export default function ThemePicker({ darkMode, profile, onSaveTheme }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  function handleZoneClick(zone) {
    setExpandedId(expandedId === zone.id ? null : zone.id);
  }

  function handleVariationPick(zone, variation) {
    const vars = darkMode ? variation.dark : variation.light;
    applyZoneVars(vars);
    setExpandedId(null);

    const mode = darkMode ? "dark" : "light";
    const existing = profile?.theme ?? {};
    const existingMode = existing[mode] ?? {};
    onSaveTheme({
      ...existing,
      [mode]: { ...existingMode, ...vars },
      active: { ...(existing.active ?? {}), [zone.id]: variation.label },
    });
  }

  const activeZones = profile?.theme?.active ?? {};

  return (
    <div className="tp-shell">
      {/* Toggle button: collapses/expands the whole picker */}
      <button
        className="tp-toggle"
        onClick={() => {
          setOpen((o) => !o);
          setExpandedId(null);
        }}
      >
        <span>Theme</span>
        <span className="tp-caret">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <>
          {/* Single horizontal row of zone dots */}
          <div className="tp-zones-row">
            {ZONES.map((zone) => {
              const isExpanded = expandedId === zone.id;
              const isActive = !!activeZones[zone.id];
              return (
                <button
                  key={zone.id}
                  className={`tp-zone-dot${isExpanded ? " tp-expanded" : ""}${isActive ? " tp-active" : ""}`}
                  style={{ background: zone.circle }}
                  onClick={() => handleZoneClick(zone)}
                  title={zone.label}
                />
              );
            })}
          </div>

          {/* Variation row: only shown when a zone is expanded, appears below the dot row */}
          {expandedId &&
            (() => {
              const zone = ZONES.find((z) => z.id === expandedId);
              return (
                <div className="tp-variations-row">
                  {zone.variations.map((v, i) => (
                    <button
                      key={v.label}
                      className="tp-var-dot"
                      style={{
                        background: darkMode
                          ? v.dark[zone.vars[0]]
                          : v.light[zone.vars[0]],
                        animationDelay: `${i * 45}ms`,
                      }}
                      onClick={() => handleVariationPick(zone, v)}
                      title={`${zone.label}: ${v.label}`}
                    />
                  ))}
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
