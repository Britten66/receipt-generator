import { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, Zap } from "lucide-react";
import { fetchReferralInfo } from "../../api/referrals";
import { useModalEscape } from "../../lib/useModalEscape";
import "./ReferralModal.css";

export default function ReferralModal({ onClose, onSignUp, onCopy }) {
  const isGuest = !!onSignUp;
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(!isGuest);
  const [copied, setCopied] = useState(false);

  useModalEscape(onClose);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top      = `-${scrollY}px`;
    document.body.style.width    = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      const y = parseFloat(document.body.style.top || "0") * -1;
      document.body.style.position = "";
      document.body.style.top      = "";
      document.body.style.width    = "";
      document.body.style.overflow = "";
      window.scrollTo(0, y);
    };
  }, []);

  useEffect(() => {
    if (isGuest) return;
    fetchReferralInfo()
      .then(setInfo)
      .finally(() => setLoading(false));
  }, [isGuest]);

  const handleCopy = () => {
    if (!info?.share_url) return;
    navigator.clipboard.writeText(info.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const grantExpiry = info?.pro_grant_until
    ? new Date(info.pro_grant_until).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ref-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Refer a friend">

        <button className="ref-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="ref-icon-wrap">
          <Gift size={28} strokeWidth={1.75} />
        </div>

        <h2 className="ref-title">Refer a Friend</h2>
        <p className="ref-sub">
          Share your link. When your friend signs up and creates their first invoice,
          <strong> you both get 1 month of Pro, free.</strong>
        </p>

        {isGuest && (
          <button className="ref-signup-cta" onClick={() => { onClose(); onSignUp(); }}>
            Sign up free and get your referral link
          </button>
        )}

        {!isGuest && loading && <div className="ref-loading">Loading your link...</div>}

        {!isGuest && !loading && info && (
          <>
            <div className="ref-link-row">
              <span className="ref-link-text">{info.share_url}</span>
              <button className="ref-copy-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="ref-stats">
              <div className="ref-stat">
                <Users size={14} strokeWidth={1.75} />
                <span><strong>{info.friends_referred}</strong> friend{info.friends_referred !== 1 ? "s" : ""} referred</span>
              </div>
              {info.grant_active && grantExpiry && (
                <div className="ref-stat ref-stat-active">
                  <Zap size={14} strokeWidth={1.75} />
                  <span>Pro active until <strong>{grantExpiry}</strong></span>
                </div>
              )}
            </div>

            <div className="ref-code-row">
              <span className="ref-code-label">Your code</span>
              <span className="ref-code">{info.code}</span>
            </div>
          </>
        )}

        {!isGuest && !loading && !info && (
          <p className="ref-error">Couldn't load your referral info. Try again.</p>
        )}

        <p className="ref-fine">
          No cap on referrals. Pro grants stack up to 90 days. Both sides must make at least one invoice to qualify.
        </p>
      </div>
    </div>
  );
}
