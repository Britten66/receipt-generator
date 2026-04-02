import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/*
  vitest.config.js — separate from vite.config.js so the production build
  config stays clean. jsdom gives us a browser-like DOM for testing CSS
  setProperty calls without needing a real browser.
*/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",  // needed to test document.documentElement.style
    globals: true,          // describe/it/expect without imports
    include: ["src/__tests__/**/*.test.{js,ts}"],
    reporter: "verbose",    // show each test name in CI output
  },
});
