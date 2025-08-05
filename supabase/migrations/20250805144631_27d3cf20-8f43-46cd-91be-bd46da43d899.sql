
-- Tutorial step enum'unu tekrar oluştur (eğer yoksa)
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

-- Güvenli profile oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      NEW.email
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Güvenli kaynak oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user_resources_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO public.user_resources (user_id, wood, gold, iron, wheat, stone)
    VALUES (NEW.id, 1000000, 1000000, 1000000, 1000000, 1000000);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Resources creation failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Güvenli tutorial oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
      '{}', 
      '{}'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Tutorial creation failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Güvenli pozisyon atama fonksiyonu
CREATE OR REPLACE FUNCTION public.assign_random_position_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  random_q INTEGER;
  random_r INTEGER;
  random_s INTEGER;
  max_attempts INTEGER := 50;
  attempt_count INTEGER := 0;
BEGIN
  BEGIN
    -- Rastgele pozisyon bul
    LOOP
      random_q := floor(random() * 13) - 6;
      random_r := floor(random() * 13) - 6;
      random_s := -(random_q + random_r);
      
      -- Bu pozisyon boş mu kontrol et
      IF NOT EXISTS (
        SELECT 1 FROM public.user_positions 
        WHERE q = random_q AND r = random_r AND s = random_s
      ) AND NOT (random_q = 0 AND random_r = 0 AND random_s = 0) THEN
        EXIT;
      END IF;
      
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        EXIT;
      END IF;
    END LOOP;
    
    INSERT INTO public.user_positions (user_id, q, r, s)
    VALUES (NEW.id, random_q, random_r, random_s);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Position creation failed for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Trigger'ları oluştur
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_safe();

CREATE TRIGGER on_auth_user_created_resources
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_resources_safe();

CREATE TRIGGER on_auth_user_created_tutorial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_tutorial_safe();

CREATE TRIGGER on_auth_user_created_position
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_tutorial_safe();
