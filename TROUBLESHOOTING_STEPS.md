# Quick Troubleshooting Steps

## What I've Done

1. ✅ **Secured Debug Endpoints** - Only admins can access `/api/debug/*` endpoints
2. ✅ **Created Debug Page** - New page at `/dashboard/debug` (admin only)
3. ✅ **Added Console Logging** - Dashboard and Orders APIs now log filtering details
4. ✅ **Added User Indicators** - Dashboard and Orders pages show "Admin View" or "Personal View" badges

## What You Need to Do

### Step 1: Check on Localhost

1. Start your localhost server
2. Log in as admin
3. Go to **Dashboard** → **Debug Info** (in sidebar under Admin section)
4. Take a screenshot or note down:
   - Your User ID (the long string)
   - Total Orders count
   - Your order count and revenue
   - All users listed in the table

### Step 2: Check on Vercel

1. Go to your Vercel deployment
2. Log in as admin (use the SAME email/password as localhost)
3. Go to **Dashboard** → **Debug Info**
4. Take a screenshot or note down the same information

### Step 3: Compare

Compare the two sets of data:

**Question 1:** Is the User ID the same on both?
- ✅ **YES** → You're logged in as the same user (good!)
- ❌ **NO** → You're logged in as different admin users (this is the issue!)

**Question 2:** Is the Total Orders count the same on both?
- ✅ **YES** → Same database (good!)
- ❌ **NO** → Different databases (check environment variables!)

**Question 3:** Do you see the same users in the table on both?
- ✅ **YES** → Same database confirmed
- ❌ **NO** → Different databases

### Step 4: Check Console Logs

1. On localhost, open your terminal where the server is running
2. Refresh the dashboard page
3. Look for logs like:
   ```
   Dashboard API - Auth User: { userId: '67...', role: 'admin', orderFilter: '{}' }
   Dashboard API - Orders found: { totalOrders: 32, ... }
   ```
4. Do the same on Vercel (check Vercel logs in the Vercel dashboard)

### Step 5: Report Back

Share with me:
1. Are the User IDs the same? (YES/NO)
2. Are the Total Orders the same? (YES/NO)
3. What do the console logs show?

## Possible Scenarios

### Scenario A: Different Admin Users
- **Symptom**: Different User IDs on localhost vs Vercel
- **Cause**: You created separate admin accounts in each environment
- **Solution**: Log in with the same admin account on both

### Scenario B: Different Databases
- **Symptom**: Different Total Orders count
- **Cause**: Localhost and Vercel are using different MongoDB databases
- **Solution**: Check environment variables, make sure `MONGO_URI` is the same

### Scenario C: Code Bug
- **Symptom**: Same User ID, same database, but different order counts
- **Cause**: Filtering logic is not working correctly
- **Solution**: We'll fix the code based on the console logs

## Quick Checks

### Check 1: Environment Variables
```bash
# On localhost, check .env file
cat .env | grep MONGO_URI

# On Vercel, check environment variables in Vercel dashboard
# Settings → Environment Variables → MONGO_URI
```

### Check 2: Current User
```bash
# The debug page shows your current user info
# Make sure you're logged in as the same user on both environments
```

### Check 3: Database Connection
```bash
# Both should show the same MongoDB Atlas connection string
# mongodb+srv://connectdravya_db_user:...@dravya.iob9o8l.mongodb.net/...
```

## After Investigation

Once you complete the steps above and share the results, I can:
1. Identify the exact issue
2. Provide the specific fix
3. Ensure admins see ALL orders from ALL users
4. Ensure distributors see only their own orders

## Need Help?

If you're stuck, just share:
- Screenshots from the Debug Info page (both localhost and Vercel)
- The console logs from your terminal
- Your Vercel environment variables (without sensitive data)
