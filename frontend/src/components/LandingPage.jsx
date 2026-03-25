import "./LandingPage.css";

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-card">
        <p className="landing-eyebrow">Keep Track - Invoice Tracking</p>
        <h1 className="landing-title">
          Easy to use
          <br />
          Free Forever
        </h1>
        <p className="landing-desc">
          Generate professional, tailored specific receipts in seconds. Free for
          basic use, with a free account unlocking custom logo branding and
          detailed generation stats.
        </p>

        <button className="landing-bubble" onClick={onEnter}>
          Start Now
        </button>
      </div>
    </div>
  );
}
