# Dev Panel Permission Setup

The Multi-Player Testing Panel now includes a secure, server-side permission system that works in both development and production environments.

## 🔐 Security Features

- **Server-side validation**: All permissions are verified on the server
- **Role-based access**: Users must have `admin` or `dev` role
- **Secure API endpoints**: New dev-only TRPC router with permission guards
- **No client-side bypassing**: Impossible to circumvent security checks

## 🚀 Setup Instructions

### 1. Run Database Migration

Apply the migration to add user roles:

**Development:**

```bash
pnpm db:migrate
```

**Production:**

```bash
pnpm db:migrate:prod
```

This creates a `user_roles` table in the public schema with values: `user`, `admin`, `dev`.

### 2. Set Your User as Admin

**Development:**

```bash
# Replace with your actual email
pnpm set-admin your-email@example.com admin
```

**Production:**

```bash
# IMPORTANT: Use your production email (the one you login with in prod)
pnpm set-admin:prod your-email@example.com admin
```

### 3. Verify Access

1. **Login** to your app with your admin account
2. **Navigate** to any poker game page
3. **Check** if the Multi-Player Testing Panel appears in the top-right

> **Note**: The panel works in both development AND production environments!

## 👥 Role Types

- **`user`** (default): Regular users, no dev panel access
- **`dev`**: Can access dev panel and testing features
- **`admin`**: Can access dev panel + manage other users' roles

## 🛠️ Managing User Roles

### Via Script (Recommended)

**Development:**

```bash
# Set user as admin
pnpm set-admin user@example.com admin

# Set user as dev
pnpm set-admin user@example.com dev

# Remove special permissions
pnpm set-admin user@example.com user
```

**Production:**

```bash
# Set user as admin in production
pnpm set-admin:prod user@example.com admin

# Set user as dev in production
pnpm set-admin:prod user@example.com dev

# Remove special permissions in production
pnpm set-admin:prod user@example.com user
```

### Via API (Admin Only)

POST to `/api/admin/set-user-role`:

```json
{
  "targetUserId": "uuid-here",
  "role": "admin"
}
```

## 🔒 Security Architecture

### Server-Side Protection

- All dev actions go through `/trpc/dev/*` endpoints
- Each endpoint validates user role before execution
- Permission context includes user ID and role
- Database queries verify user exists and has correct role

### Client-Side Flow

1. `useDevAccess()` hook checks permissions on mount
2. Server returns `hasAccess: boolean` based on user role
3. Panel only renders if user has access
4. All actions use secure dev API endpoints

### Permission Guards

```typescript
// Every dev endpoint uses this guard
await requireDevAccess(ctx.user.id);
```

This ensures:

- User exists in database
- User has `admin` or `dev` role
- Throws error if unauthorized
- Cannot be bypassed client-side

## 📋 Dev Panel Features (Admin/Dev Only)

- **🎯 Player Control**: Control any player's actions
- **⚡ Auto-Follow**: Automatically switch to current player
- **🎮 Action Execution**: Fold, Check, Call, Raise as any player
- **🔧 Game Management**: Advance game state, Reset hands
- **💸 Betting Controls**: Quick bet sizing, All-in actions

## 🚨 Important Security Notes

1. **Production Safe**: Panel only shows for authorized users
2. **No Impersonation**: No longer uses session storage hacks
3. **Server Validation**: Every action validated server-side
4. **Audit Trail**: All dev actions are logged
5. **Role-Based**: Granular permission control

## 🌍 Production Setup

### Prerequisites

1. **Deploy your app** with the permission system changes
2. **Run migration** on production database
3. **Set admin user** using production script
4. **Verify access** by logging into production

### Migration Steps

```bash
# 1. Apply migration to production DB
pnpm db:migrate:prod

# 2. Set yourself as admin (use your production login email!)
pnpm set-admin:prod your-production-email@example.com admin

# 3. Login to production and test
# Navigate to any poker game - dev panel should appear
```

### Environment Variables

For production scripts to work, ensure you have:

```bash
# .env.local or .env.production
DATABASE_URL=your-production-database-url
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
```

### Important Notes

- ⚠️ **Use your production email**: The email you actually login with in prod
- 🔐 **Secure environment**: Scripts will use your production database
- 📊 **Test thoroughly**: Verify all dev panel features work in production
- 👥 **Limited access**: Only grant admin/dev roles to trusted team members
- 🕒 **User must exist**: Login to production first to create the user account

## 🐛 Troubleshooting

### Panel Not Showing?

1. Verify you're logged in
2. Check your user role in database
3. Ensure migration was applied
4. Check browser console for errors

### Permission Errors?

1. Verify user has `admin` or `dev` role
2. Check database connection
3. Verify TRPC router is properly registered
4. If getting "must be owner of table users" error, ensure migration was applied (creates separate user_roles table)

### Script Errors?

1. Ensure user exists (must login first to create account)
2. Check database connection
3. Verify email spelling

## 📚 Technical Details

### New Database Schema

```sql
-- Creates user_roles table in public schema (avoids auth schema permissions)
CREATE TABLE "user_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'user' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "user_roles_user_id_unique" ON "user_roles" ("user_id");
CREATE INDEX "idx_user_roles_role" ON "user_roles" ("role");
ALTER TABLE "user_roles" ADD CONSTRAINT "check_user_role"
  CHECK ("role" IN ('user', 'admin', 'dev'));
```

### Permission System Files

- `src/lib/permissions.ts` - Permission utilities
- `src/trpc/routers/dev.ts` - Secure dev API
- `src/hooks/useDevAccess.ts` - Client permission hook
- `scripts/set-admin.ts` - Role management script
- `src/app/api/admin/set-user-role/route.ts` - REST API for role changes

The system is now production-ready and secure! 🎉
