-- Enable required extensions for scheduling HTTP calls (idempotent)
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- NOTE (scaffold, 2026-07-12): the original template migration re-scheduled the
-- 'daily-rollup-hourly' pg_cron job. The daily-rollup edge function is not part
-- of this repo, so the scheduling was removed at scaffold time (operator-approved).
