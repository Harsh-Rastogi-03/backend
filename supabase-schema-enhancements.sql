-- E-Commerce Platform Enhancement - Database Schema Updates
-- Run this SQL in Supabase SQL Editor after the initial schema

-- ============================================
-- PART 1: Enhance Products Table
-- ============================================

-- Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS weight DECIMAL,
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS color_options TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS size_options TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specifications JSONB,
ADD COLUMN IF NOT EXISTS rating_average DECIMAL DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price DECIMAL,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[] DEFAULT '{}';

-- ============================================
-- PART 2: Create Product Reviews Table
-- ============================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

-- ============================================
-- PART 3: Create Product Variants Table
-- ============================================

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  color TEXT,
  size TEXT,
  price DECIMAL,
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- ============================================
-- PART 4: Create Wishlist Table
-- ============================================

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- ============================================
-- PART 5: Create Sales Analytics Table
-- ============================================

CREATE TABLE IF NOT EXISTS sales_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  average_order_value DECIMAL DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_analytics_date ON sales_analytics(date DESC);

-- ============================================
-- PART 6: Create Shopping Cart Table
-- ============================================

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- ============================================
-- PART 7: Enhance Orders Table
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_method TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ============================================
-- PART 8: Create Payment Transactions Table
-- ============================================

-- Create payment method enum if not exists
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'COD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create transaction status enum if not exists
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE NOT NULL,
  payment_method payment_method NOT NULL,
  amount DECIMAL NOT NULL,
  status transaction_status DEFAULT 'PENDING',
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- ============================================
-- PART 9: Create Coupons Table
-- ============================================

-- Create coupon type enum if not exists
DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL NOT NULL,
  min_purchase_amount DECIMAL DEFAULT 0,
  max_discount_amount DECIMAL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- ============================================
-- PART 10: Add Triggers
-- ============================================

-- Trigger for product_reviews updated_at
CREATE TRIGGER update_product_reviews_updated_at 
  BEFORE UPDATE ON product_reviews 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for product_variants updated_at
CREATE TRIGGER update_product_variants_updated_at 
  BEFORE UPDATE ON product_variants 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for cart_items updated_at
CREATE TRIGGER update_cart_items_updated_at 
  BEFORE UPDATE ON cart_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sales_analytics updated_at
CREATE TRIGGER update_sales_analytics_updated_at 
  BEFORE UPDATE ON sales_analytics 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payment_transactions updated_at
CREATE TRIGGER update_payment_transactions_updated_at 
  BEFORE UPDATE ON payment_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 11: Update Product Rating Function
-- ============================================

-- Function to update product rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product rating
CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- ============================================
-- PART 12: Sample Data for Enhanced Features
-- ============================================

-- Update existing products with enhanced details
UPDATE products
SET 
  brand = 'TechPro',
  warranty_period = 12,
  features = ARRAY['Wireless', 'Noise Cancellation', 'Long Battery Life'],
  is_featured = true,
  meta_title = name || ' - Buy Online at Best Price',
  meta_description = 'Shop ' || name || ' with fast delivery and easy returns.'
WHERE id IN (
  SELECT id FROM products 
  WHERE category = 'Electronics' 
  LIMIT 3
);

-- Add sample coupon
INSERT INTO coupons (code, type, value, min_purchase_amount, usage_limit, valid_until)
VALUES 
  ('WELCOME10', 'PERCENTAGE', 10, 50, 100, NOW() + INTERVAL '30 days'),
  ('FREESHIP', 'FREE_SHIPPING', 0, 100, 50, NOW() + INTERVAL '30 days'),
  ('SAVE50', 'FIXED_AMOUNT', 50, 200, 20, NOW() + INTERVAL '15 days')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('product_reviews', 'product_variants', 'wishlist', 'sales_analytics', 'cart_items', 'payment_transactions', 'coupons')
ORDER BY table_name;

-- Check new columns in products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('brand', 'features', 'rating_average', 'is_featured')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schema enhancement completed successfully!';
  RAISE NOTICE 'New tables created: 7';
  RAISE NOTICE 'Product table enhanced with 20+ new fields';
  RAISE NOTICE 'Triggers and functions added';
END $$;
