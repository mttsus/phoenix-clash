
-- Önce mevcut trigger'ları tamamen kaldıralım
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_resources ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tutorial ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_position ON auth.users;

-- Fonksiyonları da kaldıralım
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_resources();
DROP FUNCTION IF EXISTS public.handle_new_user_tutorial();
DROP FUNCTION IF EXISTS public.assign_random_position_to_user();

-- Tutorial step enum'unu da kaldırıp yeniden oluşturalım
DROP TYPE IF EXISTS tutorial_step CASCADE;
CREATE TYPE tutorial_step AS ENUM (
    'move_castle',
    'enter_castle', 
    'build_structure',
    'wait_construction',
    'upgrade_building',
    'train_army',
    'battle_enemy',
    'completed'
);

-- Şimdi fonksiyonları tek tek, sade bir şekilde oluşturalım

-- 1. Profil oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda kayıt işlemini durdurma, sadece log
    RAISE WARNING 'Profile creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Kaynak oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user_resources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_resources (user_id, wood, gold, iron, wheat, stone)
  VALUES (NEW.id, 1000000, 1000000, 1000000, 1000000, 1000000);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Resources creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Tutorial oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_tutorial_progress (
    user_id, 
    current_step, 
    tutorial_completed, 
    step_data, 
    completed_steps
  )
  VALUES (
    NEW.id, 
    'move_castle'::tutorial_step, 
    false, 
    '{}'::jsonb, 
    '{}'::text[]
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Tutorial creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Pozisyon atama fonksiyonu
CREATE OR REPLACE FUNCTION public.assign_random_position_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  random_q INTEGER;
  random_r INTEGER;
  random_s INTEGER;
BEGIN
  -- Basit rastgele pozisyon (çakışma kontrolü olmadan)
  random_q := floor(random() * 21) - 10;
  random_r := floor(random() * 21) - 10;
  random_s := -(random_q + random_r);
  
  INSERT INTO public.user_positions (user_id, q, r, s, has_shield)
  VALUES (NEW.id, random_q, random_r, random_s, false);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Position assignment failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

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
