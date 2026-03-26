# Receipt Generator — Project Guide

## Stack
- **Frontend**: React (Vite), deployed on Vercel
- **Backend**: Express.js (Node ESM), target deploy: Railway
- **Database**: PostgreSQL via Supabase connection pooler
- **Auth**: Supabase Auth — anonymous by default, upgrade to email/password
- **PDF**: jsPDF + jspdf-autotable

## Running Locally
```bash
npm run dev          # runs frontend (port 5173) + backend (port 3000) via concurrently
cd backend && npm run dev   # backend only
cd frontend && npm run dev  # frontend only
```

## Env Files
**`frontend/.env`**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://qajcynqmjtlzofoyklyp.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

**`backend/.env`**
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://qajcynqmjtlzofoyklyp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NODE_ENV=production
```

## Database Schema (Supabase / PostgreSQL)
```sql
receipts (id, user_id, vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, created_at)
line_items (id, receipt_id, description, quantity, unit_price, total)
profiles (user_id PK, business_name, address, email, phone)
```

## Auth Model
- On load: auto `signInAnonymously()` — no auth gate
- `isAnon = session?.user?.is_anonymous ?? true`
- Anonymous users: see ticker bar + sidebar CTA to create account
- Logged-in users: see business profile button, sign out button, email in topbar
- Sign out re-triggers anonymous sign-in automatically

## Key Files
| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Main shell, auth, state, routing |
| `frontend/src/App.css` | All layout and component styles |
| `frontend/src/api/receipts.js` | Fetch wrappers for receipt CRUD |
| `frontend/src/api/profile.js` | Fetch wrappers for business profile |
| `frontend/src/components/ReceiptForm.jsx` | Create/edit receipt modal |
| `frontend/src/components/ReceiptPDF.js` | jsPDF receipt generation |
| `frontend/src/components/ProfileModal.jsx` | Edit business profile modal |
| `frontend/src/components/AuthModal.jsx` | Signup/login overlay modal |
| `frontend/src/components/AuthPage.jsx` | Standalone auth page (unused as gate) |
| `frontend/src/lib/supabase.js` | Supabase client singleton |
| `backend/src/app.js` | Express app, routes mounted |
| `backend/src/middleware/auth.middleware.js` | JWT auth via Supabase admin |
| `backend/src/controllers/receipts.controller.js` | Receipt CRUD handlers |
| `backend/src/controllers/profile.controller.js` | Profile get/upsert handlers |
| `backend/src/db/pool.js` | pg Pool using DATABASE_URL |

---

## Backlog

### 🔴 Critical (fix first)

- [ ] **Deploy backend to Railway** — Vercel app calls `localhost:3000`, broken for all users
  - Set `VITE_API_URL` in Vercel env vars to Railway URL after deploy
- [ ] **Supabase RLS** — Add row-level security policies to `receipts` and `profiles` tables
  ```sql
  -- receipts: users can only see/modify their own
  alter table receipts enable row level security;
  create policy "own receipts" on receipts for all to authenticated
    using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

  -- profiles: same
  alter table profiles enable row level security;
  create policy "own profile" on profiles for all to authenticated
    using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
  ```
- [ ] **Mobile layout** — Sidebar + main grid breaks on phones. Need responsive layout (stack sidebar above main, or drawer)
- [ ] **Replace `window.confirm` for delete** — Use inline confirmation UI instead

### 🟡 Missing Features (interviewers notice)

- [ ] **PDF includes business profile** — Address, email, phone from profile should appear on PDF under vendor name
- [ ] **Sequential receipt numbers** — Change from `REC-${Date.now().slice(-6)}` to `REC-001`, `REC-002` etc. (query MAX receipt number for user on create)
- [ ] **Search receipts** — Filter by vendor, customer, or receipt number
- [ ] **Error UI on load failure** — Show "Something went wrong" instead of silent empty list
- [ ] **Lock down CORS** — Whitelist Vercel URL in backend `cors()` config

### 🟢 Polish

- [ ] Skeleton loader instead of "Loading..." text
- [ ] Duplicate receipt button
- [ ] Date range filter (by month)
- [ ] CSV export
- [ ] Better empty state (first-time user prompt)

---

## Conventions
- All fonts: Noto Sans / Noto Sans Mono (no IBM Plex)
- CSS custom properties in `:root` — no hardcoded colours in components
- Backend controllers all wrapped in try/catch, return JSON errors
- No `window.confirm` — use inline confirmation UI
- No vendor name pre-fill from localStorage (removed)
- Commits: no "Co-Authored-By: Claude" lines
