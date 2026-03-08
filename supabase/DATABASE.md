# Bellariti Database Documentation

## Project Info

| Key              | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Provider         | Supabase (PostgreSQL 17)                               |
| Project Ref      | `ortymjemcfsjcmfxdjnu`                                 |
| Region           | South Asia (Mumbai) `ap-south-1`                       |
| Dashboard        | https://supabase.com/dashboard/project/ortymjemcfsjcmfxdjnu |
| SQL Editor       | https://supabase.com/dashboard/project/ortymjemcfsjcmfxdjnu/sql |
| Backend connects | via `@supabase/supabase-js` with the **service role key** (bypasses RLS) |

---

## Schema Overview

```
users
 ├── refresh_tokens        (auth sessions)
 ├── orders
 │    ├── order_items       (line items per order)
 │    └── payment_transactions (Razorpay records)
 ├── cart_items             (shopping cart)
 └── wishlist

products
 ├── product_variants       (color/size combos)
 └── product_reviews        (ratings & comments)

coupons                     (discount codes)
sales_analytics             (daily aggregates)
```

### Entity Relationship Diagram (text)

```
users ─┬─< refresh_tokens
       ├─< orders ──┬─< order_items ──> products
       │             └─< payment_transactions
       ├─< cart_items ─────────────────> products
       │                                  ├─< product_variants
       │                                  └─< product_reviews <─┐
       ├─< wishlist ──────────────────> products                │
       └────────────────────────────────────────────────────────┘
```

---

## Tables

### users
Core user table. Passwords are bcrypt-hashed.

| Column      | Type        | Notes                            |
| ----------- | ----------- | -------------------------------- |
| id          | uuid PK     | auto-generated                   |
| email       | text UNIQUE | login identifier                 |
| password    | text        | bcrypt hash                      |
| name        | text        |                                  |
| phone       | text        |                                  |
| role        | enum        | `CUSTOMER` (default) or `ADMIN`  |
| address     | text        | user's saved address             |
| city        | text        |                                  |
| country     | text        |                                  |
| zip_code    | text        |                                  |
| is_verified | boolean     | default `false`                  |
| created_at  | timestamptz |                                  |
| updated_at  | timestamptz | auto-updated via trigger         |

### refresh_tokens
JWT refresh token storage for session management.

| Column     | Type        | Notes                     |
| ---------- | ----------- | ------------------------- |
| id         | uuid PK     |                           |
| token      | text UNIQUE | the refresh token value   |
| user_id    | uuid FK     | -> users(id) CASCADE      |
| expires_at | timestamptz |                           |
| revoked    | boolean     | default `false`           |
| created_at | timestamptz |                           |

### products
Product catalog with full e-commerce metadata.

| Column              | Type        | Notes                          |
| ------------------- | ----------- | ------------------------------ |
| id                  | uuid PK     |                                |
| name                | text        |                                |
| slug                | text UNIQUE | URL-friendly identifier        |
| description         | text        |                                |
| price               | numeric     | current selling price          |
| original_price      | numeric     | price before discount          |
| discount_percentage | numeric     | computed discount %            |
| stock               | integer     | current inventory count        |
| sku                 | text UNIQUE | stock keeping unit             |
| images              | text[]      | array of image URLs            |
| category            | text        |                                |
| tags                | text[]      |                                |
| is_active           | boolean     | soft-delete / visibility flag  |
| brand               | text        |                                |
| model               | text        |                                |
| weight              | numeric     | in kg (used for shipping)      |
| dimensions          | jsonb       | `{ length, width, height }`    |
| color_options       | text[]      |                                |
| size_options        | text[]      |                                |
| material            | text        |                                |
| warranty_period     | integer     | months                         |
| features            | text[]      | bullet-point features          |
| specifications      | jsonb       | freeform key-value specs       |
| rating_average      | numeric     | 0-5, auto-computed via trigger |
| rating_count        | integer     | auto-computed via trigger      |
| review_count        | integer     | auto-computed via trigger      |
| is_featured         | boolean     |                                |
| is_bestseller       | boolean     |                                |
| is_new_arrival      | boolean     |                                |
| meta_title          | text        | SEO                            |
| meta_description    | text        | SEO                            |
| meta_keywords       | text[]      | SEO                            |
| created_at          | timestamptz |                                |
| updated_at          | timestamptz | auto-updated via trigger       |

### product_variants
SKU-level variants (e.g. Gold Ring - Size 7).

| Column     | Type        | Notes                    |
| ---------- | ----------- | ------------------------ |
| id         | uuid PK     |                          |
| product_id | uuid FK     | -> products(id) CASCADE  |
| sku        | text UNIQUE |                          |
| color      | text        |                          |
| size       | text        |                          |
| price      | numeric     | override (null = use parent) |
| stock      | integer     |                          |
| images     | text[]      |                          |
| is_active  | boolean     |                          |

