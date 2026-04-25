-- Migration 007: Add phone contact fields to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number  TEXT;

-- whatsapp_number should be stored in international format, e.g. +9661234567890
-- Both columns are nullable — not all team members may have these filled in.
