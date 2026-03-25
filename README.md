# The PipeLine
### Job Application Tracker — MVP Live

A full-stack job application tracker built to manage and visualize a job search pipeline. Designed and shipped as a two-person team project under First Sip Solutions.

**Live:** https://first-sip-application-tracker.netlify.app/
**Org:** https://github.com/FirstSipSolutions

---

## Tech Stack

- **Frontend:** React + Vite, deployed on Netlify
- **Backend:** Node.js + Express v5, deployed on Render
- **Database:** PostgreSQL hosted on Supabase
- **Validation:** Zod
- **Styling:** Pure CSS, glass morphism aesthetic

---

## Features

- Log job applications with company, title, URL, date, and notes
- Track status across six stages: Draft, Applied, Interviewing, Offered, Rejected, Withdrawn
- Pipeline breakdown sidebar with live counts and progress bars
- Recent applications activity feed
- Search and filter by status
- Delete with confirmation guard
- Form modal with URL auto-prefix

---

## Status

| Feature | Status |
|---|---|
| GET /api/applications | Live |
| POST /api/applications | Live |
| DELETE /api/applications/:id | Live |
| PUT /api/applications/:id | In Progress |
| StatusDropdown UI | In Progress |
| EditModal UI | In Progress |
| Mobile responsive | Backlog |
| Auth / per-user data | Phase 2 |

---

## Team

This project was built by two developers working vertical feature slices — each developer owned a full slice of the stack from database to UI rather than splitting frontend and backend responsibilities.

**Chris** owned the Create and Read slice, building the POST and GET endpoints, wiring the form and dashboard table to live data, and handling the full deployment pipeline across Supabase, Render, and Netlify.

**Justin** owned the Update and Delete slice, building the PUT and DELETE endpoints and the corresponding UI components including the edit modal and status dropdown.

Day to day we ran a lightweight standup structure — checking in on blockers, syncing on integration points where our slices touched, and reviewing each other's PRs before merging. The goal was to keep both developers moving independently without stepping on each other, while staying aligned on the shared schema and API contracts. When bugs came up we worked through them together, treating each one as a learning opportunity rather than just a fix — understanding why something broke before patching it.

---

## Project Management

Tracked via **GitHub Projects**.

- **Backlog** — planned, not yet started
- **Ready** — scoped and assigned
- **In Progress** — actively being built
- **In Review** — PR open, awaiting approval
- **Done** — merged and closed

### Workflow

1. Create an Issue before writing any code
2. Assign and move to Ready
3. Create a branch — `feat/`, `fix/`, or `chore/`
4. Open a PR linked with `Closes #[issue number]`
5. Other dev reviews and approves
6. Merge into `development` — `development` merges into `main` on release

---

## Structure
```
job-application-tracker/
├── backend/
│   ├── docs/
│   ├── node_modules/
│   ├── src/
│   ├── .env
│   ├── package-lock.json
│   ├── package.json
│   ├── schema.sql
│   └── server.js
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   └── vite.config.js
├── node_modules/
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── server.js
```
---

## Phase 2 Backlog

- Auth — JWT/sessions, per-user data isolation
- TypeScript migration
- Email reminders for follow-ups
- Analytics dashboard
- Chrome extension to scrape job postings
- AWS migration — RDS, Elastic Beanstalk, CloudFront
