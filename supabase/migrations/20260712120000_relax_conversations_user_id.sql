-- Added at scaffold time (2026-07-12). Migration 20250814114730 set
-- conversations.user_id NOT NULL, but the log edge function inserts visitor
-- turns via the service role WITHOUT a user_id (anonymous visitors have no
-- auth user). On the reference project the constraint had been relaxed outside
-- the migrations. Align the schema with the runtime code.
ALTER TABLE public.conversations
ALTER COLUMN user_id DROP NOT NULL;
