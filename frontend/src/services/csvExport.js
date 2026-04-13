import { supabase } from "../lib/supabase";

/**
 * Exports all invoices and their line items as a CSV file download.
 * One row per line item; invoice fields repeat on each row so the file
 * opens cleanly in Excel / Google Sheets with no transformation needed.
 *
 * @param {Array} receipts - Array of invoice objects from app state
 * @throws {Error} if the Supabase query or file download fails
 */
export async function exportInvoicesCSV(receipts) {
  const ids = receipts.map((r) => r.id);
  const { data: items, error } = await supabase
    .from("line_items")
    .select("*")
    .in("receipt_id", ids);

  if (error) throw new Error(error.message);

  const byReceipt = {};
  (items || []).forEach((item) => {
    if (!byReceipt[item.receipt_id]) byReceipt[item.receipt_id] = [];
    byReceipt[item.receipt_id].push(item);
  });

  // Wrap a value in quotes and escape any internal quotes (RFC 4180)
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const num  = (v) => (v == null ? "" : Number(v).toFixed(2));

  const HEADERS = [
    "Invoice #", "Date", "Status", "Currency",
    "Issued By", "Billed To",
    "Item Description", "Qty", "Unit Price", "Item Total",
    "Subtotal", "Tax", "Invoice Total",
    "Notes",
  ];

  const rows = [HEADERS.map(cell).join(",")];

  receipts.forEach((r) => {
    const lineItems = byReceipt[r.id] || [];
    const base = [
      cell(r.receipt_number || ""),
      cell(r.date || ""),
      cell(r.status || ""),
      cell(r.currency || "CAD"),
      cell(r.vendor_name || ""),
      cell(r.customer_name || ""),
    ];
    const totals = [
      cell(num(r.subtotal)),
      cell(num(r.tax)),
      cell(num(r.total)),
      cell(r.notes || ""),
    ];

    if (lineItems.length === 0) {
      rows.push([...base, cell(""), cell(""), cell(""), cell(""), ...totals].join(","));
    } else {
      lineItems.forEach((item, i) => {
        rows.push([
          ...base,
          cell(item.description || ""),
          cell(item.quantity ?? ""),
          cell(num(item.unit_price)),
          cell(num(item.total)),
          // Subtotal / tax / total / notes only on the first line item row
          ...(i === 0 ? totals : [cell(""), cell(""), cell(""), cell("")]),
        ].join(","));
      });
    }
  });

  const csv  = rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `invoiceprepper-export-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
