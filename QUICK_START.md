# Quick Start Guide

Get Sidekick running in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- Clerk account (free tier works)
- UploadThing account (free tier works)

## Step-by-Step Setup

### 1. Install Dependencies (1 min)

```bash
npm install
```

### 2. Create Clerk Application (2 mins)

1. Go to https://dashboard.clerk.com
2. Click "Add application"
3. Name it "Sidekick Dev"
4. Enable email/password auth
5. Copy your keys

### 3. Set Up Vercel Postgres (2 mins)

1. Go to https://vercel.com
2. Create new project → Import your Sidekick repo
3. Go to Storage → Create Database → Postgres
4. Copy connection strings

### 4. Set Up UploadThing (1 min)

1. Go to https://uploadthing.com
2. Sign up with GitHub
3. Create new app
4. Copy secret and app ID

### 5. Configure Environment (1 min)

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Vercel Postgres
POSTGRES_URL=<paste-from-vercel>
POSTGRES_URL_NON_POOLING=<paste-from-vercel>

# UploadThing
UPLOADTHING_SECRET=sk_live_xxxxx
UPLOADTHING_APP_ID=xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 6. Push Database Schema (30 secs)

```bash
npm run db:push
```

You should see: "✓ Database schema pushed successfully"

### 7. Seed Demo Data (30 secs)

```bash
npm run db:seed
```

You should see:
- ✓ Created agency: Apex Design Studio
- ✓ Created 4 clients
- ✓ Created 4 projects
- ✓ Created demo files and messages

### 8. Run Dev Server (10 secs)

```bash
npm run dev
```

Open http://localhost:3000

### 9. Create Admin User (1 min)

1. Click "Sign Up"
2. Create account with your email
3. Verify email
4. You'll be redirected to `/dashboard`

**IMPORTANT:** New users are `client` role by default. To make yourself an admin:

#### Option A: Via Clerk Dashboard (Recommended)
1. Go to Clerk Dashboard → Users
2. Click on your user
3. Go to "Metadata" tab
4. Add to public metadata:
```json
{
  "role": "admin"
}
```
5. Save
6. Refresh your app

#### Option B: Directly in Database
```bash
npm run db:studio
```
1. Open Drizzle Studio (link in terminal)
2. Go to "users" table
3. Find your user (by clerk_id)
4. Change `role` to `"admin"`
5. Save

### 10. Verify Everything Works

- ✅ Visit `/dashboard/admin` - should see admin dashboard
- ✅ Check sidebar - should see admin nav items
- ✅ View placeholder pages (Clients, Projects, Settings)

## What's Next?

### Option 1: Test with Demo Data
The seed script created demo users, but they don't have Clerk accounts. To test:
1. Keep using your admin account
2. Explore the dashboard
3. Check Drizzle Studio to see demo data: `npm run db:studio`

### Option 2: Create Client Users
1. Update seed script to use real Clerk IDs
2. Or create new clients in Clerk with role="client" metadata

### Option 3: Start Building UI
1. Open aura.build
2. Design your dashboard
3. Export and integrate with this foundation

## Common Issues

### "Missing publishableKey"
- Make sure `.env.local` exists with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

### "Database connection failed"
- Check POSTGRES_URL is correct
- Make sure Vercel Postgres database is created

### "Still seeing client dashboard as admin"
- Clear cookies and re-login
- Verify Clerk metadata has `"role": "admin"`
- Check middleware is working (should redirect admins to /dashboard/admin)

### "Build fails"
- This is expected without real Clerk keys
- Build will work once you add real keys from step 2

## Database Management

### View Data
```bash
npm run db:studio
```
Opens Drizzle Studio at http://localhost:4983

### Reset Everything
```bash
npm run db:reset
```
**WARNING:** Deletes all data and reseeds

### Add More Demo Data
Edit `src/lib/db/seed.ts` and run:
```bash
npm run db:seed
```

## Ready to Build!

Your foundation is ready. See `README.md` for full documentation and `IMPLEMENTATION_PLAN.md` for technical details.

Happy coding! 🚀
