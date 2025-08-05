
-- user_positions tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.user_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  s INTEGER NOT NULL,
  placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  has_shield BOOLEAN DEFAULT false,
  CONSTRAINT valid_hex_coordinates CHECK (q + r + s = 0)
);

-- RLS politikalarını etkinleştir
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;

-- RLS politikalarını oluştur (eğer yoksa)
DROP POLICY IF EXISTS "Users can view all positions" ON public.user_positions;
CREATE POLICY "Users can view all positions" 
  ON public.user_positions 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own position" ON public.user_positions;
CREATE POLICY "Users can insert their own position" 
  ON public.user_positions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own position" ON public.user_positions;
CREATE POLICY "Users can update their own position" 
  ON public.user_positions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own position" ON public.user_positions;
CREATE POLICY "Users can delete their own position" 
  ON public.user_positions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Yeni kullanıcı için trigger'ları düzelt
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_resources ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tutorial ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_position ON auth.users;

-- Trigger'ları yeniden oluştur
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_resources
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_resources();

CREATE TRIGGER on_auth_user_created_tutorial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tutorial();

CREATE TRIGGER on_auth_user_created_position
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_random_position_to_user();
