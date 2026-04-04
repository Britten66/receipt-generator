/*
  ReceiptForm.jsx — the modal form for creating or editing a receipt.

  Props:
    onSubmit(data)       — called when the user clicks Generate/Save. data is the full receipt object.
    onClose()            — called when the user clicks Cancel or the backdrop.
    initialData          — if editing an existing receipt, this is the receipt object to pre-fill.
                           if creating a new receipt, this is null/undefined.
    profile              — the user's profile, used to pre-fill the "Issued By" business name field.
    userEmail            — the user's email address, used to build the logo storage path.
    onLogoUpdate(url)    — called after a logo is uploaded so App can update profile state globally.

  The form manages two pieces of state:
    form  — the top-level fields (vendor name, client name, date, etc.)
    items — the array of line items (description, qty, unit price, total per line)
*/

import { useState, useEffect, useRef } from "react";
import { saveProfile } from "../api/profile";
import { uploadLogo } from "../api/uploadLogo";
import { parseText, parseAudio, mapParsedToForm } from "../api/aiParse";

/*
  EMPTY_ITEM is the default shape of a new blank line item.
  quantity starts at "1" so the user can just type in the price.
  We store numbers as strings in state because HTML inputs are strings.
  They get converted to numbers in handleSubmit before being sent to the server.
*/
const EMPTY_ITEM = {
  description: "",
  quantity: "1",
  unit_price: "",
  total: "",
};

// Default tax rate is 0 — users set their own rate per invoice (GST, VAT, HST, etc.)
const DEFAULT_TAX_RATE = 0;

// Corner rotation order — clicking the tile cycles through these in sequence.
const CORNER_ORDER  = ["top-left", "top-right", "bottom-right", "bottom-left"];
const CORNER_LABELS = {
  "top-left":     "Top Left",
  "top-right":    "Top Right",
  "bottom-right": "Bottom Right",
  "bottom-left":  "Bottom Left",
};

