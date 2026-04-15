# AI Prompts

Documents the exact prompts used in the InvoicePrepper AI pipeline. Update this file whenever a prompt changes in the edge functions.

---

## Voice Parse — Transcription (Groq Whisper)

**File:** `supabase/functions/voice-parse/index.ts`
**Model:** `whisper-large-v3-turbo`
**Input:** Audio file (webm or mp4)
**Output:** Raw transcript string

No system prompt — Whisper is a transcription model, not a chat model. Audio is sent directly.

---

## Voice Parse + Text Parse — Extraction (Groq LLaMA)

**File:** `supabase/functions/voice-parse/index.ts` and `supabase/functions/text-parse/index.ts`
**Model:** `llama-3.3-70b-versatile`
**Input:** Transcript (voice) or raw text (text parse)
**Output:** Structured JSON mapped to invoice fields

### System Prompt

```
You extract invoice data from invoice descriptions. Return ONLY valid JSON.

[If business_name set]: Context: The user's business is "{business_name}". Use this as vendor_name unless they explicitly mention a different business name.
[If currency set]: Default currency: {currency}. Use this unless explicitly overridden in the description.
[If past invoices exist]: RAG context with recent client names and services injected here.

Output format:
{
  "vendor_name": string or null,
  "customer_name": string or null,
  "currency": "CAD" or "USD" or "EUR" or "GBP" or other ISO 4217 code,
  "tax_rate": number or null,
  "notes": string or null,
  "line_items": [
    { "description": string, "quantity": number, "unit_price": number }
  ]
}

Rules:
- vendor_name is who is ISSUING the invoice.
- customer_name is who is RECEIVING the invoice.
- currency: detect from explicit mentions. Default to "CAD" if not mentioned.
- CRITICAL: Every distinct product or service MUST be its own separate line item. "web service and paint service" = TWO items.
- quantity: extract from any pattern — "4 apples", "x4", "3 hours", "two units". Default to 1 only if truly none mentioned.
- description: item name only, never include quantity.
- unit_price: price PER UNIT. If total given with quantity, divide.
- tax_rate: percentage as plain number (15% GST → 15). null if not mentioned.
- notes: payment terms or extra info only. Not item descriptions.
- Do not invent data not in the description.
- Spelling correction: correct plausible typos against user's invoice history only if confident.

Examples:
- "4 apples at 2 dollars each" → [{ description: "Apples", quantity: 4, unit_price: 2 }]
- "web design and hosting" → two items, quantity 1 each
- "invoice John for 3 hours of consulting at $85" → [{ description: "Consulting", quantity: 3, unit_price: 85 }]
- "5 widgets for $50 total" → [{ description: "Widgets", quantity: 5, unit_price: 10 }]
```

### User Message

```
Extract invoice data from this description: "{text}"
```

---

## RAG Context

Recent invoice history (last 10 invoices) is injected into the system prompt to help the model recognise returning clients and services by name. Format:

```
User invoice history (use for name/service recognition only):
- Customer: {name}, Services: {descriptions}
```

---

## Notes / Future Prompt Ideas

<!-- Add your own notes here -->
<!-- e.g. "tested adding 'always capitalise proper nouns' — improved client name quality" -->
<!-- e.g. "tried asking for due_date extraction — too unreliable, removed" -->
