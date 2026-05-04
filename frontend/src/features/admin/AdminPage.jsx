import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminPage.css";

const LABELS_KEY = "admin_user_labels";
const FILTERS_KEY = "admin_filters";
const LABEL_OPTIONS = ["real", "friend", "tester", "demo", "hidden"];

const FILTER_DEFAULTS = {
  search: "",
  tierFilter: "all",
  categoryFilter: "real",
  activityFilter: "all",
  joinedFilter: "all",
  sort: { col: "signed_up_at", dir: "desc" },
};

function getStoredLabels() {
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) || "{}"); }
  catch { return {}; }
}

function getStoredFilters() {
  try { return { ...FILTER_DEFAULTS, ...JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}") }; }
  catch { return FILTER_DEFAULTS; }
}

function persistLabel(userId, label) {
  const stored = getStoredLabels();
  if (label === "real") delete stored[userId];
  else stored[userId] = label;
  localStorage.setItem(LABELS_KEY, JSON.stringify(stored));
}

const SortIcon = ({ col, sort }) => {
  if (sort.col !== col) return <span className="sort-icon sort-none">⇅</span>;
  return <span className="sort-icon">{sort.dir === "asc" ? "↑" : "↓"}</span>;
};

const Th = ({ col, children, sort, onSort }) => (
  <th
    onClick={() => onSort(col)}
    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSort(col)}
    className="admin-th-sortable"
    tabIndex={0}
    role="columnheader"
    aria-sort={sort.col === col ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
  >
    {children} <SortIcon col={col} sort={sort} />
  </th>
);

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [labels, setLabels] = useState(getStoredLabels);

  const stored = getStoredFilters();
  const [search, setSearch] = useState(stored.search);
  const [tierFilter, setTierFilter] = useState(stored.tierFilter);
  const [categoryFilter, setCategoryFilter] = useState(stored.categoryFilter);
  const [activityFilter, setActivityFilter] = useState(stored.activityFilter);
  const [joinedFilter, setJoinedFilter] = useState(stored.joinedFilter);
  const [sort, setSort] = useState(stored.sort);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErr("Sign in required"); setLoading(false); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-stats`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) {
        if (!cancelled) { setErr(res.status === 403 ? "Forbidden" : `Error ${res.status}`); setLoading(false); }
        return;
      }
      const json = await res.json();
      if (!cancelled) { setUsers(json.users || []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({ search, tierFilter, categoryFilter, activityFilter, joinedFilter, sort }));
  }, [search, tierFilter, categoryFilter, activityFilter, joinedFilter, sort]);

  const handleLabel = (userId, label) => {
    persistLabel(userId, label);
    setLabels(getStoredLabels());
  };

  const toggleSort = (col) => {
    setSort(s => s.col === col
      ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
      : { col, dir: "asc" }
    );
  };

  const resetFilters = () => {
    setSearch("");
    setTierFilter("all");
    setCategoryFilter("real");
    setActivityFilter("all");
    setJoinedFilter("all");
    setSort({ col: "signed_up_at", dir: "desc" });
  };

  const isFiltered = search || tierFilter !== "all" || categoryFilter !== "real"
    || activityFilter !== "all" || joinedFilter !== "all";

  const filtered = useMemo(() => {
    let list = users.map(u => ({ ...u, _label: labels[u.user_id] || "real" }));

    if (categoryFilter === "all") {
      // show everything
    } else {
      list = list.filter(u => u._label === categoryFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u => u.email?.toLowerCase().includes(q));
    }

    if (tierFilter !== "all") list = list.filter(u => u.tier === tierFilter);

    if (activityFilter === "active") list = list.filter(u => (u.invoice_count || 0) > 0);
    if (activityFilter === "inactive") list = list.filter(u => (u.invoice_count || 0) === 0);
    if (activityFilter === "sent") list = list.filter(u => (u.sent_count || 0) > 0);
    if (activityFilter === "paid") list = list.filter(u => (u.paid_count || 0) > 0);

    if (joinedFilter !== "all") {
      const days = parseInt(joinedFilter);
      list = list.filter(u => (u.days_since_signup || 0) <= days);
    }

    list = [...list].sort((a, b) => {
      let av = a[sort.col] ?? "";
      let bv = b[sort.col] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [users, labels, search, tierFilter, categoryFilter, activityFilter, joinedFilter, sort]);

  const totals = filtered.reduce((acc, u) => {
    acc.total += 1;
    acc.pro += u.tier === "pro" ? 1 : 0;
    acc.voice += u.tier === "voice" ? 1 : 0;
    acc.invoices += u.invoice_count || 0;
    acc.paid += u.paid_count || 0;
    return acc;
  }, { total: 0, pro: 0, voice: 0, invoices: 0, paid: 0 });

  if (loading) return <div className="admin-wrap"><p>Loading...</p></div>;
  if (err) return <div className="admin-wrap"><p>{err}</p></div>;

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1 className="admin-title">Admin</h1>
        <span className="admin-count">{filtered.length} of {users.length} users</span>
      </div>

      <div className="admin-ci">
        <a
          href="https://github.com/Britten66/receipt-generator/actions/workflows/ci.yml"
          target="_blank"
          rel="noreferrer"
          className="admin-ci-badge"
        >
          <img
            src="https://github.com/Britten66/receipt-generator/actions/workflows/ci.yml/badge.svg"
            alt="CI status"
          />
        </a>
        <a
          href="https://github.com/Britten66/receipt-generator/actions/workflows/ci.yml"
          target="_blank"
          rel="noreferrer"
          className="admin-ci-link"
        >
          Actions
        </a>
        <a
          href="https://britten66.github.io/receipt-generator/"
          target="_blank"
          rel="noreferrer"
          className="admin-ci-link"
        >
          Test Report
        </a>
      </div>

      <div className="admin-kpis">
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.total}</div><div className="admin-kpi-label">Users</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.pro}</div><div className="admin-kpi-label">Pro</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.voice}</div><div className="admin-kpi-label">Voice AI</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.invoices}</div><div className="admin-kpi-label">Invoices</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.paid}</div><div className="admin-kpi-label">Paid</div></div>
      </div>

      <div className="admin-filters">
        <input
          className="admin-search"
          type="text"
          placeholder="Search email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select className="admin-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="real">Real users</option>
          <option value="all">All categories</option>
          <option value="friend">Friends</option>
          <option value="tester">Testers</option>
          <option value="demo">Demo</option>
          <option value="hidden">Hidden</option>
        </select>

        <select className="admin-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
          <option value="all">All tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="voice">Voice AI</option>
        </select>

        <select className="admin-select" value={activityFilter} onChange={e => setActivityFilter(e.target.value)}>
          <option value="all">All activity</option>
          <option value="active">Has invoices</option>
          <option value="inactive">No invoices</option>
          <option value="sent">Has sent</option>
          <option value="paid">Has paid</option>
        </select>

        <select className="admin-select" value={joinedFilter} onChange={e => setJoinedFilter(e.target.value)}>
          <option value="all">Any time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>

        {isFiltered && (
          <button className="admin-reset" onClick={resetFilters}>Reset</button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <Th col="email" sort={sort} onSort={toggleSort}>Email</Th>
              <Th col="tier" sort={sort} onSort={toggleSort}>Tier</Th>
              <th>Category</th>
              <Th col="signed_up_at" sort={sort} onSort={toggleSort}>Signed up</Th>
              <Th col="days_since_signup" sort={sort} onSort={toggleSort}>Days</Th>
              <Th col="invoice_count" sort={sort} onSort={toggleSort}>Invoices</Th>
              <Th col="sent_count" sort={sort} onSort={toggleSort}>Sent</Th>
              <Th col="paid_count" sort={sort} onSort={toggleSort}>Paid</Th>
              <Th col="last_invoice_at" sort={sort} onSort={toggleSort}>Last invoice</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user_id} className={u._label !== "real" ? `admin-row-${u._label}` : ""}>
                <td>{u.email}</td>
                <td><span className={`admin-tier admin-tier-${u.tier}`}>{u.tier}</span></td>
                <td>
                  <select
                    className={`admin-label-select admin-label-${u._label}`}
                    aria-label={`Category for ${u.email}`}
                    value={u._label}
                    onChange={e => handleLabel(u.user_id, e.target.value)}
                  >
                    {LABEL_OPTIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </td>
                <td>{u.signed_up_at ? new Date(u.signed_up_at).toLocaleDateString() : "-"}</td>
                <td>{u.days_since_signup}</td>
                <td>{u.invoice_count}</td>
                <td>{u.sent_count}</td>
                <td>{u.paid_count}</td>
                <td>{u.last_invoice_at ? new Date(u.last_invoice_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="9" className="admin-empty">No users match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
