
-- Create user_tutorial_progress table to track tutorial completion
CREATE TABLE public.user_tutorial_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_steps TEXT[] DEFAULT '{}',
  current_step TEXT,
  tutorial_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user_tutorial_progress
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_tutorial_progress
CREATE POLICY "Users can view their own tutorial progress" 
  ON public.user_tutorial_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutorial progress" 
  ON public.user_tutorial_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutorial progress" 
  ON public.user_tutorial_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function to add tutorial rewards
CREATE OR REPLACE FUNCTION public.add_tutorial_reward(reward_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_resources
  SET 
    wood = wood + reward_amount,
    gold = gold + reward_amount,
    iron = iron + reward_amount,
    wheat = wheat + reward_amount,
    stone = stone + reward_amount,
    updated_at = NOW()
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- Add unique constraint to prevent duplicate tutorial progress records per user
ALTER TABLE public.user_tutorial_progress ADD CONSTRAINT unique_user_tutorial UNIQUE (user_id);
