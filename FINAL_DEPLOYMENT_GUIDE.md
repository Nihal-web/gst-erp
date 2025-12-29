# GST ERP - Final Deployment Guide

## ✅ Pre-Deployment Checklist

Your codebase is now cleaned and ready for production deployment. Here's what has been done:

### ✓ Cleanup Completed
- Removed temporary deployment scripts and ZIP files
- Removed outdated documentation
- Cleaned up unused dependencies (mysql2 removed)
- Updated `.gitignore` to exclude `.env` files
- Created example environment files (`.env.example`, `server/.env.example`)
- Removed hardcoded credentials from config files
- Cleaned Vite configuration
- Updated comprehensive README.md

### ✓ Code is Production-Ready
- Frontend: React + TypeScript + Vite (optimized build)
- Backend: Node.js + Express with PostgreSQL (`pg`)
- Database: Supabase PostgreSQL with migration schema
- Authentication: JWT-based with bcryptjs

---

## 🚀 Step 1: Push to GitHub

### If Git is not installed:
1. Install Git from: https://git-scm.com/download/win
2. Restart your terminal after installation

### Once Git is installed:

```bash
cd C:\Users\nihal\Downloads\gst-master-erp
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git init
git add .
git commit -m "GST ERP - Clean production build ready for deployment"
git branch -M main
git remote add origin https://github.com/Nihal-web/gst-erp.git
git push -u origin main
```

---

## 🔧 Step 2: Configure Supabase

### 1. Create/Access Supabase Project
- Go to https://supabase.com
- Create a new project or use existing one
- Copy credentials:
  - **Project URL**: https://xxxxx.supabase.co
  - **Anon Key**: eyJxxx...

### 2. Run Database Migration
1. In Supabase Dashboard → **SQL Editor**
2. Create **New Query**
3. Copy entire contents of `server/supabase_schema.sql`
4. Click **Run**
5. Wait for success message

### 3. Get Connection String
1. Supabase Dashboard → **Settings** → **Database**
2. Under "Connection pooling", copy the connection string
3. Replace placeholders:
   - `[YOUR-PASSWORD]` → Your Supabase password
   - Use this as `DATABASE_URL`

---

## 🎯 Step 3: Deploy Backend on Render

### 1. Create Web Service on Render
- Go to https://render.com
- Click **New** → **Web Service**
- Connect GitHub repo `Nihal-web/gst-erp`

### 2. Configure Backend Service
Settings to use:

```
Name:               gst-erp-backend
Environment:        Node
Build Command:      npm install
Start Command:      cd server && npm start
Region:             auto (or your preference)
```

### 3. Add Environment Variables
In **Environment** section, add these variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | postgresql://postgres:xxxxx@xxxxx.supabase.co:5432/postgres |
| `JWT_SECRET` | Use strong key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SUPABASE_URL` | https://xxxxx.supabase.co |
| `SUPABASE_KEY` | Your anon key from Supabase |
| `PORT` | 5000 |
| `NODE_ENV` | production |

### 4. Deploy
- Click **Create Web Service**
- Monitor logs to ensure startup succeeds
- Note your backend URL: `https://gst-erp-backend.onrender.com`

---

## 🎨 Step 4: Deploy Frontend on Render

### 1. Create Static Site on Render
- Click **New** → **Static Site**
- Connect same GitHub repo `Nihal-web/gst-erp`

### 2. Configure Frontend Service
```
Name:               gst-erp-frontend
Build Command:      npm install && npm run build
Publish Directory:  dist
```

### 3. Add Build Environment Variables
Add in **Environment** section:
```
VITE_API_URL           = https://gst-erp-backend.onrender.com/api
VITE_SUPABASE_URL      = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJxxx...
```

### 4. Deploy
- Click **Create Static Site**
- Wait for build to complete
- Note your frontend URL from dashboard

---

## 🌐 Step 5: Connect Custom Domain

### In Hostinger (or your domain registrar):
1. Go to DNS Management for `erp.gulozar.com`
2. Add/Update **CNAME** record:
   ```
   Name:   erp
   Type:   CNAME
   Value:  your-frontend-url.onrender.com
   TTL:    3600
   ```
3. Save and wait 15-30 minutes for DNS propagation

### In Render Dashboard:
1. Frontend service → **Settings** → **Custom Domain**
2. Add: `erp.gulozar.com`
3. Verify SSL certificate (automatic)

---

## 🔐 Security Checklist - DO THIS IMMEDIATELY

⚠️ **IMPORTANT**: You shared sensitive credentials during development. Rotate them NOW:

### 1. Supabase
- Go to Dashboard → **Settings** → **API**
- Generate new **Anon Key** (rotate the one in Render env vars)
- Change database password

### 2. GitHub
- Go to https://github.com/settings/personal-access-tokens/tokens
- Revoke any temporary tokens used during setup
- Create new personal access token if needed

### 3. Render
- Backend service → **Settings** → Review all env variables
- Verify no exposed secrets in logs

### 4. Update Credentials
- Update `SUPABASE_KEY` in Render env vars with new key
- Update `JWT_SECRET` in Render with new strong value

---

## ✅ Testing & Verification

### 1. Backend Health Check
```
curl https://gst-erp-backend.onrender.com/
# Should return: "GST ERP Backend is running"
```

### 2. API Connection
- Open frontend: https://erp.gulozar.com
- Open browser DevTools → Network
- Try to login
- Check that API calls go to backend URL

### 3. Database
- In Supabase, verify tables exist:
  - `users`
  - `customers`
  - `invoices`
  - `inventory`
  - etc.

### 4. Monitor Logs
- **Backend**: Render → gst-erp-backend → **Logs**
- **Frontend**: Render → gst-erp-frontend → **Logs**
- Check for errors

---

## 🐛 Troubleshooting

### Backend won't start
```
Check Render Logs → Look for:
1. "Cannot find module" → Run npm install
2. DATABASE_URL error → Verify Supabase connection string
3. Port conflicts → Check PORT env var is set
```

### Frontend can't reach API
```
Check Browser Console:
1. CORS errors → Backend must allow frontend domain
2. 404 errors → Check VITE_API_URL env var
3. Connection refused → Backend may be down
```

### Database errors
```
1. Connection timeout → Check Supabase is active
2. Table doesn't exist → Re-run supabase_schema.sql
3. Auth errors → Verify DATABASE_URL format
```

---

## 📚 Environment Variables Quick Reference

**Frontend (.env.local):**
```env
VITE_API_URL=https://gst-erp-backend.onrender.com/api
```

**Backend (Render Environment):**
```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=very-long-random-string
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-key
NODE_ENV=production
```

---

## 🎉 Success!

Once all steps are complete:
1. ✅ Code pushed to GitHub
2. ✅ Supabase database setup and migrated
3. ✅ Backend running on Render
4. ✅ Frontend running on Render Static
5. ✅ Domain configured and SSL active
6. ✅ Credentials rotated

Your app is now **LIVE** at: https://erp.gulozar.com

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Express Docs**: https://expressjs.com

Good luck with your ERP system! 🚀
