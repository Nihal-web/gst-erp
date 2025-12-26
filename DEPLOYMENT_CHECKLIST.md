# 📋 Render Deployment Checklist

Print this out or use it as a checklist while deploying.

---

## ✅ Pre-Deployment (Do Once)

- [ ] GitHub account created → https://github.com/signup
- [ ] Personal Access Token created → https://github.com/settings/tokens
- [ ] Token copied and saved safely
- [ ] Render account created → https://render.com
- [ ] Authorized Render to access GitHub

---

## ✅ Push Code to GitHub

Open PowerShell:

```powershell
cd C:\Users\nihal\Downloads\gst-master-erp
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gst-erp.git
git push -u origin main
```

Checklist:
- [ ] Git initialized
- [ ] Files added
- [ ] Committed
- [ ] Remote added
- [ ] Pushed to GitHub
- [ ] Can see code on GitHub.com

---

## ✅ Deploy Backend on Render

1. Render dashboard → **New +** → **Web Service**
2. Connect `gst-erp` repo → **Connect**
3. Settings:

   **Name**: 
   - [ ] `gst-erp-backend`

   **Environment**:
   - [ ] Node

   **Build Command**: 
   - [ ] `cd server && npm install`

   **Start Command**: 
   - [ ] `cd server && npm start`

4. Environment Variables (Add all):
   - [ ] `SUPABASE_URL = https://rhhnlelvunzzdwbnnodo.supabase.co`
   - [ ] `SUPABASE_KEY = sb_publishable_oOav2ITX1-6Ou_sQfHEGA_ONBG3X1d`
   - [ ] `JWT_SECRET = Nihal@2025$`
   - [ ] `PORT = 5000`

5. Create:
   - [ ] Clicked "Create Web Service"
   - [ ] Waiting for "Live" status
   - [ ] **Copied backend URL** (e.g., `https://gst-erp-backend.onrender.com`)

---

## ✅ Deploy Frontend on Render

1. Render dashboard → **New +** → **Static Site**
2. Connect `gst-erp` repo → **Connect**
3. Settings:

   **Name**:
   - [ ] `gst-erp-frontend`

   **Build Command**: 
   - [ ] `npm install && npm run build`

   **Publish directory**: 
   - [ ] `dist`

4. Create:
   - [ ] Clicked "Create Static Site"
   - [ ] Waiting for "Live" status

---

## ✅ Connect Backend URL to Frontend

1. Click `gst-erp-frontend` in Render
2. **Settings** → **Environment**
3. Add environment variable:
   - [ ] `VITE_API_URL = https://gst-erp-backend.onrender.com/api` (replace with your actual backend URL)
4. Save:
   - [ ] Clicked "Save"
   - [ ] Waiting for auto-redeploy (should say "Live")

---

## ✅ Add Custom Domain

### In Render:
1. Click `gst-erp-frontend`
2. **Settings** → **Custom Domain**
3. Enter: `erp.gulozar.com`
   - [ ] Added domain
4. **Copy the CNAME value** that appears
   - [ ] CNAME copied: _____________________

### In Hostinger:
1. hPanel → **Domains** → `gulozar.com` → **Manage DNS**
2. Find or create CNAME record:
   - [ ] Name: `erp`
   - [ ] Value: (paste from Render)
   - [ ] TTL: `3600`
3. Save:
   - [ ] Clicked Save/Update
   - [ ] Waiting 5-10 minutes for DNS propagation

### Back in Render:
- [ ] Waiting for "Domain Verified" ✅

---

## ✅ Test Your App

1. Open browser
2. Go to: `https://erp.gulozar.com`
   - [ ] Page loads
   - [ ] See login form
   
3. Try logging in:
   - [ ] Can enter email and password
   - [ ] API call succeeds
   - [ ] Logged in successfully
   
4. Test features:
   - [ ] Dashboard loads
   - [ ] Can create invoice/customer
   - [ ] Data saves correctly

---

## ✅ Post-Deployment

- [ ] Tested at your domain
- [ ] All features working
- [ ] Backend service shows "Live"
- [ ] Frontend service shows "Live"
- [ ] HTTPS works (green lock in browser)

---

## 🎉 You're Done!

Your app is now live on **https://erp.gulozar.com**

Every time you push to GitHub, Render auto-deploys! 🚀

---

## 📝 Notes

Render Backend URL: ________________________________

Render Frontend URL: ________________________________

GitHub Repository: https://github.com/____________/gst-erp

Domain: erp.gulozar.com

---

## 🆘 If Something Goes Wrong

1. Check **Logs** in Render (click service → Logs)
2. Check **Build** output in Render (look for errors)
3. Check **Environment variables** are all set
4. Check **DNS propagation** (takes 5-15 min)
5. Check browser **console** (F12) for errors

---

**Estimated total time: 30-40 minutes**

**You've got this!** 💪
