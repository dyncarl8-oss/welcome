# Whop Role-Based Access App

## Overview
This Whop application provides role-based access control, directing administrators to a dedicated dashboard and customers to their member view. It leverages Whop's authentication system to automatically determine user roles, ensuring a streamlined and secure experience. The project aims to offer a multi-tenant solution where each creator's branding and messaging are preserved.

## User Preferences
I want iterative development. I prefer detailed explanations. Ask before making major changes.

## System Architecture
The application is built with a React + TypeScript frontend utilizing Wouter for routing and Tailwind CSS with shadcn/ui for styling. The backend is an Express.js application integrating with the Whop SDK. Authentication is handled entirely by Whop, with no custom authentication mechanisms.

Key architectural decisions include:
- **Role-Based Access Control**: Automatic detection of 'admin', 'customer', or 'no_access' roles via Whop SDK for dynamic content rendering.
- **Multi-tenancy**: Designed for multiple companies to use independently with strict data isolation enforced at the database (unique `whopCompanyId`), initialization, and API levels.
- **UI/UX**: Features automatic dark mode support (synced with Whop's native theme via the `onColorThemeChange` event listener), a futuristic aesthetic with gradients, glows, and custom animations, and enhanced empty states. No manual theme toggle is provided as the app automatically matches the user's Whop theme preference.
- **OAuth for Messaging**: Implements an OAuth flow to enable messages to be sent on behalf of individual creators, with automatic token refresh and secure storage.
- **Audio Storage**: Audio files are stored directly in MongoDB as base64 data URLs and served via an Express endpoint, eliminating external dependencies for audio.
- **API Scoping**: All Whop API calls include `company_id` and `access_level=customer` parameters to ensure data isolation and prevent cross-company data leakage.

## External Dependencies
- **Whop SDK**: For user authentication, access validation, and API interactions.
- **MongoDB**: Used for data persistence, including secure storage of OAuth tokens and audio files.