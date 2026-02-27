# Admin Revenue Discrepancy - Investigation Guide

## Issue Summary
You're seeing different revenue amounts for admin users on localhost vs Vercel, even though both are connected to the same MongoDB Atlas database.

## Investigation Steps

### Step 1: Access the Debug Page
1. Log in as an admin user on **localhost**
2. Go to the sidebar and click **"Debug Info"** (under Admin section)
3. Note down:
   - Your current User ID
   - Total orders in database
   - Your order count and revenue

4. Log in as an admin user on **Vercel**
5. Go to **"Debug Info"** again
6. Note down the same information

### Step 2: Compare the Data

Check if you're logged in as **different admin users**:

**Scenario A: Different User IDs**
- If the User IDs are different, you have two separate admin accounts
- Each admin only sees their own orders (this would be a bug in the code)
- Solution: The code should show ALL orders to admins, not just their own

**Scenario B: Same User ID**
- If the User IDs are the same, but you see different order counts
- This means the database is NOT actually the same
- Solution: Check your environment variables

**Scenario C: Multiple Admin Users**
- If there are multiple admin users in the database
- Each admin should see ALL orders from ALL users
- If they don't, there's a bug in the filtering logic

## What the Code Should Do

```javascript
// Admin sees ALL orders (empty filter)
const orderFilter = authUser.role === 'admin' ? {} : { createdBy: authUser.userId };
```

- **Admin**: Should see ALL orders from ALL users
- **Distributor**: Should see only their own orders

## Possible Issues

### Issue 1: You're Logged in as Different Users
- Localhost: Admin User A (ID: 123abc)
- Vercel: Admin User B (ID: 456def)
- Both are admins, but they're different people
- Solution: Log in with the same admin account on both

### Issue 2: Different Databases
- Check your `.env` file on localhost
- Check your environment variables on Vercel
- Make sure `MONGO_URI` is exactly the same

### Issue 3: Code Bug
- If you're the same user but seeing different data
- The filtering logic might not be working correctly
- Check the console logs in the terminal

## How to Fix

### Fix 1: Use Same Admin Account
1. Go to Debug Info page
2. Find the admin user you want to use
3. Log out and log back in with that account on both environments

### Fix 2: Verify Database Connection
1. Check `.env` file: `MONGO_URI=mongodb+srv://...`
2. Check Vercel environment variables
3. Make sure they point to the same database

### Fix 3: Check Console Logs
1. Open terminal where your app is running
2. Look for logs like:
   ```
   Dashboard API - Auth User: { userId: '...', role: 'admin', orderFilter: '{}' }
   Dashboard API - Orders found: { totalOrders: 32, ... }
   ```
3. Compare logs from localhost vs Vercel

## Debug Endpoints (Admin Only)

- `/dashboard/debug` - Visual debug page showing all users and their orders
- `/api/debug/all-users` - JSON endpoint with user statistics
- `/api/debug/user-info` - JSON endpoint with detailed order information

## Next Steps

1. **First**: Go to the Debug Info page on both localhost and Vercel
2. **Compare**: Check if you're logged in as the same user (same User ID)
3. **Report**: Share the User IDs and order counts you see on both environments
4. **Then**: We can determine the exact issue and fix it

## Security Note

The debug endpoints are now restricted to admin users only. Non-admin users will get a 403 Forbidden error if they try to access them.
