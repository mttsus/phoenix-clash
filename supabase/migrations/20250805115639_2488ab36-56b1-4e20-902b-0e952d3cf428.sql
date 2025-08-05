
-- Create a table for PvP battle logs
CREATE TABLE public.pvp_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_id UUID REFERENCES auth.users NOT NULL,
  defender_id UUID NOT NULL,
  army_count INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL,
  victory BOOLEAN NOT NULL DEFAULT false,
  battle_log TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.pvp_battles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to insert their own battle logs
CREATE POLICY "Users can create their own battle logs" 
  ON public.pvp_battles 
  FOR INSERT 
  WITH CHECK (auth.uid() = attacker_id);

-- Create policy for users to view battle logs they're involved in
CREATE POLICY "Users can view battles they participated in" 
  ON public.pvp_battles 
  FOR SELECT 
  USING (auth.uid() = attacker_id OR auth.uid()::text = defender_id::text);
