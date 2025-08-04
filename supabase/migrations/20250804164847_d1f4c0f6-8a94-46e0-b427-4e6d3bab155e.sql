
-- Önce mevcut kullanıcıları otomatik yerleştiren fonksiyonu güncelle
CREATE OR REPLACE FUNCTION public.place_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
    random_q INTEGER;
    random_r INTEGER;
    random_s INTEGER;
    position_exists BOOLEAN := TRUE;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Pozisyonu olmayan tüm kullanıcıları bul
    FOR user_record IN 
        SELECT p.id, p.username 
        FROM profiles p 
        LEFT JOIN user_positions up ON p.id = up.user_id 
        WHERE up.user_id IS NULL
    LOOP
        position_exists := TRUE;
        attempt_count := 0;
        
        -- Her kullanıcı için boş pozisyon bul
        WHILE position_exists AND attempt_count < max_attempts LOOP
            random_q := floor(random() * 13) - 6;
            random_r := floor(random() * 13) - 6;
            random_s := -random_q - random_r;
            
            -- Hex grid kurallarına uygunluk kontrolü
            IF ABS(random_q) <= 6 AND ABS(random_r) <= 6 AND ABS(random_s) <= 6 THEN
                -- Bu pozisyonda başka kullanıcı var mı kontrol et
                SELECT EXISTS(
                    SELECT 1 FROM user_positions 
                    WHERE q = random_q AND r = random_r AND s = random_s
                ) INTO position_exists;
                
                -- Merkez kaleyi (0,0,0) atla
                IF random_q = 0 AND random_r = 0 AND random_s = 0 THEN
                    position_exists := TRUE;
                END IF;
            END IF;
            
            attempt_count := attempt_count + 1;
        END LOOP;
        
        -- Uygun pozisyon bulunduysa kullanıcıyı yerleştir
        IF NOT position_exists AND attempt_count < max_attempts THEN
            INSERT INTO user_positions (user_id, q, r, s)
            VALUES (user_record.id, random_q, random_r, random_s);
            
            RAISE NOTICE 'User % placed at position (%, %, %)', user_record.username, random_q, random_r, random_s;
        ELSE
            RAISE NOTICE 'Could not find position for user %', user_record.username;
        END IF;
    END LOOP;
END;
$function$;

-- Kale taşıma fonksiyonu
CREATE OR REPLACE FUNCTION public.move_castle(
    target_q INTEGER,
    target_r INTEGER,
    target_s INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    position_taken BOOLEAN;
    current_user_id UUID;
BEGIN
    -- Mevcut kullanıcıyı al
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Hex grid koordinat kontrolü
    IF ABS(target_q) > 6 OR ABS(target_r) > 6 OR ABS(target_s) > 6 OR (target_q + target_r + target_s) != 0 THEN
        RAISE EXCEPTION 'Invalid hex coordinates';
    END IF;
    
    -- Merkez kale kontrolü (0,0,0)
    IF target_q = 0 AND target_r = 0 AND target_s = 0 THEN
        RAISE EXCEPTION 'Cannot place castle at center position';
    END IF;
    
    -- Pozisyon boş mu kontrol et
    SELECT EXISTS(
        SELECT 1 FROM user_positions 
        WHERE q = target_q AND r = target_r AND s = target_s
    ) INTO position_taken;
    
    IF position_taken THEN
        RAISE EXCEPTION 'Position already occupied';
    END IF;
    
    -- Kullanıcının kalemini güncelle veya yeni pozisyon ekle
    INSERT INTO user_positions (user_id, q, r, s)
    VALUES (current_user_id, target_q, target_r, target_s)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        q = target_q, 
        r = target_r, 
        s = target_s, 
        placed_at = NOW();
    
    RETURN TRUE;
END;
$function$;

-- Mevcut kullanıcıları yerleştir
SELECT public.place_existing_users();
