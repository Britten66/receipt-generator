-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Status enum — enforced at DB level, not just app level
CREATE TYPE receipt_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'voided'
);

CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name     VARCHAR(255)    NOT NULL,
  customer_name   VARCHAR(255)    NOT NULL,
  receipt_number  VARCHAR(100)    NOT NULL UNIQUE,
  status          receipt_status  NOT NULL DEFAULT 'draft',
  date            DATE            NOT NULL DEFAULT CURRENT_DATE,
  subtotal        NUMERIC(10,2)   NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2)   NOT NULL DEFAULT 0,
  total           NUMERIC(10,2)   NOT NULL DEFAULT 0,
  device_id       TEXT            NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  UUID            NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  description VARCHAR(255)    NOT NULL,
  quantity    NUMERIC(10,2)   NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2)   NOT NULL DEFAULT 0,
  total       NUMERIC(10,2)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Filter receipts by device (auth pattern)
CREATE INDEX idx_receipts_device_id ON receipts(device_id);

-- Filter by status
CREATE INDEX idx_receipts_status ON receipts(status);

-- Newest first
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);

-- Look up line items by receipt fast
CREATE INDEX idx_line_items_receipt_id ON line_items(receipt_id);

-- Auto-updates updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();