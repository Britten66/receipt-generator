{/* AI Feature Section — ready to drop into LandingPage.jsx between {/* 3 — Features */} and {/* 5 — How it works */} */}
{/* Also requires the .lv2-ai-* CSS block in LandingPage.css */}

<section className="lv2-ai-feature">
  <p className="lv2-ai-eyebrow">Voice AI Plan</p>
  <h2 className="lv2-ai-title">An AI that learns your business</h2>
  <p className="lv2-ai-desc">Say your invoice out loud or type a quick description. The AI fills in your clients, line items, quantities, and prices. The more you invoice, the smarter it gets.</p>

  <div className="lv2-ai-examples">
    <div className="lv2-ai-example">
      <div className="lv2-ai-spoken">"Invoice Sarah for 3 hours of design at 85"</div>
      <div className="lv2-ai-fills">
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Client</span><span>Sarah Mitchell</span></div>
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Service</span><span>Design Work x 3 - $255.00</span></div>
      </div>
    </div>
    <div className="lv2-ai-example">
      <div className="lv2-ai-spoken">"Logo and web design for Thornton, net 30"</div>
      <div className="lv2-ai-fills">
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Client</span><span>Thornton Co.</span></div>
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Line 1</span><span>Logo Design - $300.00</span></div>
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Line 2</span><span>Web Design - $1,200.00</span></div>
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Notes</span><span>Net 30</span></div>
      </div>
    </div>
    <div className="lv2-ai-example">
      <div className="lv2-ai-spoken">"4 hours consulting for DataFlow at the usual rate"</div>
      <div className="lv2-ai-fills">
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Client</span><span>DataFlow Inc.</span></div>
        <div className="lv2-ai-fill-row"><span className="lv2-ai-field">Service</span><span>Consulting x 4 hrs - $340.00</span></div>
      </div>
    </div>
  </div>

  <div className="lv2-ai-flywheel">
    <p className="lv2-ai-flywheel-hook">Other apps make you learn them. InvoicePrepper learns you.</p>
    <p className="lv2-ai-flywheel-sub">First invoice: knows your business name and currency. Tenth: knows your clients by name. Fiftieth: you barely have to say anything.</p>
  </div>

  <button className="lv2-plan-btn lv2-plan-btn-voice lv2-ai-cta" onClick={onEnterVoice}>
    Try Voice AI - CAD $12/mo
  </button>
</section>
