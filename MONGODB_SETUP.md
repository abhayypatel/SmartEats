# 🚨 URGENT: MongoDB Atlas Setup Fix

## Issue: Database Connection Failed
Your Vercel app can't connect to MongoDB Atlas because of IP restrictions.

## Quick Fix:

### 1. Open MongoDB Atlas Dashboard
- Go to [MongoDB Atlas](https://cloud.mongodb.com/)
- Login to your account

### 2. Fix IP Whitelist
- Click on your cluster
- Go to "Network Access" (left sidebar)
- Click "Add IP Address"
- **Select "Allow Access from Anywhere" (0.0.0.0/0)**
- Click "Confirm"

### 3. Check Connection String
Make sure your Vercel environment variable `MONGO_URI` is set to:
```
mongodb+srv://username:password@cluster.mongodb.net/smarteats?retryWrites=true&w=majority
```

### 4. Test the Fix
- Wait 2-3 minutes for changes to propagate
- Try logging in again
- Check Vercel logs for "✅ MongoDB Connected"

**Note:** For production, you'd want to add specific Vercel IP ranges, but "Allow from Anywhere" works for now and is common for serverless deployments. 