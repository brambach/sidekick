# Sidekick - Client Portal Foundation Setup

## Overview
Set up complete Next.js 14 foundation for a white-labeled client portal with role-based authentication, database, and file uploads.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Shadcn UI + Clerk + Drizzle ORM + Vercel Postgres + UploadThing

---

## Phase 1: Project Initialization

### 1.1 Create Next.js Project
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 1.2 Install Dependencies
```bash
# Auth, DB, File uploads
npm install @clerk/nextjs drizzle-orm @vercel/postgres uploadthing @uploadthing/react

# Utilities
npm install zod svix date-fns clsx tailwind-merge class-variance-authority lucide-react

# Dev dependencies
npm install -D drizzle-kit tsx
```

### 1.3 Initialize Shadcn UI
```bash
npx shadcn@latest init
npx shadcn@latest add button card input badge avatar dropdown-menu dialog textarea
```

---

## Phase 2: Project Structure

Create folder structure:
```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── clients/page.tsx
│   │   │   │   ├── projects/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── client/
│   │   │       ├── page.tsx
│   │   │       └── projects/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── webhooks/clerk/route.ts
│   │   └── uploadthing/
│   │       ├── core.ts
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # Shadcn (auto-generated)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   └── shared/
│       └── loading-spinner.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts           # Drizzle client
│   │   ├── schema.ts          # Database schema
│   │   └── seed.ts            # Seed script
│   ├── auth.ts                # Auth helpers
│   ├── errors.ts              # Custom error classes
│   ├── types.ts               # TypeScript types
│   ├── utils.ts               # Utilities
│   └── uploadthing.ts         # UploadThing exports
└── middleware.ts              # Route protection
```

---

## Phase 3: Database Schema

**File: `src/lib/db/schema.ts`**

### 3.1 Tables

**users** (Simplified - Clerk is source of truth for profile data)
- id: uuid (PK)
- clerk_id: string (unique, not null)
- role: enum ('admin', 'client')
- agency_id: uuid (FK, nullable)
- client_id: uuid (FK, nullable)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp (nullable, for soft delete)

> **Note:** Email, name, and avatar are NOT stored here. Clerk is the source of truth for user profile data. Use `getUserWithProfile()` helper to fetch combined data.

