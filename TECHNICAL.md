# InteraX — Technical Reference

> **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL (Supabase) · Tailwind CSS v4 · Radix UI · Gemini AI · Supabase Storage

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Configuration Files](#configuration-files)
4. [App Layer (`/app`)](#app-layer)
5. [API Routes (`/app/api`)](#api-routes)
6. [Frontend Layer (`/frontend`)](#frontend-layer)
7. [Backend Layer (`/backend`)](#backend-layer)
8. [Database Schema](#database-schema)
9. [Data Flow](#data-flow)
10. [Environment Variables](#environment-variables)

---

## Project Overview

**InteraX** is a full-stack campus social media platform. It features:
- Social feed with posts, likes, comments, and a 5-star rating system
- 24-hour Instagram-style stories with emoji reactions
- Real-time messaging with voice notes, image sharing, and message reactions
- Groups and community pages
- An AI chatbot ("InteraX CB") powered by the Gemini AI API
- Dark/light theme, i18n (Arabic/English)

---

## Directory Structure

```
InteraX/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # REST API route handlers
│   ├── auth/               # Login / Signup / Verify pages
│   ├── campus-bot/         # Dedicated AI chatbot page
│   ├── chat/               # Messaging page
│   ├── create/             # Post creation page
│   ├── groups/             # Groups list + detail pages
│   ├── login/              # Login page
│   ├── logout/             # Logout redirect page
│   ├── notifications/      # Notifications page
│   ├── pages/              # Facebook-style Pages list + detail
│   ├── profile/            # User profile page (own + others)
│   ├── search/             # Search users/posts
│   ├── settings/           # Account settings page
│   ├── signup/             # Registration page
│   ├── globals.css         # Global TailwindCSS base styles
│   ├── layout.tsx          # Root layout (providers, metadata)
│   └── page.tsx            # Home feed (redirect to login or feed)
│
├── frontend/               # UI components, hooks, styles
│   ├── components/
│   │   ├── chat/           # Voice recorder component
│   │   ├── feed/           # Post card + post feed
│   │   ├── groups/         # Group card
│   │   ├── layout/         # Header, sidebar, bottom nav, right panel
│   │   ├── rating/         # Star rating display
│   │   ├── stories/        # Stories bar, story ring, story viewer
│   │   ├── ui/             # Radix-based shadcn/ui primitives
│   │   └── theme-provider.tsx
│   ├── hooks/
│   │   ├── use-mobile.ts   # Breakpoint hook
│   │   └── use-toast.ts    # Toast notification hook
│   ├── lib/
│   │   └── cropImage.ts    # Canvas-based image cropping utility
│   └── styles/
│       └── globals.css     # Additional component-scoped styles
│
├── backend/                # Server-side logic, DB, types
│   ├── lib/
│   │   ├── auth-context.tsx # React AuthContext provider (client)
│   │   ├── db.ts            # PostgreSQL Pool singleton + helpers
│   │   ├── i18n/            # Language context + translations
│   │   ├── mock-data.ts     # Static seed data (fallback / dev)
│   │   ├── types.ts         # All shared TypeScript DB entity types
│   │   ├── upload.ts        # Client-side media upload caller
│   │   └── utils.ts         # cn(), formatNumber(), formatTimeAgo()
│   └── schema.sql           # Full PostgreSQL DDL (tables, indexes, triggers)
│
├── public/                  # Static assets (avatars, icons, placeholders)
├── .env.local               # Environment secrets (not committed)
├── next.config.mjs          # Next.js config
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript config
└── postcss.config.mjs       # PostCSS / Tailwind config
```

---

## Configuration Files

### `package.json` — Key Scripts
| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |

---

## App Layer

### `app/layout.tsx` — Root Layout
Wraps the entire application with:
- **`ThemeProvider`** — next-themes, system default, class-based dark mode
- **`AuthProvider`** — global auth state from `backend/lib/auth-context.tsx`
- **`LanguageProvider`** — i18n context (Arabic / English)

### `app/page.tsx`
Home entry point — redirects authenticated users to the feed, unauthenticated users to `/login`.

---

## API Routes

All routes live under `app/api/` and follow Next.js Route Handler conventions (`route.ts`).
Authentication is handled via `x-user-id` header or query params.

### Authentication — `/api/auth/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Validates email + bcrypt password, returns JWT + user object |
| `/api/auth/signup` | POST | Creates new user, hashes password, returns JWT |

### AI (Campus Bot) — `/api/ai/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/ai/chat` | POST | Sends messages to Gemini API, supports JSON responses |

### Upload — `/api/upload/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Accepts metadata form-data, stores the Supabase URL in the `uploads` table, and returns the URL. |

---

## Frontend Layer

### Layout Components (`frontend/components/layout/`)
| File | Purpose |
|---|---|
| `header.tsx` | App header with logo, search bar, notification bell, theme toggle, and user avatar dropdown. |
| `sidebar.tsx` | Left navigation sidebar (desktop) with links. |

### Feed Components (`frontend/components/feed/`)
| File | Purpose |
|---|---|
| `post-card.tsx` | Renders a single post, uses the `isOwner` check to dynamically display real-time updated profile information from the `useAuth` hook. |

---

## Backend Layer

### `backend/lib/db.ts` — Database Connection
- Connects to Supabase PostgreSQL using `DATABASE_URL`.
- Exports typed helpers: `query`, `queryOne`, `execute`.

### `backend/lib/types.ts` — Shared TypeScript Types
Defines all database entity interfaces.

### `backend/lib/auth-context.tsx` — Auth Context Provider
Client-side React Context managing the authenticated session, pulling user updates dynamically across components.

---

## Database Schema

Defined in `backend/schema.sql`. Key tables:
| Table | Description |
|---|---|
| `users` | All user accounts: credentials, profile, counters, role, points, rating |
| `posts` | Posts with author, content, image/video URLs, counters |
| `uploads` | Source of truth tracking for uploaded files (stores the Supabase Storage URL) |
| `conversations` | 1-on-1 chat sessions between two users |
| `messages` | Individual messages with type (text/image/audio), soft delete |
| `notifications` | Fan-out notifications: type, actor, entity references |
| `groups` | Campus groups with privacy settings and member counts |

---

## Data Flow

```
Browser (React)
     │
     │ fetch()
     ▼
Next.js API (/app/api/)
     │
     ├─ /api/upload
     │       ├─► Supabase Storage (Uploads physical file via frontend, API gets metadata)
     │       └─► Supabase PostgreSQL (Stores metadata and Supabase URL in `uploads` table)
     │
     ├─ /api/ai/chat
     │       └─► Gemini AI API
     │
     └─ /api/posts, /api/users, etc.
             └─► Supabase PostgreSQL (pg Pool)
```

**Media Strategy:** 
1. The client selects a file for upload.
2. The frontend uses the `@supabase/supabase-js` client SDK to securely stream the file to the Supabase `uploads` Storage Bucket.
3. The frontend retrieves the public CDN URL from Supabase Storage.
4. The client submits `multipart/form-data` with the new URL to `/api/upload` (or other update endpoints).
5. The Supabase URL is tracked in the Supabase DB's `uploads` table.
6. Posts and media tags use the Supabase CDN URL directly for fast load times and correct video playback capabilities (avoiding Base64 payload bloat).

---

## Environment Variables

Defined in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string with pooling |
| `JWT_SECRET` | Secret key for JSON Web Tokens |
| `GEMINI_API_KEY` | Key for the Gemini AI model |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key |

---

*Last updated: 2026-05-15*
