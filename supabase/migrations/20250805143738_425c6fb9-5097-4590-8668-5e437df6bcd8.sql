
-- Önce mevcut trigger fonksiyonlarını kontrol edelim ve eksik olanları oluşturalım

-- handle_new_user fonksiyonunu kontrol et/oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- handle_new_user_resources fonksiyonunu kontrol et/oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user_resources()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_resources (user_id, wood, gold, iron, wheat, stone)
  VALUES (NEW.id, 1000000, 1000000, 1000000, 1000000, 1000000);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tutorial step enum'unu kontrol et/oluştur
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- handle_new_user_tutorial fonksiyonunu kontrol et/oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_tutorial_progress (user_id, current_step, tutorial_completed, step_data, completed_steps)
  VALUES (NEW.id, 'move_castle'::tutorial_step, false, '{}', '{}');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- assign_random_position_to_user fonksiyonunu kontrol et/oluştur
CREATE OR REPLACE FUNCTION public.assign_random_position_to_user()
RETURNS TRIGGER AS $$
DECLARE
  random_q INTEGER;
  random_r INTEGER;
  random_s INTEGER;
  max_attempts INTEGER := 100;
  attempt_count INTEGER := 0;
BEGIN
  -- Rastgele pozisyon bul (çakışma olmayacak şekilde)
  LOOP
    random_q := floor(random() * 21) - 10; -- -10 ile +10 arası
    random_r := floor(random() * 21) - 10; -- -10 ile +10 arası  
    random_s := -(random_q + random_r); -- Hex koordinat kuralı: q + r + s = 0
    
    -- Bu pozisyon boş mu kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM public.user_positions 
      WHERE q = random_q AND r = random_r AND s = random_s
    ) THEN
      EXIT; -- Boş pozisyon bulundu, döngüden çık
    END IF;
    
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      -- Eğer 100 denemede boş yer bulunamadıysa, rastgele bir yere koy
      EXIT;
    END IF;
  END LOOP;
  
  INSERT INTO public.user_positions (user_id, q, r, s)
  VALUES (NEW.id, random_q, random_r, random_s);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ları yeniden oluştur (hata durumunda)
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_resources ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tutorial ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_position ON auth.users;

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
