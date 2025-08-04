
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GameLobby } from './GameLobby';
import { ArenaGame } from './ArenaGame';

interface GameRoom {
  id: string;
  name: string;
  max_players: number;
  current_players: number;
  status: string;
  created_at: string;
}

export const MultiplayerArena = () => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState<'lobby' | 'game' | 'rooms'>('rooms');

  useEffect(() => {
    fetchRooms();
    subscribeToRoomUpdates();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setRooms(data);
    }
  };

  const subscribeToRoomUpdates = () => {
    const channel = supabase
      .channel('room-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms'
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createRoom = async () => {
    const roomName = `Arena ${Date.now()}`;
    const { data, error } = await supabase
      .from('game_rooms')
      .insert([{
        name: roomName,
        max_players: 2,
        current_players: 0,
        status: 'waiting'
      }])
      .select()
      .single();

    if (data && !error) {
      setCurrentRoom(data.id);
      setGameState('lobby');
    }
  };

  const joinRoom = async (roomId: string) => {
    setCurrentRoom(roomId);
    setGameState('lobby');
  };

  const startGame = () => {
    setGameState('game');
  };

  if (gameState === 'lobby' && currentRoom) {
    return (
      <GameLobby
        roomId={currentRoom}
        playerName={playerName}
        onStartGame={startGame}
        onLeave={() => {
          setCurrentRoom(null);
          setGameState('rooms');
        }}
      />
    );
  }

  if (gameState === 'game' && currentRoom) {
    return (
      <ArenaGame
        roomId={currentRoom}
        playerName={playerName}
        onLeaveGame={() => {
          setCurrentRoom(null);
          setGameState('rooms');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Multiplayer Arena</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Oyuncu adınız..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded"
              />
              <Button 
                onClick={createRoom}
                disabled={!playerName.trim()}
              >
                Yeni Oda Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant="secondary">
                    {room.status === 'waiting' ? 'Bekliyor' : 'Oynuyor'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Oyuncular: {room.current_players}/{room.max_players}
                  </p>
                  <Button
                    onClick={() => joinRoom(room.id)}
                    disabled={!playerName.trim() || room.current_players >= room.max_players}
                    className="w-full"
                  >
                    Katıl
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {rooms.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Henüz aktif oda bulunmuyor. İlk odayı siz oluşturun!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
