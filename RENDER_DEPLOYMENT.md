# Deploy GST ERP to Render + Supabase

Complete guide to deploy your full app (frontend + backend) to Render with Supabase database.

## What You Get

✅ **Frontend** on Render (auto-deployed from GitHub)
✅ **Backend API** on Render (auto-deployed from GitHub)
✅ **Database** on Supabase (already configured)
✅ **Custom Domain** erp.gulozar.com
✅ **Auto SSL/HTTPS**
✅ **Auto Deployments** (push to GitHub → auto deploy)

---

## Prerequisites

You need:
1. GitHub account (free at https://github.com)
2. Render account (free at https://render.com)
3. Your code ready (you have it locally)

---

## Step 1: Push Code to GitHub

### A) Create GitHub Repository

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `gst-erp`
   - **Description**: GST Master ERP
   - **Private or Public**: Your choice (doesn't matter for deployment)
3. Click **"Create repository"**
4. Copy the repository URL (looks like: `https://github.com/yourname/gst-erp.git`)

### B) Push Your Local Code to GitHub

Open PowerShell in your project root:

```powershell
cd C:\Users\nihal\Downloads\gst-master-erp

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - GST ERP with Supabase"

# Add remote (replace YOUR_GITHUB_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/gst-erp.git

# Push to GitHub
git branch -M main
git push -u origin main
```

⚠️ **Important**: When prompted for credentials, use your GitHub **Personal Access Token** (not password):
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Click "Tokens (classic)"
3. Click "Generate new token"
4. Select `repo` scope
5. Copy and paste when prompted in PowerShell

---

## Step 2: Create Render Account & Web Service

### A) Sign Up for Render

1. Go to https://render.com
2. Click **"Sign up"**
3. Sign up with GitHub (recommended - easiest)
4. Authorize Render to access GitHub

### B) Deploy Backend Service

1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect to your GitHub repository:
   - Select your `gst-erp` repository
   - Click **"Connect"**
4. Configure the service:
   - **Name**: `gst-erp-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
5. Scroll down to **"Environment"**
6. Add environment variables:
   ```
   SUPABASE_URL = https://rhhnlelvunzzdwbnnodo.supabase.co
   SUPABASE_KEY = sb_publishable_oOav2ITX1-6Ou_sQfHEGA_ONBG3X1d
   JWT_SECRET = Nihal@2025$
   PORT = 5000
   ```
7. Click **"Create Web Service"**
8. Wait for deployment (5-10 minutes)
9. Once deployed, you'll see a URL like: `https://gst-erp-backend.onrender.com`
10. Copy this URL - you'll need it next

### C) Deploy Frontend Service

1. In Render dashboard, click **"New +"**
2. Select **"Static Site"**
3. Connect to your GitHub repository again
4. Configure:
   - **Name**: `gst-erp-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish directory**: `dist`
5. Click **"Create Static Site"**
6. Wait for deployment (2-3 minutes)
7. Once done, you'll get a URL like: `https://gst-erp-frontend.onrender.com`

---

## Step 3: Connect Backend URL in Frontend

Your frontend needs to know where your backend is.

1. Go back to Render dashboard
2. Click on **`gst-erp-frontend`** static site
3. Go to **Settings** → **Environment**
4. Add environment variable:
   ```
   VITE_API_URL = https://gst-erp-backend.onrender.com/api
   ```
5. Click **"Save"**
6. Render will **auto-redeploy** with the new URL

---

## Step 4: Connect Custom Domain

Now connect your domain `erp.gulozar.com` to Render.

### A) In Render Dashboard

1. Click on `gst-erp-frontend` service
2. Go to **Settings** → **Custom Domain**
3. Enter: `erp.gulozar.com`
4. Click **"Add Domain"**
5. Render will show you **CNAME record** to add

### B) In Your Domain Provider (Hostinger)

1. Log into Hostinger hPanel
2. Go to **Domains** → **Manage DNS** (for `gulozar.com`)
3. Find the **CNAME** records section
4. Add a new CNAME record:
   - **Name**: `erp` (or whatever Render says)
   - **Value**: Copy what Render shows (looks like: `gst-erp-frontend.onrender.com`)
   - TTL: 3600
5. Click **"Save"**
6. Wait 5-10 minutes for DNS to propagate

### C) Verify in Render

Back in Render, wait for it to show **"Domain Verified"** ✅

---

## Step 5: Update Backend API Calls

Your frontend still points to the old backend URL. Update it:

1. Open `services/apiService.ts` locally
2. Change:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
   ```
3. Push to GitHub:
   ```powershell
   git add .
   git commit -m "Update API URL to Render backend"
   git push
   ```
4. Render will **auto-redeploy** when you push

---

## Step 6: Test Your App

1. Open https://erp.gulozar.com in browser
2. You should see the login page
3. Try to **login** with your credentials
4. Should work! ✅

---

## Troubleshooting

### "Domain not working"
- Wait 10-15 minutes for DNS propagation
- Clear browser cache (Ctrl+Shift+Delete)
- Check CNAME record is correct in Hostinger DNS

### "API errors / unable to fetch"
- Check backend service is "Live" (green) in Render
- Verify environment variables are set in Render
- Check VITE_API_URL in frontend environment

### "Blank page"
- Open browser console (F12)
- Check for JavaScript errors
- Verify build succeeded in Render logs

### "Service keeps crashing"
- Click on the service in Render
- Go to **Logs**
- See what error is shown
- Common issues: missing env vars, port conflict

---

## Auto-Deployment from GitHub

Now every time you:
1. Make changes locally
2. Push to GitHub (`git push`)
3. Render automatically rebuilds and deploys! ✅

---

## Key Advantages Over Hostinger

✅ **Free tier** is enough for testing
✅ **Auto SSL** - HTTPS included
✅ **Auto deploy** - Push code → auto deploy
✅ **Better Node.js support** - Made for Node
✅ **Easy environment variables** - No SSH needed
✅ **Better performance** - CDN included
✅ **Paid tier is cheap** - $7/month for production

---

## Next Steps

1. **Sign up** on GitHub & Render (5 min)
2. **Push code** to GitHub (5 min)
3. **Create services** on Render (10 min)
4. **Add custom domain** (5 min)
5. **Test** at https://erp.gulozar.com (2 min)

**Total setup time: ~30 minutes!**

---

## Questions?

- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs
- GitHub Docs: https://docs.github.com

Let me know if you get stuck on any step!
