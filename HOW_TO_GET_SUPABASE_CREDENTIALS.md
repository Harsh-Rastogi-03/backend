# How to Get Supabase Credentials

## Step 1: Create a Supabase Account & Project

1. **Go to Supabase**
   - Visit: https://supabase.com
   - Click "Start your project" or "Sign In"

2. **Sign Up / Sign In**
   - Use GitHub, Google, or email
   - Complete the registration

3. **Create a New Project**
   - Click "New Project" button
   - Fill in the details:
     - **Project Name**: `bellariti` (or any name you prefer)
     - **Database Password**: Choose a strong password (save this!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Free tier is fine for development
   - Click "Create new project"
   - ⏳ Wait 2-3 minutes for provisioning

## Step 2: Get Your Supabase Credentials

Once your project is ready:

### Option A: From Project Dashboard

1. **Navigate to Project Settings**
   - In your Supabase project dashboard
   - Click the **⚙️ Settings** icon in the left sidebar
   - Click **API** in the settings menu

2. **Copy Your Credentials**
   
   You'll see three important values:

   **📍 Project URL** (SUPABASE_URL)
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```
   - This is your project's unique URL
   - Copy the entire URL including `https://`

   **🔑 anon/public Key** (SUPABASE_ANON_KEY)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```
   - This is a long JWT token
   - Safe to use in client-side code
   - Copy the entire key

   **🔐 service_role Key** (SUPABASE_SERVICE_ROLE_KEY)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
   ```
   - ⚠️ **KEEP THIS SECRET!** Never expose in client-side code
   - This bypasses Row Level Security
   - Used for backend/server operations
   - Copy the entire key

### Option B: Quick Access

Direct link format (replace YOUR_PROJECT_ID):
```
https://app.supabase.com/project/YOUR_PROJECT_ID/settings/api
```

## Step 3: Update Your .env File

Copy the values you got from Supabase and paste them into your `.env` file:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=a2b95092216f2ae0baa571dc37362db2a21c796e6604e30ac5e74c642587ffe9db8735042072705b2cfd12a4c48ba9fdc95
```

## Step 4: Set Up Database Schema

1. **Open SQL Editor**
   - In Supabase dashboard, click **🗄️ SQL Editor** in left sidebar
   - Click **New Query**

2. **Run Schema**
   - Open the file `backend/supabase-schema.sql`
   - Copy ALL the SQL code
   - Paste into Supabase SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Tables Created**
   - Click **🗂️ Table Editor** in left sidebar
   - You should see tables:
     - `users`
     - `products`
     - `orders`
     - `order_items`
     - `refresh_tokens`

## Visual Guide

```
Supabase Dashboard
├── 🏠 Home
├── 🗂️ Table Editor ← Verify tables here
├── 🗄️ SQL Editor ← Run schema here
├── 🔐 Authentication
├── 📦 Storage
└── ⚙️ Settings
    └── API ← GET CREDENTIALS HERE
        ├── Project URL
        ├── anon/public key
        └── service_role key (⚠️ SECRET!)
```

## Security Notes

⚠️ **IMPORTANT**:
- ✅ `SUPABASE_URL` - Safe to expose
- ✅ `SUPABASE_ANON_KEY` - Safe for client-side
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **NEVER** expose publicly
- ❌ `JWT_SECRET` - **NEVER** expose publicly

## Troubleshooting

### "Project not found" error
- Make sure you copied the correct Project URL
- Verify the URL includes `https://`

### "Invalid API key" error
- Double-check you copied the entire key (they're very long)
- Make sure there are no extra spaces or line breaks
- Verify you're using the `service_role` key, not the `anon` key

### "Permission denied" error
- You might be using the `anon` key instead of `service_role` key
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## Need Help?

- Supabase Docs: https://supabase.com/docs
- API Settings: https://supabase.com/docs/guides/api
- Community: https://github.com/supabase/supabase/discussions
