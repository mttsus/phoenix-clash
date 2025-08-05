
-- Add has_shield column to user_positions table
ALTER TABLE public.user_positions 
ADD COLUMN has_shield boolean DEFAULT false;
