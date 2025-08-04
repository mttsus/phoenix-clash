
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HexPosition {
  q: number;
  r: number;
  s: number;
}

interface UserPosition {
  id: string;
  user_id: string;
  q: number;
  r: number;
  s: number;
  username?: string;
}

// Genişletilmiş harita yapısı - 100 bölümden oluşan dünya haritası
const generateWorldMap = () => {
  const tiles = [];
  const radius = 6; // Daha büyük harita için radius artırıldı
  
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      
      // Sabit seed kullanarak her zaman aynı haritayı oluştur
      const seed = q * 1000 + r * 100 + s;
      const pseudoRandom = Math.abs(Math.sin(seed)) * 10000;
      const rand = pseudoRandom - Math.floor(pseudoRandom);
      
      let type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest' = 'plain';
      if (q === 0 && r === 0) type = 'castle'; // Merkez kale
      else if (rand < 0.25) type = 'forest';
      else if (rand < 0.4) type = 'mountain';
      else if (rand < 0.5) type = 'mine';
      else if (rand < 0.55) type = 'chest';
      
      tiles.push({ q, r, s, type });
    }
  }
  
  return tiles;
};

const HexTile = ({ q, r, s, type, onClick, isSelected, hasPlayer, playerName, isOwnCastle, isEnemyCastle }: {
  q: number;
  r: number;
  s: number;
  type: string;
  onClick: () => void;
  isSelected: boolean;
  hasPlayer?: boolean;
  playerName?: string;
  isOwnCastle?: boolean;
  isEnemyCastle?: boolean;
}) => {
  const size = 25; // Daha büyük harita için tile boyutu küçültüldü
  const width = size * 2;
  const height = size * Math.sqrt(3);
  
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  
  const getColor = () => {
    if (isOwnCastle) return 'fill-blue-600'; // Kendi kalesi
    if (isEnemyCastle) return 'fill-red-600'; // Düşman kalesi
    if (hasPlayer) return 'fill-purple-500'; // Diğer oyuncular
    switch (type) {
      case 'castle': return 'fill-yellow-500';
      case 'forest': return 'fill-green-500';
      case 'mountain': return 'fill-gray-500';
      case 'mine': return 'fill-yellow-600';
      case 'chest': return 'fill-purple-500';
      default: return 'fill-blue-100';
    }
  };

  const getIcon = () => {
    if (isOwnCastle) return '🏰';
    if (isEnemyCastle) return '⚔️';
    if (hasPlayer) return '🏰';
    switch (type) {
      case 'castle': return '🏰';
      case 'forest': return '🌲';
      case 'mountain': return '⛰️';
      case 'mine': return '⚒️';
      case 'chest': return '📦';
      default: return '';
    }
  };

  return (
    <g transform={`translate(${x + 400}, ${y + 400})`}>
      <polygon
        points="-22,0 -11,-19 11,-19 22,0 11,19 -11,19"
        className={`${getColor()} stroke-2 cursor-pointer transition-all hover:opacity-80 ${
          isSelected ? 'stroke-yellow-400' : 'stroke-gray-400'
        } ${isEnemyCastle ? 'hover:stroke-red-400' : ''}`}
        onClick={onClick}
      />
      <text 
        x="0" 
        y="2" 
        textAnchor="middle" 
        className="text-xs pointer-events-none"
      >
        {getIcon()}
      </text>
      {playerName && (
        <text 
          x="0" 
          y="14" 
          textAnchor="middle" 
          className="text-[7px] fill-current text-foreground pointer-events-none font-bold"
        >
          {playerName.slice(0, 8)}
        </text>
      )}
    </g>
  );
};

