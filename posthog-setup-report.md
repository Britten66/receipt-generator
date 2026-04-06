<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into InvoicePrepper's Supabase Edge Functions backend. A shared PostHog client helper was added to `supabase/functions/_shared/posthog.ts`, configured for serverless operation (flushAt: 1, flushInterval: 0, shutdown after each request). All 11 events were instrumented across 7 edge functions. User identification is wired at signup (email, tier, created_at) and on subscription state changes (tier property kept in sync). `posthog-node` was added to `frontend/package.json` and `POSTHOG_API_KEY` / `POSTHOG_HOST` were written to `frontend/.env`. These same keys need to be added as Supabase secrets for deployed edge functions.

| Event | Description | File |
|---|---|---|
| `invoice created` | User successfully creates a new invoice with line items | `supabase/functions/receipts/index.ts` |
| `invoice updated` | User successfully updates an existing invoice | `supabase/functions/receipts/index.ts` |
| `invoice deleted` | User deletes an invoice | `supabase/functions/receipts/index.ts` |
| `invoice sent` | User emails an invoice to a client (Pro+ only) | `supabase/functions/send-invoice/index.ts` |
| `checkout started` | User initiates a Stripe checkout session | `supabase/functions/stripe-checkout/index.ts` |
| `subscription activated` | Stripe confirms checkout completed; tier upgraded | `supabase/functions/stripe-webhook/index.ts` |
| `subscription cancelled` | User sets cancel_at_period_end on their subscription | `supabase/functions/cancel-subscription/index.ts` |
| `subscription downgraded` | Stripe subscription deleted; tier reset to free | `supabase/functions/stripe-webhook/index.ts` |
| `voice parse completed` | User successfully uses voice AI to parse invoice fields | `supabase/functions/voice-parse/index.ts` |
| `text parse completed` | User successfully uses text AI to parse invoice fields | `supabase/functions/text-parse/index.ts` |
| `user signed up` | New user account created via database webhook | `supabase/functions/notify-signup/index.ts` |

## Next steps

Deploy the edge functions and add `POSTHOG_API_KEY` and `POSTHOG_HOST` as Supabase secrets via the dashboard or CLI:

```
supabase secrets set POSTHOG_API_KEY=<your-key> POSTHOG_HOST=https://us.i.posthog.com
```

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard:** [Analytics basics](https://us.posthog.com/project/371851/dashboard/1437449)
- **Signup to paid conversion funnel** - [https://us.posthog.com/project/371851/insights/WUNYf8xN](https://us.posthog.com/project/371851/insights/WUNYf8xN)
- **Checkout to subscription conversion** - [https://us.posthog.com/project/371851/insights/J8SUuf93](https://us.posthog.com/project/371851/insights/J8SUuf93)
- **New signups per day** - [https://us.posthog.com/project/371851/insights/eXXitb4b](https://us.posthog.com/project/371851/insights/eXXitb4b)
- **Invoice activity (created vs sent)** - [https://us.posthog.com/project/371851/insights/osTiSw4V](https://us.posthog.com/project/371851/insights/osTiSw4V)
- **Subscription health (activated vs cancelled vs downgraded)** - [https://us.posthog.com/project/371851/insights/rjALBoNF](https://us.posthog.com/project/371851/insights/rjALBoNF)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
