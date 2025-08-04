
-- user_positions tablosuna realtime desteği ekle
ALTER TABLE user_positions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE user_positions;

-- Güvenlik politikalarını kontrol et ve gerekirse güncelle
-- Tüm kullanıcılar diğer kullanıcıların pozisyonlarını görebilmeli
DROP POLICY IF EXISTS "Users can view all positions" ON user_positions;
CREATE POLICY "Users can view all positions" 
    ON user_positions 
    FOR SELECT 
    USING (true);

-- Kullanıcılar sadece kendi pozisyonlarını güncelleyebilmeli
DROP POLICY IF EXISTS "Users can update their own position" ON user_positions;
CREATE POLICY "Users can update their own position" 
    ON user_positions 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi pozisyonlarını silebilmeli
DROP POLICY IF EXISTS "Users can delete their own position" ON user_positions;
CREATE POLICY "Users can delete their own position" 
    ON user_positions 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Kullanıcılar sadece kendi pozisyonlarını ekleyebilmeli
DROP POLICY IF EXISTS "Users can insert their own position" ON user_positions;
CREATE POLICY "Users can insert their own position" 
    ON user_positions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
