// PostHog client for Supabase Edge Functions (Deno).
// Edge functions are short-lived serverless processes, so we use flushAt: 1
// and flushInterval: 0 to send events immediately, and call shutdown() after capture.
import { PostHog } from "https://esm.sh/posthog-node@5.0.0";

export function createPostHogClient(): PostHog {
  const apiKey = Deno.env.get("POSTHOG_API_KEY") ?? "";
  const host   = Deno.env.get("POSTHOG_HOST") ?? "";
  return new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}

// Returns true if PostHog is configured. Use to skip tracking when keys are absent.
export function isPostHogConfigured(): boolean {
  return !!Deno.env.get("POSTHOG_API_KEY");
}

// Never blocks more than 2s: prevents EarlyDrop when PostHog is unconfigured or slow.
export async function safeShutdown(ph: PostHog): Promise<void> {
  try {
    await Promise.race([ph.shutdown(), new Promise((r) => setTimeout(r, 2000))]);
  } catch {
    // swallow: analytics must never break core operations
  }
}
