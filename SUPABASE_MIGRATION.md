# Migrate from MySQL to Supabase

This guide will help you migrate your GST ERP backend from MySQL to Supabase PostgreSQL.

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: gst-erp (or your choice)
   - **Database Password**: Create a strong password
   - **Region**: Select closest to you (e.g., us-east-1 or eu-west-1)
5. Click **"Create new project"**
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your Supabase Credentials

1. Once project is created, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: (looks like `https://xxxxx.supabase.co`)
   - **Anon Key**: (long key starting with `eyJh...`)
3. Keep these safe - you'll need them in your `.env`

## Step 3: Run the Migration Script

1. Go to Supabase dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Copy the entire contents of `server/supabase_schema.sql`
5. Paste into the SQL editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see success messages for each table created

## Step 4: Update Backend Configuration

1. Open `server/.env` (or create it if missing)
2. Add these lines:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your_anon_key_here
   JWT_SECRET=your_secret_key_choose_anything
   PORT=5000
   ```
3. Replace `your-project-id` and `your_anon_key_here` with values from Step 2

## Step 5: Install Supabase Dependencies

Open PowerShell in `server/` folder:

```powershell
cd server
npm install
```

This will:
- Remove mysql2 dependency
- Install @supabase/supabase-js
- Update all packages

## Step 6: Update Database Connection in Code

The backend code uses `db.query()` which now connects to Supabase instead of MySQL.

**Key changes made automatically:**
- `db.js` still works as a wrapper
- All queries now go to Supabase PostgreSQL
- No changes needed to your route files (they stay the same)

## Step 7: Migrate Your Existing Data (Optional)

If you have existing users/invoices in MySQL, you can:

### Option A: Manual Export from MySQL to Supabase
1. Export data from MySQL (phpMyAdmin)
2. Convert to PostgreSQL format
3. Import into Supabase

### Option B: Use Migration Tool
Supabase has tools to migrate from MySQL. Visit:
https://supabase.com/docs/guides/migrations/mysql

### Option C: Start Fresh
Just delete the old MySQL database and start fresh with the Supabase schema.

## Step 8: Test Locally

1. Make sure you're in `gst-master-erp/` folder
2. Start the backend:
   ```powershell
   cd server
   node index.js
   ```
3. You should see: `Server listening on port 5000`
4. Try logging in at http://localhost:3000
5. Should work! ✅

## Step 9: Redeploy to Hostinger

1. Build frontend again:
   ```powershell
   cd C:\Users\nihal\Downloads\gst-master-erp
   $env:VITE_API_URL="https://erp.gulozar.com/api"
   npm run build
   ```

2. Create new deploy package:
   ```powershell
   if (Test-Path .\deploy) { Remove-Item .\deploy -Recurse -Force }
   New-Item -ItemType Directory -Path .\deploy -Force | Out-Null
   Copy-Item -Path .\server\* -Destination .\deploy -Recurse
   New-Item -ItemType Directory -Path .\deploy\dist -Force | Out-Null
   Copy-Item -Path .\dist\* -Destination .\deploy\dist -Recurse
   Compress-Archive -Path .\deploy\* -DestinationPath .\supabase_deploy.zip -Force
   ```

3. Upload to Hostinger FTP (same as before)

4. In Hostinger hPanel:
   - Extract the zip to `/gst-erp/`
   - Update environment variables in Node.js App:
     - `SUPABASE_URL=https://xxxxx.supabase.co`
     - `SUPABASE_KEY=your_key`
     - `JWT_SECRET=your_secret`
     - `PORT=5000`
   - Restart the app
   - Test at https://erp.gulozar.com

## Troubleshooting

### "Invalid API key"
- Check that SUPABASE_KEY is set correctly in `.env`
- Make sure you copied the full key (it's long)

### "Connection refused"
- Verify SUPABASE_URL is correct
- Check your internet connection
- Make sure Supabase project is active (not paused)

### "Tables don't exist"
- Run the SQL migration script again (Step 3)
- Verify tables exist in Supabase SQL Editor

### "Authentication error"
- Use the **anon** key, not the service_role key
- The anon key is for public access

## Benefits of Supabase

✅ No more MySQL management
✅ PostgreSQL is more robust
✅ Built-in authentication (optional)
✅ Built-in file storage
✅ Real-time subscriptions (optional)
✅ Automatic backups
✅ Generous free tier

---

Let me know if you need help with any step!