### product_reviews
User reviews, with auto-aggregation to products table.

| Column            | Type    | Notes                     |
| ----------------- | ------- | ------------------------- |
| id                | uuid PK |                           |
| product_id        | uuid FK | -> products(id) CASCADE   |
| user_id           | uuid FK | -> users(id) CASCADE      |
| rating            | integer | 1-5 (CHECK constraint)    |
| title             | text    |                           |
| comment           | text    |                           |
| verified_purchase | boolean |                           |
| helpful_count     | integer |                           |

**Trigger:** On INSERT/UPDATE/DELETE, `trigger_update_product_rating` recalculates `rating_average`, `rating_count`, and `review_count` on the parent product.

### orders
Customer orders with shipping and lifecycle tracking.

| Column           | Type         | Notes                                |
| ---------------- | ------------ | ------------------------------------ |
| id               | uuid PK      |                                      |
| user_id          | uuid FK      | -> users(id)                         |
| status           | order_status | `PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` or `CANCELLED` |
| payment_status   | payment_status | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| total            | numeric      | order total                          |
| shipping_address | text         |                                      |
| shipping_city    | text         |                                      |
| shipping_state   | text         | **added in migration 001** (required for Shiprocket) |
| shipping_zip     | text         | pincode                              |
| shipping_country | text         |                                      |
| shipping_phone   | text         | **added in migration 001**           |
| tracking_number  | text         | AWB code from Shiprocket             |
| shipping_method  | text         | e.g. `Shiprocket - BlueDart`         |
| shipping_cost    | numeric      |                                      |
| tax_amount       | numeric      |                                      |
| discount_amount  | numeric      |                                      |
| coupon_code      | text         |                                      |
| notes            | text         | admin/internal notes                 |
| shipped_at       | timestamptz  | set when status -> SHIPPED           |
| delivered_at     | timestamptz  | set when status -> DELIVERED         |
| cancelled_at     | timestamptz  | set when status -> CANCELLED         |

### order_items
Line items for each order.

| Column     | Type    | Notes                   |
| ---------- | ------- | ----------------------- |
| id         | uuid PK |                         |
| order_id   | uuid FK | -> orders(id) CASCADE   |
| product_id | uuid FK | -> products(id)         |
| quantity   | integer |                         |
| price      | numeric | price at time of order  |

### payment_transactions
Razorpay payment records.

| Column           | Type               | Notes                          |
| ---------------- | ------------------ | ------------------------------ |
| id               | uuid PK            |                                |
| order_id         | uuid FK            | -> orders(id) CASCADE          |
| transaction_id   | text UNIQUE        | Razorpay payment ID            |
| payment_method   | payment_method     | `UPI`, `CREDIT_CARD`, etc.     |
| amount           | numeric            |                                |
| status           | transaction_status | `PENDING` -> `COMPLETED`/`FAILED` |
| gateway_response | jsonb              | raw Razorpay webhook payload   |

### cart_items
Server-side shopping cart (persists across sessions).

| Column     | Type    | Notes                              |
| ---------- | ------- | ---------------------------------- |
| id         | uuid PK |                                    |
| user_id    | uuid FK | -> users(id) CASCADE               |
| product_id | uuid FK | -> products(id) CASCADE            |
| variant_id | uuid FK | -> product_variants(id) CASCADE    |
| quantity   | integer | CHECK > 0                          |
| UNIQUE     |         | (user_id, product_id, variant_id)  |

### wishlist
User wishlisted products.

| Column     | Type    | Notes                             |
| ---------- | ------- | --------------------------------- |
| id         | uuid PK |                                   |
| user_id    | uuid FK | -> users(id) CASCADE              |
| product_id | uuid FK | -> products(id) CASCADE           |
| UNIQUE     |         | (user_id, product_id)             |

### coupons
Discount codes applied at checkout.

| Column              | Type        | Notes                            |
| ------------------- | ----------- | -------------------------------- |
| id                  | uuid PK     |                                  |
| code                | text UNIQUE | e.g. `WELCOME10`                 |
| type                | coupon_type | `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING` |
| value               | numeric     | percentage or fixed amount       |
| min_purchase_amount | numeric     | minimum cart value to apply      |
| max_discount_amount | numeric     | cap for percentage coupons       |
| usage_limit         | integer     | total uses allowed               |
| usage_count         | integer     | current uses                     |
| valid_from          | timestamptz |                                  |
| valid_until         | timestamptz |                                  |
| is_active           | boolean     |                                  |

### sales_analytics
Pre-aggregated daily sales metrics.

| Column              | Type    | Notes            |
| ------------------- | ------- | ---------------- |
| id                  | uuid PK |                  |
| date                | date UNIQUE | one row per day |
| total_orders        | integer |                  |
| total_revenue       | numeric |                  |
| total_items_sold    | integer |                  |
| average_order_value | numeric |                  |
| new_customers       | integer |                  |
| returning_customers | integer |                  |

