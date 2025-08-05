
-- Create buildings table to store user buildings
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  completion_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Create policies for buildings
CREATE POLICY "Users can view their own buildings" 
  ON public.buildings 
  FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own buildings" 
  ON public.buildings 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own buildings" 
  ON public.buildings 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own buildings" 
  ON public.buildings 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_buildings_updated_at 
  BEFORE UPDATE ON public.buildings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
