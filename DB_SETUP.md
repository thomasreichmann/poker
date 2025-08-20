# Database Setup Guide

This project supports running database commands against both local and production Supabase instances.

## Environment Configuration

### Local Development

Create a `.env.local` file in the project root:

```bash
# Local Development Environment
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Local Supabase settings
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_here
```

### Production Environment

For production database operations, add these variables to your `.env.local` file:

```bash
# Production Supabase Database URL
# Get this from: Supabase Dashboard > Settings > Database > Connection string > URI
PROD_DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Or alternatively, you can set DATABASE_URL when running production commands
# DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Getting Your Production Database URL

1. Go to your Supabase Dashboard
2. Navigate to Settings > Database
3. Under "Connection string", copy the URI format
4. Replace `[password]` with your actual database password
5. Replace `[project-ref]` with your project reference

The URL should look like:

```
postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

## Available Commands

### Local Database Operations (default)

```bash
pnpm db:push       # Push schema changes to local database
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Run migrations on local database
pnpm db:studio     # Open Drizzle Studio for local database
```

### Production Database Operations

```bash
pnpm db:push:prod     # Push schema changes to production database
pnpm db:generate:prod # Generate migration files for production
pnpm db:migrate:prod  # Run migrations on production database
pnpm db:studio:prod   # Open Drizzle Studio for production database
```

## Environment Variables Priority

The configuration automatically detects which environment you're targeting:

- **Local commands**: Uses `DATABASE_URL` from `.env.local`
- **Production commands**: Uses `PROD_DATABASE_URL` first, then falls back to `DATABASE_URL`

## Security Notes

- Never commit `.env.local` to version control
- Your production database password should be kept secure
- Consider using Supabase's connection pooling URL for production operations
- The production URL includes your database password, so handle it carefully

## Troubleshooting

If you get a "DATABASE_URL is not set" error:

1. Ensure your `.env.local` file exists and contains the correct variables
2. For production commands, make sure `PROD_DATABASE_URL` is set
3. Restart your terminal after adding new environment variables
