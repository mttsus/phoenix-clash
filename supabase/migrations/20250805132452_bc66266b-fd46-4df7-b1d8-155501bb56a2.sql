
-- Create user_resources table to store resources persistently
CREATE TABLE IF NOT EXISTS public.user_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wood INTEGER NOT NULL DEFAULT 1000000,
  gold INTEGER NOT NULL DEFAULT 1000000,
  iron INTEGER NOT NULL DEFAULT 1000000,
  wheat INTEGER NOT NULL DEFAULT 1000000,
  stone INTEGER NOT NULL DEFAULT 1000000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own resources" 
  ON public.user_resources 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources" 
  ON public.user_resources 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources" 
  ON public.user_resources 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Insert 1 million resources for all existing users
INSERT INTO public.user_resources (user_id, wood, gold, iron, wheat, stone)
SELECT id, 1000000, 1000000, 1000000, 1000000, 1000000
FROM auth.users
ON CONFLICT (user_id) 
DO UPDATE SET 
  wood = 1000000,
  gold = 1000000,
  iron = 1000000,
  wheat = 1000000,
  stone = 1000000,
  updated_at = NOW();

-- Create trigger to automatically give new users 1 million resources
CREATE OR REPLACE FUNCTION public.handle_new_user_resources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_resources (user_id, wood, gold, iron, wheat, stone)
  VALUES (NEW.id, 1000000, 1000000, 1000000, 1000000, 1000000);
  RETURN NEW;
END;
$$;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_resources ON auth.users;
CREATE TRIGGER on_auth_user_created_resources
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_resources();
