# Whop Permissions Setup Guide for AutoWelcome AI

This guide will help you configure the required permissions for your AutoWelcome AI app to work properly with Whop.

## Why Permissions Are Required

AutoWelcome AI needs specific permissions to:
- Detect when new members join your community (via webhooks)
- Read member information to personalize videos
- Send DMs to members with their welcome videos
- Access your company and product information

## Required Permissions

Your app needs the following Whop permissions:

### 1. **`membership:read`** ✅
- **Why**: To read membership data when webhooks fire and detect new members
- **Justification**: "To detect when new members join and trigger personalized welcome videos"

### 2. **`user:read`** ✅
- **Why**: To fetch user details (name, username, etc.) for personalization
- **Justification**: "To personalize video messages with member names and details"

### 3. **`message:write`** ⭐ CRITICAL
- **Why**: To send DMs to customers with their welcome videos
- **Justification**: "To automatically send personalized welcome videos via DM"
- **Note**: Without this permission, videos will generate but won't be delivered!

### 4. **`company:read`** ✅
- **Why**: To identify the creator and customize welcome messages
- **Justification**: "To identify the creator and customize welcome messages"

### 5. **`product:read`** ✅
- **Why**: To personalize messages based on the plan/product members joined
- **Justification**: "To personalize messages based on the plan/product members joined"

---

## Step-by-Step Setup Instructions

### Step 1: Go to Developer Dashboard

1. Visit: https://whop.com/dashboard/developer
2. Select your **AutoWelcome AI** app (or the app you created)
3. Click on the **"Permissions"** tab

![Permissions Tab](https://mintcdn.com/whop/CTin6M1qeROeLXJs/images/app-permissions-settings.png)

### Step 2: Add Required Permissions

1. Click **"Add permissions"** button
2. Select ALL of these permissions:
   - ✅ `membership:read`
   - ✅ `user:read`
   - ✅ `message:write`
   - ✅ `company:read`
   - ✅ `product:read`
3. Click **"Add"**

### Step 3: Configure Each Permission

For each permission you added, you need to:

1. Write a **justification** (why your app needs it)
2. Choose whether it's **required** or **optional**

Use these justifications:

| Permission | Justification | Required? |
|------------|---------------|-----------|
| `membership:read` | "To detect when new members join and trigger personalized welcome videos" | ✅ Required |
| `user:read` | "To personalize video messages with member names and details" | ✅ Required |
| `message:write` | "To automatically send personalized welcome videos via DM" | ✅ Required |
| `company:read` | "To identify the creator and customize welcome messages" | ✅ Required |
| `product:read` | "To personalize messages based on the plan/product members joined" | ✅ Required |

![Permission Justification](https://mintcdn.com/whop/CTin6M1qeROeLXJs/images/app-permissions-settings-justification.png)

### Step 4: Save Your Permissions

1. Review all permissions
2. Click **"Save"** button
3. Confirm the changes

![Save Permissions](https://mintcdn.com/whop/CTin6M1qeROeLXJs/images/app-permissions-settings-save.png)

### Step 5: Install/Re-approve Your App

After configuring permissions, you need to install (or re-approve) the app:

1. Visit: `https://whop.com/apps/YOUR_APP_ID/install`
   - Replace `YOUR_APP_ID` with your actual app ID (e.g., `app_xxxxxxxxx`)
2. Select your company
3. **Review and approve ALL permissions**

![Permission Approval Screen](https://mintcdn.com/whop/CTin6M1qeROeLXJs/images/app-permissions-oauth.png)

---

## For Multi-Tenant Use (Other Creators)

When other creators install your AutoWelcome AI app on their Whop companies:

1. They will see the same permissions approval screen
2. They must approve ALL required permissions
3. Each creator gets their own isolated setup:
   - Their own admin dashboard
   - Their own avatar/settings
   - Their own customer list
   - Videos sent from their account to their members

---

## Troubleshooting

### Problem: Videos generate but don't send via DM

**Solution**: Check if `message:write` permission is approved
- Go to: https://whop.com/dashboard/settings/authorized-apps
- Find your AutoWelcome AI app
- Verify `message:write` is checked
- If not, click **"Re-approve"**

### Problem: "Permission denied" or "Unauthorized" errors

**Solution**: 
1. Go to Developer Dashboard → Permissions
2. Verify all 5 permissions are added
3. Re-install/re-approve the app

### Problem: Webhooks receive events but nothing happens

**Solution**:
1. Check that `membership:read` permission is approved
2. Verify webhook is set to receive `membership.went_valid` events
3. Check the app logs for detailed error messages

---

## API Endpoints That Require Permissions

| Endpoint | Required Permission |
|----------|---------------------|
| `/api/v5/messages` (Create DM) | `message:write` |
| `/users/:userId` (Get user details) | `user:read` |
| `/memberships/:id` (Get membership) | `membership:read` |
| `/companies/:id` (Get company) | `company:read` |
| `/products/:id` (Get product) | `product:read` |

---

## Need Help?

If you're still having issues:

1. Check the console logs for permission-related errors
2. Verify all environment variables are set correctly
3. Test the webhook endpoint manually
4. Contact Whop support if permissions aren't working

---

## Important Notes

- ⚠️ All permissions must be approved for the app to work fully
- ⚠️ If you add new permissions later, creators will need to re-approve
- ⚠️ Handle permission errors gracefully in your code
- ✅ The app will show helpful error messages if permissions are missing
