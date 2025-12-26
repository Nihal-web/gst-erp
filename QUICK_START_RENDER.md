# 🚀 Render Deployment - Quick Start

Your app is ready to deploy to Render! Follow these **simple steps**.

---

## 📋 What You Need

- ✅ GitHub account (free) → https://github.com/signup
- ✅ Render account (free) → https://render.com
- ✅ Your Hostinger domain (already have: `erp.gulozar.com`)

---

## ⏱️ Total Time: ~30 minutes

---

## Step 1️⃣: Create GitHub Account & Token (5 min)

### A) Sign up on GitHub
1. Go to https://github.com
2. Click **"Sign up"**
3. Complete signup
4. Remember your username

### B) Create Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Tokens (classic)"**
3. Name it: `render-deployment`
4. Select `repo` scope (that's all you need)
5. Click **"Generate token"**
6. **Copy the token** (you'll use it once)
7. Keep it secret!

---

## Step 2️⃣: Push Your Code to GitHub (5 min)

Open **PowerShell** in your project:

```powershell
cd C:\Users\nihal\Downloads\gst-master-erp

git init
git add .
git commit -m "Initial commit - ready for Render"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gst-erp.git
git push -u origin main
```

When prompted for password, **paste your token** (not your GitHub password).

**Done!** Your code is now on GitHub. ✅

---

## Step 3️⃣: Create Render Services (10 min)

### A) Sign up on Render
1. Go to https://render.com
2. Click **"Sign up"**
3. Choose **"Sign up with GitHub"** (easiest)
4. Authorize Render to access GitHub

### B) Deploy Backend
1. Click **"New +"** → **"Web Service"**
2. Select your `gst-erp` repository
3. Click **"Connect"**
4. Fill in:
   - **Name**: `gst-erp-backend`
   - **Environment**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
5. Scroll to **"Environment"** and add:
   ```
   SUPABASE_URL = https://rhhnlelvunzzdwbnnodo.supabase.co
   SUPABASE_KEY = sb_publishable_oOav2ITX1-6Ou_sQfHEGA_ONBG3X1d
   JWT_SECRET = Nihal@2025$
   PORT = 5000
   ```
6. Click **"Create Web Service"**
7. Wait for **"Live"** status ✅
8. **Copy** the URL (e.g., `https://gst-erp-backend.onrender.com`)

### C) Deploy Frontend
1. Click **"New +"** → **"Static Site"**
2. Select your `gst-erp` repository
3. Click **"Connect"**
4. Fill in:
   - **Name**: `gst-erp-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish directory**: `dist`
5. Click **"Create Static Site"**
6. Wait for **"Live"** status ✅

---

## Step 4️⃣: Connect Backend to Frontend (2 min)

1. Click **`gst-erp-frontend`** service
2. Go to **Settings** → **Environment**
3. Add:
   ```
   VITE_API_URL = https://gst-erp-backend.onrender.com/api
   ```
4. Click **"Save"**
5. Render will **auto-redeploy** ✅

---

## Step 5️⃣: Connect Your Domain (5 min)

### A) In Render

1. Click **`gst-erp-frontend`**
2. Go to **Settings** → **Custom Domain**
3. Enter: `erp.gulozar.com`
4. Click **"Add Domain"**
5. **Copy the CNAME value** that Render shows

### B) In Hostinger hPanel

1. Login to https://hpanel.hostinger.com
2. Go to **Domains** → Select `gulozar.com`
3. Click **"Manage DNS"**
4. Find or create CNAME record:
   - **Name**: `erp`
   - **Value**: Paste what Render showed
   - **TTL**: 3600
5. Click **"Save"**
6. Wait 5-10 minutes for DNS

---

## Step 6️⃣: Test! (2 min)

1. Open https://erp.gulozar.com
2. You should see the login page
3. Try to login
4. Should work! 🎉

---

## 🔄 Future Deployments (Push to Deploy!)

Every time you want to update your app:

```powershell
# Make changes locally
# Then:

git add .
git commit -m "Your message"
git push

# Render automatically deploys in 1-2 minutes!
```

Or just run: `push_to_render.bat` (I created this for you)

---

## ✅ Your Credentials (Already Set)

```
Supabase URL: https://rhhnlelvunzzdwbnnodo.supabase.co
Supabase Key: sb_publishable_oOav2ITX1-6Ou_sQfHEGA_ONBG3X1d
JWT Secret: Nihal@2025$
Domain: erp.gulozar.com
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Service not starting | Check logs in Render → click service → Logs |
| API errors | Verify `VITE_API_URL` environment variable |
| Domain not working | Wait 15 min, clear cache, verify DNS |
| Blank page | F12 → Console → check errors |
| Keeps deploying | Let it finish one deployment first |

---

## 📊 Pricing (All Free for Now)

- **Render Free Tier**: Free
- **Supabase Free Tier**: 500 MB database
- **Your domain**: Already paid
- **SSL**: Free (included)

**Total monthly cost**: $0 (unless you want paid tier for 24/7 uptime)

---

## 🎯 Next: Do These Steps

1. **Create GitHub + Token** ← Do this first
2. **Push code to GitHub** ← Do this second
3. **Create Render account** ← Sign up
4. **Deploy services** ← Create 2 services
5. **Add domain** ← DNS update
6. **Test** ← Visit your domain

**You've got this!** 🚀

---

**Need help? Render support: https://render.com/docs**