---

## Enums

| Enum               | Values                                                        |
| ------------------ | ------------------------------------------------------------- |
| role               | `CUSTOMER`, `ADMIN`                                           |
| order_status       | `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`  |
| payment_status     | `PENDING`, `PAID`, `FAILED`, `REFUNDED`                       |
| payment_method     | `CREDIT_CARD`, `DEBIT_CARD`, `UPI`, `NET_BANKING`, `WALLET`, `COD` |
| transaction_status | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REFUNDED`   |
| coupon_type        | `PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`                 |

---

## Functions & Triggers

| Trigger                             | Table            | Event               | Function                   |
| ----------------------------------- | ---------------- | -------------------- | -------------------------- |
| update_*_updated_at                 | all major tables | BEFORE UPDATE        | `update_updated_at_column()` — sets `updated_at = NOW()` |
| trigger_update_product_rating       | product_reviews  | AFTER INSERT/UPDATE/DELETE | `update_product_rating()` — recalculates rating_average, rating_count, review_count on the parent product |

---

## Migrations

Located in `backend/supabase/migrations/`.

| File                                          | Description                              |
| --------------------------------------------- | ---------------------------------------- |
| `20260308000000_remote_schema.sql`            | Full schema pulled from remote DB        |
| `20260308000001_add_shipping_state_phone.sql` | Adds `shipping_state`, `shipping_phone` to orders + tracking_number index |

---

## Supabase CLI Commands

### First-time setup

```bash
cd backend

# Login to Supabase (opens browser)
npx supabase login

# Link to the project (will ask for DB password)
npx supabase link --project-ref ortymjemcfsjcmfxdjnu
```

### Pull schema from remote

Since Docker is not available on this machine, use the custom pull script:

```bash
# 1. Get DB credentials (look at the PGHOST/PGUSER/PGPASSWORD output)
npx supabase db dump --dry-run

# 2. Run the pull script with those credentials
PGHOST="db.ortymjemcfsjcmfxdjnu.supabase.co" \
PGPORT=5432 \
PGUSER="cli_login_postgres" \
PGPASSWORD="<password-from-step-1>" \
PGDATABASE="postgres" \
node supabase/pull-schema.mjs
```

This writes the full schema to `supabase/migrations/20260308000000_remote_schema.sql`.

### Push migrations to remote

```bash
# Mark the base schema as already applied (it's the current live DB)
npx supabase migration repair 20260308000000 --status applied

# Push only new migrations
npx supabase db push
```

### Check migration status

```bash
npx supabase migration list
```

### Create a new migration

```bash
# Option 1: Empty migration file (write SQL manually)
npx supabase migration new my_change_name

# Option 2: If Docker is available, diff against local
npx supabase db diff -f my_change_name
```

### Run SQL directly on remote

```bash
# Via Supabase SQL Editor (browser)
# https://supabase.com/dashboard/project/ortymjemcfsjcmfxdjnu/sql

# Or via psql if PostgreSQL client is installed
psql "postgresql://postgres:<password>@db.ortymjemcfsjcmfxdjnu.supabase.co:5432/postgres"
```

### Seed data

```bash
# Seeds run automatically during `db reset` (local only, requires Docker)
# For remote, copy-paste seed.sql into the SQL Editor
```

---

## Backend Environment Variables (DB-related)

```env
SUPABASE_URL=https://ortymjemcfsjcmfxdjnu.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The backend uses the **service role key** which bypasses Row Level Security. RLS is currently disabled on all tables.

---

## Integrations

### Razorpay (Payments)
- Payment records stored in `payment_transactions`
- Webhook updates `orders.payment_status`
- Config: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

### Shiprocket (Shipping)
- Creates shipments from `orders` data, stores AWB in `orders.tracking_number`
- Webhook updates `orders.status`, `shipped_at`, `delivered_at`, `cancelled_at`
- Config: `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_PICKUP_LOCATION`, `SHIPROCKET_WEBHOOK_SECRET`
- Requires `shipping_state` on orders (migration 001)

---

## Quick Reference: Common Queries

```sql
-- All orders with customer info
SELECT o.*, u.name, u.email
FROM orders o JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC;

-- Revenue by day
SELECT DATE(created_at) AS day, SUM(total) AS revenue, COUNT(*) AS orders
FROM orders WHERE payment_status = 'PAID'
GROUP BY day ORDER BY day DESC;

-- Low stock products
SELECT name, sku, stock FROM products
WHERE is_active = true AND stock < 10
ORDER BY stock ASC;

-- Top rated products
SELECT name, rating_average, review_count FROM products
WHERE review_count > 0
ORDER BY rating_average DESC, review_count DESC
LIMIT 20;

-- Pending shipments (paid but not shipped)
SELECT o.id, o.created_at, u.name, o.total
FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.payment_status = 'PAID' AND o.status = 'PENDING'
ORDER BY o.created_at ASC;
```
