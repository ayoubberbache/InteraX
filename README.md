# InteraX - Campus Social Platform

Welcome to the **InteraX** codebase! InteraX is a modern, responsive, and dynamic social networking platform built for campus communities to connect, share expressions, join groups, and communicate.

## 🗺️ Project Structure Map

The project is organized into three main pillars: **App Routing**, **Frontend UI**, and **Backend/Core Logic**.

```text
InteraX/
├── app/                  # Next.js App Router (Pages & API Endpoints)
│   ├── (main pages)      # '/', '/search', '/create', '/chat', '/notifications', '/settings'
│   ├── profile/          # User profiles and content feeds
│   ├── groups/           # Group discovery and detail pages
│   ├── pages/            # Public pages (like businesses or campus clubs)
│   ├── login/ & signup/  # Authentication flows
│   └── api/              # Backend API routes
│       ├── users/        # User data & settings updates
│       ├── posts/        # Feed fetching and post creation
│       ├── stories/      # Story (temporary posts) logic
│       ├── upload/       # Media processing and storage
│       └── ...           # Groups, Pages, Search APIs
│
├── frontend/             # Reusable UI Architecture
│   ├── components/       # Core building blocks
│   │   ├── ui/           # Primitive generic components (Buttons, Avatars, Inputs)
│   │   ├── layout/       # Main layouts, Header, Sidebar (RTL/LTR aware)
│   │   ├── feed/         # Post cards, timelines, interaction buttons
│   │   ├── stories/      # Story rings, full-screen media viewers
│   │   └── rating/       # Star rating display components
│   └── lib/              # Frontend-only utilities (like avatar cropping)
│
├── backend/              # Core Logic & Infrastructure
│   ├── lib/              # Contexts and Database connection
│   │   ├── db.ts         # PostgreSQL connection logic
│   │   ├── auth-context  # Global user authentication state
│   │   ├── i18n/         # Internationalization (En, Fr, Ar)
│   │   └── upload.ts     # Media handling logic
│   └── schema.sql        # The complete PostgreSQL database blueprint
│
├── public/               # Static Assets
│   ├── default-avatar.svg# Standard fallback avatar
│   └── uploads/          # Local media storage directory
```

## 🚀 Core Features

1. **Expressions (Posts & Stories)**: Upload photos, videos, and music tracks. Media is handled through a seamless upload flow, including built-in cropping for avatars.
2. **Dynamic UI System**: Full Dark/Light mode support with a theme-aware dynamic logo.
3. **Internationalization (i18n)**: Deep language support (English, French, Arabic). When Arabic is selected, the entire UI intelligently mirrors into a Right-to-Left (RTL) layout.
4. **Groups & Pages**: Dedicated hubs for campus clubs and interests.
5. **Real-time Ready**: Built on top of PostgreSQL and Next.js React Server Components.

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router) with React 19
* **Styling**: Tailwind CSS v4 (with native logical CSS properties for RTL)
* **Database**: PostgreSQL
* **Icons**: Lucide React
* **Media Processing**: React Easy Crop

## 💻 Running Locally

1. Install dependencies: `npm install`
2. Set up your `.env.local` with your PostgreSQL database credentials.
3. Start the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

*Note: If you want to share your local server with a friend, check out the `DEPLOYMENT_GUIDE.md`!*
