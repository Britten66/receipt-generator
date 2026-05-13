/*
  ReceiptPDF.js: generates the PDF file for a receipt.

  Uses two libraries:
    jsPDF       : creates PDF documents in the browser (no server needed)
    autoTable   : jsPDF plugin that draws formatted tables

  Two exported functions:
    downloadReceiptPDF(receipt): generates and immediately downloads the PDF
    shareReceiptPDF(receipt)   : generates and opens the native share sheet (iOS/Android)
                                  falls back to download if sharing is not supported

  The receipt object should have these fields:
    receipt_number, vendor_name, customer_name, date, status,
    subtotal, tax, total, notes, line_items, logo_url (optional)

  Example receipt object for testing:
    {
      receipt_number: "REC-000001",
      vendor_name: "Acme Services",
      customer_name: "Bob Smith",
      date: "2025-03-01T00:00:00Z",
      status: "sent",
      subtotal: 100.00,
      tax: 15.00,
      total: 115.00,
      notes: "Payment due upon receipt.",
      line_items: [
        { description: "Web Design", quantity: 1, unit_price: 100.00, total: 100.00 }
      ],
      logo_url: null
    }
*/

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/*
  loadImageAsDataUrl(url): fetches an image from a URL and converts it to a base64 data URL.

  jsPDF's addImage() function works best with base64 strings rather than URLs.
  We draw the image onto a hidden canvas element and then read the base64 data from it.

  Returns the base64 string on success, or null if the image fails to load.
  The crossOrigin = "anonymous" setting is required for images hosted on other domains
  (like Supabase Storage): without it, the canvas would be "tainted" and we couldn't
  read the pixel data from it.
*/
async function loadImageAsDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/*
  buildDoc(receipt): builds and returns a jsPDF document object.

  This is a private function: it is not exported.
  downloadReceiptPDF and shareReceiptPDF both call this and then do
  different things with the result.

  The layout (in mm from top):
    0–18:  dark header bar with logo (or "RECEIPT" text) and receipt number
    18–32: vendor name (left) and client name (right)
    40:    date and status line
    45:    horizontal divider
    50+:   line items table (height depends on number of rows)
    after table: subtotal / tax / total block
    after totals: notes (if any)
    284:   footer text at page bottom
*/
// Format a number as currency with thousand separators: e.g. 43252345 → "$43,252,345.00"
// currency param is the ISO code from profile (CAD, USD, etc.): all use $ symbol
function fmtMoney(n, currency) {
  const symbol = (currency && currency !== "CAD" && currency !== "USD") ? (currency + " ") : "$";
  return symbol + parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function buildDoc(receipt) {
  // Create an A4 page with millimetre units
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // m = left and right margin in mm
  const m = 20;

  // pageW = total page width (210mm for A4)
  const pageW = doc.internal.pageSize.getWidth();

  // Draw the dark header bar across the full width
  doc.setFillColor(30, 28, 24); // dark charcoal colour (R, G, B)
  doc.rect(0, 0, pageW, 18, "F"); // x, y, width, height, "F" = filled rectangle

  // Resolve logo data and dimensions up-front so we can adapt layout below.
  // If a logo_url exists but no corner was chosen, default to top-left so it always shows.
  const corner = receipt.logo_url
    ? (receipt.logo_corner || "top-left")
    : null;
  const isTopCorner    = corner === "top-left"  || corner === "top-right";
  const isBottomCorner = corner === "bottom-left" || corner === "bottom-right";

  let logoDataUrl = null;
  let logoW = 25; // default fallback width in mm
  const logoH = 14; // fixed height in mm

  if (receipt.logo_url && corner) {
    logoDataUrl = await loadImageAsDataUrl(receipt.logo_url);
    if (logoDataUrl) {
      try {
        const imgEl = new window.Image();
        imgEl.src = logoDataUrl;
        await new Promise((resolve) => { imgEl.onload = resolve; imgEl.onerror = resolve; });
        if (imgEl.naturalWidth && imgEl.naturalHeight) {
          logoW = Math.min((imgEl.naturalWidth / imgEl.naturalHeight) * logoH, 50);
        }
      } catch { /* keep fallback */ }
    }
  }

  // ── Header bar: logo (top corners) or INVOICE text ──
  if (logoDataUrl && isTopCorner) {
    // Place logo in the header at the chosen corner
    const logoX = corner === "top-right" ? pageW - m - logoW : m;
    doc.addImage(logoDataUrl, "PNG", logoX, 2, logoW, logoH);
  } else {
    // No top logo: show "INVOICE" text in the header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", m, 11);
  }

  // Receipt number: swap to left side when logo occupies the top-right corner
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 175, 165);
  if (logoDataUrl && corner === "top-right") {
    doc.text(`#${receipt.receipt_number}`, m, 11);
  } else {
    doc.text(`#${receipt.receipt_number}`, pageW - m, 11, { align: "right" });
  }

  // ── Vendor block (left): name + contact info ──
  const vendorNameY = 26;
  if (receipt.vendor_name) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 28, 24);
    doc.text(receipt.vendor_name, m, vendorNameY);
  }

  const contactLines = [
    receipt.vendor_address,
    receipt.vendor_phone,
    receipt.vendor_email,
    receipt.vendor_website,
  ].filter(Boolean);

  if (contactLines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 96, 90);
    contactLines.forEach((line, i) => {
      doc.text(line, m, vendorNameY + 6 + i * 5);
    });
  }

  // ── Customer block (right): billed-to label + name ──
  if (receipt.customer_name) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 96, 90);
    doc.text("BILLED TO", pageW - m - 60, 23);
    doc.setFontSize(11);
    doc.setTextColor(30, 28, 24);
    doc.text(receipt.customer_name, pageW - m - 60, 30);
  }

  // Date and status line: positioned below vendor block
  const vendorBlockEndY = vendorNameY + 6 + contactLines.length * 5;
  const metaY = Math.max(vendorBlockEndY + 4, 40);
  doc.setFontSize(8);
  doc.setTextColor(100, 96, 90);

  if (receipt.date) {
    const formattedDate = new Date(receipt.date).toLocaleDateString("en-CA");
    doc.text(`Date: ${formattedDate}`, m, metaY);
    if (receipt.due_by) {
      const formattedDue = new Date(receipt.due_by + "T00:00:00").toLocaleDateString("en-CA");
      doc.text(`Due: ${formattedDue}`, m + 50, metaY);
      doc.text(`Status: ${receipt.status.toUpperCase()}`, m + 100, metaY);
    } else {
      doc.text(`Status: ${receipt.status.toUpperCase()}`, m + 50, metaY);
    }
  } else {
    doc.text(`Status: ${receipt.status.toUpperCase()}`, m, metaY);
  }

  // Horizontal divider line separating the header info from the table
  const dividerY = metaY + 6;
  doc.setDrawColor(200, 196, 188);
  doc.setLineWidth(0.3);
  doc.line(m, dividerY, pageW - m, dividerY);

  // Build the rows for the line items table
  // Each row is an array: [description, qty, unit price, total]
  let tableRows;
  if (receipt.line_items && receipt.line_items.length > 0) {
    tableRows = receipt.line_items.map((item) => [
      item.description || "-",
      String(item.quantity),
      fmtMoney(item.unit_price, receipt.currency),
      fmtMoney(item.total, receipt.currency),
    ]);
  } else {
    // No line items: show a placeholder row so the table isn't empty
    tableRows = [["No line items", "", "", ""]];
  }

  // Draw the table using jspdf-autotable
  const unitHeader = receipt.unit_label || "Qty";
  autoTable(doc, {
    startY: dividerY + 5,
    head: [["Description", unitHeader, "Unit Price", "Total"]],
    body: tableRows,
    margin: { left: m, right: m },
    headStyles: {
      fillColor: [232, 230, 225],
      textColor: [100, 96, 90],
      fontSize: 7,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 48, 44],
      cellPadding: { top: 3, bottom: 3, left: 2, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },  // description: takes remaining space
      1: { halign: "right", cellWidth: 16 },      // qty: small, just needs 1–999
      2: { halign: "right", cellWidth: 38 },      // unit price: fits $231,876.00
      3: { halign: "right", cellWidth: 38 },      // total: same width as unit price
    },
    // Right-align the header labels for numeric columns to match body alignment
    didParseCell(data) {
      if (data.section === "head" && data.column.index > 0) {
        data.cell.styles.halign = "right";
      }
    },
    theme: "plain",
    tableLineColor: [210, 208, 200],
    tableLineWidth: 0.2,
  });

  // Y position to start drawing the totals block: just below where the table ended
  const afterTableY = doc.lastAutoTable.finalY + 6;

  // Parse the totals from the receipt (they may come as strings from the database)
  const subtotal = parseFloat(receipt.subtotal || 0);
  const tax      = parseFloat(receipt.tax      || 0);
  const total    = parseFloat(receipt.total    || 0);

  // Column positions for the totals block (right-aligned)
  const labelCol = pageW - m - 40; // left edge of the label (e.g. "Subtotal")
  const valueCol = pageW - m;      // right edge of the value (e.g. "$100.00")

  // Draw a light line above the totals block
  doc.setDrawColor(200, 196, 188);
  doc.line(labelCol - 5, afterTableY, valueCol, afterTableY);

  // Build the list of total rows to draw
  // We only show Subtotal and Tax if they have values
  const totalRows = [];
  if (subtotal > 0) {
    totalRows.push(["Subtotal", fmtMoney(subtotal, receipt.currency)]);
  }
  if (tax > 0) {
    totalRows.push(["Tax", fmtMoney(tax, receipt.currency)]);
  }
  totalRows.push(["Total", fmtMoney(total, receipt.currency)]); // Total is always shown

  // Draw each row in the totals block
  totalRows.forEach(([label, value], rowIndex) => {
    const rowY = afterTableY + 8 + rowIndex * 8; // 8mm spacing between rows
    const isGrandTotal = label === "Total";

    // Draw a separator line above the Total row (only when there are rows above it)
    if (isGrandTotal && totalRows.length > 1) {
      doc.setDrawColor(150, 146, 138);
      doc.line(labelCol - 5, rowY - 4, valueCol, rowY - 4);
    }

    // Total row uses bold, larger text and dark colour
    // Other rows (Subtotal, Tax) use normal weight, smaller text and grey colour
    if (isGrandTotal) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 28, 24); // dark
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 96, 90); // grey
    }

    doc.text(label, labelCol, rowY);
    doc.text(value, valueCol, rowY, { align: "right" });
  });

  // Notes section: only rendered if the receipt has notes
  if (receipt.notes && receipt.notes.trim()) {
    const notesY = afterTableY + 8 + totalRows.length * 8 + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 126, 118);
    doc.text("Notes:", m, notesY);
    doc.setTextColor(80, 78, 74);
    // maxWidth wraps long notes to fit within the page margins
    doc.text(receipt.notes, m, notesY + 6, { maxWidth: pageW - m * 2 });
  }

  // ── Bottom-corner logo ──
  // Drawn just above the footer area so it never overlaps the main content.
  // A4 page is 297 mm tall. Footer text sits at y=284.
  // Logo (14mm tall) is placed starting at y=266 → ends at 280 → 4mm gap to footer.
  if (logoDataUrl && isBottomCorner) {
    const logoY = 266;
    const logoX = corner === "bottom-right" ? pageW - m - logoW : m;
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);
  }

  return doc;
}

