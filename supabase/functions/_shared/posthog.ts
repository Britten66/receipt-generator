// PostHog client for Supabase Edge Functions (Deno).
// Edge functions are short-lived serverless processes, so we use flushAt: 1
// and flushInterval: 0 to send events immediately, and call shutdown() after capture.
import { PostHog } from "https://esm.sh/posthog-node@5.0.0";

export function createPostHogClient(): PostHog {
  const apiKey = Deno.env.get("POSTHOG_API_KEY") ?? "";
  const host = Deno.env.get("POSTHOG_HOST") ?? "";
  return new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}
