import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // We removed the server/proxy block because we will use
  // Environment Variables to set the API location instead.
});
