import { useState, useMemo, useEffect } from "react";
import { Bug } from "lucide-react";

import {
  createApplication,
  getApplications,
  deleteApplication,
} from "./api/applications";
import ApplicationTable from "./components/ApplicationTable";
import Aurora from "./components/Aurora";

import "./App.css";

import GlassIcons from "./components/GlassIcons";

const BUG_REPORT_URL =
  "https://github.com/FirstSipSolutions/job-application-tracker/issues/new?title=[BUG]%20&labels=bug&body=**Describe%20the%20bug**%0A%0A**Steps%20to%20reproduce**%0A1.%20%0A2.%20%0A3.%20%0A%0A**Expected%20behaviour**%0A%0A**Actual%20behaviour**%0A%0A**Browser%20%2F%20Device**";
<div
  style={{
    position: "fixed",
    bottom: 32,
    right: 32,
    zIndex: 50,
  }}
></div>;

const STATUS_CONFIG = {
  draft: { label: "DRAFT", color: "#9e9e9e" },
  applied: { label: "APPLIED", color: "#5b9bd5" },
  interviewing: { label: "INTERVIEWING", color: "#e0a84b" },
  offered: { label: "OFFERED", color: "#4cad7c" },
  rejected: { label: "REJECTED", color: "#d96b6b" },
  withdrawn: { label: "WITHDRAWN", color: "#a0a0b0" },
};

