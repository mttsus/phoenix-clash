
-- Tutorial progress tablosunu genişletelim
ALTER TABLE user_tutorial_progress 
ADD COLUMN IF NOT EXISTS step_data JSONB DEFAULT '{}';

-- Tutorial steps için enum type oluşturalım
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

-- Current step column'ını enum type'a çevirelim
ALTER TABLE user_tutorial_progress 
ALTER COLUMN current_step TYPE tutorial_step USING current_step::tutorial_step;

-- Tutorial completed olmayan kullanıcıları move_castle step'ine ayarlayalım
UPDATE user_tutorial_progress 
SET current_step = 'move_castle'::tutorial_step,
    tutorial_completed = false
WHERE tutorial_completed IS NULL OR tutorial_completed = false;

-- Yeni kullanıcılar için trigger fonksiyonunu güncelleyelim
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_tutorial_progress (user_id, current_step, tutorial_completed, step_data)
  VALUES (NEW.id, 'move_castle'::tutorial_step, false, '{}');
  RETURN NEW;
END;
$function$;

-- Trigger'ı güncelle
DROP TRIGGER IF EXISTS on_auth_user_created_tutorial ON auth.users;
CREATE TRIGGER on_auth_user_created_tutorial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_tutorial();

-- Tutorial step'ini güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION public.update_tutorial_step(new_step tutorial_step, step_data_update JSONB DEFAULT '{}')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.user_tutorial_progress
  SET 
    current_step = new_step,
    step_data = step_data || step_data_update,
    completed_steps = array_append(completed_steps, current_step::text),
    updated_at = NOW()
  WHERE user_id = auth.uid();
  
  -- Eğer completed step'ine geçiyorsa tutorial'ı bitmiş say
  IF new_step = 'completed' THEN
    UPDATE public.user_tutorial_progress
    SET tutorial_completed = true
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Tutorial tamamlama ödülü fonksiyonu
CREATE OR REPLACE FUNCTION public.complete_tutorial_step_reward()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Her step tamamlandığında 100,000 kaynak ver
  UPDATE public.user_resources
  SET 
    wood = wood + 100000,
    gold = gold + 100000,
    iron = iron + 100000,
    wheat = wheat + 100000,
    stone = stone + 100000,
    updated_at = NOW()
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$function$;
