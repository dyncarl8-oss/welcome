# Whop Role-Based Access App

## Overview
This is a Whop application that implements role-based access control, automatically routing admins to a dashboard and customers to their member view based on Whop's authentication system.

## Architecture
- **Frontend**: React + TypeScript with Wouter routing
- **Backend**: Express.js with Whop SDK integration
- **Authentication**: Handled entirely by Whop - no custom auth needed
- **Styling**: Tailwind CSS with shadcn/ui components

## Key Features
- Automatic role detection (admin vs customer) via Whop SDK
- Admin dashboard with stats and activity monitoring
- Customer view with feature access management
- Dark mode support
- Real-time access validation

## How It Works

### Whop Integration
The app uses Whop's SDK to validate user access:

1. **Experience View Pattern**: App is accessed via `/experiences/[experienceId]`
2. **Token Validation**: Whop automatically adds `x-whop-user-token` header to all requests
3. **Access Check**: Backend validates token and checks user's access level
4. **Role-Based Rendering**: Frontend renders appropriate view based on access level

### Access Levels
- **admin**: Owners/moderators of the Whop → see Admin Dashboard
- **customer**: Regular members → see Customer View
- **no_access**: No access → see Access Denied page

## Configuration

### Required Environment Variables
```
WHOP_API_KEY=<your_api_key>
NEXT_PUBLIC_WHOP_APP_ID=<your_app_id>
WHOP_OAUTH_CLIENT_ID=<your_oauth_client_id>
WHOP_OAUTH_CLIENT_SECRET=<your_oauth_client_secret>
```

Get these from: https://whop.com/dashboard/developer/

### OAuth Configuration (IMPORTANT for Multi-Tenant Messaging)

**Why OAuth is Required:**
- Without OAuth, all messages appear from the app owner's account ("Chess agent")
- With OAuth, each creator's messages appear from their own Whop account
- This is essential for a professional multi-tenant experience

**Setup Steps:**

1. **Get OAuth Credentials** from your Whop Developer Dashboard:
   - Go to https://whop.com/dashboard/developer/
   - Select your app
   - Navigate to OAuth settings
   - Copy your OAuth Client ID and Client Secret

2. **Configure Redirect URI** in Whop Dashboard:
   - In the OAuth settings, add the following redirect URI:
   - For Replit deployment: `https://[YOUR-REPL-NAME].[YOUR-USERNAME].replit.app/api/auth/whop/callback`
   - For production: `https://[YOUR-DOMAIN]/api/auth/whop/callback`
   - Save the OAuth configuration

3. **Add Environment Variables**:
   - Add `WHOP_OAUTH_CLIENT_ID` and `WHOP_OAUTH_CLIENT_SECRET` to your Replit secrets
   - These are separate from your app API key

4. **Each Creator Must Connect:**
   - When a creator first accesses the admin dashboard, they'll see a warning
   - They must click "Connect Whop Account" to authorize
   - This is a one-time setup per creator
   - After connection, all their messages will appear from their account

**OAuth Scopes Used:**
- `messages:write` - Required to send DMs on behalf of the creator
- `user:read` - Required to identify the creator

**Token Management:**
- OAuth tokens are automatically refreshed when they expire
- Tokens are securely stored in the database per creator
- If token refresh fails, the app falls back to app-level messaging (from app owner)

### Optional for Local Testing
```
WHOP_DEV_TOKEN=<jwt_token_from_whop_dev_tools>
```

## Local Development

### Using Whop Dev Proxy (Recommended)
The dev proxy automatically injects the user token for local testing:

```bash
# Start the dev server
npm run dev

# In a separate terminal, run the dev proxy
npx @whop-apps/dev-proxy --standalone --upstreamPort=5000 --proxyPort=3000
```

Then access your app through the Whop platform with the dev tools set to localhost:3000

### Without Dev Proxy (Mock Mode)
Set `WHOP_DEV_TOKEN` environment variable to test locally without the proxy.

## Deployment

### Whop Dashboard Configuration
1. Go to https://whop.com/dashboard/developer/
2. Select your app
3. In Hosting settings, set Experience View path to: `/experiences/[experienceId]`
4. Deploy your app
5. Install the app in a Whop to test

### Environment Setup
Ensure `WHOP_API_KEY` and `NEXT_PUBLIC_WHOP_APP_ID` are set in your deployment environment.

## Project Structure

```
client/
  src/
    components/
      AdminDashboard.tsx    # Admin view with stats
      CustomerView.tsx      # Customer member view
      Header.tsx           # App header with role badge
      LoadingState.tsx     # Loading indicator
      AccessDenied.tsx     # Access denied screen
    pages/
      Experience.tsx       # Main experience view (role-based routing)
      Home.tsx            # Info page
    lib/
      api.ts              # API helper functions

server/
  lib/
    whop-sdk.ts          # Whop SDK initialization
  middleware/
    whop-proxy.ts        # Dev token injection for local testing
  routes.ts              # API routes for access validation
```

## API Routes

### POST /api/validate-access
Validates user access to an experience.

**Request:**
```json
{
  "experienceId": "exp_xxx"
}
```

**Response:**
```json
{
  "hasAccess": true,
  "accessLevel": "admin"|"customer"|"no_access",
  "userId": "user_xxx"
}
```

### GET /api/user
Gets current user information (requires x-whop-user-token header).

## Development Notes