/*
  buildPDFBase64(receipt): generates the PDF and returns it as a base64 string.
  Used when attaching the PDF to an outgoing email via Resend.
*/
export async function buildPDFBase64(receipt) {
  const doc = await buildDoc(receipt);
  // "datauristring" returns "data:application/pdf;base64,XXXX..."
  // We strip the prefix and return only the base64 payload.
  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1];
}

/*
  downloadReceiptPDF(receipt): generates the PDF and triggers a file download.
  The file is named "receipt-REC-000001.pdf" using the receipt number.
*/
export async function downloadReceiptPDF(receipt) {
  const doc = await buildDoc(receipt);
  doc.save(`invoice-${receipt.receipt_number}.pdf`);
}

/*
  getPDFBlobUrl(receipt): builds the PDF and returns a blob: URL.
  Caller is responsible for revoking via URL.revokeObjectURL when done.
*/
export async function getPDFBlobUrl(receipt) {
  const doc = await buildDoc(receipt);
  return doc.output("bloburl");
}

/*
  getExamplePDFBlobUrl(): builds a sample invoice PDF with a diagonal EXAMPLE
  watermark for the landing page "Try Me" demo. No receipt data required.
  Caller is responsible for revoking via URL.revokeObjectURL when done.
*/
export async function getExamplePDFBlobUrl() {
  const example = {
    receipt_number: "INV-001042",
    vendor_name: "Maple & Co. Creative",
    customer_name: "Summit Tech Solutions",
    date: "2026-03-14",
    status: "sent",
    subtotal: 1930.00,
    tax: 250.90,
    total: 2180.90,
    notes: "Payment due within 14 days. Thank you for your business.",
    currency: "CAD",
    line_items: [
      { description: "Brand Identity Package", quantity: 1, unit_price: 1200.00, total: 1200.00 },
      { description: "Social Media Asset Kit", quantity: 3, unit_price: 180.00, total: 540.00 },
      { description: "Revision Round", quantity: 2, unit_price: 95.00, total: 190.00 },
    ],
  };

  const doc = await buildDoc(example);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(210, 207, 202);
  doc.text("EXAMPLE", pageW / 2, pageH / 2, { angle: 30, align: "center", baseline: "middle" });

  return doc.output("bloburl");
}

