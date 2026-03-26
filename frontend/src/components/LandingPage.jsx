import "./LandingPage.css";

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-card">
        <p className="landing-eyebrow">Keep Track - Invoice Tracking</p>
        <h1 className="landing-title">
          Stay on top
          <br />
          Of every invoice
        </h1>
        <p className="landing-desc">
          Stop losing invoices, chasing payments, and guessing what’s outstanding. Quickly generate clear, professional receipts and keep every invoice organized so you get paid faster with less admin stress.
        </p>

        <button className="landing-bubble" onClick={onEnter}>
          Start Now
        </button>
      </div>
    </div>
  );
}