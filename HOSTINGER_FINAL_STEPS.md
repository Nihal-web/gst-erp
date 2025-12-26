# Hostinger Deployment - Final Steps

Your app files have been uploaded to Hostinger FTP. Follow these steps in hPanel to complete deployment.

## Step 1: Extract files (File Manager)
1. Log in to **Hostinger hPanel**
2. Go to **Files** → **File Manager**
3. Find `hostinger_deploy.zip` in the root or `/public_html`
4. Right-click → **Extract**
5. Extract to `/public_html` (overwrites existing files)

## Step 2: Setup frontend
1. Navigate to `/public_html`
2. You should see a `deploy` folder
3. Move all files from `deploy/dist/` into `/public_html/` (drag contents)
4. Delete the empty `deploy` folder
5. Verify `index.html` is now in `/public_html/`

## Step 3: Create .htaccess for React routing
1. In `/public_html/`, create a new file called `.htaccess`
2. Add this content:
```
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```
3. Save the file

## Step 4: Setup Node.js backend
1. Go to **Node.js Apps** in hPanel
2. Click **Create New App** (or edit existing)
3. Set these values:
   - **App Name**: gst-erp
   - **App Root**: `/home/u539817673/gst-erp` (create this folder and upload `deploy` folder contents there)
   - **App Startup File**: `index.js`
   - **Node.js Version**: 18+ (select available version)
4. Click **Create**

## Step 5: Set Environment Variables
1. In the Node.js App settings, find **Environment Variables**
2. Add these variables (copy from your local `server/.env`):
   ```
   DB_HOST=srv684.hstgr.io
   DB_USER=u539817673_erpmaster
   DB_PASSWORD=Erpmaster@2024
   DB_NAME=u539817673_erpmaster
   DB_PORT=3306
   JWT_SECRET=your_secret_key_here
   PORT=5000
   ```
3. Save

## Step 6: Install dependencies & start
1. In the Node.js App panel, click **Install Dependencies** (or use SSH)
2. Click **Start App**
3. Wait for status to show "Running"

## Step 7: Verify deployment
1. Open **https://erp.gulozar.com** in your browser
2. The frontend should load (may take 30 seconds on first load)
3. Try to login
4. Should work! ✅

## Troubleshooting
- **Blank page at erp.gulozar.com**: Check that `index.html` is in `/public_html/` and `.htaccess` exists
- **API errors**: Check Node.js app is running and environment variables are set correctly
- **SSL errors**: Enable Let's Encrypt in hPanel → Websites → SSL
- **Connection timeout**: Backend app may not be running — check Node.js Apps status

## Important Notes
- Do NOT use `deploy/` folder in `/public_html/` — extract its contents directly
- Keep your FTP password private (rotate it after deployment if shared)
- Monitor Node.js app logs in hPanel if issues occur
