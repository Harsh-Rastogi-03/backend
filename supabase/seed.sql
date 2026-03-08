-- Seed data for development

-- Sample coupons
INSERT INTO coupons (code, type, value, min_purchase_amount, usage_limit, valid_until)
VALUES
  ('WELCOME10', 'PERCENTAGE', 10, 50, 100, NOW() + INTERVAL '30 days'),
  ('FREESHIP', 'FREE_SHIPPING', 0, 100, 50, NOW() + INTERVAL '30 days'),
  ('SAVE50', 'FIXED_AMOUNT', 50, 200, 20, NOW() + INTERVAL '15 days')
ON CONFLICT (code) DO NOTHING;
