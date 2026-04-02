/*
  ReceiptPDF.js — generates the PDF file for a receipt.

  Uses two libraries:
    jsPDF        — creates PDF documents in the browser (no server needed)
    autoTable    — jsPDF plugin that draws formatted tables

  Two exported functions:
    downloadReceiptPDF(receipt) — generates and immediately downloads the PDF
    shareReceiptPDF(receipt)    — generates and opens the native share sheet (iOS/Android)
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
  loadImageAsDataUrl(url) — fetches an image from a URL and converts it to a base64 data URL.

  jsPDF's addImage() function works best with base64 strings rather than URLs.
  We draw the image onto a hidden canvas element and then read the base64 data from it.

  Returns the base64 string on success, or null if the image fails to load.
  The crossOrigin = "anonymous" setting is required for images hosted on other domains
  (like Supabase Storage) — without it, the canvas would be "tainted" and we couldn't
  read the pixel data from it.
*/
async function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Create a temporary canvas the same size as the image
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image onto the canvas
      canvas.getContext("2d").drawImage(img, 0, 0);

      // Read back the image data as a base64 PNG string
      resolve(canvas.toDataURL("image/png"));
    };

    // If the image fails to load (bad URL, network error, etc.) return null
    img.onerror = () => resolve(null);

    // Setting src triggers the load
    img.src = url;
  });
}

/*
  buildDoc(receipt) — builds and returns a jsPDF document object.

  This is a private function — it is not exported.
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

  // Show the logo if the user has uploaded one, otherwise show "RECEIPT" text
  if (receipt.logo_url) {
    const dataUrl = await loadImageAsDataUrl(receipt.logo_url);
    if (dataUrl) {
      // addImage(data, format, x, y, width, height)
      // width = 0 means "auto" — jsPDF will calculate it from the height
      doc.addImage(dataUrl, "PNG", m, 2, 0, 14);
    } else {
      // Image failed to load — fall back to text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("RECEIPT", m, 11);
    }
  } else {
    // No logo set — show "RECEIPT" text in the header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("RECEIPT", m, 11);
  }

  // Receipt number in the top-right of the header bar
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 175, 165); // light grey
  doc.text(`#${receipt.receipt_number}`, pageW - m, 11, { align: "right" });

  // Vendor name (the business issuing the receipt) — shown below the header on the left
  if (receipt.vendor_name) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 28, 24);
    doc.text(receipt.vendor_name, m, 32);
  }

  // Customer name (the client being billed) — shown on the right side
  if (receipt.customer_name) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 96, 90);
    doc.text("ISSUED TO", pageW - m - 60, 26);
    doc.setFontSize(11);
    doc.setTextColor(30, 28, 24);
    doc.text(receipt.customer_name, pageW - m - 60, 32);
  }

  // Date and status line — shown below the names
  const metaY = 40; // Y position in mm from top of page
  doc.setFontSize(8);
  doc.setTextColor(100, 96, 90);

  if (receipt.date) {
    // Format the date as YYYY-MM-DD (Canadian format)
    const formattedDate = new Date(receipt.date).toLocaleDateString("en-CA");
    doc.text(`Date: ${formattedDate}`, m, metaY);
    doc.text(`Status: ${receipt.status.toUpperCase()}`, m + 50, metaY);
  } else {
    // No date — just show the status
    doc.text(`Status: ${receipt.status.toUpperCase()}`, m, metaY);
  }

  // Horizontal divider line separating the header info from the table
  doc.setDrawColor(200, 196, 188);
  doc.setLineWidth(0.3);
  doc.line(m, 45, pageW - m, 45); // from left margin to right margin

  // Build the rows for the line items table
  // Each row is an array: [description, qty, unit price, total]
  let tableRows;
  if (receipt.line_items && receipt.line_items.length > 0) {
    tableRows = receipt.line_items.map((item) => [
      item.description || "—",
      String(item.quantity),
      `$${parseFloat(item.unit_price).toFixed(2)}`,
      `$${parseFloat(item.total).toFixed(2)}`,
    ]);
  } else {
    // No line items — show a placeholder row so the table isn't empty
    tableRows = [["No line items", "", "", ""]];
  }

  // Draw the table using jspdf-autotable
  autoTable(doc, {
    startY: 50,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body: tableRows,
    margin: { left: m, right: m },
    headStyles: {
      fillColor: [232, 230, 225],
      textColor: [100, 96, 90],
      fontSize: 7,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: { fontSize: 9, textColor: [50, 48, 44] },
    columnStyles: {
      0: { cellWidth: "auto" },     // description column takes remaining space
      1: { halign: "right", cellWidth: 20 }, // qty — right aligned
      2: { halign: "right", cellWidth: 30 }, // unit price — right aligned
      3: { halign: "right", cellWidth: 30 }, // total — right aligned
    },
    theme: "plain",
    tableLineColor: [210, 208, 200],
    tableLineWidth: 0.2,
  });

  // Y position to start drawing the totals block — just below where the table ended
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
    totalRows.push(["Subtotal", `$${subtotal.toFixed(2)}`]);
  }
  if (tax > 0) {
    totalRows.push(["Tax", `$${tax.toFixed(2)}`]);
  }
  totalRows.push(["Total", `$${total.toFixed(2)}`]); // Total is always shown

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

  // Notes section — only rendered if the receipt has notes
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

  // Footer — watermark for free users, plain footer for Pro
  doc.setFontSize(7);
  doc.setTextColor(180, 176, 168);
  if (receipt.tier !== "pro") {
    doc.text("Created with Keep Track · keeptrack.app", pageW / 2, 284, { align: "center" });
  }

  return doc;
}

/*
  downloadReceiptPDF(receipt) — generates the PDF and triggers a file download.
  The file is named "receipt-REC-000001.pdf" using the receipt number.
*/
export async function downloadReceiptPDF(receipt) {
  const doc = await buildDoc(receipt);
  doc.save(`receipt-${receipt.receipt_number}.pdf`);
}

/*
  previewReceiptPDF(receipt) — opens the PDF in a new browser tab.
  Uses the browser's built-in PDF viewer — no download triggered.
*/
export async function previewReceiptPDF(receipt) {
  const doc = await buildDoc(receipt);
  const url = doc.output("bloburl");
  window.open(url, "_blank");
}

/*
  shareReceiptPDF(receipt) — generates the PDF and opens the native share sheet.

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
  // File is like Blob but with a name and MIME type — required for navigator.share
  const blob = doc.output("blob");
  const file = new File(
    [blob],
    `receipt-${receipt.receipt_number}.pdf`,
    { type: "application/pdf" }
  );

  // Build the share text — include the total amount if available
  let shareText = `Receipt from ${receipt.vendor_name}`;
  if (receipt.total) {
    shareText += ` — $${parseFloat(receipt.total).toFixed(2)}`;
  }

  // Check if this browser supports sharing files before trying
  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] });

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: `Receipt ${receipt.receipt_number}`,
      text: shareText,
    });
  } else {
    // Browser doesn't support the file share API — just download instead
    downloadReceiptPDF(receipt);
  }
}
