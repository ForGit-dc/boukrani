-- Enable required extensions for scheduling HTTP calls
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- NOTE (scaffold, 2026-07-12): the original template migration scheduled a
-- pg_cron job 'daily-rollup-hourly' posting hourly to the daily-rollup edge
-- function. That function does not exist in this repo, so the job was removed
-- at scaffold time (operator-approved). Only the extension enables are kept.
