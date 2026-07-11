-- Run this in your Supabase SQL Editor
ALTER TABLE public.divisions 
ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT,
ADD COLUMN IF NOT EXISTS line_target_id TEXT;
