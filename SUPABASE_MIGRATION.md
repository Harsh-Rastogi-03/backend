# Supabase Migration Guide

This guide explains how to complete the migration from Prisma to Supabase.

## Prerequisites

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up or log in
   - Click "New Project"
   - Choose your organization and create a new project
   - Wait for the project to be provisioned

2. **Get Your Supabase Credentials**
   - Once your project is ready, go to Project Settings > API
   - Copy the following values:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)
     - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Migration Steps

### Step 1: Set Up Database Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-schema.sql` and paste it into the editor
5. Click **Run** to execute the SQL
6. Verify that all tables were created successfully in the **Table Editor**

### Step 2: Configure Environment Variables

1. Open the `.env` file in the backend directory
2. Replace the placeholder values with your actual Supabase credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
JWT_SECRET=your_secure_jwt_secret
```

**Important**: 
- Never commit the `.env` file with real credentials to version control
- The `JWT_SECRET` should be a long, random string (at least 32 characters)

### Step 3: Install Dependencies

The Prisma packages have been removed and Supabase client has been installed. If you need to reinstall:

```bash
cd backend
npm install
```

### Step 4: Verify the Migration

Run the backend server:

```bash
npm run dev
```

The server should start without errors. Check the console for any Supabase connection issues.

### Step 5: Test the API

Run the verification scripts to ensure everything works:

```bash
# Test authentication
node verify_auth.js

# Test product operations
node verify_commerce.js

# Test order management
node verify_orders.js

# Test payment flow
node verify_payment.js
```

## Data Migration (Optional)

If you have existing data in your PostgreSQL database that you want to migrate to Supabase:

### Option 1: Manual Export/Import

1. **Export from PostgreSQL**:
   ```bash
   pg_dump -h localhost -U postgres -d bellariti --data-only --inserts > data.sql
   ```

2. **Import to Supabase**:
   - Open Supabase SQL Editor
   - Paste the contents of `data.sql`
   - Run the query

### Option 2: Use Supabase Migration Tool

Supabase provides migration tools. Check their documentation:
https://supabase.com/docs/guides/database/migrating-to-supabase

## Changes Made

### Files Modified

- **Services**: All service files now use Supabase client instead of Prisma
  - `auth.service.ts`
  - `product.service.ts`
  - `order.service.ts`
  - `user.service.ts`
  - `admin.service.ts`
  - `payment.service.ts`

- **Controllers**: Updated imports to use database types
  - `order.controller.ts`

- **Configuration**:
  - `.env` - Updated with Supabase credentials
  - `package.json` - Removed Prisma, added Supabase

### Files Created

- `src/utils/supabase.ts` - Supabase client configuration
- `src/types/database.types.ts` - TypeScript type definitions
- `supabase-schema.sql` - Database schema for Supabase

### Files Removed

- `prisma/schema.prisma` - No longer needed
- `src/utils/prisma.ts` - Replaced by supabase.ts
- Prisma client packages from node_modules

## Key Differences

### Transaction Handling

**Prisma** used `$transaction()` for atomic operations:
```typescript
await prisma.$transaction(async (tx) => {
  // operations
});
```

**Supabase** requires manual rollback:
```typescript
try {
  // operations
} catch (error) {
  // manual rollback
  throw error;
}
```

### Query Syntax

**Prisma**:
```typescript
await prisma.user.findUnique({ where: { email } });
```

**Supabase**:
```typescript
await supabase.from('users').select('*').eq('email', email).single();
```

### Relations

**Prisma** used `include`:
```typescript
include: { user: true }
```

**Supabase** uses nested selects:
```typescript
select('*, user:users(*)')
```

## Troubleshooting

### Connection Errors

If you see "Missing Supabase environment variables":
- Verify `.env` file has correct values
- Restart the server after updating `.env`

### Query Errors

If queries fail:
- Check table names match schema (snake_case in Supabase)
- Verify column names (e.g., `user_id` not `userId`)
- Check Supabase dashboard logs for detailed errors

### Type Errors

If TypeScript complains about types:
- Ensure you're importing from `../types/database.types`
- Not from `@prisma/client`

## Support

For Supabase-specific issues:
- Documentation: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions
- Discord: https://discord.supabase.com

## Rollback Plan

If you need to rollback to Prisma:

1. Restore the Prisma files from git history
2. Reinstall Prisma: `npm install @prisma/client prisma`
3. Restore the old `.env` with `DATABASE_URL`
4. Run: `npx prisma generate`
5. Restart the server
