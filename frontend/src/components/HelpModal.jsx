import { useState, useRef, useEffect } from "react";
import { FileText, Mic, Mail, Scale } from "lucide-react";

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

            {/* Getting started */}
            <div className="help-section">
              <div className="help-section-head"><FileText size={13} strokeWidth={2} /><span>Getting started</span></div>
              <div className="help-row"><span className="help-step">1</span>Hit <strong>+ New Invoice</strong> to create one</div>
              <div className="help-row"><span className="help-step">2</span>Add your client, line items, and date</div>
              <div className="help-row"><span className="help-step">3</span>Move status: Draft → Sent → Paid</div>
              <div className="help-row"><span className="help-step">4</span>Preview, download PDF, or send to client</div>
            </div>

            <div className="win-divider" />

            {/* AI */}
            <div className="help-section">
              <div className="help-section-head"><Mic size={13} strokeWidth={2} /><span>Voice AI</span></div>
              <div className="help-row"><span className="help-dot" />Type a description and AI fills in the fields</div>
              <div className="help-row"><span className="help-dot" />Say "web design and hosting" to get two line items</div>
              <div className="help-row"><span className="help-dot" />Detects currency from context (USD, CAD, EUR, GBP)</div>
              <div className="help-row"><span className="help-dot" />Free: 3 parses per month. Pro: unlimited. Always review before sending.</div>
            </div>

            <div className="win-divider" />

            {/* Support */}
            <div className="help-section">
              <div className="help-section-head"><Mail size={13} strokeWidth={2} /><span>Support</span></div>
              <div className="help-row">
                <span className="help-dot" />
                <a href="mailto:support@invoiceprepper.com" style={{ color: "var(--accent)" }}>support@invoiceprepper.com</a>
              </div>
            </div>

            {onLegal && (
              <>
                <div className="win-divider" />
                <div className="help-section">
                  <div className="help-section-head"><Scale size={13} strokeWidth={2} /><span>Legal</span></div>
                  <div className="help-row">
                    <span className="help-dot" />
                    <button onClick={() => { onLegal("terms"); onClose(); }} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11 }}>Terms of Service</button>
                  </div>
                  <div className="help-row">
                    <span className="help-dot" />
                    <button onClick={() => { onLegal("privacy"); onClose(); }} style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11 }}>Privacy Policy</button>
                  </div>
                </div>
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
