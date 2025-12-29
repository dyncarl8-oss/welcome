# Design Guidelines: Whop Role-Based Access App

## Design Approach
**Selected System:** Material Design 3 adapted for dashboard/portal interfaces
**Rationale:** Utility-focused SaaS application requiring clear information hierarchy, familiar patterns for data display, and professional aesthetics suitable for both admin dashboards and customer portals.

## Core Design Principles
- **Clarity First:** Every element serves a functional purpose
- **Role Distinction:** Visual indicators clearly communicate user access level
- **Data Readability:** Information architecture optimized for quick scanning
- **Professional Consistency:** Enterprise-grade polish suitable for business contexts

## Color Palette

### Dark Mode (Primary)
- **Background:** 222 15% 8%
- **Surface:** 222 15% 12%
- **Surface Elevated:** 222 15% 16%
- **Primary Brand:** 220 90% 56%
- **Primary Hover:** 220 90% 46%
- **Success Accent:** 142 76% 36%
- **Text Primary:** 0 0% 98%
- **Text Secondary:** 0 0% 71%
- **Border:** 222 15% 24%

### Light Mode (Secondary)
- **Background:** 0 0% 100%
- **Surface:** 0 0% 98%
- **Surface Elevated:** 0 0% 96%
- **Primary Brand:** 220 90% 56%
- **Text Primary:** 222 15% 12%
- **Text Secondary:** 222 8% 45%

## Typography
- **Primary Font:** Inter (Google Fonts) - for UI elements, body text
- **Display Font:** Inter (600-700 weight) - for headings, emphasis
- **Heading Scale:** text-3xl (admin dashboard), text-2xl (section headers), text-xl (card titles)
- **Body Text:** text-base (default), text-sm (supporting text, metadata)
- **Monospace:** JetBrains Mono - for data values, IDs, technical info

## Layout System
**Spacing Units:** Tailwind primitives limited to 4, 6, 8, 12, 16, 24
- Component padding: p-6 or p-8
- Section spacing: gap-6 between cards, gap-8 between major sections
- Page margins: px-6 lg:px-8

**Grid Structure:**
- Admin Dashboard: 12-column grid for flexible stat cards
- Customer View: Single column max-w-4xl centered layout
- Sidebar (if needed): Fixed 256px width on desktop

## Component Library

### Navigation
- **Role Indicator Badge:** Prominent display showing "Admin" or "Member" status with appropriate icon
- **Sidebar Navigation (Admin):** Fixed left sidebar with dashboard sections
- **Top Bar:** Company/whop name, user avatar, role badge

### Admin Dashboard Components
- **Stat Cards:** Grid layout displaying key metrics (total members, active users, revenue)
- **Data Tables:** Clean tables with hover states for member lists, activity logs
- **Chart Containers:** Card-based chart displays with clear titles and legends
- **Action Buttons:** Primary CTAs for admin functions (Manage Members, Settings)

### Customer View Components
- **Welcome Card:** Personalized greeting with membership status
- **Content Cards:** Access to features, resources, or content relevant to their membership
- **Info Panels:** Membership details, expiration dates, access level information

### Shared Elements
- **Empty States:** Centered with icon, heading, and descriptive text
- **Loading States:** Skeleton loaders matching content structure
- **Error Messages:** Alert boxes with clear messaging and action steps

## Visual Hierarchy
- **L1 (Admin Dashboard):** Page title (text-3xl font-semibold) → Stat grid → Content sections
- **L2 (Customer View):** Welcome card → Feature access grid → Support resources
- **Card Structure:** Icon/indicator → Title → Value/description → Action (if applicable)

## Interaction Patterns
- **Hover States:** Subtle elevation (shadow-md to shadow-lg) on interactive cards
- **Active States:** Primary color border-l-4 indicator on selected navigation items
- **Transitions:** duration-200 for all state changes
- **Focus States:** ring-2 ring-primary for keyboard navigation

## Responsive Behavior
- **Desktop (lg+):** Full dashboard layout with sidebar
- **Tablet (md):** Collapsed sidebar with hamburger menu
- **Mobile (base):** Stack all content single column, full-width cards

## Access Control UI
- **Visual Lock Icons:** Disabled state for restricted features in customer view
- **Upgrade Prompts:** Subtle CTAs for customers to access admin features (if applicable)
- **Permission Indicators:** Badge/tooltip showing why certain actions are unavailable

## Animations
**Minimal use only:**
- Page transitions: Simple fade-in (200ms)
- Skeleton loaders: Gentle pulse animation
- No decorative animations - focus on functionality