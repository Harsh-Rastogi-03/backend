-- Pulled from remote Supabase database on 2026-03-08T05:17:43.662Z
-- Project: ortymjemcfsjcmfxdjnu (Bellariti)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE coupon_type AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
CREATE TYPE order_status AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'COD');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE role AS ENUM ('CUSTOMER', 'ADMIN');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Tables
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id, variant_id),
  CHECK ((quantity > 0))
);

CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  type coupon_type NOT NULL,
  value numeric NOT NULL,
  min_purchase_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL,
  price numeric NOT NULL
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id),
  status order_status DEFAULT 'PENDING',
  payment_status payment_status DEFAULT 'PENDING',
  total numeric NOT NULL,
  shipping_address text NOT NULL,
  shipping_city text NOT NULL,
  shipping_zip text NOT NULL,
  shipping_country text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tracking_number text,
  shipping_method text,
  shipping_cost numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  coupon_code text,
  notes text,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone
);

CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  transaction_id text NOT NULL UNIQUE,
  payment_method payment_method NOT NULL,
  amount numeric NOT NULL,
  status transaction_status DEFAULT 'PENDING',
  gateway_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE product_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  title text,
  comment text NOT NULL,
  verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  color text,
  size text,
  price numeric,
  stock integer DEFAULT 0 NOT NULL,
  images text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  price numeric NOT NULL,
  stock integer NOT NULL,
  sku text NOT NULL UNIQUE,
  images text[] DEFAULT '{}',
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  brand text,
  model text,
  weight numeric,
  dimensions jsonb,
  color_options text[] DEFAULT '{}',
  size_options text[] DEFAULT '{}',
  material text,
  warranty_period integer DEFAULT 0,
  features text[] DEFAULT '{}',
  specifications jsonb,
  rating_average numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  review_count integer DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  original_price numeric,
  is_featured boolean DEFAULT false,
  is_bestseller boolean DEFAULT false,
  is_new_arrival boolean DEFAULT false,
  meta_title text,
  meta_description text,
  meta_keywords text[] DEFAULT '{}',
  CHECK (((rating_average >= (0)::numeric) AND (rating_average <= (5)::numeric)))
);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  revoked boolean DEFAULT false
);

CREATE TABLE sales_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL UNIQUE,
  total_orders integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  total_items_sold integer DEFAULT 0,
  average_order_value numeric DEFAULT 0,
  new_customers integer DEFAULT 0,
  returning_customers integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  name text,
  phone text,
  role role DEFAULT 'CUSTOMER',
  address text,
  city text,
  country text,
  zip_code text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE wishlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Indexes
CREATE UNIQUE INDEX cart_items_user_id_product_id_variant_id_key ON public.cart_items USING btree (user_id, product_id, variant_id);
CREATE UNIQUE INDEX coupons_code_key ON public.coupons USING btree (code);
CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);
CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);
CREATE INDEX idx_coupons_is_active ON public.coupons USING btree (is_active);
CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);
CREATE INDEX idx_payment_transactions_order_id ON public.payment_transactions USING btree (order_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);
CREATE INDEX idx_payment_transactions_transaction_id ON public.payment_transactions USING btree (transaction_id);
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews USING btree (product_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews USING btree (rating);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews USING btree (user_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants USING btree (sku);
CREATE INDEX idx_products_category ON public.products USING btree (category);
CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);
CREATE INDEX idx_products_slug ON public.products USING btree (slug);
CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token);
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);
CREATE INDEX idx_sales_analytics_date ON public.sales_analytics USING btree (date DESC);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_wishlist_product_id ON public.wishlist USING btree (product_id);
CREATE INDEX idx_wishlist_user_id ON public.wishlist USING btree (user_id);
CREATE UNIQUE INDEX payment_transactions_transaction_id_key ON public.payment_transactions USING btree (transaction_id);
CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);
CREATE UNIQUE INDEX products_sku_key ON public.products USING btree (sku);
CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);
CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);
CREATE UNIQUE INDEX sales_analytics_date_key ON public.sales_analytics USING btree (date);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX wishlist_user_id_product_id_key ON public.wishlist USING btree (user_id, product_id);

-- Functions
CREATE OR REPLACE FUNCTION public.update_product_rating()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- Triggers
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_product_rating AFTER INSERT OR DELETE OR UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION update_product_rating();
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_analytics_updated_at BEFORE UPDATE ON public.sales_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