- The app automatically handles dark/light mode preferences
- All interactive elements include data-testid attributes for testing
- Mock data in dashboards will be replaced with real Whop API calls in production
- The dev proxy is essential for local testing with Whop authentication

## Multi-Tenant Security Architecture

This app is designed for multi-tenant deployment where multiple companies can install and use the app independently. Complete data isolation is enforced at multiple levels:

### Security Layers

1. **Database Constraints** (shared/schema.ts):
   - `whopCompanyId` is NOT NULL and UNIQUE
   - Enforces one creator per company at database level
   - Prevents NULL bypass of unique constraint

2. **Initialization Security** (/api/admin/initialize):
   - REQUIRES `experienceId` in request
   - Verifies user has ADMIN access to experience via Whop SDK
   - Rejects if user lacks admin access (403)
   - Fetches company ID from verified experience (server-side only)
   - Creates creator with company ID OR validates existing creator matches
   - Returns 403 if existing creator belongs to different company

3. **Settings Protection** (/api/admin/save-settings):
   - Company ID is READ-ONLY after initialization
   - Client cannot change company ID (removed from request body)
   - Only messageTemplate can be updated

4. **Webhook Routing** (/api/whop/webhook):
   - Extracts company ID from webhook payload
   - Matches creator by company ID (not first available)
   - Rejects webhooks without company ID or matching creator

5. **API Scoping** (/api/admin/analytics, /api/admin/customers):
   - All Whop API calls include company_id parameter
   - Returns only data for creator's company
   - Logs company context for auditing

### Attack Vectors Blocked

- ❌ Cannot initialize with arbitrary experienceId (admin access check)
- ❌ Cannot change company ID after setup (settings endpoint hardened)
- ❌ Cannot create creator without company ID (DB constraint + validation)
- ❌ Cannot create multiple creators for same company (unique constraint)
- ❌ Webhooks cannot route to wrong creator (company-based lookup)
- ❌ API calls cannot leak cross-company data (company_id parameter)

## Audio Storage Architecture

Audio files are stored directly in MongoDB and served by the Express backend:

1. **Storage**: Audio is stored as base64 data URLs in the `audioUrl` field of audio messages
2. **Serving**: `/api/audio/:id` endpoint converts base64 back to binary and serves with proper headers
3. **URLs**: DM links use deployment-aware URLs (RENDER_EXTERNAL_URL or REPL_SLUG)
4. **Benefits**:
   - ✅ No external dependencies or API keys needed
   - ✅ Works on any deployment platform (Replit, Render, etc.)
   - ✅ Audio persists with database backups
   - ✅ Simple, reliable architecture

**Note**: MongoDB has 16MB document limit, but typical voice messages are well under this.

## Recent Changes
- **October 2025 - OAuth Implementation Completed**:
  - ✅ Completed OAuth flow for per-creator message sending
  - ✅ Added automatic token refresh logic to handle expired tokens
  - ✅ Updated OAuth scopes to include `messages:write` and `user:read`
  - ✅ Implemented token validation with automatic refresh in both automatic and manual DM flows
  - ✅ Added comprehensive error handling with fallback to app-level messaging
  - ✅ Documented OAuth redirect URI configuration for Whop dashboard
  - Messages now appear from each creator's own Whop account when OAuth is connected
  - Tokens are automatically refreshed before expiry (5-minute buffer)
  - Clear UI warnings guide creators to connect their Whop account
- **October 2025 - DM Sender Identity Fix**:
  - Fixed multi-tenant DM sender issue where all messages appeared from app developer
  - Updated both automatic and manual DM pathways to use per-creator SDK instances
  - Messages now correctly appear from each creator's account using `onBehalfOfUserId`
  - Applied fix to `sendAudioDM` function and `/api/admin/send-audio-dm` endpoint
  - All DMs now properly scoped to the creator who owns the customer
- **October 2025 - Audio Storage Simplification**:
  - Removed external service dependencies (Clyp.it, Cloudinary)
  - Audio now stored directly in MongoDB as base64 data URLs
  - Added `/api/audio/:id` endpoint to serve audio files
  - Works reliably on all deployment platforms
  - No API keys or configuration needed
- **October 2025 - Critical Security Update**: Complete multi-tenant isolation
  - Added admin access verification to initialization endpoint
  - Made company ID immutable after initialization
  - Enforced NOT NULL + UNIQUE constraints on whopCompanyId
  - Added company_id scoping to all Whop API calls
  - Fixed webhook routing to use company-based creator lookup
  - Added comprehensive logging for security auditing
  - Blocked all cross-company data access attack vectors
- **October 2025**: Major UX and design improvements
  - Restructured upload flow: Files are now staged locally and only uploaded when "Save Settings" is clicked
  - Fixed avatar preview persistence - preview now remains visible after upload
  - Added setup progress tracker showing completion percentage and steps
  - Enhanced visual design with futuristic aesthetic: gradients, glows, and animations
  - Improved empty states with engaging visuals and better guidance
  - Added custom CSS animations (shimmer, pulse-glow, float, slide-in-up, fade-in)
  - Better status indicators and badges throughout admin dashboard
  - "Unsaved Changes" badge to prevent accidental data loss
  - Improved customer view with better status displays and action cards
  - Added cleanup for polling interval to prevent memory leaks
- Initial implementation with Whop SDK integration
- Role-based routing using experience view pattern  
- API routes for access validation
- Local development setup with mock token support
