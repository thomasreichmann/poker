-- Create user_roles table in public schema (not auth schema)
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index on user_id to ensure one role per user
CREATE UNIQUE INDEX IF NOT EXISTS "user_roles_user_id_unique" ON "user_roles" ("user_id");

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS "idx_user_roles_role" ON "user_roles" ("role");

-- Add constraint to ensure only valid roles are used
ALTER TABLE "user_roles" ADD CONSTRAINT "check_user_role" 
CHECK ("role" IN ('user', 'admin', 'dev'));