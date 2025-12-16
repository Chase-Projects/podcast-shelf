-- Migration: Add is_favorite column to user_podcasts table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.user_podcasts
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;