**agencies**
- id: uuid (PK)
- name: varchar(255)
- logo_url: text (nullable)
- primary_color: varchar(7) (default: #3B82F6)
- domain: varchar(255) (nullable)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp (nullable)

**clients**
- id: uuid (PK)
- agency_id: uuid (FK, not null)
- company_name: varchar(255)
- contact_name: varchar(255)
- contact_email: varchar(255)
- status: enum ('active', 'inactive', 'archived')
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp (nullable)

**projects**
- id: uuid (PK)
- client_id: uuid (FK, not null)
- name: varchar(255)
- description: text (nullable)
- status: enum ('planning', 'in_progress', 'review', 'completed', 'on_hold')
- start_date: timestamp (nullable)
- due_date: timestamp (nullable)
- created_at: timestamp
- updated_at: timestamp
- deleted_at: timestamp (nullable)

**files**
- id: uuid (PK)
- project_id: uuid (FK, not null)
- name: varchar(255)
- file_url: text
- file_size: integer
- file_type: varchar(100)
- uploaded_by: uuid (FK to users, nullable)
- uploaded_at: timestamp
- deleted_at: timestamp (nullable)

**messages**
- id: uuid (PK)
- project_id: uuid (FK, not null)
- sender_id: uuid (FK to users, nullable)
- content: text
- read: boolean (default: false)
- created_at: timestamp
- deleted_at: timestamp (nullable)

**client_activity** (Track client engagement for dashboard metrics)
- id: uuid (PK)
- client_id: uuid (FK, unique)
- last_login: timestamp (nullable)
- last_message_sent: timestamp (nullable)
- last_file_downloaded: timestamp (nullable)
- updated_at: timestamp

### 3.2 Soft Delete Pattern

All tables include `deleted_at: timestamp (nullable)`. When "deleting" records:
- Set `deleted_at = new Date()` instead of removing from database
- Filter queries with `where: isNull(table.deleted_at)`
- Benefits: Data recovery, audit trail, maintains referential integrity

### 3.3 Performance Indexes

```typescript
// projects table
indexes: {
  client_idx: index('projects_client_idx').on(projects.clientId),
  status_idx: index('projects_status_idx').on(projects.status)
}

// messages table
indexes: {
  project_idx: index('messages_project_idx').on(messages.projectId),
  sender_idx: index('messages_sender_idx').on(messages.senderId),
  unread_idx: index('messages_unread_idx').on(messages.read, messages.projectId)
}

// files table
indexes: {
  project_idx: index('files_project_idx').on(files.projectId),
  uploaded_by_idx: index('files_uploaded_by_idx').on(files.uploadedBy)
}
```

### 3.4 Drizzle Relations

Define relations between all tables for type-safe joins.

**File: `drizzle.config.ts`** - Drizzle Kit configuration pointing to schema

---

## Phase 4: Authentication Setup

### 4.1 Clerk Provider
Wrap app in `ClerkProvider` in root layout.

### 4.2 Middleware (`src/middleware.ts`)
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks`
- Admin routes (`/dashboard/admin/*`): Require role = admin
- Client routes (`/dashboard/client/*`): Require role = client
- Auto-redirect `/dashboard` based on role

### 4.3 Webhook Handler (`src/app/api/webhooks/clerk/route.ts`)
Handle events:
- `user.created` → Insert user into DB with role from publicMetadata
- `user.updated` → Update user role in DB (no profile sync needed)
- `user.deleted` → Soft delete user (set deleted_at)

Verify webhook signature with svix.

### 4.4 Auth Helpers (`src/lib/auth.ts`)

```typescript
// Get DB user only (for role/permissions)
export async function getCurrentUser(): Promise<User | null>

// Get DB user + Clerk profile data (for display)
export async function getUserWithProfile(): Promise<UserWithProfile | null> {
  const { userId } = await auth()
  if (!userId) return null

  const [dbUser, clerkUser] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.clerkId, userId) }),
    clerkClient.users.getUser(userId)
  ])

  if (!dbUser) return null

  return {
    ...dbUser,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
    avatarUrl: clerkUser.imageUrl
  }
}

// Throw if not authenticated
export async function requireAuth(): Promise<User>

// Throw if not admin
export async function requireAdmin(): Promise<User>
```

---

## Phase 5: UploadThing Setup

**File: `src/app/api/uploadthing/core.ts`**

File size limits (optimized for design agency workflows):
- `projectFile` endpoint:
  - images: 50MB (high-res mockups, Figma exports)
  - PDFs: 50MB (design specs, presentations)
  - zips: 200MB (asset bundles, source files)
  - docs: 50MB (Word, Excel)
- `agencyLogo` endpoint: images (8MB), admin only

**File: `src/lib/uploadthing.ts`**
Export `UploadButton` and `UploadDropzone` components.

---

## Phase 5.5: Messaging Strategy (MVP)

For MVP, use **polling** (simple, no WebSocket infrastructure needed):

```typescript
// Client component with React Query or SWR
const { data: messages } = useQuery({
  queryKey: ['messages', projectId],
  queryFn: () => fetch(`/api/messages/${projectId}`).then(r => r.json()),
  refetchInterval: 30000 // Poll every 30 seconds
})
```

Features:
- Automatic polling every 30 seconds when tab is active
- Unread count badge updates in real-time
- Simple API route, no WebSocket complexity

**Phase 2 Upgrade Path:** Server-Sent Events or Pusher for true real-time.

---

## Phase 6: TypeScript Types

**File: `src/lib/types.ts`**
- Inferred types from Drizzle schema: `User`, `Agency`, `Client`, `Project`, `File`, `Message`, `ClientActivity`
- Insert types: `NewUser`, `NewAgency`, etc.
- Extended types with relations: `ProjectWithDetails`, `MessageWithSender`, etc.
- `UserWithProfile` - DB user + Clerk profile data
- `ClerkPublicMetadata` interface for role/agencyId/clientId

---

## Phase 7: Core Components

### Layout Components
- **Sidebar** - Navigation based on user role (admin vs client nav items)
- **Header** - User greeting + Clerk UserButton

### Placeholder Pages
- Admin: Overview, Clients, Projects, Settings
- Client: Dashboard, Projects

---

## Phase 7.5: Error Handling

**File: `src/lib/errors.ts`**

```typescript
export class AuthorizationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

**Usage in API routes:**
```typescript
try {
  const user = await requireAdmin()
  // ... business logic
} catch (error) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  console.error('Unexpected error:', error)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

---

## Phase 8: Seed Script

**File: `src/lib/db/seed.ts`**

Demo data:

**Agency:**
- "Apex Design Studio" (primary color: #3B82F6)

**Clients (4 total - including edge cases):**
1. TechCorp Industries (active) - John Smith
2. StartupX (active) - Sarah Johnson
3. RetailCo (inactive) - Mike Davis
4. DesignCo (archived) - Problem client demo

**Projects (4 total):**
1. TechCorp: "Corporate Website Redesign" (in_progress, on schedule)
2. StartupX: "Mobile App UI/UX" (review, on schedule)
3. RetailCo: "E-commerce Platform" (completed)
4. DesignCo: "Brand Refresh" (on_hold, overdue by 2 weeks, no messages in 3 weeks)

**Users:**
- 1 admin user (agency)
- 3 client users (one per active client)

**Sample Data:**
- Files for each project
- Message threads showing conversation flow
- Client activity records

> **Edge Case Demo:** DesignCo demonstrates how Sidekick handles problem clients - overdue projects, stalled communication. Useful for agency demos.

---

## Phase 9: Environment Variables

**File: `.env.example`**
```
# Environment
NODE_ENV=development

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Vercel Postgres
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# UploadThing
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Phase 10: Configuration Updates

**tailwind.config.ts** - Add UploadThing `withUt()` wrapper

**next.config.ts** - Add image domains (picsum.photos, utfs.io, img.clerk.com)

**package.json** - Add scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit generate && drizzle-kit push",
    "db:seed": "tsx src/lib/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "db:reset": "drizzle-kit drop && npm run db:push && npm run db:seed"
  }
}
```

> **`db:reset`** is useful during development to quickly wipe and reseed demo data.

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `src/lib/db/schema.ts` | Database schema with indexes (create first) |
| `src/middleware.ts` | Route protection |
| `src/app/api/webhooks/clerk/route.ts` | User sync from Clerk |
| `src/lib/auth.ts` | Auth helper functions + `getUserWithProfile()` |
| `src/lib/errors.ts` | Custom error classes |
| `src/app/api/uploadthing/core.ts` | File upload config (50MB/200MB limits) |
| `src/lib/db/seed.ts` | Demo data with edge cases |

---

## Verification Steps

1. **Project builds:** `npm run build` completes without errors
2. **Dev server runs:** `npm run dev` starts on localhost:3000
3. **Database:** `npm run db:push` creates tables successfully
4. **Seed data:** `npm run db:seed` populates demo data
5. **Auth flow:** Sign up/in works, redirects to correct dashboard
6. **Route protection:** Admin can't access `/dashboard/client`, vice versa
7. **Soft delete:** Verify `deleted_at` is set instead of hard delete

---

## Post-Setup: Ready for UI Integration

After this foundation:
1. Design UI in aura.build
2. Export HTML/Tailwind components
3. Replace placeholder pages with exported components
4. Wire up data fetching with existing queries

---

## Command Summary

```bash
# Initial setup
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install dependencies
npm install @clerk/nextjs drizzle-orm @vercel/postgres uploadthing @uploadthing/react zod svix date-fns clsx tailwind-merge class-variance-authority lucide-react
npm install -D drizzle-kit tsx

# Initialize shadcn and add components
npx shadcn@latest init
npx shadcn@latest add button card input badge avatar dropdown-menu dialog textarea

# Database commands
npm run db:generate    # Generate migrations
npm run db:push        # Push schema to database
npm run db:seed        # Seed demo data
npm run db:studio      # Open Drizzle Studio
npm run db:reset       # Drop, recreate, and reseed (dev only)

# Development
npm run dev

# Production build
npm run build
```

---

## Revision History

- **v2** - Production improvements:
  - Simplified user schema (Clerk as source of truth for profile data)
  - Increased file upload limits (50MB/200MB for design files)
  - Added database indexes for performance
  - Added soft delete support (deleted_at field)
  - Added client_activity table for engagement metrics
  - Added error handling patterns
  - Added messaging strategy (polling for MVP)
  - Added edge case seed data (problem client demo)
  - Added db:reset script