export default function ReceiptForm({ onSubmit, onClose, initialData, profile, userEmail, onLogoUpdate }) {

  /*
    form — the main fields of the receipt.

    When creating a new receipt (initialData is null):
      - vendor_name pre-fills from the user's saved profile business name
      - date defaults to today
      - id is null (the server will generate an id on creation)

    When editing an existing receipt (initialData is the receipt object):
      - vendor_name starts blank and gets filled in by the useEffect below
      - id is the existing receipt's id so the server knows to UPDATE not INSERT
  */
  const [form, setForm] = useState(() => {
    // Figure out the initial vendor name
    // If editing, leave it blank — useEffect will fill it in from initialData
    // If creating new, use the saved business name from the profile (or blank)
    let startingVendorName = "";
    if (!initialData && profile && profile.business_name) {
      startingVendorName = profile.business_name;
    }

    return {
      vendor_name: startingVendorName,
      customer_name: "",
      receipt_number: "",
      date: new Date().toISOString().split("T")[0], // today in YYYY-MM-DD format
      isTaxExempt: false,
      taxRate: String(DEFAULT_TAX_RATE * 100), // stored as percent string, e.g. "13" = 13%
      taxLabel: "Tax",                          // e.g. "GST", "VAT", "HST" — user sets per invoice
      currency: localStorage.getItem("lastCurrency") || "CAD",
      notes: "",
      id: null,
    };
  });

  // The list of line items. Starts with one blank row.
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  // Controls whether the notes textarea is visible. Hidden by default, shown when "+ Add Note" is clicked.
  const [showNotes, setShowNotes] = useState(false);

  // Controls whether the logo placement panel is visible (Pro only).
  const [showLogoPanel, setShowLogoPanel] = useState(false);

  // Which corner to place the logo in on the PDF. Cycles through CORNER_ORDER on each click.
  const [logoCorner, setLogoCorner] = useState("top-left");

  // Local copy of the logo URL — syncs with profile.logo_url unless the user
  // has already uploaded a fresh one during this form session.
  const [localLogoUrl, setLocalLogoUrl] = useState(profile?.logo_url || "");

  // Keep localLogoUrl in sync if the profile updates while the form is open
  // (e.g. user uploaded a new logo from ProfileModal in another tab).
  // Only sync if we don't already have a user-set value this session.
  useEffect(() => {
    if (profile?.logo_url) {
      setLocalLogoUrl((prev) => prev || profile.logo_url);
    }
  }, [profile?.logo_url]);

  // True while a logo file is being uploaded to Supabase Storage.
  const [logoUploading, setLogoUploading] = useState(false);

  // Ref to the hidden file input inside the logo panel.
  const logoFileInputRef = useRef(null);

  // Voice parsing state — voice tier only
  const [voiceRecording, setVoiceRecording]   = useState(false);
  const [voiceParsing, setVoiceParsing]       = useState(false);
  const [voiceError, setVoiceError]           = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceSeconds, setVoiceSeconds]       = useState(0);
  const [voiceText, setVoiceText]             = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const voiceTimerRef    = useRef(null);
  const voiceMimeRef     = useRef("audio/webm");
  const MAX_RECORDING_SECONDS = 45;

  // True on desktop (mouse pointer) — shows text input instead of mic orb
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

  function playChime(type = "start") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const t   = ctx.currentTime;

      function note(freq, startAt, duration, peakGain) {
        const osc  = ctx.createOscillator();
        const g    = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startAt);
        g.gain.setValueAtTime(0, startAt);
        g.gain.linearRampToValueAtTime(peakGain, startAt + 0.02);
        g.gain.setValueAtTime(peakGain, startAt + duration - 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
        osc.start(startAt);
        osc.stop(startAt + duration);
      }

      if (type === "start") {
        // Two clean ascending tones — "listening" (C5 then E5)
        note(523,  t,        0.22, 0.18);
        note(659,  t + 0.20, 0.28, 0.20);
      } else if (type === "stop") {
        // One clear ding — "got it" (A5, audible)
        note(880,  t,        0.30, 0.22);
      } else {
        // Two-note resolution — G5 then C6 ("done")
        note(784,  t,        0.20, 0.18);
        note(1047, t + 0.18, 0.32, 0.16);
      }
    } catch {}
  }

  function speakBack(parsed) {
    if (!window.speechSynthesis) return;
    const customer = parsed.customer_name || "your client";
    const count    = parsed.line_items?.length ?? 0;
    const text     = count > 1
      ? `Invoice for ${customer}, ${count} items. Review the form.`
      : `Invoice for ${customer}. Review the form.`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = 0.85;
    utter.rate   = 1.05;
    window.speechSynthesis.speak(utter);
  }

  function getMimeType() {
    const types = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }

  async function startVoiceRecording() {
    setVoiceError("");
    setVoiceTranscript("");
    setVoiceSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      voiceMimeRef.current = mimeType || "audio/webm";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(voiceTimerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: voiceMimeRef.current });
        await parseVoice(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceRecording(true);
      playChime("start");
      // Tick timer + auto-stop at max
      voiceTimerRef.current = setInterval(() => {
        setVoiceSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopVoiceRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err?.name, err?.message);
      setVoiceError("Microphone access denied. Please allow mic access and try again.");
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      playChime("stop");
      mediaRecorderRef.current.stop();
      setVoiceRecording(false);
      setVoiceParsing(true);
      clearInterval(voiceTimerRef.current);
    }
  }

  function applyParsed(parsed) {
    const { fields, items } = mapParsedToForm(parsed);
    // Only overwrite fields that are currently blank so existing values survive a second parse
    if (fields.vendor_name)        setField("vendor_name",   fields.vendor_name);
    if (fields.customer_name)      setField("customer_name", fields.customer_name);
    if (fields.currency)           setField("currency",      fields.currency);
    if (fields.notes)              { setField("notes", fields.notes); setShowNotes(true); }
    if (fields.taxRate !== undefined) setField("taxRate", fields.taxRate);
    // Append new line items instead of replacing — lets users build up a complex invoice
    // across multiple voice or text passes without losing what they already have
    if (items && items.length > 0) {
      setItems((prev) => {
        const hasContent = prev.some((i) => i.description || i.unit_price);
        return hasContent ? [...prev, ...items] : items;
      });
    }
  }

  // Wipes all AI-filled content back to a single blank line item
  function clearParsed() {
    setItems([{ ...EMPTY_ITEM }]);
    setField("vendor_name", "");
    setField("customer_name", "");
    setField("notes", "");
    setVoiceTranscript("");
    setVoiceError("");
  }

  async function parseVoice(blob) {
    try {
      const { transcript, parsed } = await parseAudio(blob, voiceMimeRef.current);
      setVoiceTranscript(transcript);
      applyParsed(parsed);
      playChime("done");
      speakBack(parsed);
    } catch (err) {
      setVoiceError(err.message || "Something went wrong. Please try again.");
    } finally {
      setVoiceParsing(false);
    }
  }

  async function parseVoiceText(text) {
    if (!text.trim()) return;
    setVoiceParsing(true);
    setVoiceError("");
    setVoiceTranscript("");
    try {
      const parsed = await parseText(text);
      applyParsed(parsed);
      playChime("done");
      setVoiceTranscript("done");
      setVoiceText("");
    } catch (err) {
      setVoiceError(err.message || "Something went wrong. Please try again.");
    } finally {
      setVoiceParsing(false);
    }
  }

  /*
    When editing an existing receipt, load its data into the form.
    This runs once when the component mounts (because initialData is in the dependency array).
    It does nothing when creating a new receipt.
  */
  useEffect(() => {
    if (!initialData) return;

    // Parse isTaxExempt from whether tax is 0 on the saved receipt
    const savedTax      = parseFloat(initialData.tax)      || 0;
    const savedSubtotal = parseFloat(initialData.subtotal)  || 0;
    const wasTaxExempt  = savedTax === 0;

    // Infer what rate was used when the invoice was created so editing feels right.
    // If tax > 0, back-calculate: rate = tax / subtotal * 100, rounded to 2 dp.
    let inferredRate = "0";
    if (savedTax > 0 && savedSubtotal > 0) {
      inferredRate = ((savedTax / savedSubtotal) * 100).toFixed(2).replace(/\.?0+$/, "");
    }

    // Format the date as YYYY-MM-DD for the date input field
    let formattedDate = "";
    if (initialData.date) {
      formattedDate = new Date(initialData.date).toISOString().split("T")[0];
    }

    setForm({
      vendor_name: initialData.vendor_name || "",
      customer_name: initialData.customer_name || "",
      receipt_number: initialData.receipt_number || "",
      date: formattedDate,
      isTaxExempt: wasTaxExempt,
      taxRate:  inferredRate,
      taxLabel: "Tax",
      currency: initialData.currency || "CAD",
      notes: initialData.notes || "",
      id: initialData.id,
    });

    // Show the notes box if the receipt already has notes
    if (initialData.notes) {
      setShowNotes(true);
    }

    // Restore logo corner selection if the receipt had one saved
    if (initialData.logo_corner) {
      setLogoCorner(initialData.logo_corner);
      setShowLogoPanel(true);
    }

    // Load existing line items if the receipt has any
    // We convert numbers back to strings because the input fields work with strings
    if (initialData.line_items && initialData.line_items.length > 0) {
      const loadedItems = initialData.line_items.map((item) => ({
        ...item,
        quantity:   item.quantity.toString(),
        unit_price: item.unit_price.toString(),
        total:      item.total.toString(),
      }));
      setItems(loadedItems);
    }
  }, [initialData]);

  /*
    setField(key, value) — update a single field in the form state.
    For example: setField("customer_name", "Bob Smith")

    The spread ...f copies all existing fields and then overwrites just the one we want.
    This is the standard React pattern for updating a single key in an object state.
  */
  function setField(key, value) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  /*
    setItem(index, key, value) — update a single field on a single line item.

    Arguments:
      index — which line item to update (0 = first row, 1 = second row, etc.)
      key   — which field to update ("description", "quantity", or "unit_price")
      value — the new value typed by the user

    When quantity or unit_price changes, we also recalculate the row total automatically.
    Empty strings are treated as 0 so the field doesn't glitch when the user clears it.
  */
  function setItem(index, key, value) {
    const updatedItems = items.map((item, i) => {
      // Leave all rows except the one being edited exactly as they are
      if (i !== index) return item;

      // Create a copy of this row with the new value
      const updatedRow = { ...item, [key]: value };

      // If quantity or price changed, recalculate the row total
      if (key === "quantity" || key === "unit_price") {
        // Parse the values — treat empty string as 0
        let qty = 0;
        if (updatedRow.quantity !== "") {
          qty = parseFloat(updatedRow.quantity) || 0;
        }

        let price = 0;
        if (updatedRow.unit_price !== "") {
          price = parseFloat(updatedRow.unit_price) || 0;
        }

        // toFixed(2) gives us exactly two decimal places e.g. "25.00"
        updatedRow.total = (qty * price).toFixed(2);
      }

      return updatedRow;
    });

    setItems(updatedItems);
  }

  // Add a new blank line item row to the bottom of the list
  function addItem() {
    setItems((currentItems) => [...currentItems, { ...EMPTY_ITEM }]);
  }

  // Remove a line item row by its index
  function removeItem(index) {
    setItems((currentItems) => currentItems.filter((_, i) => i !== index));
  }

  /*
    Calculate the running totals shown at the bottom of the form.

    subtotal — sum of all line item totals (before tax)
    tax      — 15% of subtotal, or 0 if the receipt is marked tax exempt
    total    — subtotal + tax
  */
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

  const taxRateFraction = form.isTaxExempt ? 0 : (parseFloat(form.taxRate) || 0) / 100;
  const tax   = subtotal * taxRateFraction;
  const total = subtotal + tax;

  /*
    cycleCorner() — advances the logo corner one step through CORNER_ORDER on each click.
  */
  function cycleCorner() {
    setLogoCorner((prev) => {
      const idx = CORNER_ORDER.indexOf(prev);
      return CORNER_ORDER[(idx + 1) % CORNER_ORDER.length];
    });
  }

  /*
    handleLogoUpload(event) — uploads the selected image to Supabase Storage and
    updates both local state and the user's profile so the new logo persists.
  */
  async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setLogoUploading(true);

    const freshUrl = await uploadLogo({ file, userEmail });
    if (freshUrl) {
      setLocalLogoUrl(freshUrl);
      await saveProfile({ ...(profile || {}), logo_url: freshUrl });
      if (onLogoUpdate) onLogoUpdate(freshUrl);
    }

    setLogoUploading(false);
    // Reset the input so the same file can be re-selected if needed
    event.target.value = "";
  }

  /*
    handleSubmit() — called when the user clicks "Generate Receipt" or "Save Changes".

    Validates required fields, then calls onSubmit() with the full receipt data.
    Line items are filtered to remove any rows where description is blank
    (the user may have added a row but not filled it in).
    All number strings are converted to actual numbers before sending.
  */
  function handleSubmit() {
    if (!form.vendor_name || !form.customer_name) {
      alert("Missing Information: Please fill in both 'Issued By' and 'Billed To'.");
      return;
    }

    // Filter out empty rows and convert strings to numbers
    const cleanedItems = items
      .filter((item) => item.description) // skip rows with no description
      .map((item) => ({
        description: item.description,
        quantity:    parseFloat(item.quantity)   || 0,
        unit_price:  parseFloat(item.unit_price) || 0,
        total:       parseFloat(item.total)      || 0,
      }));

    localStorage.setItem("lastCurrency", form.currency);

    onSubmit({
      ...form,
      subtotal,
      tax,
      total,
      line_items: cleanedItems,
      // Pass logo data so the PDF can render it.
      // logo_url uses the local copy which may have been updated via the in-form upload.
      // logo_corner is only set if the panel is open and a logo actually exists.
      logo_url:    showLogoPanel && localLogoUrl ? localLogoUrl : null,
      logo_corner: showLogoPanel && localLogoUrl ? logoCorner   : null,
    });
  }

  /*
    Determine the title and submit button label based on whether we're
    creating a new receipt or editing an existing one.
    form.id is null for new receipts, and the receipt's UUID when editing.
  */
  let modalTitle;
  let submitButtonLabel;
  if (form.id) {
    modalTitle = "Edit Invoice";
    submitButtonLabel = "Save Changes";
  } else {
    modalTitle = "New Invoice";
    submitButtonLabel = "Create Invoice";
  }

  /*
    Placeholder for the receipt number field.
    When editing, the field already has a value so no placeholder is needed.
    When creating, we show "Auto: 001001" to explain that the server
    will generate the number automatically if left blank.
  */
  let receiptNumberPlaceholder;
  if (form.id) {
    receiptNumberPlaceholder = "";
  } else {
    receiptNumberPlaceholder = "Auto: 001001";
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        // Close the modal if the user clicks the dark backdrop behind it
        // e.target is what was clicked, e.currentTarget is the backdrop div itself
        // If they're the same element, the user clicked outside the modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{modalTitle}</span>
          <button className="btn btn-ghost" style={{ padding: "4px 10px" }} onClick={onClose}>✕</button>
        </div>

        {/* Voice AI entry — voice tier only */}
        {profile?.tier === "voice" && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 10 }}>

            {isDesktop ? (
              /* Desktop: text input box */
              <>
                <input
                  type="text"
                  value={voiceText}
                  onChange={(e) => { setVoiceText(e.target.value); setVoiceError(""); setVoiceTranscript(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); parseVoiceText(voiceText); } }}
                  placeholder="Invoice to John, 3 hrs at 85, logo for 300..."
                  disabled={voiceParsing}
                  style={{
                    flex: 1, minWidth: 0, fontSize: 11, padding: "5px 10px",
                    borderRadius: 6, border: "1px solid rgba(77,216,224,0.3)",
                    background: "rgba(77,216,224,0.05)", color: "var(--text)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => parseVoiceText(voiceText)}
                  disabled={voiceParsing || !voiceText.trim()}
                  style={{
                    fontSize: 10, padding: "5px 10px", borderRadius: 6, border: "none",
                    background: voiceParsing ? "rgba(77,216,224,0.2)" : "rgba(77,216,224,0.85)",
                    color: voiceParsing ? "var(--voice-text)" : "#0a1a1c",
                    cursor: voiceParsing || !voiceText.trim() ? "not-allowed" : "pointer",
                    fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0,
                    animation: voiceParsing ? "voice-spin 1.4s linear infinite" : "none",
                  }}
                >
                  {voiceParsing ? "Parsing..." : "Parse"}
                </button>
                {/* Status messages */}
                {(voiceError || voiceTranscript) && (
                  <span style={{ fontSize: 10, flexShrink: 0, color: voiceError ? "var(--voided)" : "var(--voice-text)", fontWeight: 600 }}>
                    {voiceError || "Done. Review below."}
                  </span>
                )}
              </>
            ) : (
              /* Mobile: status text only — the recording button is the full-width bar in the footer */
              <div style={{ flex: 1, minWidth: 0 }}>
                {!voiceRecording && !voiceParsing && !voiceTranscript && !voiceError && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Tap &ldquo;Speak Invoice&rdquo; below to fill in by voice
                  </span>
                )}
                {voiceRecording && (
                  <span style={{ fontSize: 10, color: "#e05555", fontWeight: 600 }}>Listening... {MAX_RECORDING_SECONDS - voiceSeconds}s</span>
                )}
                {voiceParsing && (
                  <span style={{ fontSize: 10, color: "var(--voice-text)" }}>Filling in your invoice...</span>
                )}
                {voiceTranscript && !voiceRecording && !voiceParsing && !voiceError && (
                  <span style={{ fontSize: 10, color: "#4dd8e0", fontWeight: 600 }}>Done. Review below.</span>
                )}
                {voiceError && (
                  <span style={{ fontSize: 10, color: "var(--voided)" }}>{voiceError}</span>
                )}
              </div>
            )}

            <span style={{ fontSize: 8, padding: "1px 5px", background: "rgba(77,216,224,0.12)", border: "1px solid rgba(77,216,224,0.25)", borderRadius: 2, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase", color: "var(--voice-text)", flexShrink: 0 }}>beta</span>
            <button
              type="button"
              onClick={clearParsed}
              title="Clear all AI-filled fields"
              style={{ fontSize: 9, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0 2px", flexShrink: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >Clear</button>
          </div>
        )}

        <div className="modal-body">

          {/* Top row: Issued By (your business) and Billed To (the client) */}
          <div className="field-row">
            <div className="field-group">
              <label className="field-label">Issued By (Your Business) *</label>
              <input
                className="field"
                placeholder="Business Name"
                value={form.vendor_name}
                onChange={(e) => setField("vendor_name", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Billed To (Client) *</label>
              <input
                className="field"
                placeholder="Client Name or Company"
                value={form.customer_name}
                onChange={(e) => setField("customer_name", e.target.value)}
              />
            </div>
          </div>

          {/* Second row: Receipt number, issue date, currency */}
          <div className="field-row field-row-meta">
            <div className="field-group">
              <label className="field-label">Invoice #</label>
              <input
                className="field"
                value={form.receipt_number}
                onChange={(e) => setField("receipt_number", e.target.value)}
                placeholder={receiptNumberPlaceholder}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Issue Date</label>
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Currency</label>
              <select
                className="field"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                style={{ minWidth: 80 }}
              >
                {["USD","CAD","EUR","GBP","AUD","NZD","CHF","JPY","MXN","BRL","INR","SEK","NOK","SGD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items — each row is one product or service */}
          <div>
            <div className="field-label" style={{ marginBottom: 10 }}>Products &amp; Services</div>
            <div className="line-item-row header">
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
              <span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="line-item-row" style={{ marginBottom: 6 }}>
                <input
                  className="field"
                  placeholder="Item or service description"
                  value={item.description}
                  onChange={(e) => setItem(i, "description", e.target.value)}
                />
                <input
                  className="field"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => setItem(i, "quantity", e.target.value)}
                  onFocus={(e) => e.target.select()} // select all text when focused so it's easy to replace
                />
                <input
                  className="field"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  value={item.unit_price}
                  onChange={(e) => setItem(i, "unit_price", e.target.value)}
                  onFocus={(e) => e.target.select()}
                />
                {/* Row total is read-only — it's calculated automatically from qty × price */}
                <input
                  className="field"
                  readOnly
                  value={item.total && item.total !== "0.00" ? `$${item.total}` : ""}
                  placeholder="$0.00"
                  style={{ color: "var(--text-dim)", backgroundColor: "transparent" }}
                />
                <button className="btn-icon" onClick={() => removeItem(i)}>✕</button>
              </div>
            ))}
            <button
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 10, padding: "8px 12px" }}
              onClick={addItem}
            >
              + Add Line Item
            </button>
          </div>

          {/* Totals section: subtotal, tax toggle, grand total */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "grid", gap: 12 }}>

            {/* Subtotal — sum of all line item totals before tax */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
              <span>Subtotal</span>
              <span style={{ fontFamily: "var(--mono)" }}>${subtotal.toFixed(2)}</span>
            </div>

            {/* Tax row — user sets their own label (GST, VAT, HST…) and rate per invoice */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className={`btn ${form.isTaxExempt ? "btn-status" : "btn-ghost"}`}
                onClick={() => setField("isTaxExempt", !form.isTaxExempt)}
                style={{ fontSize: 10, padding: "6px 10px", flexShrink: 0, color: form.isTaxExempt ? "var(--voided)" : "var(--text-muted)" }}
              >
                {form.isTaxExempt ? "✓ EXEMPT" : "TAX EXEMPT"}
              </button>
              {!form.isTaxExempt && (
                <div className="tax-input-row" style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" }}>
                  <input
                    className="field tax-label-input"
                    placeholder="Tax label (GST, VAT…)"
                    value={form.taxLabel}
                    onChange={(e) => setField("taxLabel", e.target.value)}
                    style={{ fontSize: 11, padding: "4px 8px", textAlign: "left" }}
                  />
                  <input
                    className="field tax-rate-input"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="%"
                    value={form.taxRate}
                    onChange={(e) => setField("taxRate", e.target.value)}
                    onFocus={(e) => e.target.select()}
                    style={{ fontSize: 11, padding: "4px 8px", textAlign: "right" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>%</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-dim)", minWidth: 60, textAlign: "right" }}>
                    ${tax.toFixed(2)}
                  </span>
                </div>
              )}
              {form.isTaxExempt && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-dim)" }}>$0.00</span>
              )}
            </div>

            {/* Grand total */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontFamily: "var(--mono)", color: "var(--accent)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text)", alignSelf: "center", fontWeight: 600 }}>
                Total Amount
              </span>
              <span style={{ fontWeight: 600 }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes section — hidden until the user clicks "+ Add Note" */}
          {showNotes ? (
            <div className="field-group" style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label className="field-label">Note</label>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ fontSize: 11, color: "var(--text-muted)" }}
                  onClick={() => { setShowNotes(false); setField("notes", ""); }}
                >
                  ✕
                </button>
              </div>
              <textarea
                className="field"
                rows={2}
                autoFocus
                style={{ resize: "none" }}
                placeholder="Payment due upon receipt, thank you for your business..."
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 10, padding: "6px 12px" }}
              onClick={() => setShowNotes(true)}
            >
              + Add Note
            </button>
          )}

          {/* Logo placement — upgrade prompt for free users only */}
          {profile?.tier !== "pro" && profile?.tier !== "voice" && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8, fontSize: 10, padding: "6px 12px" }}
              onClick={() => alert("Upgrade to Pro to add your logo to invoices.")}
            >
              + Add your logo
            </button>
          )}
          {(profile?.tier === "pro" || profile?.tier === "voice") && (
            showLogoPanel ? (
              <div style={{
                marginTop: 12,
                padding: "14px 16px",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}>

                {/* Panel header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Logo on PDF
                  </span>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ fontSize: 11, color: "var(--text-muted)" }}
                    onClick={() => setShowLogoPanel(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Logo upload / preview row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  {localLogoUrl && (
                    <img
                      src={localLogoUrl}
                      alt="Logo"
                      style={{ height: 30, maxWidth: 90, objectFit: "contain", border: "1px solid var(--border)", flexShrink: 0 }}
                    />
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 10, padding: "5px 10px" }}
                    onClick={() => logoFileInputRef.current.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? "Uploading..." : localLogoUrl ? "Change" : "Upload Logo"}
                  </button>
                  {localLogoUrl && (
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ fontSize: 11, color: "var(--text-muted)" }}
                      onClick={() => {
                        setLocalLogoUrl(null);
                        saveProfile({ ...(profile || {}), logo_url: null });
                        if (onLogoUpdate) onLogoUpdate(null);
                      }}
                    >
                      ✕
                    </button>
                  )}
                  {/* Hidden file input */}
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoUpload}
                  />
                </div>

                {/* Corner picker — only shown when a logo exists */}
                {localLogoUrl && (
                  <>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                      Placement
                    </div>

                    {/* Single tile that cycles corner on each click */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

                      {/* Mini document tile — click to cycle */}
                      <div
                        onClick={cycleCorner}
                        title="Click to change corner"
                        style={{
                          width: 66,
                          height: 52,
                          border: "1px solid var(--accent)",
                          position: "relative",
                          background: "var(--surface)",
                          cursor: "pointer",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {/* Dark header strip */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 11, background: "#1e1c18" }} />
                        {/* Faint body lines to suggest content */}
                        <div style={{ position: "absolute", top: 16, left: 4, right: 14, height: 2, background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ position: "absolute", top: 21, left: 4, right: 22, height: 2, background: "var(--border)", borderRadius: 1 }} />
                        <div style={{ position: "absolute", top: 26, left: 4, right: 10, height: 2, background: "var(--border)", borderRadius: 1 }} />
                        {/* Footer strip */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 7, background: "var(--surface-2)", borderTop: "1px solid var(--border)" }} />
                        {/* Logo position indicator — moves to current corner */}
                        <div style={{
                          position: "absolute",
                          width: 16,
                          height: 8,
                          borderRadius: 1,
                          background: "var(--accent)",
                          ...(logoCorner === "top-left"     ? { top: 1,    left:  2 }
                            : logoCorner === "top-right"    ? { top: 1,    right: 2 }
                            : logoCorner === "bottom-right" ? { bottom: 8, right: 2 }
                            :                                 { bottom: 8, left:  2 }),
                        }} />
                      </div>

                      {/* Current corner label + hint */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>
                          {CORNER_LABELS[logoCorner]}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 5, letterSpacing: "0.04em" }}>
                          click tile to change
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, fontSize: 10, padding: "6px 12px" }}
                onClick={() => setShowLogoPanel(true)}
              >
                + Add your logo
              </button>
            )
          )}
        </div>

        <div className="modal-footer" style={{ alignItems: "center" }}>
          {profile?.tier === "voice" ? (
            isDesktop ? (
              /* Desktop: small orb + label — mouse precision is fine */
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={voiceRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={voiceParsing}
                  title={voiceRecording ? "Stop recording" : "Speak your invoice"}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
                    cursor: voiceParsing ? "not-allowed" : "pointer", padding: 0,
                    background: voiceRecording
                      ? "radial-gradient(circle, rgba(220,80,80,0.3) 0%, rgba(220,80,80,0.08) 100%)"
                      : "radial-gradient(circle, rgba(77,216,224,0.22) 0%, rgba(77,216,224,0.06) 100%)",
                    boxShadow: voiceRecording ? "0 0 0 2px rgba(220,80,80,0.5)" : "0 0 0 2px rgba(77,216,224,0.35)",
                    animation: voiceRecording ? "voice-pulse 1.2s ease-in-out infinite" : voiceParsing ? "voice-spin 1.4s linear infinite" : "voice-breathe 3s ease-in-out infinite",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <span style={{ display: "block", width: voiceRecording ? 10 : 8, height: voiceRecording ? 10 : 8, borderRadius: "50%", background: voiceRecording ? "#e05555" : "#4dd8e0", transition: "all 0.2s" }} />
                </button>
                <span style={{ fontSize: 9, color: voiceRecording ? "#e05555" : "var(--voice-text)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                  {voiceRecording ? "Tap to stop" : voiceParsing ? "Parsing..." : "Invoice Parser"}
                </span>
              </div>
            ) : (
              /* Mobile: full-width easy-to-tap button — no more tiny orb */
              <button
                type="button"
                onClick={voiceRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={voiceParsing}
                style={{
                  flex: 1, alignSelf: "stretch", border: "none", borderRight: "1px solid var(--border)",
                  background: voiceRecording ? "rgba(220,80,80,0.15)" : voiceParsing ? "rgba(77,216,224,0.05)" : "rgba(77,216,224,0.12)",
                  color: voiceRecording ? "#e05555" : voiceParsing ? "var(--text-muted)" : "var(--voice-text)",
                  cursor: voiceParsing ? "not-allowed" : "pointer",
                  fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: voiceRecording ? "#e05555" : voiceParsing ? "var(--text-muted)" : "#4dd8e0",
                  animation: voiceRecording ? "voice-pulse 1.2s ease-in-out infinite" : voiceParsing ? "voice-spin 1.4s linear infinite" : "voice-breathe 3s ease-in-out infinite",
                }} />
                {voiceRecording ? "Stop Recording" : voiceParsing ? "Parsing..." : "Speak Invoice"}
              </button>
            )
          ) : (
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit}>{submitButtonLabel}</button>
        </div>
      </div>
    </div>
  );
}
