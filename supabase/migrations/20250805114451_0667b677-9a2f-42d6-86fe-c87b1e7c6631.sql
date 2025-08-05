
-- Create resource regions table
CREATE TABLE public.resource_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  s INTEGER NOT NULL,
  resource_type VARCHAR NOT NULL CHECK (resource_type IN ('wood', 'gold', 'iron', 'wheat', 'stone')),
  owner_id UUID REFERENCES auth.users,
  boss_health INTEGER NOT NULL DEFAULT 2000,
  max_boss_health INTEGER NOT NULL DEFAULT 2000,
  production_bonus INTEGER NOT NULL DEFAULT 500,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique positions
  UNIQUE(q, r, s)
);

-- Enable RLS
ALTER TABLE public.resource_regions ENABLE ROW LEVEL SECURITY;

-- Allow all users to view all resource regions
CREATE POLICY "Users can view all resource regions" 
  ON public.resource_regions 
  FOR SELECT 
  USING (true);

-- Allow users to update regions they're capturing (for boss battles)
CREATE POLICY "Users can update resource regions for battles" 
  ON public.resource_regions 
  FOR UPDATE 
  USING (true);

-- Create battle logs table for tracking resource region battles
CREATE TABLE public.resource_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID REFERENCES public.resource_regions(id) NOT NULL,
  attacker_id UUID REFERENCES auth.users NOT NULL,
  army_count INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL,
  boss_health_remaining INTEGER NOT NULL,
  victory BOOLEAN NOT NULL DEFAULT false,
  battle_log TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for battle logs
ALTER TABLE public.resource_battles ENABLE ROW LEVEL SECURITY;

-- Users can view all battle logs
CREATE POLICY "Users can view all battle logs" 
  ON public.resource_battles 
  FOR SELECT 
  USING (true);

-- Users can insert their own battle logs
CREATE POLICY "Users can create battle logs" 
  ON public.resource_battles 
  FOR INSERT 
  WITH CHECK (auth.uid() = attacker_id);

-- Insert some resource regions across the map
INSERT INTO public.resource_regions (q, r, s, resource_type) VALUES
  (-4, 2, 2, 'wood'),
  (3, -1, -2, 'gold'),
  (-2, -3, 5, 'iron'),
  (4, -2, -2, 'wheat'),
  (-1, 4, -3, 'stone'),
  (2, 3, -5, 'wood'),
  (-5, 1, 4, 'gold'),
  (1, -4, 3, 'iron'),
  (-3, -1, 4, 'wheat'),
  (5, -3, -2, 'stone');
