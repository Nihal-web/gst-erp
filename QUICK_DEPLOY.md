# 🚀 QUICK START - Push & Deploy

## Step 1: Push to GitHub (2 minutes)

```bash
# Simply double-click this file:
push_to_github.bat
```

**What it does:**
- Initializes git repository
- Commits all changes
- Pushes to https://github.com/Nihal-web/gst-erp

---

## Step 2: Setup Supabase (3 minutes)

1. Go to https://supabase.com → Dashboard
2. Open **SQL Editor** → **New Query**
3. Copy contents of: `server/supabase_schema.sql`
4. Paste and **Run**

✅ Database is ready!

---

## Step 3: Deploy Backend (5 minutes)

Go to https://render.com → Click **New Web Service**

**Settings:**
```
Repo: Nihal-web/gst-erp
Name: gst-erp-backend
Build: npm install
Start: cd server && npm start
```

**Environment Variables:**
```
DATABASE_URL          = postgresql://postgres:...@....supabase.co:5432/...
JWT_SECRET            = [generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
SUPABASE_URL          = https://xxxxx.supabase.co
SUPABASE_KEY          = eyJ...
PORT                  = 5000
NODE_ENV              = production
```

✅ Backend is live!

---

## Step 4: Deploy Frontend (3 minutes)

Click **New Static Site** on Render

**Settings:**
```
Repo: Nihal-web/gst-erp
Name: gst-erp-frontend
Build: npm install && npm run build
Publish: dist
```

**Environment Variables:**
```
VITE_API_URL            = https://gst-erp-backend.onrender.com/api
VITE_SUPABASE_URL       = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY  = eyJ...
```

✅ Frontend is live!

---

## Step 5: Connect Domain (2 minutes)

### In Hostinger:
Go to DNS Records → Add:
```
Name:  erp
Type:  CNAME
Value: [your-render-static-site-url]
TTL:   3600
```

### In Render:
Frontend Service → Settings → Custom Domain → Add `erp.gulozar.com`

---

## ✅ Done! Your App is Live

Visit: **https://erp.gulozar.com**

---

## 🔒 Security Reminder

**IMMEDIATELY after deployment:**
1. Supabase → Generate new API key
2. GitHub → Revoke temporary tokens
3. Render → Verify no exposed secrets

See `FINAL_DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 📖 Full Documentation

- `README.md` - Setup & features
- `FINAL_DEPLOYMENT_GUIDE.md` - Detailed guide
- `CLEANUP_SUMMARY.md` - What was cleaned

---

## 🆘 Issues?

**Backend won't start?**
- Check Render logs → Verify DATABASE_URL is set

**Frontend can't reach API?**
- Check VITE_API_URL env var matches backend URL

**Database issues?**
- Verify supabase_schema.sql was executed

See `FINAL_DEPLOYMENT_GUIDE.md` Troubleshooting section.

---

**You're ready to go! 🎉**