const NAV_ITEMS = [
  "ALL",
  "APPLIED",
  "INTERVIEWING",
  "OFFERED",
  "REJECTED",
  "DRAFT",
];

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    job_url: "",
    date_applied: "",
    notes: "",
  });

  useEffect(() => {
    getApplications()
      .then((data) => setApplications(data))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.company_name || !form.job_title) return;
    const result = await createApplication(form);
    setApplications([result, ...applications]);
    setForm({
      company_name: "",
      job_title: "",
      job_url: "",
      date_applied: "",
      notes: "",
    });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    const app = applications.find((a) => a.id === id);
    if (
      !window.confirm(
        `Delete application for ${app.company_name}? This can't be undone.`,
      )
    )
      return;
    await deleteApplication(id);
    setApplications(applications.filter((a) => a.id !== id));
  };

  // removed search bar to clean up UI
  const filtered = useMemo(() => {
    return activeFilter === "ALL"
      ? applications
      : applications.filter((a) => a.status.toUpperCase() === activeFilter);
  }, [applications, activeFilter]);

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map((s) => [
      s,
      applications.filter((a) => a.status === s).length,
    ]),
  );

  const thisMonth = applications.filter((a) => {
    if (!a.created_at) return false;
    const d = new Date(a.created_at);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const recentApplications = applications.slice(0, 5);

  const AURORA_COLORS = {
    ALL: ["#0a2a3a", "#0d6e8a", "#1a3a4a"],
    APPLIED: ["#1a0a3a", "#7b2fff", "#0a0a2a"],
    INTERVIEWING: ["#3a2a0d", "#6b4a1a", "#4a3a0d"],
    OFFERED: ["#0d3a1a", "#1a6b2a", "#0d2a14"],
    REJECTED: ["#3a0d0d", "#6b1a1a", "#2a0d0d"],
    DRAFT: ["#1a1a2e", "#2a2a4a", "#0d0d1e"],
    WITHDRAWN: ["#1a1a1a", "#2a2a2a", "#0d0d0d"],
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
      <Aurora
        colorStops={AURORA_COLORS[activeFilter]}
        blend={0.4}
        amplitude={1.2}
        speed={0.5}
      />

      {/* ── HEADER ── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(18px, 4vw, 28px)",
            fontWeight: 300,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "#e8e2d9",
            margin: 0,
          }}
        >
          APPLICATION{" "}
          <span style={{ color: "#c9a96e", fontWeight: 500 }}>TRACKER</span>
        </h1>
        <button className="glow-button" onClick={() => setShowForm(true)}>
          + Log
        </button>
      </header>

      {/* ── MAIN GRID ── */}
      <div
        className="main-layout"
        style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}
      >
        {/* ── LEFT COLUMN ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            minWidth: 0,
          }}
        >
          {/* Stats */}
          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "This Month",
                value: `+${thisMonth}`,
                sub: "Applications",
              },
              { label: "Total", value: applications.length, sub: "Life-time" },
              {
                label: "Interviews",
                value: counts.interviewing || 0,
                sub: "Active Stage",
              },
              { label: "Offers", value: counts.offered || 0, sub: "Received" },
            ].map((s) => (
              <div key={s.label} className="glass-card" style={{ padding: 16 }}>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    color: "rgba(201,169,110,0.5)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 300,
                    color: "#e8e2d9",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(232,226,217,0.3)",
                    marginTop: 4,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Search + filter tabs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 16,
                borderBottom: "1px solid rgba(201,169,110,0.05)",
                overflowX: "auto",
              }}
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveFilter(item)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom:
                      activeFilter === item
                        ? "1px solid #e8e2d9"
                        : "1px solid transparent",
                    color:
                      activeFilter === item
                        ? "#e8e2d9"
                        : "rgba(232,226,217,0.3)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    paddingBottom: 10,
                    cursor: "pointer",
                    transition: "color 0.18s",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(201,169,110,0.05)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(201,169,110,0.9)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Applications
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(201,169,110,0.4)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Total: {filtered.length}
              </span>
            </div>
            <div className="table-scroll">
              <div className="row">
                {["", "COMPANY", "ROLE", "STATUS", "DATE", ""].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 7,
                      letterSpacing: "0.2em",
                      color: "rgba(232,226,217,0.2)",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {isLoading ? (
                <div
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    color: "rgba(232,226,217,0.1)",
                  }}
                >
                  LOADING...
                </div>
              ) : (
                <ApplicationTable
                  applications={filtered}
                  STATUS_CONFIG={STATUS_CONFIG}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div
          className="right-col"
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/*  breakdown */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(201,169,110,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(201,169,110,0.9)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Overview
              </span>
            </div>
            <div
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = counts[key] || 0;
                const pct = applications.length
                  ? Math.round((count / applications.length) * 100)
                  : 0;
                return (
                  <div key={key}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.16em",
                          color: "rgba(232,226,217,0.3)",
                          textTransform: "uppercase",
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span
                        style={{ fontSize: 9, color: "rgba(232,226,217,0.3)" }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 2,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: cfg.color,
                          borderRadius: 4,
                          transition: "width 0.7s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(201,169,110,0.9)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Quick Stats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  label: "Response Rate",
                  value: applications.length
                    ? `${Math.round(((counts.interviewing || 0) / applications.length) * 100)}%`
                    : "0%",
                },
                {
                  label: "Offer Rate",
                  value: applications.length
                    ? `${Math.round(((counts.offered || 0) / applications.length) * 100)}%`
                    : "0%",
                },
                {
                  label: "Active Applications",
                  value: (counts.applied || 0) + (counts.interviewing || 0),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontSize: 11, color: "rgba(232,226,217,0.4)" }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{ fontSize: 11, color: "rgba(232,226,217,0.7)" }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(201,169,110,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(201,169,110,0.9)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Recent
              </span>
            </div>
            <div
              style={{
                padding: "14px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {recentApplications.length === 0 ? (
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    color: "rgba(232,226,217,0.1)",
                    textTransform: "uppercase",
                    padding: "12px 0",
                  }}
                >
                  No entries yet
                </div>
              ) : (
                recentApplications.map((app, idx) => {
                  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.draft;
                  const isLast = idx === recentApplications.length - 1;
                  return (
                    <div
                      key={app.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        position: "relative",
                        paddingBottom: isLast ? 0 : 18,
                      }}
                    >
                      {!isLast && (
                        <div
                          style={{
                            position: "absolute",
                            left: 6,
                            top: 14,
                            bottom: 0,
                            width: 1,
                            background: "rgba(255,255,255,0.06)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: 13,
                          height: 13,
                          borderRadius: "50%",
                          background: idx === 0 ? cfg.color : "transparent",
                          border: `1px solid ${cfg.color}`,
                          flexShrink: 0,
                          marginTop: 2,
                          boxShadow:
                            idx === 0 ? `0 0 6px ${cfg.color}60` : "none",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: "rgba(232,226,217,0.8)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {app.company_name}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: "rgba(232,226,217,0.2)",
                              flexShrink: 0,
                            }}
                          >
                            {timeAgo(app.created_at)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(232,226,217,0.35)",
                            marginTop: 2,
                          }}
                        >
                          {app.job_title}
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <span
                            style={{
                              fontSize: 7,
                              fontWeight: 700,
                              letterSpacing: "0.12em",
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: `${cfg.color}18`,
                              color: cfg.color,
                              border: `1px solid ${cfg.color}30`,
                              textTransform: "uppercase",
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BUG REPORT BUTTON ── */}
      {/* Fixed bottom right — opens a pre-filled GitHub issue */}
      {/* ── BUG REPORT BUTTON ── */}
      <button
        onClick={() => window.open(BUG_REPORT_URL, "_blank")}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(232,226,217,0.25)",
          fontSize: 10,
          letterSpacing: "0.1em",
          transition: "color 0.2s",
          padding: 0,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "rgba(232,226,217,0.7)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(232,226,217,0.25)")
        }
      >
        <Bug size={13} />
        Found a bug? Report it here
      </button>

      {/* ── FOOTER ── */}
      <footer style={{ marginTop: 48, paddingBottom: 24, textAlign: "center" }}>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "rgba(232,226,217,0.15)",
          }}
        >
          © 2026 First Sip Solutions{" "}
        </span>
      </footer>

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div
            className="glass-card"
            style={{ padding: 32, width: "100%", maxWidth: 500 }}
          >
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.22em",
                color: "rgba(232,226,217,0.2)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              New Entry
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#e8e2d9",
                marginBottom: 28,
                marginTop: 0,
              }}
            >
              Log Application
            </h2>
            <div style={{ display: "grid", gap: 18 }}>
              {[
                {
                  label: "Company Name *",
                  key: "company_name",
                  placeholder: "e.g. Shopify",
                },
                {
                  label: "Job Title *",
                  key: "job_title",
                  placeholder: "e.g. Junior Developer",
                },
                {
                  label: "Job URL",
                  key: "job_url",
                  placeholder: "https://...",
                },
                {
                  label: "Date Applied",
                  key: "date_applied",
                  placeholder: "YYYY-MM-DD",
                },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 8,
                      letterSpacing: "0.18em",
                      color: "rgba(232,226,217,0.2)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </label>
                  <input
                    className="field"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (key === "job_url" && val && !val.startsWith("http"))
                        val = "https://" + val;
                      setForm({ ...form, [key]: val });
                    }}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 8,
                    letterSpacing: "0.18em",
                    color: "rgba(232,226,217,0.2)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Notes
                </label>
                <textarea
                  className="field"
                  rows={3}
                  placeholder="Recruiter, salary, interview prep..."
                  style={{ resize: "none" }}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button
                className="glow-button"
                style={{ flex: 1 }}
                onClick={handleSubmit}
              >
                Save Application
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: "none",
                  border: "1px solid rgba(201,169,110,0.1)",
                  color: "rgba(232,226,217,0.3)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
