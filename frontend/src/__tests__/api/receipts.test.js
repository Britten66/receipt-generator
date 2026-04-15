import { describe, it, expect, vi, beforeEach } from "vitest";

/*
  Tests for src/api/receipts.js — the CRUD wrappers around the /receipts edge function.

  Strategy: mock globalThis.fetch and assert the correct URL, method, and body
  are passed. We don't test the edge function itself here — just that the client
  builds the right requests.
*/

// Stub env and supabase before the module is imported
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

const { fetchReceipts, fetchReceiptById, createReceipt, updateReceipt, deleteReceipt } =
  await import("../../api/receipts.js");

const BASE = "https://test.supabase.co/functions/v1";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve(body), status }));
}

describe("API", () => {

describe("fetchReceipts", () => {
  it("calls GET /receipts and returns parsed JSON", async () => {
    mockFetch([{ id: "1", vendor_name: "Acme" }]);
    const result = await fetchReceipts();
    expect(fetch).toHaveBeenCalledWith(`${BASE}/receipts`, expect.objectContaining({ headers: expect.any(Object) }));
    expect(result).toEqual([{ id: "1", vendor_name: "Acme" }]);
  });
});

describe("fetchReceiptById", () => {
  it("calls GET /receipts?id=X and returns parsed JSON", async () => {
    mockFetch({ id: "abc", line_items: [] });
    const result = await fetchReceiptById("abc");
    expect(fetch).toHaveBeenCalledWith(`${BASE}/receipts?id=abc`, expect.anything());
    expect(result.id).toBe("abc");
  });

  it("returns error object when receipt not found", async () => {
    mockFetch({ error: "Not found" }, 404);
    const result = await fetchReceiptById("missing");
    expect(result.error).toBe("Not found");
  });
});

describe("createReceipt", () => {
  it("calls POST /receipts with correct body", async () => {
    const payload = { vendor_name: "Acme", customer_name: "Bob" };
    mockFetch({ id: "new-id", ...payload }, 201);
    await createReceipt(payload);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/receipts`);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toMatchObject(payload);
  });
});

describe("updateReceipt", () => {
  it("calls PATCH /receipts?id=X with correct body", async () => {
    mockFetch({ id: "abc", vendor_name: "Updated" });
    await updateReceipt("abc", { vendor_name: "Updated" });
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/receipts?id=abc`);
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body).vendor_name).toBe("Updated");
  });

  it("returns error object on 404 without throwing", async () => {
    mockFetch({ error: "Not found" }, 404);
    const result = await updateReceipt("missing", { vendor_name: "X" });
    expect(result.error).toBe("Not found");
  });

  it("sends Authorization header with Bearer token", async () => {
    mockFetch({ id: "abc" });
    await updateReceipt("abc", {});
    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe("Bearer test-token");
  });
});

describe("deleteReceipt", () => {
  it("calls DELETE /receipts?id=X", async () => {
    mockFetch({ message: "Deleted" });
    await deleteReceipt("abc");
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/receipts?id=abc`);
    expect(opts.method).toBe("DELETE");
  });
});


}); // API