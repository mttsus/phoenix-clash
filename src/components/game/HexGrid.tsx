
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff } from 'lucide-react';

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
  has_shield?: boolean;
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

const HexTile = ({ q, r, s, type, onClick, isSelected, hasPlayer, playerName, isOwnCastle, isEnemyCastle, hasShield }: {
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
  hasShield?: boolean;
}) => {
  const size = 25;
  const width = size * 2;
  const height = size * Math.sqrt(3);
  
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  
  const getColor = () => {
    if (hasShield) return 'fill-cyan-400'; // Kalkanlı kaleler
    if (isOwnCastle) return 'fill-blue-600';
    if (isEnemyCastle) return 'fill-red-600';
    if (hasPlayer) return 'fill-purple-500';
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
    if (hasShield) return '🛡️';
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
        } ${isEnemyCastle && !hasShield ? 'hover:stroke-red-400' : ''} ${hasShield ? 'stroke-cyan-500' : ''}`}
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
  const [isMoving, setIsMoving] = useState(false);
  const [userHasShield, setUserHasShield] = useState(false);

  useEffect(() => {
    // Dünya haritası oluştur
    const worldTiles = generateWorldMap();
    setTiles(worldTiles);
  }, []);

  useEffect(() => {
    if (user) {
      initializeUserPositions();
      
      // Realtime güncellemeler için subscription oluştur
      const subscription = supabase
        .channel('user_positions_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'user_positions' }, 
          (payload) => {
            console.log('Position change detected:', payload);
            // Hemen pozisyonları yeniden yükle
            fetchUserPositions();
            if (payload.eventType === 'UPDATE' && payload.new?.user_id === user.id) {
              setIsMoving(false);
              toast.success(`Kaleniz (${payload.new.q}, ${payload.new.r}) konumuna başarıyla taşındı!`);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const initializeUserPositions = async () => {
    await fetchUserPositions();
    await checkUserPosition();
    
    // Eğer kullanıcının pozisyonu yoksa, otomatik yerleştir
    if (!userHasPosition) {
      await placeExistingUsers();
    }
  };

  const fetchUserPositions = async () => {
    console.log('Fetching user positions...');
    
    try {
      const { data: positions, error } = await supabase
        .from('user_positions')
        .select('id, user_id, q, r, s, has_shield');

      if (error) {
        console.error('Kullanıcı pozisyonları yüklenemedi:', error);
        return;
      }

      if (!positions) {
        console.log('No positions found');
        setUserPositions([]);
        return;
      }

      const positionsWithUsernames = await Promise.all(
        positions.map(async (pos) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', pos.user_id)
            .single();
          
          return {
            ...pos,
            username: profile?.username || 'Anonim'
          } as UserPosition;
        })
      );

      setUserPositions(positionsWithUsernames);

      // Kullanıcının kalkan durumunu kontrol et
      const currentUser = positionsWithUsernames.find(pos => pos.user_id === user?.id);
      setUserHasShield(currentUser?.has_shield || false);

    } catch (err) {
      console.error('Unexpected error in fetchUserPositions:', err);
    }
  };

  const checkUserPosition = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_positions')
      .select('id, q, r, s')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Kullanıcı pozisyonu kontrol edilemedi:', error);
      return;
    }

    console.log('User position data:', data);
    const hasPosition = !!data;
    setUserHasPosition(hasPosition);
  };

  const placeExistingUsers = async () => {
    console.log('Placing existing users...');
    try {
      const { error } = await supabase.rpc('place_existing_users');
      
      if (error) {
        console.error('Kullanıcı yerleştirme hatası:', error);
        toast.error('Kale yerleştirilemedi: ' + error.message);
      } else {
        console.log('Users placed successfully');
        // Pozisyonları yeniden yükle
        setTimeout(() => {
          fetchUserPositions();
          checkUserPosition();
        }, 1000);
      }
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
    }
  };

  const handleTileClick = async (tile: {q: number, r: number, s: number, type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest'}) => {
    if (isMoving) {
      toast.info('Kale taşınıyor, lütfen bekleyin...');
      return;
    }

    const playerOnTile = getPlayerOnTile(tile.q, tile.r);
    
    // Düşman kalesi kontrolü - Kalkanlı kalelere saldırı yapılamaz
    if (playerOnTile && playerOnTile.user_id !== user?.id) {
      if (playerOnTile.has_shield) {
        toast.info(`${playerOnTile.username} kalesi kalkanlı! Saldırı yapılamaz.`);
        return;
      }
      
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

  const toggleShield = async () => {
    if (!user || !userHasPosition) {
      toast.error('Kalkan sistemini kullanmak için kalenizin haritada olması gerekir.');
      return;
    }

    try {
      const newShieldState = !userHasShield;
      
      const { error } = await supabase
        .from('user_positions')
        .update({ has_shield: newShieldState })
        .eq('user_id', user.id);

      if (error) {
        console.error('Kalkan durumu güncellenemedi:', error);
        toast.error('Kalkan durumu güncellenemedi: ' + error.message);
        return;
      }

      setUserHasShield(newShieldState);
      
      if (newShieldState) {
        toast.success('🛡️ Kalkan aktif edildi! Artık saldırıya uğramayacaksınız.');
      } else {
        toast.success('⚔️ Kalkan deaktif edildi! Artık saldırıya uğrayabilirsiniz.');
      }

      // Pozisyonları yeniden yükle
      setTimeout(() => {
        fetchUserPositions();
      }, 500);

    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      toast.error('Beklenmeyen bir hata oluştu');
    }
  };

  const moveCastle = async (tile: {q: number, r: number, s: number}) => {
    if (!user || isMoving) return;

    console.log('Moving castle to:', tile);
    setIsMoving(true);
    toast.info('Kale taşınıyor...');

    try {
      const { data, error } = await supabase.rpc('move_castle', {
        target_q: tile.q,
        target_r: tile.r,
        target_s: tile.s
      });

      if (error) {
        console.error('Kale taşıma hatası:', error);
        toast.error('Kale taşınamadı: ' + error.message);
        setIsMoving(false);
        return;
      }

      console.log('Castle moved successfully', data);
      
      // Kale taşıma sonrası pozisyonları hemen güncelle
      setTimeout(async () => {
        await fetchUserPositions();
        await checkUserPosition();
        setIsMoving(false);
        toast.success(`Kale başarıyla (${tile.q}, ${tile.r}) konumuna taşındı!`);
      }, 500);
      
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      toast.error('Beklenmeyen bir hata oluştu');
      setIsMoving(false);
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
    <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden relative">
      {/* Kalkan Kontrolü - Sağ üst köşe */}
      {userHasPosition && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={toggleShield}
            variant={userHasShield ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-2 ${
              userHasShield 
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white' 
                : 'border-cyan-600 text-cyan-600 hover:bg-cyan-50'
            }`}
          >
            {userHasShield ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            {userHasShield ? 'Kalkan Aktif' : 'Kalkan İnaktif'}
          </Button>
        </div>
      )}

      {/* Durum Bilgileri */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {!userHasPosition && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏳ Kaleniz otomatik olarak yerleştiriliyor... {isMoving && 'Taşınıyor...'}
            </p>
          </div>
        )}
        {userHasPosition && currentUserPosition && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Kaleniz ({currentUserPosition.q}, {currentUserPosition.r}) konumunda!
              {userHasShield && ' 🛡️ Kalkan aktif!'}
              {isMoving ? ' 🔄 Taşınıyor...' : !userHasShield ? ' Düşman kalelerine (⚔️) tıklayarak savaş başlatabilir, boş alanlara tıklayarak kalenizi taşıyabilirsiniz.' : ' Kalkanlısınız, saldırıya uğramayacaksınız.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Tam Ekran Harita */}
      <div className="w-full h-full flex items-center justify-center pt-20 pb-4">
        <div className="overflow-auto max-h-full max-w-full">
          <svg width="800" height="800" viewBox="0 0 800 800" className="w-full h-auto">
            {tiles.map((tile, index) => {
              const playerOnTile = getPlayerOnTile(tile.q, tile.r);
              const isOwnCastle = playerOnTile && playerOnTile.user_id === user?.id;
              const isEnemyCastle = playerOnTile && playerOnTile.user_id !== user?.id;
              const hasShield = playerOnTile?.has_shield || false;
              
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
                  hasShield={hasShield}
                />
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* Alt Panel - Aktif Kaleler */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <h3 className="text-sm font-semibold mb-2">Dünya Sunucusu - Aktif Kaleler ({userPositions.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs max-h-32 overflow-y-auto">
            {userPositions.map(pos => (
              <div key={pos.id} className="flex items-center gap-2">
                <span className={pos.user_id === user?.id ? "text-blue-600" : pos.has_shield ? "text-cyan-600" : "text-red-600"}>
                  {pos.user_id === user?.id ? '🏰' : pos.has_shield ? '🛡️' : '⚔️'}
                </span>
                <span className={pos.user_id === user?.id ? "font-bold text-blue-600" : pos.has_shield ? "text-cyan-600" : ""}>
                  {pos.user_id === user?.id ? `${pos.username} (Sen)` : `${pos.username}${pos.has_shield ? ' (Kalkanlı)' : ''}`}
                </span>
                <span className="text-gray-500 text-[10px]">({pos.q},{pos.r})</span>
              </div>
            ))}
          </div>
          {userPositions.length === 0 && (
            <p className="text-xs text-gray-500">Kaleler yükleniyor...</p>
          )}
          
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              🌍 <strong>Dünya Sunucusu:</strong> Kalkanlı kalelere (🛡️) saldırı yapılamaz. Kalkan butonunu kullanarak korunabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
