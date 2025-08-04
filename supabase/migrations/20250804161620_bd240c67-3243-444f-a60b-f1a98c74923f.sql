
-- Multiplayer oyun odaları için tablo
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_players INTEGER DEFAULT 2,
  current_players INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oyuncuların oyun odalarına katılımı
CREATE TABLE game_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name VARCHAR(50) NOT NULL,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oyun içi kule sistemi
CREATE TABLE game_towers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  tower_type VARCHAR(20) NOT NULL, -- basic, cannon, magic
  health INTEGER NOT NULL DEFAULT 1000,
  max_health INTEGER NOT NULL DEFAULT 1000,
  damage INTEGER NOT NULL DEFAULT 100,
  range_radius FLOAT NOT NULL DEFAULT 150,
  is_destroyed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mancınık sistemi
CREATE TABLE game_catapults (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  health INTEGER NOT NULL DEFAULT 1500,
  max_health INTEGER NOT NULL DEFAULT 1500,
  damage INTEGER NOT NULL DEFAULT 300,
  range_radius FLOAT NOT NULL DEFAULT 400,
  reload_time INTEGER NOT NULL DEFAULT 5, -- saniye
  last_shot_at TIMESTAMP WITH TIME ZONE,
  is_destroyed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oyun içi birimler/askerler
CREATE TABLE game_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  unit_type VARCHAR(20) NOT NULL, -- minion, champion, siege
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  target_x FLOAT,
  target_y FLOAT,
  health INTEGER NOT NULL,
  max_health INTEGER NOT NULL,
  damage INTEGER NOT NULL,
  speed FLOAT NOT NULL DEFAULT 50,
  is_alive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gerçek zamanlı oyun olayları
CREATE TABLE game_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL, -- tower_destroyed, unit_spawned, catapult_shot, game_ended
  team INTEGER,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oyun sonuçları
CREATE TABLE game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  winner_team INTEGER CHECK (winner_team IN (1, 2)),
  duration_seconds INTEGER,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Realtime için gerekli ayarlar
ALTER TABLE game_rooms REPLICA IDENTITY FULL;
ALTER TABLE game_participants REPLICA IDENTITY FULL;
ALTER TABLE game_towers REPLICA IDENTITY FULL;
ALTER TABLE game_catapults REPLICA IDENTITY FULL;
ALTER TABLE game_units REPLICA IDENTITY FULL;
ALTER TABLE game_events REPLICA IDENTITY FULL;

-- Realtime publikasyonlarına ekleme
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE game_towers;
ALTER PUBLICATION supabase_realtime ADD TABLE game_catapults;
ALTER PUBLICATION supabase_realtime ADD TABLE game_units;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;

-- Trigger'lar updated_at için
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_rooms_updated_at BEFORE UPDATE ON game_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_units_updated_at BEFORE UPDATE ON game_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
