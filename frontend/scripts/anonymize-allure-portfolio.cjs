#!/usr/bin/env node
/*
  anonymize-allure-portfolio.cjs
  Runs against ./allure-results before `allure generate` for the portfolio build.
  Two jobs:
    1. Group every test under one of 12 portfolio epics (Behaviors view).
    2. Strip product identifiers and host fingerprints from result JSON.
  Source test files are untouched: this is purely a transform on Allure output.
*/
const fs = require("fs");
const path = require("path");

const RESULTS_DIR = path.resolve(__dirname, "..", "allure-results");

const EPICS = {
  AUTH:    "EP-01 Authentication & Session Management",
  BILLING: "EP-02 Subscription Billing & Payment Flows",
  CRUD:    "EP-03 Core CRUD & Data Persistence",
  A11Y:    "EP-04 Accessibility Compliance (WCAG 2.1 AA)",
  SEO:     "EP-05 Marketing Funnel & SEO",
  PROFILE: "EP-06 User Profile & Onboarding",
  AUTHZ:   "EP-07 API Authorization & Data Ownership",
  XSS:     "EP-08 Input Validation & XSS Defense",
  ABUSE:   "EP-09 Rate Limiting & Abuse Prevention",
  EMAIL:   "EP-10 Email Delivery & Tier Enforcement",
  AI:      "EP-11 AI / Voice Input Parsing",
  DOMAIN:  "EP-12 Business Logic & Financial Math",
  MISC:    "EP-13 Miscellaneous",
};

const ROUTES = [
  [/security[.\/]privacy-consent/i,         "ABUSE"],
  [/security[.\/]send-invoice-rate-limit/i, "ABUSE"],
  [/security[.\/]notify-signup/i,           "ABUSE"],
  [/security[.\/]send-invoice-sender/i,     "EMAIL"],
  [/security[.\/]cors/i,                    "AUTHZ"],
  [/security[.\/]fields-whitelist/i,        "AUTHZ"],
  [/security[.\/]user-data-ownership/i,     "AUTHZ"],
  [/security[.\/]validation/i,              "XSS"],
  [/security[.\/]themes/i,                  "XSS"],
  [/api[.\/]ai-parse/i,                     "AI"],
  [/api[.\/]receipts/i,                     "CRUD"],
  [/components[.\/](BillingModal|PlansModal|UpgradeConfirmModal)/i, "BILLING"],
  [/components[.\/](HelpModal|WelcomeModal)/i,                      "PROFILE"],
  [/components[.\/](InvoiceGrid|InvoiceDetail|ReceiptForm|AppSidebar)/i, "CRUD"],
  [/logic[.\/](invoice-math|edge-cases)/i,  "DOMAIN"],
  [/e2e[.\/]accessibility/i,                "A11Y"],
  [/e2e[.\/]auth/i,                         "AUTH"],
  [/e2e[.\/]billing/i,                      "BILLING"],
  [/e2e[.\/]dashboard/i,                    "CRUD"],
  [/e2e[.\/]invoices/i,                     "CRUD"],
  [/e2e[.\/]landing/i,                      "SEO"],
  [/e2e[.\/]profile/i,                      "PROFILE"],
  [/e2e[.\/]seo-pages/i,                    "SEO"],
];

const SEVERITY = {
  AUTH: "critical", BILLING: "critical", A11Y: "critical",
  AUTHZ: "blocker", XSS: "blocker", ABUSE: "blocker",
  EMAIL: "critical", CRUD: "normal", AI: "normal",
  DOMAIN: "normal", SEO: "minor", PROFILE: "normal",
  MISC: "minor",
};

const REDACTIONS = [
  [/InvoicePrepper/g, "the application"],
  [/invoiceprepper\.com/gi, "example.com"],
  [/invoiceprepper/gi, "the application"],
  [/MacBookPro/g, "ci-runner-linux"],
  [/britten63@hotmail\.com/gi, "tester@example.com"],
  [/firstsipsolutions@gmail\.com/gi, "admin@example.com"],
];

function redact(s) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const [re, rep] of REDACTIONS) out = out.replace(re, rep);
  return out;
}

function deepRedact(obj) {
  if (Array.isArray(obj)) return obj.map(deepRedact);
  if (obj && typeof obj === "object") {
    const o = {};
    for (const k of Object.keys(obj)) o[k] = deepRedact(obj[k]);
    return o;
  }
  return redact(obj);
}

function classify(haystack) {
  for (const [re, key] of ROUTES) if (re.test(haystack)) return key;
  return "MISC";
}

function titleCase(s) {
  return String(s).replace(/[-_.]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();
}

if (!fs.existsSync(RESULTS_DIR)) {
  console.error(`anonymize-allure-portfolio: ${RESULTS_DIR} not found, nothing to do`);
  process.exit(0);
}

let processed = 0, classified = 0, misc = 0;

for (const f of fs.readdirSync(RESULTS_DIR)) {
  const p = path.join(RESULTS_DIR, f);
  if (!f.endsWith(".json")) {
    if (f.endsWith(".txt") || f.endsWith(".log")) {
      const txt = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, redact(txt));
    }
    continue;
  }

  const data = JSON.parse(fs.readFileSync(p, "utf8"));

  if (f.endsWith("-result.json")) {
    const pkg = (data.labels || []).find(l => l.name === "package")?.value || "";
    const origParent = (data.labels || []).find(l => l.name === "parentSuite")?.value || "";
    const origSuite  = (data.labels || []).find(l => l.name === "suite")?.value || "";

    const haystack = `${pkg}|${data.fullName || ""}|${(data.titlePath || []).join("/")}`;
    const epicKey = classify(haystack);
    if (epicKey === "MISC") misc++; else classified++;

    data.labels = (data.labels || []).filter(l =>
      !["epic","feature","story","suite","parentSuite","subSuite","host","severity"].includes(l.name)
    );

    const fileStem = (pkg.split(".").filter(Boolean).slice(-2)[0] || "tests");
    const feature = origSuite || titleCase(fileStem);
    const story = origParent && origParent !== origSuite ? origParent : "";

    data.labels.push({ name: "epic",        value: EPICS[epicKey] });
    data.labels.push({ name: "parentSuite", value: EPICS[epicKey] });
    data.labels.push({ name: "feature",     value: feature });
    data.labels.push({ name: "suite",       value: feature });
    if (story) data.labels.push({ name: "story", value: story });
    data.labels.push({ name: "severity", value: SEVERITY[epicKey] || "normal" });
    data.labels.push({ name: "host", value: "ci-runner-linux" });
  }

  fs.writeFileSync(p, JSON.stringify(deepRedact(data)));
  processed++;
}

console.log(
  `anonymize-allure-portfolio: ${processed} files processed ` +
  `(${classified} mapped to epic, ${misc} → MISC)`
);