export const HexGrid = () => {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [tiles, setTiles] = useState<Array<{q: number, r: number, s: number, type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest'}>>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [userHasPosition, setUserHasPosition] = useState(false);

  useEffect(() => {
    // Dünya haritası oluştur
    const worldTiles = generateWorldMap();
    setTiles(worldTiles);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserPositions();
      checkUserPosition();
      
      // Realtime güncellemeler için subscription oluştur
      const subscription = supabase
        .channel('user_positions_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_positions' }, 
          (payload) => {
            console.log('Position change detected:', payload);
            fetchUserPositions();
            if (payload.eventType === 'UPDATE' && payload.new?.user_id === user.id) {
              toast.success('Kaleniz başarıyla taşındı!');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const fetchUserPositions = async () => {
    console.log('Fetching user positions...');
    
    const { data, error } = await supabase
      .from('user_positions')
      .select(`
        id,
        user_id,
        q,
        r,
        s,
        profiles(username)
      `);

    if (error) {
      console.error('Kullanıcı pozisyonları yüklenemedi:', error);
      return;
    }

    console.log('Raw user positions data:', data);

    const positions = data?.map(pos => ({
      id: pos.id,
      user_id: pos.user_id,
      q: pos.q,
      r: pos.r,
      s: pos.s,
      username: (pos.profiles as any)?.username || 'Anonim'
    })) || [];

    console.log('Processed positions:', positions);
    setUserPositions(positions);
  };

  const checkUserPosition = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_positions')
      .select('id, q, r, s')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Kullanıcı pozisyonu kontrol edilemedi:', error);
      return;
    }

    console.log('User position data:', data);
    setUserHasPosition(!!data);
  };

  const handleTileClick = async (tile: {q: number, r: number, s: number, type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest'}) => {
    const playerOnTile = getPlayerOnTile(tile.q, tile.r);
    
    // Düşman kalesi kontrolü
    if (playerOnTile && playerOnTile.user_id !== user?.id) {
      const shouldAttack = confirm(`${playerOnTile.username} kalesine saldırmak istiyor musunuz?`);
      if (shouldAttack) {
        startBattle(playerOnTile);
        return;
      }
    }

    // Boş alana kale taşıma (sadece kendi kalemiz varsa)
    if (userHasPosition && user && !playerOnTile) {
      const shouldMove = confirm(`Kalenizi (${tile.q}, ${tile.r}) konumuna taşımak istiyor musunuz?`);
      
      if (shouldMove) {
        await moveCastle(tile);
      }
    }

    dispatch({ 
      type: 'SELECT_TILE', 
      payload: { ...tile, owner: 'player' } 
    });
  };

  const moveCastle = async (tile: {q: number, r: number, s: number}) => {
    if (!user) return;

    console.log('Moving castle to:', tile);

    try {
      const { error } = await supabase
        .from('user_positions')
        .update({
          q: tile.q,
          r: tile.r,
          s: tile.s
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Kale taşıma hatası:', error);
        toast.error('Kale taşınamadı: ' + error.message);
        return;
      }

      console.log('Castle moved successfully');
      // Toast realtime event'te gösterilecek
      
      // Pozisyonları hemen güncelle
      await fetchUserPositions();
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      toast.error('Beklenmeyen bir hata oluştu');
    }
  };

  const startBattle = (enemy: UserPosition) => {
    // Savaş arenasını başlat
    dispatch({ 
      type: 'START_BATTLE', 
      payload: { 
        enemy: enemy,
        playerArmy: state.army 
      } 
    });
  };

  const getPlayerOnTile = (q: number, r: number) => {
    return userPositions.find(pos => pos.q === q && pos.r === r);
  };

  const getUserPosition = () => {
    if (!user) return null;
    return userPositions.find(pos => pos.user_id === user.id);
  };

  const currentUserPosition = getUserPosition();

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden">
      <div className="p-4">
        {!userHasPosition && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏳ Kaleniz otomatik olarak yerleştiriliyor... Sayfayı yenileyin.
            </p>
          </div>
        )}
        {userHasPosition && currentUserPosition && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Kaleniz ({currentUserPosition.q}, {currentUserPosition.r}) konumunda! Düşman kalelerine (⚔️) tıklayarak savaş başlatabilir, boş alanlara tıklayarak kalenizi taşıyabilirsiniz.
            </p>
          </div>
        )}
      </div>
      
      <div className="w-full h-full flex items-center justify-center">
        <div className="overflow-auto max-h-[600px] max-w-[800px]">
          <svg width="800" height="800" viewBox="0 0 800 800">
            {tiles.map((tile, index) => {
              const playerOnTile = getPlayerOnTile(tile.q, tile.r);
              const isOwnCastle = playerOnTile && playerOnTile.user_id === user?.id;
              const isEnemyCastle = playerOnTile && playerOnTile.user_id !== user?.id;
              
              return (
                <HexTile
                  key={index}
                  q={tile.q}
                  r={tile.r}
                  s={tile.s}
                  type={tile.type}
                  onClick={() => handleTileClick(tile)}
                  isSelected={state.selectedTile?.q === tile.q && state.selectedTile?.r === tile.r}
                  hasPlayer={!!playerOnTile}
                  playerName={playerOnTile?.username}
                  isOwnCastle={isOwnCastle}
                  isEnemyCastle={isEnemyCastle}
                />
              );
            })}
          </svg>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-white/90 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Dünya Sunucusu - Aktif Kaleler ({userPositions.length})</h3>
          <div className="grid grid-cols-2 gap-2 text-xs max-h-32 overflow-y-auto">
            {userPositions.map(pos => (
              <div key={pos.id} className="flex items-center gap-2">
                <span className={pos.user_id === user?.id ? "text-blue-600" : "text-red-600"}>
                  {pos.user_id === user?.id ? '🏰' : '⚔️'}
                </span>
                <span className={pos.user_id === user?.id ? "font-bold text-blue-600" : ""}>
                  {pos.user_id === user?.id ? `${pos.username} (Sen)` : `${pos.username}`}
                </span>
                <span className="text-gray-500 text-[10px]">({pos.q},{pos.r})</span>
              </div>
            ))}
          </div>
          {userPositions.length === 0 && (
            <p className="text-xs text-gray-500">Dünya haritası yükleniyor...</p>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              🌍 <strong>Dünya Sunucusu:</strong> Tüm oyuncular aynı haritada! Boş alanlara tıklayarak kalenizi taşıyın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
