import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminPage.css";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

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

  const totals = users.reduce((acc, u) => {
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
      <h1 className="admin-title">Admin</h1>

      <div className="admin-kpis">
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.total}</div><div className="admin-kpi-label">Users</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.pro}</div><div className="admin-kpi-label">Pro</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.voice}</div><div className="admin-kpi-label">Voice AI</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.invoices}</div><div className="admin-kpi-label">Invoices</div></div>
        <div className="admin-kpi"><div className="admin-kpi-num">{totals.paid}</div><div className="admin-kpi-label">Paid</div></div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Tier</th>
              <th>Signed up</th>
              <th>Days</th>
              <th>Invoices</th>
              <th>Sent</th>
              <th>Paid</th>
              <th>Last invoice</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.email}</td>
                <td><span className={`admin-tier admin-tier-${u.tier}`}>{u.tier}</span></td>
                <td>{u.signed_up_at ? new Date(u.signed_up_at).toLocaleDateString() : "-"}</td>
                <td>{u.days_since_signup}</td>
                <td>{u.invoice_count}</td>
                <td>{u.sent_count}</td>
                <td>{u.paid_count}</td>
                <td>{u.last_invoice_at ? new Date(u.last_invoice_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
