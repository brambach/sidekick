# Onboarding System Documentation

## Overview

The Digital Directions Portal now has a **professional invite-only onboarding system** for both team members and clients.

## Key Features

### ✅ Invite-Only Access
- Public signup is disabled
- All users must be invited by an admin
- Professional "invitation-only" page for unauthorized signup attempts

### ✅ Admin Team Invites
- "Invite Team Member" button on admin dashboard
- Sends email with 7-day expiring invite link
- Automatically assigns admin role
- Syncs role to both database and Clerk

### ✅ Client Onboarding
- "Add Client" dialog has checkbox to send invite
- Creates client + optionally sends invite
- Invite links client to their company automatically
- Client gets portal access on signup

### ✅ Secure Token System
- Cryptographically secure invite tokens
- 7-day expiration
- One-time use (marked as "accepted" after signup)
- Validates email matches invite

### ✅ Role Synchronization
- **Database is source of truth** for roles
- Auto-syncs role to Clerk metadata on signup
- Middleware reads from Clerk for fast routing
- No manual role management needed

---

## How It Works

### For Team Members (Admins)

**1. Admin Invites Team Member:**
```
Admin Dashboard → "Invite Team Member" button
→ Enter email → Send
→ Invite email sent with signup link
```

**2. Team Member Signs Up:**
```
Click email link → /invite/[token]
→ Validates token
→ Shows Clerk signup form
→ After signup: auto-assigned admin role
→ Redirected to admin dashboard
```

**3. What Happens Behind the Scenes:**
- Invite validated against database
- User created in Clerk
- User record created in database with role="admin"
- Role synced to Clerk public metadata
- Invite marked as "accepted"

---

### For Clients

**1. Admin Creates Client:**
```
Clients page → "Add Client" button
→ Fill in company details
→ Check "Send portal invite email"
→ Create Client
```

**2. Client Signs Up:**
```
Click email link → /invite/[token]
→ Validates token (shows company name)
→ Shows Clerk signup form
→ After signup: auto-assigned client role + linked to company
→ Redirected to client dashboard
```

**3. What Happens Behind the Scenes:**
- Client record created in database
- Invite created with role="client" + clientId
- Invite email sent with company context
- On signup: user linked to client company
- Role synced to Clerk
- Client sees only their projects/tickets

---

## Database Schema

### Invites Table

```sql
invites {
  id: uuid (primary key)
  email: string (who is being invited)
  token: string (secure random token)
  role: "admin" | "client"
  status: "pending" | "accepted" | "expired"
  clientId: uuid (for client invites, null for admin)
  invitedBy: uuid (admin who sent invite)
  expiresAt: timestamp (7 days from creation)
  acceptedAt: timestamp (when accepted)
  createdAt: timestamp
}
```

---

## API Routes

### POST /api/invites
**Create new invite (admin only)**

Request:
```json
{
  "email": "user@example.com",
  "role": "admin" | "client",
  "clientId": "uuid" // required for client invites
}
```

Response:
```json
{
  "message": "Invite sent successfully",
  "invite": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "client",
    "expiresAt": "2026-01-19T..."
  }
}
```

### POST /api/invites/validate
**Validate invite token (public)**

Request:
```json
{
  "token": "abc123..."
}
```

Response:
```json
{
  "valid": true,
  "invite": {
    "email": "user@example.com",
    "role": "client",
    "clientName": "Acme Corp" // if client invite
  }
}
```

### POST /api/invites/accept
**Accept invite after Clerk signup (public)**

Request:
```json
{
  "token": "abc123..."
}
```

Response:
```json
{
  "success": true,
  "role": "client",
  "message": "Invite accepted successfully"
}
```

### GET /api/invites
**List pending invites (admin only)**

Response:
```json
{
  "invites": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "client",
      "status": "pending",
      "expiresAt": "2026-01-19T...",
      "clientName": "Acme Corp"
    }
  ]
}
```

---

## Email Templates

### Team Member Invite Email
- Subject: "You've been invited to join Digital Directions"
- Purple-branded with DD logo
- "Accept Invite & Sign Up" button
- Expires in 7 days notice

### Client Invite Email
- Subject: "Welcome to the Digital Directions Portal - [Company Name]"
- Shows company name prominently
- Explains portal access (projects, files, tickets)
- "Accept Invite & Sign Up" button
- Expires in 7 days notice

---

## User Experience Flow

