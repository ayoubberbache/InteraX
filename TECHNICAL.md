# InteraX — Technical Reference

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL (Supabase) · Tailwind CSS v4 · Radix UI · Gemini AI · Supabase Storage · i18n (Arabic / French / English)

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
10. [i18n (Internationalization)](#i18n-internationalization)
11. [Environment Variables](#environment-variables)
12. [Deployment](#deployment)

---

## Project Overview

**InteraX** is a full-stack, mobile-first social media platform for campuses and communities. It features:

| Feature | Description |
|---|---|
| Social Feed | Posts with likes, comments, saves, 5-star ratings, and "show more" text truncation |
| Stories | 24-hour Instagram-style stories with images, video, audio, and emoji reactions |
| Messaging | Real-time DMs and group chats with voice notes, image/audio sharing, message reactions, replies, and forwarding |
| Groups | Campus community groups with member management and privacy settings |
| Pages | Creator/brand pages with follower system |
| AI Chatbot | "InteraX CB" powered by the Gemini AI API, streaming responses |
| Notifications | Fan-out real-time notification polling with browser push support |
| Search | Full-text user and content search |
| i18n | Arabic 🇩🇿, French 🇫🇷, English 🇬🇧 with RTL support |
| Themes | Dark / Light mode with `next-themes` |
| Auth | JWT-based with bcrypt password hashing |

---

## Directory Structure

```
InteraX/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── api/                      # REST API route handlers
│   │   ├── ai/                   # AI chatbot routes (chat, messages, sessions)
│   │   ├── auth/                 # Login, Signup, Sync, Verify
│   │   ├── conversations/        # Chat conversation CRUD
│   │   ├── groups/               # Groups + join + members
│   │   ├── media/                # Media proxy / serving
│   │   ├── messages/             # DM messages + reactions
│   │   ├── notifications/        # Notification CRUD + fan-out
│   │   ├── pages/                # Brand pages + follow
│   │   ├── posts/                # Posts + likes + comments + save + rate + report
│   │   ├── stories/              # Stories CRUD + view + reactions
│   │   ├── upload/               # Supabase file upload
│   │   └── users/                # User CRUD + follow + block + follow-request + suggestions
│   │
│   ├── auth/callback/            # OAuth callback
│   ├── campus-bot/               # Dedicated AI chatbot page
│   ├── chat/                     # Real-time messaging page
│   ├── create/                   # Post creation page
│   ├── groups/[id]/              # Group detail page
│   ├── login/                    # Login page
│   ├── logout/                   # Logout redirect
│   ├── notifications/            # Notifications page
│   ├── pages/[id]/               # Page detail
│   ├── profile/[id]/             # User profile (own + others)
│   ├── search/                   # Search page
│   ├── settings/                 # Account settings
│   ├── signup/                   # Registration page
│   ├── globals.css               # Global TailwindCSS base styles
│   ├── layout.tsx                # Root layout (providers, metadata)
│   └── page.tsx                  # Home feed (redirect guard)
│
├── frontend/                     # UI components, hooks, styles
│   ├── components/
│   │   ├── chat/                 # VoiceRecorder component
│   │   ├── feed/                 # PostCard + PostFeed
│   │   ├── groups/               # GroupCard
│   │   ├── layout/               # Header, Sidebar, BottomNav, RightPanel, MainLayout
│   │   ├── rating/               # StarRating display
│   │   ├── stories/              # StoriesBar, StoryRing, StoryViewer
│   │   ├── ui/                   # Radix-based shadcn/ui primitives + Logo component
│   │   └── theme-provider.tsx    # next-themes ThemeProvider wrapper
│   ├── hooks/
│   │   ├── use-mobile.ts         # Viewport breakpoint hook
│   │   └── use-toast.ts          # Toast notification hook
│   ├── lib/
│   │   └── cropImage.ts          # Canvas-based image cropping utility
│   └── styles/
│       └── globals.css           # Additional component-scoped styles
│
├── backend/                      # Server-side logic, DB, types
│   ├── lib/
│   │   ├── auth-context.tsx      # React AuthContext provider (client-side)
│   │   ├── db.ts                 # PostgreSQL Pool singleton + typed helpers
│   │   ├── i18n/
│   │   │   ├── language-context.tsx  # React LanguageContext + useTranslation hook
│   │   │   └── translations.ts       # All translation strings (en / fr / ar)
│   │   ├── mock-data.ts          # Static seed data (fallback / dev)
│   │   ├── types.ts              # All shared TypeScript DB entity types
│   │   ├── upload.ts             # Client-side Supabase media upload caller
│   │   └── utils.ts              # cn(), formatNumber(), formatTimeAgo()
│   └── schema.sql                # Full PostgreSQL DDL (tables, indexes, triggers)
│
├── public/                       # Static assets
│   ├── icon.svg                  # App favicon / icon (light+dark adaptive)
│   ├── interax-logo-light.svg    # Full brand lockup — light mode
│   ├── interax-logo-dark.svg     # Full brand lockup — dark mode
│   ├── default-avatar.svg        # Fallback avatar
│   └── placeholder.svg           # Media placeholder
│
├── scripts/                      # Database migration & seed scripts
├── .env.local                    # Environment secrets (not committed)
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies & npm scripts
├── tsconfig.json                 # TypeScript configuration
├── railway.json                  # Railway.app deployment config
└── postcss.config.mjs            # PostCSS / Tailwind config
```

---

## Configuration Files

### `package.json` — Key Scripts
| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Compile production bundle |
| `npm run start` | Serve production build |

### `next.config.mjs` — Key Settings
- **`serverActions`** experimental flag enabled
- **`images.remotePatterns`** — allows Supabase CDN (`*.supabase.co`) and other trusted domains for `next/image` optimization

---

## App Layer

### `app/layout.tsx` — Root Layout
Wraps the entire application tree with:
- **`ThemeProvider`** — `next-themes`, system default, class-based dark mode
- **`AuthProvider`** — global auth state from `backend/lib/auth-context.tsx`
- **`LanguageProvider`** — i18n context (English / French / Arabic) from `backend/lib/i18n/language-context.tsx`
- Google Fonts (Inter) via `next/font`

### `app/page.tsx`
Home entry point — checks auth cookie:
- **Authenticated** → renders full feed with `PostFeed`, `StoriesBar`, and `RightPanel`
- **Unauthenticated** → redirects to `/login`

---

## API Routes

All routes live under `app/api/` following Next.js Route Handler conventions (`route.ts`).  
Authentication is handled via `x-user-id` / `x-user-role` request headers (set from client JWT decode) or query params.

### Authentication — `/api/auth/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Validates email + bcrypt hash, returns JWT + user object |
| `/api/auth/signup` | POST | Creates user, hashes password with bcrypt, returns JWT |
| `/api/auth/sync` | GET | Re-fetches the user record by ID (for session refresh) |
| `/api/auth/verify` | POST | Verifies a JWT and returns decoded payload |

### Posts — `/api/posts/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/posts` | GET / POST | List feed posts / Create new post |
| `/api/posts/[id]/like` | POST | Toggle like on a post |
| `/api/posts/[id]/comments` | GET / POST | List comments / Add comment |
| `/api/posts/[id]/save` | POST | Toggle save/bookmark |
| `/api/posts/[id]/rate` | POST | Submit 1–5 star rating |
| `/api/posts/[id]/report` | POST | Report a post |

### Stories — `/api/stories/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/stories` | GET / POST / DELETE | List / Create / Delete stories (24h TTL) |
| `/api/stories/view` | POST | Record a story view |
| `/api/stories/reactions` | GET / POST | List / Submit emoji reactions on stories |

### Messaging — `/api/conversations/` & `/api/messages/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/conversations` | GET / POST / DELETE | List DMs / Start conversation / Delete |
| `/api/messages` | GET / POST | List messages in a conv / Send message |
| `/api/messages/[id]/react` | POST | Add/remove emoji reaction to a message |

### Users — `/api/users/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/users` | GET / PUT | Get user by ID / Update profile |
| `/api/users/[id]/follow` | POST | Follow / unfollow |
| `/api/users/block` | GET / POST / DELETE | Block management |
| `/api/users/follow-request` | GET / POST / DELETE | Private account follow requests |
| `/api/users/relations` | GET | Fetch mutual follow state between two users |
| `/api/users/suggestions` | GET | Suggested accounts (people you may know) |

### AI — `/api/ai/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/ai/chat` | POST | Sends messages to Gemini API, streams response via SSE |
| `/api/ai/sessions` | GET / POST | Manage AI chat sessions |
| `/api/ai/messages` | GET / POST | Persist AI chat message history |

### Groups — `/api/groups/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/groups` | GET / POST | List / Create groups |
| `/api/groups/[id]/join` | POST | Join / Leave group |
| `/api/groups/[id]/members` | GET | List group members |

### Pages — `/api/pages/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/pages` | GET / POST | List / Create pages |
| `/api/pages/[id]/follow` | POST | Follow / Unfollow a page |
| `/api/pages/[id]/followers` | GET | List page followers |

### Upload — `/api/upload/`
| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Receives Supabase CDN URL metadata, writes record to `uploads` table |

---

## Frontend Layer

### Layout Components (`frontend/components/layout/`)
| File | Purpose |
|---|---|
| `main-layout.tsx` | Wraps all pages. Controls header/bottom-nav visibility on mobile (e.g., hides both for chat). Uses `visualViewport` API to prevent the chat header from being pushed up by the mobile keyboard. |
| `header.tsx` | App header: Logo, global search bar, notification bell (with unread badge), theme toggle, user avatar dropdown |
| `sidebar.tsx` | Desktop left sidebar with navigation links and active state highlighting |
| `bottom-nav.tsx` | Mobile bottom navigation bar (home, search, create, messages, profile) |
| `right-panel.tsx` | Desktop right panel: suggested users, trending topics |

### Feed Components (`frontend/components/feed/`)
| File | Purpose |
|---|---|
| `post-card.tsx` | Full post renderer: media, text with "show more", reactions, comments, share/forward sheet |
| `post-feed.tsx` | Paginated post list |

### Story Components (`frontend/components/stories/`)
| File | Purpose |
|---|---|
| `stories-bar.tsx` | Horizontal scrollable row of story rings |
| `story-ring.tsx` | Individual story avatar ring with gradient border |
| `story-viewer.tsx` | Full-screen story viewer with auto-play, reactions, and deletion |

### UI Components (`frontend/components/ui/`)
All components are based on the **shadcn/ui** library (Radix UI primitives + Tailwind CSS). Additional custom components include:
- `logo.tsx` — `InteraXLogo` SVG component with theme-aware gradient (indigo→lavender in light mode, lavender→violet in dark mode)

---

## Backend Layer

### `backend/lib/db.ts` — Database Connection
- Connects to Supabase PostgreSQL using the `DATABASE_URL` connection string (with `pg` pool).
- Exports typed helpers: `query<T>()`, `queryOne<T>()`, `execute()`.
- Pool configured with `max: 10` connections and `idleTimeoutMillis: 30000`.

### `backend/lib/types.ts` — Shared TypeScript Types
Defines all DB entity interfaces: `User`, `Post`, `Story`, `Conversation`, `Message`, `Group`, `Page`, `Notification`, `Upload`, `Comment`, and their join types.

### `backend/lib/auth-context.tsx` — Auth Context
Client-side React Context. On mount, reads JWT from `localStorage`, decodes user ID, and fetches the full profile via `/api/auth/sync`. Exposes `currentUser`, `setCurrentUser`, `logout`.

### `backend/lib/utils.ts`
| Utility | Description |
|---|---|
| `cn(...classes)` | Merges Tailwind classes (clsx + tailwind-merge) |
| `formatNumber(n)` | Formats counts: `1.2K`, `3.4M`, etc. |
| `formatTimeAgo(date)` | Human-readable relative time: `2m`, `3h`, `Yesterday` |

---

## Database Schema

Defined in `backend/schema.sql`. Key tables:

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id`, `email`, `password_hash`, `full_name`, `username`, `avatar_url`, `bio`, `role`, `is_private`, `followers_count`, `following_count`, `points` | All user accounts |
| `posts` | `id`, `author_id`, `content`, `image_url`, `video_url`, `likes_count`, `comments_count`, `rating_avg` | User posts |
| `stories` | `id`, `user_id`, `type`, `content_url`, `caption`, `expires_at` | 24-hour ephemeral stories |
| `conversations` | `id`, `participant_ids[]`, `is_group`, `group_name`, `last_message` | Chat sessions |
| `messages` | `id`, `conversation_id`, `sender_id`, `type`, `content`, `media_url`, `is_deleted`, `replied_to_id` | Individual messages |
| `message_reactions` | `id`, `message_id`, `user_id`, `emoji` | Per-message emoji reactions |
| `notifications` | `id`, `user_id`, `from_user_id`, `type`, `message`, `is_read` | Fan-out notifications |
| `groups` | `id`, `name`, `description`, `privacy`, `member_count`, `owner_id` | Community groups |
| `pages` | `id`, `name`, `handle`, `category`, `avatar_url`, `followers_count`, `owner_id` | Brand/creator pages |
| `uploads` | `id`, `uploader_id`, `supabase_url`, `type`, `entity_type` | Media upload tracking |
| `follows` | `follower_id`, `following_id`, `status` | Follow relationships (incl. pending for private accounts) |
| `blocks` | `blocker_id`, `blocked_id` | Block list |

---

## Data Flow

```
Browser (React)
     │
     │ fetch() / Supabase JS SDK
     ▼
Next.js API (/app/api/)
     │
     ├─ /api/upload
     │       ├─► Supabase Storage (frontend streams file directly via @supabase/supabase-js)
     │       └─► Supabase PostgreSQL (API stores CDN URL in `uploads` table)
     │
     ├─ /api/ai/chat
     │       └─► Google Gemini AI API (streaming SSE)
     │
     └─ /api/posts, /api/users, etc.
             └─► Supabase PostgreSQL (pg Pool)
```

**Media Upload Strategy:**
1. Client selects a file (image, video, audio).
2. Frontend uses `@supabase/supabase-js` SDK to stream the file directly to the `uploads` Supabase Storage Bucket.
3. Supabase returns a public CDN URL.
4. Client posts that URL (as form-data or JSON) to the relevant API endpoint.
5. The API stores the URL in the DB (`uploads` table + the related entity column).
6. All media references use Supabase CDN URLs directly — no Base64 payloads, fast load times, correct streaming for video/audio.

---

## i18n (Internationalization)

**Location:** `backend/lib/i18n/`

| File | Purpose |
|---|---|
| `language-context.tsx` | React context providing the active language (`en`/`fr`/`ar`) and the `t(key)` translation function. Persists selection to `localStorage`. Applies `dir="rtl"` to `<html>` for Arabic. |
| `translations.ts` | Central map of all translation strings for `en`, `fr`, and `ar`. |

**Rules:**
- Names, Usernames, and Messages are **not translated** — they remain in their original (mother) language across all locales.
- The `t()` hook is used in all page and component files to render localized strings.

---

## Environment Variables

Defined in `.env.local` (never committed to git):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (with PgBouncer pooling) |
| `JWT_SECRET` | Secret key for JSON Web Token signing/verification |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key (public) |

---

## Deployment

**Platform:** [Railway.app](https://railway.app)  
**Config:** `railway.json`

```json
{
  "build": { "builder": "nixpacks" },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/"
  }
}
```

- Git push to `main` automatically triggers a Railway build and deployment.
- Production URL is set as `NEXT_PUBLIC_SITE_URL` environment variable in Railway's dashboard.
- Supabase environment variables are also set in Railway's dashboard for the production environment.

---

*Last updated: 2026-05-19*
