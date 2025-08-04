
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
  const [hasPlacedCastle, setHasPlacedCastle] = useState(false);
  const [canPlaceCastle, setCanPlaceCastle] = useState(true);

  useEffect(() => {
    // Dünya haritası oluştur
    const worldTiles = generateWorldMap();
    setTiles(worldTiles);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserPositions();
      checkUserCastleStatus();
      
      // Realtime güncellemeler için subscription oluştur
      const subscription = supabase
        .channel('user_positions_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_positions' }, 
          (payload) => {
            console.log('Position change detected:', payload);
            fetchUserPositions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const fetchUserPositions = async () => {
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

    const positions = data?.map(pos => ({
      id: pos.id,
      user_id: pos.user_id,
      q: pos.q,
      r: pos.r,
      s: pos.s,
      username: (pos.profiles as any)?.username || 'Anonim'
    })) || [];

    setUserPositions(positions);
    console.log('Loaded positions:', positions);
  };

  const checkUserCastleStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_positions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Kale durumu kontrol edilemedi:', error);
      return;
    }

    setHasPlacedCastle(!!data);
    setCanPlaceCastle(!data);
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

    // Kendi kalemizi taşımak istiyoruz
    if (playerOnTile && playerOnTile.user_id === user?.id) {
      const shouldMove = confirm('Kalenizi bu konuma taşımak istiyor musunuz?');
      if (shouldMove) {
        await moveCastle(tile);
        return;
      }
    }

    dispatch({ 
      type: 'SELECT_TILE', 
      payload: { ...tile, owner: 'player' } 
    });

    // İlk kale yerleştirme veya boş alana kale yerleştirme
    if ((canPlaceCastle || !hasPlacedCastle) && user && !playerOnTile) {
      const message = hasPlacedCastle 
        ? 'Kalenizi bu konuma taşımak istiyor musunuz?' 
        : 'Bu konuma kalenizi yerleştirmek istiyor musunuz?';
      
      const shouldPlace = confirm(message);
      
      if (shouldPlace) {
        await placeCastleOnTile(tile);
      }
    }
  };

  const moveCastle = async (tile: {q: number, r: number, s: number}) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_positions')
      .update({
        q: tile.q,
        r: tile.r,
        s: tile.s
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Kale taşınamadı: ' + error.message);
      return;
    }

    toast.success('Kaleniz başarıyla taşındı!');
    await fetchUserPositions();
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

  const placeCastleOnTile = async (tile: {q: number, r: number, s: number}) => {
    if (!user) return;

    if (hasPlacedCastle) {
      // Mevcut kaleyi güncelle
      await moveCastle(tile);
      return;
    }

    // Yeni kale yerleştir
    const { error } = await supabase
      .from('user_positions')
      .insert([{
        user_id: user.id,
        q: tile.q,
        r: tile.r,
        s: tile.s
      }]);

    if (error) {
      toast.error('Kale yerleştirilemedi: ' + error.message);
      return;
    }

    toast.success('Kaleniz başarıyla yerleştirildi!');
    setHasPlacedCastle(true);
    setCanPlaceCastle(false);
    await fetchUserPositions();
  };

  const getPlayerOnTile = (q: number, r: number) => {
    return userPositions.find(pos => pos.q === q && pos.r === r);
  };

  // Rastgele pozisyon önerme fonksiyonu
  const suggestRandomPosition = () => {
    const availableTiles = tiles.filter(tile => {
      const hasPlayer = getPlayerOnTile(tile.q, tile.r);
      return !hasPlayer && tile.type === 'plain';
    });
    
    if (availableTiles.length > 0) {
      const randomTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
      handleTileClick(randomTile);
    } else {
      toast.info('Uygun boş alan bulunamadı');
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden">
      <div className="p-4">
        {canPlaceCastle && !hasPlacedCastle && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              🏰 Dünya haritasında bir konuma tıklayarak kalenizi yerleştirebilirsiniz.
            </p>
            <button 
              onClick={suggestRandomPosition}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Rastgele Pozisyon Öner
            </button>
          </div>
        )}
        {hasPlacedCastle && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Kaleniz haritada! Düşman kalelerine (⚔️) tıklayarak savaşa başlayabilir, kendi kalenize tıklayarak taşıyabilirsiniz.
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
          <h3 className="text-sm font-semibold mb-2">Dünya Haritası - Aktif Kaleler ({userPositions.length})</h3>
          <div className="grid grid-cols-2 gap-2 text-xs max-h-32 overflow-y-auto">
            {userPositions.map(pos => (
              <div key={pos.id} className="flex items-center gap-2">
                <span className={pos.user_id === user?.id ? "text-blue-600" : "text-red-600"}>
                  {pos.user_id === user?.id ? '🏰' : '⚔️'}
                </span>
                <span className={pos.user_id === user?.id ? "font-bold text-blue-600" : ""}>
                  {pos.user_id === user?.id ? `${pos.username} (Sen)` : `${pos.username} Kalesi`}
                </span>
                <span className="text-gray-500 text-[10px]">({pos.q},{pos.r})</span>
              </div>
            ))}
          </div>
          {userPositions.length === 0 && (
            <p className="text-xs text-gray-500">Dünya haritası henüz boş. İlk kaleyi sen inşa et!</p>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              🌍 <strong>Dünya Sunucusu:</strong> Tüm oyuncular aynı haritada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