### Invite-Only Signup Page
If someone tries to access `/sign-up` directly, they see:

```
┌─────────────────────────────────┐
│   [DD Logo]                     │
│   [Envelope Icon]               │
│                                 │
│   Invite Only                   │
│   Portal is invitation-only.    │
│   You'll need an invite.        │
│                                 │
│   [For Team Members box]        │
│   [For Clients box]             │
│                                 │
│   [Sign In button]              │
└─────────────────────────────────┘
```

### Invite Signup Page
When user clicks invite link (`/invite/[token]`):

```
┌─────────────────────────────────┐
│   [DD Logo]                     │
│                                 │
│   Welcome to Digital Directions!│
│                                 │
│   You've been invited as:       │
│   [Role badge]                  │
│   For: [Company Name]           │
│   Email: user@example.com       │
│                                 │
│   [Clerk Signup Form]           │
│                                 │
│   Already have account? Sign in │
└─────────────────────────────────┘
```

---

## Security Features

1. **Cryptographically Secure Tokens**
   - 32-byte random tokens (64 hex characters)
   - Impossible to guess

2. **Email Validation**
   - Invite shows intended email
   - Can only be used with that email

3. **Expiration**
   - 7-day expiration
   - Prevents indefinite access

4. **One-Time Use**
   - Marked as "accepted" after use
   - Can't be reused

5. **Role Assignment**
   - Role assigned by admin during invite
   - User can't choose their own role
   - Synced to both DB and Clerk

6. **Access Control**
   - Only admins can create invites
   - Clients can only access their own data
   - Middleware enforces role-based routing

---

## Testing the System

### Test Admin Invite

1. Make yourself admin first:
   ```bash
   npm run make-admin your-email@example.com
   ```

2. Sign in as admin
3. Go to Admin Dashboard
4. Click "Invite Team Member"
5. Enter test email
6. Check email for invite link
7. Open invite link → should see signup form
8. Sign up → should land on admin dashboard

### Test Client Invite

1. Go to Clients page
2. Click "Add Client"
3. Fill in company details
4. Check "Send portal invite email"
5. Create client
6. Check email for invite
7. Open invite link → should show company name
8. Sign up → should land on client dashboard
9. Verify you see only that client's projects

---

## Configuration

### Required Environment Variables

```env
# For email invites (optional but recommended)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=Digital Directions <notifications@yourdomain.com>

# Already configured
CLERK_SECRET_KEY=sk_test_xxxxx
POSTGRES_URL=postgresql://xxxxx
```

### Without Email Configured

If Resend is not configured:
- Invites will still be created in database
- No email will be sent (logged to console)
- You can manually share invite links: `http://localhost:3000/invite/[token]`
- Production: Emails are critical for user experience

---

## Troubleshooting

### "Invalid invite token"
- Token expired (7 days)
- Token already used
- Token doesn't exist
- Check invites table in database

### User created but wrong role
- Check invite table - what role was it created with?
- Check users table - what role is stored?
- Check Clerk metadata - does it match database?
- Re-sync: Update database role, user signs out/in

### Invite email not received
- Check Resend configuration
- Check console logs for errors
- Verify EMAIL_FROM is verified in Resend
- Check spam folder

### Can't create invites
- Must be admin
- Check users table - is role="admin"?
- Check Clerk metadata - does it say admin?
- Use make-admin script if needed

---

## Future Enhancements

Potential features to add:

1. **Bulk Invites**
   - Upload CSV of emails
   - Send multiple invites at once

2. **Invite Management**
   - View all pending invites
   - Cancel/resend invites
   - Change expiration dates

3. **Custom Expiration**
   - Let admin choose: 1 day, 7 days, 30 days, never
   - Useful for different scenarios

4. **Invite Templates**
   - Custom email templates per client
   - Branded emails with client logo

5. **Auto-Expire Old Invites**
   - Background job to mark expired invites
   - Clean up old tokens

6. **Invite Analytics**
   - Track invite acceptance rate
   - Time to signup
   - Who invites the most

---

## Summary

Your portal now has a **professional, secure, invite-only onboarding system** that:

✅ Prevents unauthorized access
✅ Makes team onboarding one-click easy
✅ Automatically links clients to their companies
✅ Syncs roles between database and Clerk
✅ Sends beautiful branded invite emails
✅ Handles expiration and security

**You're ready for production!** 🚀
