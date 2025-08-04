
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TowerSystem } from './TowerSystem';
import { CatapultSystem } from './CatapultSystem';
import { UnitSystem } from './UnitSystem';

interface ArenaGameProps {
  roomId: string;
  playerName: string;
  onLeaveGame: () => void;
}

interface GameStats {
  team1Towers: number;
  team2Towers: number;
  gameTime: number;
  myTeam: number;
}

export const ArenaGame = ({ roomId, playerName, onLeaveGame }: ArenaGameProps) => {
  const [gameStats, setGameStats] = useState<GameStats>({
    team1Towers: 9,
    team2Towers: 9,
    gameTime: 0,
    myTeam: 1
  });
  const [gameEvents, setGameEvents] = useState<string[]>([]);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const gameTimeRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initializeGame();
    subscribeToGameEvents();
    startGameTimer();

    return () => {
      if (gameTimeRef.current) {
        clearInterval(gameTimeRef.current);
      }
    };
  }, [roomId]);

  const initializeGame = async () => {
    // Kule sistemini başlat
    await initializeTowers();
    // Mancınıkları yerleştir
    await initializeCatapults();
    // İlk birimleri oluştur
    await spawnInitialUnits();
  };

  const initializeTowers = async () => {
    const towerPositions = [
      // Takım 1 kuleleri
      { team: 1, x: 100, y: 100, type: 'basic' },
      { team: 1, x: 200, y: 100, type: 'basic' },
      { team: 1, x: 300, y: 100, type: 'basic' },
      { team: 1, x: 100, y: 200, type: 'cannon' },
      { team: 1, x: 200, y: 200, type: 'magic' },
      { team: 1, x: 300, y: 200, type: 'cannon' },
      { team: 1, x: 100, y: 300, type: 'basic' },
      { team: 1, x: 200, y: 300, type: 'basic' },
      { team: 1, x: 300, y: 300, type: 'basic' },
      
      // Takım 2 kuleleri
      { team: 2, x: 700, y: 100, type: 'basic' },
      { team: 2, x: 800, y: 100, type: 'basic' },
      { team: 2, x: 900, y: 100, type: 'basic' },
      { team: 2, x: 700, y: 200, type: 'cannon' },
      { team: 2, x: 800, y: 200, type: 'magic' },
      { team: 2, x: 900, y: 200, type: 'cannon' },
      { team: 2, x: 700, y: 300, type: 'basic' },
      { team: 2, x: 800, y: 300, type: 'basic' },
      { team: 2, x: 900, y: 300, type: 'basic' }
    ];

    for (const pos of towerPositions) {
      await supabase.from('game_towers').insert([{
        room_id: roomId,
        team: pos.team,
        position_x: pos.x,
        position_y: pos.y,
        tower_type: pos.type,
        health: pos.type === 'basic' ? 1000 : pos.type === 'cannon' ? 1500 : 1200,
        max_health: pos.type === 'basic' ? 1000 : pos.type === 'cannon' ? 1500 : 1200,
        damage: pos.type === 'basic' ? 100 : pos.type === 'cannon' ? 200 : 150,
        range_radius: pos.type === 'basic' ? 150 : pos.type === 'cannon' ? 200 : 180
      }]);
    }
  };

  const initializeCatapults = async () => {
    const catapultPositions = [
      { team: 1, x: 150, y: 400 },
      { team: 1, x: 250, y: 400 },
      { team: 2, x: 750, y: 400 },
      { team: 2, x: 850, y: 400 }
    ];

    for (const pos of catapultPositions) {
      await supabase.from('game_catapults').insert([{
        room_id: roomId,
        team: pos.team,
        position_x: pos.x,
        position_y: pos.y
      }]);
    }
  };

  const spawnInitialUnits = async () => {
    const unitTypes = ['minion', 'champion', 'siege'];
    
    for (let i = 0; i < 10; i++) {
      const unitType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
      
      // Takım 1 birimleri
      await supabase.from('game_units').insert([{
        room_id: roomId,
        team: 1,
        unit_type: unitType,
        position_x: 50 + Math.random() * 100,
        position_y: 500 + Math.random() * 100,
        health: unitType === 'minion' ? 100 : unitType === 'champion' ? 300 : 200,
        max_health: unitType === 'minion' ? 100 : unitType === 'champion' ? 300 : 200,
        damage: unitType === 'minion' ? 20 : unitType === 'champion' ? 50 : 40,
        speed: unitType === 'minion' ? 60 : unitType === 'champion' ? 40 : 30
      }]);
      
      // Takım 2 birimleri
      await supabase.from('game_units').insert([{
        room_id: roomId,
        team: 2,
        unit_type: unitType,
        position_x: 850 + Math.random() * 100,
        position_y: 500 + Math.random() * 100,
        health: unitType === 'minion' ? 100 : unitType === 'champion' ? 300 : 200,
        max_health: unitType === 'minion' ? 100 : unitType === 'champion' ? 300 : 200,
        damage: unitType === 'minion' ? 20 : unitType === 'champion' ? 50 : 40,
        speed: unitType === 'minion' ? 60 : unitType === 'champion' ? 40 : 30
      }]);
    }
  };

  const subscribeToGameEvents = () => {
    const channel = supabase
      .channel('game-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          const event = payload.new;
          addGameEvent(`${event.event_type}: ${event.data?.message || 'Oyun olayı'}`);
          
          if (event.event_type === 'tower_destroyed') {
            updateTowerCount(event.team, -1);
          } else if (event.event_type === 'game_ended') {
            setIsGameEnded(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startGameTimer = () => {
    gameTimeRef.current = setInterval(() => {
      setGameStats(prev => ({
        ...prev,
        gameTime: prev.gameTime + 1
      }));
    }, 1000);
  };

  const addGameEvent = (event: string) => {
    setGameEvents(prev => [event, ...prev.slice(0, 9)]);
  };

  const updateTowerCount = (team: number, change: number) => {
    if (team === 1) {
      setGameStats(prev => {
        const newCount = prev.team1Towers + change;
        if (newCount <= 0) {
          endGame(2);
        }
        return { ...prev, team1Towers: Math.max(0, newCount) };
      });
    } else {
      setGameStats(prev => {
        const newCount = prev.team2Towers + change;
        if (newCount <= 0) {
          endGame(1);
        }
        return { ...prev, team2Towers: Math.max(0, newCount) };
      });
    }
  };

  const endGame = async (winnerTeam: number) => {
    await supabase.from('game_results').insert([{
      room_id: roomId,
      winner_team: winnerTeam,
      duration_seconds: gameStats.gameTime,
      team1_score: gameStats.team1Towers,
      team2_score: gameStats.team2Towers
    }]);

    await supabase.from('game_events').insert([{
      room_id: roomId,
      event_type: 'game_ended',
      data: { winner: winnerTeam, message: `Takım ${winnerTeam} kazandı!` }
    }]);

    setIsGameEnded(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Üst Panel - Oyun Durumu */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {formatTime(gameStats.gameTime)}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-semibold">Takım 1:</span>
                  <Badge variant="default">{gameStats.team1Towers} Kule</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-semibold">Takım 2:</span>
                  <Badge variant="destructive">{gameStats.team2Towers} Kule</Badge>
                </div>
              </div>
              <Button variant="outline" onClick={onLeaveGame}>
                Oyundan Ayrıl
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          {/* Sol Panel - Kule Sistemi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kule Sistemi</CardTitle>
            </CardHeader>
            <CardContent>
              <TowerSystem roomId={roomId} myTeam={gameStats.myTeam} />
            </CardContent>
          </Card>

          {/* Ana Oyun Alanı */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded-lg relative overflow-hidden">
                  {/* Arena görsel temsili */}
                  <div className="absolute inset-4 border-2 border-gray-300 rounded">
                    {/* Takım 1 alanı */}
                    <div className="absolute top-4 left-4 w-1/3 h-1/3 bg-blue-100 rounded opacity-50 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">TAKIM 1</span>
                    </div>
                    {/* Takım 2 alanı */}
                    <div className="absolute bottom-4 right-4 w-1/3 h-1/3 bg-red-100 rounded opacity-50 flex items-center justify-center">
                      <span className="text-red-600 font-bold">TAKIM 2</span>
                    </div>
                    {/* Merkez alan */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-200 rounded-full opacity-70 flex items-center justify-center">
                      <span className="text-xs font-bold">ARENA</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Kontroller */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mancınık</CardTitle>
              </CardHeader>
              <CardContent>
                <CatapultSystem roomId={roomId} myTeam={gameStats.myTeam} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Birimler</CardTitle>
              </CardHeader>
              <CardContent>
                <UnitSystem roomId={roomId} myTeam={gameStats.myTeam} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alt Panel - Oyun Olayları */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Oyun Olayları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {gameEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">Henüz oyun olayı yok...</p>
              ) : (
                gameEvents.map((event, index) => (
                  <div key={index} className="text-sm font-mono bg-muted p-2 rounded">
                    {event}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Oyun Sonu Modal */}
        {isGameEnded && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Oyun Bitti!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Oyun {formatTime(gameStats.gameTime)} sürdü.
                </p>
                <Button onClick={onLeaveGame} className="w-full">
                  Lobbiye Dön
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
