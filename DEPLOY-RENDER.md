# Deploying to Render

Render is the easiest way to host this app - no Docker needed!

## Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Upload the project files (or push from your computer)

## Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (easiest)

## Step 3: Deploy

1. Click **New +** → **Web Service**
2. Select **Build and deploy from a Git repository** → **Next**
3. Connect your GitHub repo → Click **Connect**

4. Configure the service:
   ```
   Name: k12-enrichment-portal
   Region: (pick closest to you)
   Branch: main
   Runtime: Node
   Build Command: npm install
   Start Command: node backend/server.js
   ```

5. Select **Free** plan

6. Click **Create Web Service**

Wait 2-5 minutes for build to complete. You'll get a URL like:
`https://k12-enrichment-portal.onrender.com`

## That's it!

Your app is now live at your Render URL.

---

## Important Notes

### Free Tier Behavior
- App sleeps after 15 minutes of no activity
- First visit after sleep takes ~30-60 seconds to wake up
- 750 free hours/month

### Keep App Awake (Optional)
To prevent sleeping, use a free service like:
- UptimeRobot (https://uptimerobot.com) - pings your URL every 5 min
- Cron-job.org - same thing

### Database Note
The SQLite database resets when Render restarts your app. For permanent data, you'd need to add a Render PostgreSQL database.

---

## Quick Checklist

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] New → Web Service → Connect repo
- [ ] Build: `npm install`
- [ ] Start: `node backend/server.js`
- [ ] Create Web Service
- [ ] Wait for "Live" status
- [ ] Visit your URL!
