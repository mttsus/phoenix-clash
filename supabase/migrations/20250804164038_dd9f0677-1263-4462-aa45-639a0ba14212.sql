
-- Kayıt olan kullanıcılara otomatik rastgele pozisyon atayan fonksiyon
CREATE OR REPLACE FUNCTION assign_random_position_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    random_q INTEGER;
    random_r INTEGER;
    random_s INTEGER;
    position_exists BOOLEAN := TRUE;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- Rastgele pozisyon bulana kadar dene
    WHILE position_exists AND attempt_count < max_attempts LOOP
        -- -6 ile 6 arasında rastgele koordinatlar oluştur (hex grid için uygun)
        random_q := floor(random() * 13) - 6;
        random_r := floor(random() * 13) - 6;
        random_s := -random_q - random_r;
        
        -- Koordinatların geçerli hex grid kurallarına uyup uymadığını kontrol et
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
        VALUES (NEW.id, random_q, random_r, random_s);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Yeni kullanıcı oluşturulduğunda tetiklenecek trigger
DROP TRIGGER IF EXISTS assign_position_on_user_creation ON profiles;
CREATE TRIGGER assign_position_on_user_creation
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_random_position_to_user();

-- Mevcut kullanıcıları rastgele pozisyonlara yerleştir
DO $$
DECLARE
    user_record RECORD;
    random_q INTEGER;
    random_r INTEGER;
    random_s INTEGER;
    position_exists BOOLEAN := TRUE;
    attempt_count INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    -- user_positions tablosunda olmayan tüm kullanıcılar için
    FOR user_record IN 
        SELECT p.id 
        FROM profiles p 
        LEFT JOIN user_positions up ON p.id = up.user_id 
        WHERE up.user_id IS NULL
    LOOP
        position_exists := TRUE;
        attempt_count := 0;
        
        -- Her kullanıcı için rastgele pozisyon bul
        WHILE position_exists AND attempt_count < max_attempts LOOP
            random_q := floor(random() * 13) - 6;
            random_r := floor(random() * 13) - 6;
            random_s := -random_q - random_r;
            
            -- Koordinatların geçerli olup olmadığını kontrol et
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
        END IF;
    END LOOP;
END;
$$;