/*
  previewReceiptPDF(receipt): opens the PDF in a new browser tab.
  Uses the browser's built-in PDF viewer: no download triggered.
  Only use on desktop; on mobile/PWA use getPDFBlobUrl + in-app overlay.
*/
export async function previewReceiptPDF(receipt) {
  const url = await getPDFBlobUrl(receipt);
  window.open(url, "_blank");
}

/*
  shareReceiptPDF(receipt): generates the PDF and opens the native share sheet.

  The Web Share API (navigator.share) is available on iOS Safari and Android Chrome.
  It opens the system share sheet so the user can share the PDF via Messages, email,
  AirDrop, etc.

  We first check navigator.canShare({ files: [file] }) to confirm the browser supports
  sharing files (not just text/URLs). If it doesn't support file sharing, we fall back
  to a regular download.
*/
export async function shareReceiptPDF(receipt) {
  const doc = await buildDoc(receipt);

  // Convert the PDF to a binary Blob, then wrap it in a File object
  // File is like Blob but with a name and MIME type: required for navigator.share
  const blob = doc.output("blob");
  const file = new File(
    [blob],
    `invoice-${receipt.receipt_number}.pdf`,
    { type: "application/pdf" }
  );

  const shareText = receipt.total
    ? `Receipt from ${receipt.vendor_name} for ${fmtMoney(receipt.total, receipt.currency)}`
    : `Receipt from ${receipt.vendor_name}`;

  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: `Receipt ${receipt.receipt_number}`,
      text: shareText,
    });
  } else {
    downloadReceiptPDF(receipt);
  }
}
