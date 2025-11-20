# Whop Webhook Setup Guide

## Problem Overview

Your AutoWelcome AI app wasn't sending DMs to new members because Whop needs to be configured to notify your app when new members join. This is done through Whop's webhook system.

## Solution

I've updated your app to handle Whop's `membership.went_valid` webhook event. Now you just need to configure the webhook in your Whop dashboard.

---

## Step-by-Step Webhook Configuration

### 1. Get Your Webhook URL

Your webhook endpoint is now ready at:
```
https://your-replit-url.replit.app/api/whop/webhook
```

Replace `your-replit-url` with your actual Replit deployment URL.

**Note:** If you're testing locally with the dev proxy, use:
```
http://localhost:5000/api/whop/webhook
```
But for production, always use your published Replit HTTPS URL.

### 2. Configure Webhook in Whop Dashboard

#### Option A: Via Whop Dashboard (Recommended)
1. Go to your Whop dashboard
2. Navigate to **Settings** → **Webhooks**
3. Click **Create Webhook** or **Add Webhook**
4. Enter your webhook URL: `https://your-replit-url.replit.app/api/whop/webhook`
5. Select the event: **Membership Went Valid**
6. Enable the webhook
7. Save

#### Option B: Via Whop API
If you prefer using the API, run this command (replace `YOUR_API_KEY` with your actual Whop API key):

```bash
curl --request POST \
  --url https://api.whop.com/api/v2/webhooks \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "url": "https://your-replit-url.replit.app/api/whop/webhook",
    "enabled": true,
    "events": ["membership.went_valid"]
  }'
```

### 3. Test the Webhook

After setting up:
1. Use the "Test Webhook" button in your Whop dashboard
2. Check your server logs for: `Received Whop webhook: membership.went_valid`
3. If you see this message, the webhook is working!

### 4. Test with a Real Member

To test the full flow:
1. Have someone join your Whop community (or create a test membership)
2. Watch your server logs - you should see:
   - `New member joined: [username]`
   - `Created customer record for [username]`
   - `HeyGen video generation started for [username]`
3. After HeyGen completes the video (usually 1-3 minutes), the member should receive a DM with the personalized video

---

## How It Works

### The Complete Flow:

1. **New Member Joins** → Whop sends webhook to `/api/whop/webhook`
2. **Webhook Received** → Your app creates a customer record
3. **Video Generation** → App triggers HeyGen to create personalized video
4. **HeyGen Processing** → HeyGen generates the AI video (1-3 minutes)
5. **Video Complete** → HeyGen sends webhook to `/api/heygen/webhook`
6. **Send DM** → App sends the video URL via Whop DM to the new member
7. **Customer Sees** → Member gets notification and can watch their personalized welcome video

---

## Webhook Payload Reference

When a new member joins, Whop sends this payload:

```json
{
  "action": "membership.went_valid",
  "data": {
    "id": "mem_XXXX",
    "status_reason": "created",
    "user": {
      "id": "user_XXXX",
      "username": "username",
      "email": "user@example.com"
    },
    "access_pass": {
      "name": "Your Product Name"
    },
    "product_id": "prod_XXXX"
  }
}
```

Your app now correctly handles this format!

---

## Troubleshooting

### No DMs Being Sent?

**Check these in order:**

1. **Is the webhook configured?**
   - Go to Whop dashboard → Settings → Webhooks
   - Verify webhook is enabled and pointing to your app URL

2. **Is your app publicly accessible?**
   - Make sure your Replit app is deployed and running
   - Test the URL in your browser

3. **Check server logs:**
   ```
   Received Whop webhook: membership.went_valid
   New member joined: [username]
   ```
   - If you see these, the webhook is working

4. **Is creator setup complete?**
   - Go to admin dashboard
   - Verify avatar is uploaded and message template is saved
   - The dashboard should show "Setup Complete"

5. **Check HeyGen API:**
   - Look for: `HeyGen video generation started`
   - If you see errors, check your `HEYGEN_API_KEY`

6. **Check video status in admin dashboard:**
   - Go to Customers tab
   - Look at video status for the new member
   - Status should be: Generating → Completed → Sent

### Webhook Not Receiving Events?

- **URL must be HTTPS** (Replit provides this automatically)
- **URL must respond within 3 seconds**
- **Must return 200 status code** (your app does this)
- Check Whop webhook logs in dashboard for delivery failures

### Videos Generated But No DMs?

This means HeyGen is working but Whop messaging has an issue:
1. Check `WHOP_API_KEY` is set correctly
2. Verify your Whop app has messaging permissions
3. Check logs for "Failed to send DM" errors

---

## Environment Variables Required

Make sure these are set in your Replit Secrets:

```
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_WEBHOOK_SECRET=your_heygen_webhook_secret (optional)
```

---

## Monitoring

Watch your logs for these key messages:

✅ **Success indicators:**
- `Received Whop webhook: membership.went_valid`
- `New member joined: [username]`
- `HeyGen video generation started for [username]: [video_id]`
- `Video [video_id] sent to [name] via DM`

❌ **Error indicators:**
- `No setup complete creator found`
- `HeyGen API error:`
- `Failed to send DM:`

---

## Next Steps

1. Configure the webhook in your Whop dashboard (see Step 2 above)
2. Test with a real member joining
3. Check that they receive the DM with the video
4. Monitor the admin dashboard to see video generation and delivery stats

---

## Support Resources

- **Whop Webhooks Documentation:** https://guides.whop.com/webhooks
- **Whop API Reference:** https://dev.whop.com/api-reference/v2/webhooks/create-a-webhook
- **HeyGen API Documentation:** https://docs.heygen.com/docs/quick-start

---

## Summary

The issue was that Whop wasn't notifying your app when new members joined. Now that the webhook endpoint is ready, you just need to configure it in your Whop dashboard, and new members will automatically receive personalized welcome videos via DM! 🎥✨
