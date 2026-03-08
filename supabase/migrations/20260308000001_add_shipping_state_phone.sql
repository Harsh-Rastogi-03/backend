-- Migration: Add shipping_state and shipping_phone to orders
-- Required for Shiprocket integration (state is mandatory for order creation)

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_state text,
ADD COLUMN IF NOT EXISTS shipping_phone text;

-- Backfill existing orders: use shipping_city as fallback for state
UPDATE orders SET shipping_state = shipping_city WHERE shipping_state IS NULL;

-- Make shipping_state NOT NULL after backfill
ALTER TABLE orders ALTER COLUMN shipping_state SET NOT NULL;

-- Index on tracking_number for Shiprocket webhook lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
