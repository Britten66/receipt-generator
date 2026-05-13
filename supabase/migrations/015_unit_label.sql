-- Add unit_label to receipts so invoices can show Qty / Hrs / Days on the PDF.
-- Existing invoices default to 'Qty' (no visible change).
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS unit_label TEXT NOT NULL DEFAULT 'Qty'
  CHECK (unit_label IN ('Qty', 'Hrs', 'Days'));
