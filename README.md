# GST ERP System

A full-stack ERP application for GST (Goods and Services Tax) management built with React, TypeScript, Express.js, and PostgreSQL via Supabase.

## 🎯 Features

- **Dashboard**: Overview of key metrics and reports
- **Billing Terminal**: Create and manage invoices
- **Inventory Management**: Track products and stock levels
- **Customer Management**: Manage customer data and profiles
- **Admin Panel**: Platform administration and settings
- **Authentication**: Secure JWT-based auth with role-based access control

## 🛠️ Tech Stack

### Frontend
- **React** 18+ with TypeScript
- **Vite** for fast development and optimized builds
- **Axios** for HTTP client
- **Context API** for state management

### Backend
- **Node.js** with Express.js
- **PostgreSQL** via Supabase
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests

## 📋 Prerequisites

- **Node.js** 14+ and npm
- **Supabase** account (free tier available at https://supabase.com)
- **GitHub** account for pushing code
- **Render** account (free tier available at https://render.com) for deployment

## 🚀 Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/Nihal-web/gst-erp.git
cd gst-erp
```

### 2. Install dependencies

**Root (Frontend):**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### 3. Configure environment variables

**Frontend** (`.env.local` in root):
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** (`server/.env`):
```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your_jwt_secret_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

### 4. Setup Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com) → Create new project
2. Copy your **Project URL** and **Anon Key** to `server/.env`
3. In SQL Editor, run the schema from `server/supabase_schema.sql`:
   - Open Supabase Dashboard → SQL Editor → New Query
   - Copy entire contents of `server/supabase_schema.sql`
   - Run the query to create all tables

### 5. Start local development

**Terminal 1 - Backend:**
```bash
cd server
npm start
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## 📦 Building for Production

### Build Frontend
```bash
npm run build
```
Output: `dist/` folder with optimized static assets

### Backend is ready as-is
No build required; runs directly with Node.js

## 🌐 Deployment to Render + Supabase

### 1. Push to GitHub
```bash
git add .
git commit -m "GST ERP - Ready for production"
git push origin main
```

### 2. Deploy Backend on Render

1. Go to [Render Dashboard](https://render.com)
2. Create **New Web Service**
3. Connect your GitHub repo (`Nihal-web/gst-erp`)
4. Configure:
   - **Name:** `gst-erp-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `cd server && npm start`
   - **Add Environment Variables:**
     ```
     DATABASE_URL = [Supabase connection string from Settings]
     JWT_SECRET = [your secret key]
     SUPABASE_URL = [your supabase url]
     SUPABASE_KEY = [your supabase anon key]
     ```
5. Click **Create Web Service**
6. Monitor logs for successful startup

### 3. Deploy Frontend on Render

1. Create **New Static Site**
2. Connect same GitHub repo
3. Configure:
   - **Name:** `gst-erp-frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Click **Create Static Site**
5. Add **Pull Request Previews** (optional)

### 4. Connect Domain

1. In Hostinger (or your domain registrar), update DNS:
   - Add **CNAME** record: `erp.gulozar.com → [your-render-url]`
2. In Render Dashboard → Static Site Settings → Add custom domain: `erp.gulozar.com`

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Frontend API endpoint | `https://gst-erp-backend.onrender.com/api` |
| `PORT` | Backend server port | `5000` |
| `DATABASE_URL` | Supabase PostgreSQL connection | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret for JWT signing | `your_random_secret_string` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | `eyJ...` |

## 🔒 Security Notes

- ⚠️ Never commit `.env` files with sensitive credentials
- 🔄 Rotate keys and tokens after deployment
- 🔐 Use strong `JWT_SECRET` values (min 32 chars recommended)
- 🛡️ Enable CORS only for trusted domains in production

## 🐛 Troubleshooting

### Backend won't start on Render
- Check logs in Render Dashboard → Service Logs
- Verify `DATABASE_URL` is set and valid
- Ensure `PORT` env var is set
- Confirm all npm dependencies installed: `npm install`

### Frontend can't reach API
- Check `VITE_API_URL` env var matches backend URL
- Verify backend CORS settings allow frontend domain
- Inspect browser console for network errors

### Database connection errors
- Verify Supabase project is active
- Check PostgreSQL connection string format
- Confirm firewall/network allows outbound connections

## 📚 Project Structure

```
gst-erp/
├── components/          # React components
├── services/            # API service utilities
├── utils/               # Helper functions
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── db.js            # Database connection
│   ├── index.js         # Server entry point
│   └── package.json
├── package.json         # Frontend dependencies
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript config
└── README.md
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push branch: `git push origin feature/your-feature`
4. Submit pull request

## 📄 License

MIT

## 📧 Support

For issues or questions, please open a GitHub issue or contact the maintainers.
