// Global test setup — runs before every test file
import { vi } from "vitest";

// Silence console.error in tests unless explicitly tested
vi.spyOn(console, "error").mockImplementation(() => {});
