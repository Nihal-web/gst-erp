# Supabase Deployment to Hostinger - Final Steps

Your Supabase-powered app has been uploaded to Hostinger. Follow these steps to complete deployment.

## Summary of What's Happening
- **Frontend**: React app (static files)
- **Backend**: Node.js with Supabase PostgreSQL
- **Database**: Supabase (online, no MySQL needed)
- **Domain**: https://erp.gulozar.com

---

## Step 1: Extract Files on Hostinger

1. Log in to **Hostinger hPanel**
2. Go to **Files** → **File Manager**
3. Find **`supabase_deploy.zip`** in root or `/public_html`
4. Right-click → **Extract**
5. Extract to `/public_html` (merge/overwrite)

---

## Step 2: Setup Frontend

1. In `/public_html/`, you'll see a `deploy` folder
2. Move ALL files from `deploy/dist/*` to `/public_html/`
   - `index.html`
   - `assets/` folder
   - All other files
3. Delete the empty `deploy` folder
4. Verify `index.html` is directly in `/public_html/`

---

## Step 3: Create `.htaccess` for React Routing

In `/public_html/`, create a new file `.htaccess` with:

```
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## Step 4: Setup Node.js Backend (Critical!)

### Create Backend Folder

1. In hPanel, go to **File Manager**
2. Navigate to `/home/u539817673/` (your home directory)
3. Create a new folder called `gst-erp`
4. Upload the contents of the `deploy` folder into `/home/u539817673/gst-erp/`
   - Not the deploy folder itself, just its contents!
   - Include: `index.js`, `package.json`, `dist/`, `routes/`, `middleware/`, `.env`, etc.

### Create Node.js App in hPanel

1. In hPanel, go to **Node.js Apps**
2. Click **Create New App**
3. Fill in:
   - **App Name**: `gst-erp`
   - **App Root**: `/home/u539817673/gst-erp`
   - **App Startup File**: `index.js`
   - **Node.js Version**: Select 18 or higher
4. Click **Create**

---

## Step 5: Set Environment Variables (CRITICAL!)

1. In the Node.js App settings, find **Environment Variables**
2. Add these (copy-paste):

```
SUPABASE_URL=https://rhhnlelvunzzdwbnnodo.supabase.co
SUPABASE_KEY=sb_publishable_oOav2ITX1-6Ou_sQfHEGA_ONBG3X1d
JWT_SECRET=Nihal@2025$
PORT=5000
```

3. Click **Save** or **Update**

---

## Step 6: Install Dependencies & Start

1. Click **Install Dependencies** (wait for it to complete)
2. Click **Start App**
3. Wait 30 seconds for app to start
4. Status should show **"Running"** (green indicator)

---

## Step 7: Verify Deployment

1. Open https://erp.gulozar.com in browser
2. Frontend should load (GST ERP login page)
3. Try to **login** with your credentials
4. Should work! ✅

---

## Troubleshooting

### Blank Page / 404
- Check `index.html` is in `/public_html/`
- Verify `.htaccess` exists
- Check browser console (F12) for errors

### API Errors / "Unable to Fetch"
- Check Node.js app status (should be "Running")
- Verify environment variables are set
- Check app startup logs in hPanel

### Connection Refused
- Make sure Node.js app is **Running**
- Wait 1-2 minutes after starting
- Check firewall isn't blocking port 5000

### "Database connection error"
- Verify Supabase credentials in `.env`
- Make sure Supabase project is active (not paused)
- Check your internet connection

---

## Important Notes ⚠️

✅ Do NOT use the `deploy/` folder in `/public_html/` — extract its contents to `/public_html/` directly
✅ Frontend files should be in `/public_html/`
✅ Backend files should be in `/home/u539817673/gst-erp/`
✅ Both must have their own `.env` files
✅ Restart Node.js app after any changes to `.env`

---

## SSL & HTTPS

- Hostinger usually enables SSL automatically
- If you get SSL warnings, go to **Websites** → **SSL** → Enable **Let's Encrypt**

---

## Next Steps After Deployment

1. Test all features (login, create invoice, etc.)
2. Monitor the app for 24 hours
3. If issues occur, check hPanel Node.js app logs
4. Rotate your FTP password after deployment

---

**Questions? Check the logs in hPanel → Node.js Apps → Your App → View Logs**
