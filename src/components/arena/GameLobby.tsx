
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Sword } from 'lucide-react';

interface GameParticipant {
  id: string;
  player_id: string;
  player_name: string;
  team: number;
  ready: boolean;
}

interface GameLobbyProps {
  roomId: string;
  playerName: string;
  onStartGame: () => void;
  onLeave: () => void;
}

export const GameLobby = ({ roomId, playerName, onStartGame, onLeave }: GameLobbyProps) => {
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<GameParticipant | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    joinRoom();
    fetchParticipants();
    subscribeToParticipants();

    return () => {
      leaveRoom();
    };
  }, [roomId]);

  const joinRoom = async () => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const team = participants.filter(p => p.team === 1).length < participants.filter(p => p.team === 2).length ? 1 : 2;

    const { data, error } = await supabase
      .from('game_participants')
      .insert([{
        room_id: roomId,
        player_id: playerId,
        player_name: playerName,
        team: team,
        ready: false
      }])
      .select()
      .single();

    if (data && !error) {
      setMyParticipant(data);
    }

    // Oda oyuncu sayısını güncelle
    await supabase
      .from('game_rooms')
      .update({ 
        current_players: participants.length + 1 
      })
      .eq('id', roomId);
  };

  const leaveRoom = async () => {
    if (myParticipant) {
      await supabase
        .from('game_participants')
        .delete()
        .eq('id', myParticipant.id);

      await supabase
        .from('game_rooms')
        .update({ 
          current_players: Math.max(0, participants.length - 1) 
        })
        .eq('id', roomId);
    }
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('game_participants')
      .select('*')
      .eq('room_id', roomId);

    if (data && !error) {
      setParticipants(data);
    }
  };

  const subscribeToParticipants = () => {
    const channel = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleReady = async () => {
    if (!myParticipant) return;

    const newReadyState = !isReady;
    await supabase
      .from('game_participants')
      .update({ ready: newReadyState })
      .eq('id', myParticipant.id);

    setIsReady(newReadyState);
  };

  const switchTeam = async () => {
    if (!myParticipant) return;

    const newTeam = myParticipant.team === 1 ? 2 : 1;
    await supabase
      .from('game_participants')
      .update({ team: newTeam })
      .eq('id', myParticipant.id);

    setMyParticipant({ ...myParticipant, team: newTeam });
  };

  const canStartGame = () => {
    return participants.length >= 2 && 
           participants.every(p => p.ready) &&
           participants.filter(p => p.team === 1).length > 0 &&
           participants.filter(p => p.team === 2).length > 0;
  };

  const handleStartGame = async () => {
    if (!canStartGame()) return;

    await supabase
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId);

    onStartGame();
  };

  const team1Players = participants.filter(p => p.team === 1);
  const team2Players = participants.filter(p => p.team === 2);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Oyun Lobisi</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onLeave}>
                  Ayrıl
                </Button>
                {canStartGame() && (
                  <Button onClick={handleStartGame}>
                    Oyunu Başlat
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Takım 1 */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Sword className="w-5 h-5" />
                Takım 1 ({team1Players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {team1Players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div className="flex items-center gap-2">
                      {player.player_id === myParticipant?.player_id && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                    <Badge variant={player.ready ? "default" : "secondary"}>
                      {player.ready ? "Hazır" : "Bekliyor"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Takım 2 */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Sword className="w-5 h-5" />
                Takım 2 ({team2Players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {team2Players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="flex items-center gap-2">
                      {player.player_id === myParticipant?.player_id && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                    <Badge variant={player.ready ? "default" : "secondary"}>
                      {player.ready ? "Hazır" : "Bekliyor"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Oyuncu Kontrolleri */}
        {myParticipant && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Users className="w-5 h-5" />
                  <span>Sen: <strong>{myParticipant.player_name}</strong></span>
                  <Badge variant={myParticipant.team === 1 ? "default" : "destructive"}>
                    Takım {myParticipant.team}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={switchTeam}>
                    Takım Değiştir
                  </Button>
                  <Button 
                    onClick={toggleReady}
                    variant={isReady ? "default" : "outline"}
                  >
                    {isReady ? "Hazırım ✓" : "Hazır Değilim"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
