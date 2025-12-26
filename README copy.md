<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GQyIxktIGpZ5QIjG8U4cBszjV46xyWAW

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend Setup

1. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
2. Configure environment:
   - Create/Update `server/.env` with your PostgreSQL credentials:
     ```
     DB_HOST=localhost
     DB_USER=your_user
     DB_PASSWORD=your_password
     DB_NAME=gst_erp_db
     ```
3. Initialize Database:
   - Run the schema script `server/schema.sql` in your PostgreSQL database.
4. Start the server:
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:5000
