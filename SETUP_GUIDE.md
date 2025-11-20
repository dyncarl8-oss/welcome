# AutoWelcome AI - Complete Setup Guide

## ✅ What's Been Fixed

I've fixed all the major issues with your app:

### 1. **User Names Now Display Correctly** ✅
- Uses Whop SDK to fetch full user details
- Shows actual names (like "alleyah", "dujx3388") instead of just user IDs
- Works for both admins and customers
- Displays in header, dashboard, and customer views

### 2. **DM Sending Fixed** ✅
- Now uses the correct **GraphQL API** with `feedType: "dms_feed"`
- Sends personalized messages to new members
- Includes video link in the message
- Proper error handling and logging

### 3. **Webhook Signature Verification** ✅
- Properly validates all incoming webhooks using your secret
- Rejects invalid or missing signatures
- Prevents spoofed webhook attacks
- Detailed logging for debugging

---

## 🚀 How It Works Now

### When a New Member Joins:

1. **Whop sends webhook** → Your app at `/api/whop/webhook`
2. **Signature verified** → Using your webhook secret
3. **User details fetched** → From Whop API (name, username, email)
4. **Customer record created** → Stored in database
5. **Video generation triggered** → HeyGen creates personalized video
6. **HeyGen webhook received** → When video is ready
7. **DM sent automatically** → User receives video in their Whop DMs

---

## 🔧 Setup Instructions

### Step 1: Environment Variables

Make sure these are set in your Replit Secrets:

```
WHOP_API_KEY=your_api_key_here
NEXT_PUBLIC_WHOP_APP_ID=your_app_id_here
WHOP_WEBHOOK_SECRET=ws_4c187f951d819fb5c1a12f2b14dce2df5a3edaf3ef9be95ab1bf9428c9df6299
HEYGEN_API_KEY=your_heygen_key_here
```

### Step 2: Configure Whop Webhook

1. Go to https://whop.com/dashboard/developer/
2. Select your app
3. Go to **Webhooks** section
4. Click **Add Webhook** or **Create Webhook**
5. Enter these details:
   - **URL**: `https://your-replit-app-url.replit.app/api/whop/webhook`
   - **Events**: Select `membership.went_valid`
   - **Secret**: `ws_4c187f951d819fb5c1a12f2b14dce2df5a3edaf3ef9be95ab1bf9428c9df6299`
6. Save and enable the webhook

### Step 3: Test the Webhook

Visit this URL to verify your webhook endpoint is accessible:
```
https://your-replit-app-url.replit.app/api/whop/webhook/test
```

You should see a JSON response confirming the endpoint is working.

### Step 4: Configure App in Whop

1. In your Whop app settings, set the **Experience View** path to:
   ```
   /experiences/[experienceId]
   ```

2. Make sure your app is installed in a Whop community/product

---

## 🐛 Troubleshooting

### Names Not Showing?

**Check the logs**: Look for these messages:
```
Fetched user details: {"name":"...","username":"..."}
User details: name="...", username="..."
```

If you see these, the names ARE being fetched. The issue is likely:
- Frontend not refreshing after login
- Using cached data
- Need to refresh the page

### Webhooks Not Receiving?

1. **Test the endpoint**:
   ```bash
   curl https://your-app.replit.app/api/whop/webhook/test
   ```

2. **Check Whop Dashboard**:
   - Go to your webhook configuration
   - Look at "Recent Deliveries" or "Webhook Logs"
   - Verify the webhook is enabled

3. **Check for signature errors**:
   - Look for "Invalid Whop webhook signature" in logs
   - Verify your `WHOP_WEBHOOK_SECRET` matches what's in Whop dashboard

4. **Common issues**:
   - ✗ Wrong webhook URL (must be `/api/whop/webhook`)
   - ✗ Webhook secret doesn't match
   - ✗ Wrong event selected (must be `membership.went_valid`)
   - ✗ Webhook not enabled in Whop dashboard

### DMs Not Sending?

**Check the logs for**:
```
Attempting to send DM to user user_...
DM sent successfully to [name]
```

**If you see errors**:
- `GraphQL error: ...` → Check your WHOP_API_KEY
- `feedId` errors → Make sure using correct user ID
- 401/403 errors → API key might be invalid

---

## 📊 How to View Names

### Admin Dashboard
- Title now shows: **"Welcome, [Your Name]!"**
- Header displays your name next to the role badge
- Customer list shows full names (not just IDs)

### Customer View
- Welcome message: **"Welcome, [Your Name]!"**
- Shows personalized greeting
- Displays user ID below (for reference)

---

## 🔍 Debugging Tips

### 1. Check Logs
Look in your Replit console for:
- User fetch messages
- Webhook receipts
- DM sending confirmations
- Any error messages

### 2. Test Each Component

**Test User Fetch**:
```
POST /api/validate-access
Body: {"experienceId": "exp_xxx"}
Headers: x-whop-user-token: [your token]
```

Should return:
```json
{
  "hasAccess": true,
  "accessLevel": "admin",
  "userId": "user_xxx",
  "userName": "Your Name",
  "username": "your_username"
}
```

**Test Webhook**:
```
GET /api/whop/webhook/test
```

Should show environment status.

### 3. Common Log Messages

**✅ Good**:
```
Fetched user details: {...}
User details: name="...", username="..."
Webhook - Fetched user details: {...}
New member joined: [name] (@username, user_id)
DM sent successfully to [name]
```

**❌ Bad**:
```
Error fetching user details
Invalid Whop webhook signature
GraphQL error: ...
Failed to send DM
```

---

## 📝 Testing Checklist

- [ ] Environment variables set in Replit Secrets
- [ ] Webhook configured in Whop dashboard with correct URL
- [ ] Webhook secret matches between app and Whop
- [ ] Event `membership.went_valid` selected
- [ ] Webhook enabled in Whop dashboard
- [ ] App installed in a Whop community
- [ ] Test webhook endpoint returns success
- [ ] Admin can see their name in dashboard
- [ ] New member triggers webhook (check logs)
- [ ] Customer record created (check admin customer list)
- [ ] Video generation starts (check logs)
- [ ] DM sent when video completes

---

## 💡 Tips

1. **Use the test endpoint** first to verify webhooks can reach your app
2. **Check Replit logs** in real-time when testing
3. **Test with a real member** joining your Whop community
4. **Verify webhook deliveries** in Whop dashboard
5. **Look for error messages** in both Whop and Replit logs

---

## 🎯 Expected Behavior

When everything is working correctly:

1. Admin visits app → Sees "Welcome, [Their Name]!" in dashboard
2. Customer joins Whop → Webhook received (shows in logs)
3. Customer record created → Visible in admin customer list with full name
4. HeyGen video generates → Shows "generating" status
5. Video completes → HeyGen webhook received
6. DM sent → Customer receives message in Whop DMs
7. Customer visits app → Sees "Welcome, [Their Name]!" with instructions to check DMs

---

## 🆘 Still Having Issues?

If names still aren't showing or webhooks aren't working:

1. **Share your Replit logs** showing the validate-access and webhook calls
2. **Share screenshots** of your Whop webhook configuration
3. **Test the webhook test endpoint** and share the response
4. **Check Recent Deliveries** in Whop webhook settings

The app IS working correctly based on the logs - the names ARE being fetched and returned. The issue is likely with webhook configuration or frontend caching.
