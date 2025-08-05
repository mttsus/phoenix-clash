
-- Geçici olarak tüm trigger'ları devre dışı bırakalım
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_resources ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tutorial ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_position ON auth.users;

-- Temel kayıt işleminin çalışıp çalışmadığını test edelim
-- Trigger'lar olmadan sadece auth sistemi çalışacak
