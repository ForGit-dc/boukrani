-- Add alias column to visitors table and visitor identity columns to conversations
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS alias text NOT NULL DEFAULT '';

-- Update existing visitors with generated aliases based on session_id
UPDATE public.visitors 
SET alias = 'Guest-' || UPPER(SUBSTR(MD5(session_id), 1, 4))
WHERE alias = '';

-- Add visitor identity columns to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS visitor_alias text;