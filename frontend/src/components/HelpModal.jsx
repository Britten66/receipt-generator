import { useState, useRef, useEffect } from "react";

export default function HelpModal({ onClose, isPro, onLegal }) {
  /*
    pos starts as null so the window renders centred via CSS transform.
    The moment the user drags it, we switch to explicit pixel coords and
    drop the transform — otherwise the transform origin fights the drag math.
  */
  const [pos, setPos]             = useState(null);
  const [minimized, setMinimized] = useState(false);

  const modalRef  = useRef(null);

  /*
    dragging is a ref, not state, intentionally.
    We don't want a re-render every time the flag flips — we just need
    the mousemove handler to be able to read it synchronously without
    going stale inside the event listener closure.
  */
  const dragging  = useRef(false);

  /*
    dragStart captures the window's top-left corner at the moment the
    user pressed down, plus where the mouse was at that same moment.
    We compute the delta on every mousemove and add it to the original
    corner position — this way the window doesn't "jump" to the cursor.
  */
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });

  function handleTitleMouseDown(e) {
    if (e.button !== 0) return; // only left-click drags
    e.preventDefault(); // prevents text selection while dragging
    const rect = modalRef.current.getBoundingClientRect();
    dragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: rect.left,
      winY: rect.top,
    };
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.winX + (e.clientX - dragStart.current.mouseX),
        y: dragStart.current.winY + (e.clientY - dragStart.current.mouseY),
      });
    }

    /*
      mouseup on the window (not just the modal) so releasing the mouse
      anywhere on screen always stops the drag — not just if you release
      while hovering over the window itself.
    */
    function onMouseUp() { dragging.current = false; }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []); // empty — dragStart and setPos are both stable references

  /*
    When pos is null we rely on CSS (left: 50%, transform: translate(-50%,-50%))
    to centre the window. Once the user drags it we replace that with raw
    pixel positions and remove the transform so they don't compound.
  */
  const posStyle = pos
    ? { left: pos.x, top: pos.y, transform: "none" }
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <>
      {/*
        A transparent full-screen div sits behind the window.
        Clicking it closes the modal. This replaces the usual dark backdrop
        because a floating draggable window looks wrong inside a dimmed overlay.
      */}
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />

      {/*
        resize: both (set in CSS on .win-modal) gives us the native browser
        resize handle in the bottom-right corner for free — no JS needed.
        The window needs overflow: hidden so the content clips during resize
        and the body's overflow: auto handles internal scrolling.
      */}
      <div ref={modalRef} className="win-modal" style={{ ...posStyle, zIndex: 200 }}>

        <div className="win-titlebar" onMouseDown={handleTitleMouseDown}>
          <span className="win-titlebar-title">How it works</span>
          <div style={{ display: "flex", gap: 3 }}>
            <button className="win-btn" onClick={() => setMinimized(v => !v)} title={minimized ? "restore" : "minimise"}>
              {minimized ? "▲" : "▼"}
            </button>
            <button className="win-btn" onClick={onClose} title="close">✕</button>
          </div>
        </div>

        {!minimized && (
          <div className="win-body">

            <p className="help-heading">Getting started</p>
            <ul className="help-list">
              <li>Hit <strong>+ New Invoice</strong> to create one</li>
              <li>Add your business info, client, line items and date</li>
              <li>Set status: Draft → Sent → Paid (or Voided)</li>
              <li>Tap any invoice to preview, download PDF, or send</li>
            </ul>

            <div className="win-divider" />

            <p className="help-heading">Free vs Pro</p>
            <ul className="help-list">
              <li><strong>Free:</strong> unlimited invoices, PDF download &amp; share</li>
              <li><strong>Pro ($6/mo):</strong> email invoices directly to clients, no watermark, custom logo on PDF</li>
              <li>Upgrade anytime from the sidebar. Cancel anytime from Billing.</li>
              <li>Your data is never sold or shared</li>
            </ul>

            <p className="help-footer">invoiceprepper.com. Built for freelancers, contractors &amp; small business.</p>

            {isPro && onLegal && (
              <>
                <div className="win-divider" />
                <p className="help-heading">Legal</p>
                <ul className="help-list">
                  <li>
                    <button onClick={() => { onLegal("terms"); onClose(); }} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                      Terms of Service
                    </button>
                  </li>
                  <li>
                    <button onClick={() => { onLegal("privacy"); onClose(); }} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
                      Privacy Policy
                    </button>
                  </li>
                </ul>
              </>
            )}

          </div>
        )}

        {/* Decorative grip dots — the actual resize is handled by CSS, this just signals to the user that the corner is draggable */}
        {!minimized && <div className="win-resize-grip" />}

      </div>
    </>
  );
}
