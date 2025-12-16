-- Migration: Add iTunes URLs to podcasts table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.podcasts
ADD COLUMN IF NOT EXISTS itunes_url text,
ADD COLUMN IF NOT EXISTS artist_url text;
