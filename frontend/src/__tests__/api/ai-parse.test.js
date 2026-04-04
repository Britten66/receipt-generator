import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  Tests for src/api/aiParse.js

  Covers:
  - parseText: correct request shape, response mapping, error handling
  - parseAudio: correct request shape, error handling
  - mapParsedToForm: field extraction and line item calculation

  Strategy: mock fetch to avoid real API calls. All AI behaviour (LLaMA output)
  is tested via mapParsedToForm — the part we control.
*/

vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

const { parseText, parseAudio, mapParsedToForm } = await import("../../api/aiParse.js");

const TOKEN = "test-access-token";
const BASE  = "https://test.supabase.co/functions/v1";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }));
}

// ---------------------------------------------------------------------------
// parseText
// ---------------------------------------------------------------------------

describe("parseText", () => {
  it("sends POST to text-parse with correct headers and body", async () => {
    mockFetch({ parsed: { vendor_name: "Acme", customer_name: null, notes: null, line_items: [] } });
    await parseText("Invoice to John for 3 hours at 85", TOKEN);

    const call = fetch.mock.calls[0];
    expect(call[0]).toBe(`${BASE}/text-parse`);
    expect(call[1].method).toBe("POST");
    expect(call[1].headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(call[1].headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(call[1].body)).toEqual({ text: "Invoice to John for 3 hours at 85" });
  });

  it("returns parsed object on success", async () => {
    const parsed = { vendor_name: "Acme", customer_name: "John", notes: null, line_items: [{ description: "Design", quantity: 3, unit_price: 85 }] };
    mockFetch({ parsed });
    const result = await parseText("anything", TOKEN);
    expect(result).toEqual(parsed);
  });

  it("throws with server error message on 401", async () => {
    mockFetch({ error: "Unauthorized" }, 401);
    await expect(parseText("anything", TOKEN)).rejects.toThrow("Unauthorized");
  });

  it("throws with server error message on 403 (wrong tier)", async () => {
    mockFetch({ error: "AI parsing requires the Voice AI tier." }, 403);
    await expect(parseText("anything", TOKEN)).rejects.toThrow("AI parsing requires the Voice AI tier.");
  });

  it("throws with server error message on 429 (rate limit)", async () => {
    mockFetch({ error: "Daily AI limit reached. Try again tomorrow." }, 429);
    await expect(parseText("anything", TOKEN)).rejects.toThrow("Daily AI limit reached. Try again tomorrow.");
  });

  it("falls back to generic error when server sends no message", async () => {
    mockFetch({}, 500);
    await expect(parseText("anything", TOKEN)).rejects.toThrow("Error 500");
  });
});

// ---------------------------------------------------------------------------
// parseAudio
// ---------------------------------------------------------------------------

describe("parseAudio", () => {
  it("sends POST to voice-parse with audio blob and correct content-type", async () => {
    const transcript = "Invoice to John";
    const parsed     = { vendor_name: null, customer_name: "John", notes: null, line_items: [] };
    mockFetch({ transcript, parsed });

    const blob = new Blob(["audio-data"], { type: "audio/webm" });
    await parseAudio(blob, "audio/webm", TOKEN);

    const call = fetch.mock.calls[0];
    expect(call[0]).toBe(`${BASE}/voice-parse`);
    expect(call[1].method).toBe("POST");
    expect(call[1].headers["Content-Type"]).toBe("audio/webm");
    expect(call[1].headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  it("returns transcript and parsed on success", async () => {
    const response = {
      transcript: "3 hours of design for John at 85 dollars",
      parsed: { vendor_name: null, customer_name: "John", notes: null, line_items: [{ description: "Design", quantity: 3, unit_price: 85 }] },
    };
    mockFetch(response);
    const blob   = new Blob(["audio-data"], { type: "audio/webm" });
    const result = await parseAudio(blob, "audio/webm", TOKEN);
    expect(result.transcript).toBe(response.transcript);
    expect(result.parsed).toEqual(response.parsed);
  });

  it("throws on voice-parse error", async () => {
    mockFetch({ error: "Transcription failed. Please try again." }, 502);
    const blob = new Blob(["audio-data"], { type: "audio/webm" });
    await expect(parseAudio(blob, "audio/webm", TOKEN)).rejects.toThrow("Transcription failed. Please try again.");
  });
});

// ---------------------------------------------------------------------------
// mapParsedToForm — field extraction and line item math
// ---------------------------------------------------------------------------

describe("mapParsedToForm", () => {
  it("extracts all top-level fields", () => {
    const parsed = {
      vendor_name: "Acme Studio",
      customer_name: "John Doe",
      notes: "Net 30",
      line_items: [],
    };
    const { fields } = mapParsedToForm(parsed);
    expect(fields.vendor_name).toBe("Acme Studio");
    expect(fields.customer_name).toBe("John Doe");
    expect(fields.notes).toBe("Net 30");
  });

  it("omits null fields so form keeps existing values", () => {
    const parsed = { vendor_name: null, customer_name: "John", notes: null, line_items: [] };
    const { fields } = mapParsedToForm(parsed);
    expect(fields).not.toHaveProperty("vendor_name");
    expect(fields).not.toHaveProperty("notes");
    expect(fields.customer_name).toBe("John");
  });

  it("maps line items with correct quantity * price total", () => {
    const parsed = {
      vendor_name: null, customer_name: null, notes: null,
      line_items: [{ description: "Design work", quantity: 3, unit_price: 85 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Design work");
    expect(items[0].quantity).toBe("3");
    expect(items[0].unit_price).toBe("85");
    expect(items[0].total).toBe("255.00");
  });

  it("maps multiple line items", () => {
    const parsed = {
      vendor_name: null, customer_name: null, notes: null,
      line_items: [
        { description: "Design", quantity: 3, unit_price: 85 },
        { description: "Logo",   quantity: 1, unit_price: 300 },
      ],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items).toHaveLength(2);
    expect(items[1].description).toBe("Logo");
    expect(items[1].total).toBe("300.00");
  });

  it("defaults quantity to 1 when AI omits it", () => {
    const parsed = {
      vendor_name: null, customer_name: null, notes: null,
      line_items: [{ description: "Flat fee", quantity: 0, unit_price: 500 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].quantity).toBe("1");
    expect(items[0].total).toBe("500.00");
  });

  it("returns null items when line_items is empty", () => {
    const parsed = { vendor_name: null, customer_name: null, notes: null, line_items: [] };
    const { items } = mapParsedToForm(parsed);
    expect(items).toBeNull();
  });

  it("returns null items when line_items is missing", () => {
    const parsed = { vendor_name: null, customer_name: null, notes: null };
    const { items } = mapParsedToForm(parsed);
    expect(items).toBeNull();
  });

  it("handles fractional quantities (1.5 hours at 100)", () => {
    const parsed = {
      vendor_name: null, customer_name: null, notes: null,
      line_items: [{ description: "Consulting", quantity: 1.5, unit_price: 100 }],
    };
    const { items } = mapParsedToForm(parsed);
    expect(items[0].quantity).toBe("1.5");
    expect(items[0].total).toBe("150.00");
  });

  it("handles a real-world spoken invoice description result", () => {
    // Simulates what LLaMA returns for: "Invoice to John, 3 hours of design at 85, and logo for 300"
    const parsed = {
      vendor_name: null,
      customer_name: "John",
      notes: null,
      line_items: [
        { description: "Design", quantity: 3, unit_price: 85 },
        { description: "Logo",   quantity: 1, unit_price: 300 },
      ],
    };
    const { fields, items } = mapParsedToForm(parsed);
    expect(fields.customer_name).toBe("John");
    expect(items[0].total).toBe("255.00");
    expect(items[1].total).toBe("300.00");
  });
});
