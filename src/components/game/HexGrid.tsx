
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

const HexTile = ({ q, r, s, type, onClick, isSelected, hasPlayer, playerName }: {
  q: number;
  r: number;
  s: number;
  type: string;
  onClick: () => void;
  isSelected: boolean;
  hasPlayer?: boolean;
  playerName?: string;
}) => {
  const size = 30;
  const width = size * 2;
  const height = size * Math.sqrt(3);
  
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  
  const getColor = () => {
    if (hasPlayer) return 'fill-blue-600'; // Oyuncu kalemi
    switch (type) {
      case 'castle': return 'fill-red-500';
      case 'forest': return 'fill-green-500';
      case 'mountain': return 'fill-gray-500';
      case 'mine': return 'fill-yellow-500';
      case 'chest': return 'fill-purple-500';
      default: return 'fill-blue-100';
    }
  };

  return (
    <g transform={`translate(${x + 300}, ${y + 300})`}>
      <polygon
        points="-26,0 -13,-22.5 13,-22.5 26,0 13,22.5 -13,22.5"
        className={`${getColor()} stroke-2 cursor-pointer transition-all hover:opacity-80 ${
          isSelected ? 'stroke-yellow-400' : 'stroke-gray-400'
        }`}
        onClick={onClick}
      />
      <text 
        x="0" 
        y="0" 
        textAnchor="middle" 
        className="text-xs fill-current text-foreground pointer-events-none"
      >
        {hasPlayer ? '👤' : type[0].toUpperCase()}
      </text>
      {playerName && (
        <text 
          x="0" 
          y="15" 
          textAnchor="middle" 
          className="text-[8px] fill-current text-foreground pointer-events-none"
        >
          {playerName.slice(0, 6)}
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
  const [hasPlacedPen, setHasPlacedPen] = useState(false);
  const [canPlacePen, setCanPlacePen] = useState(true);

  useEffect(() => {
    // Temel hex grid oluşturma (7x7 grid)
    const newTiles = [];
    const radius = 3;
    
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        const s = -q - r;
        
        // Rastgele tile tipi
        let type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest' = 'plain';
        const rand = Math.random();
        if (q === 0 && r === 0) type = 'castle'; // Merkez kale
        else if (rand < 0.2) type = 'forest';
        else if (rand < 0.35) type = 'mountain';
        else if (rand < 0.45) type = 'mine';
        else if (rand < 0.5) type = 'chest';
        
        newTiles.push({ q, r, s, type });
      }
    }
    
    setTiles(newTiles);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserPositions();
      checkUserPenStatus();
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
  };

  const checkUserPenStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_positions')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Kalem durumu kontrol edilemedi:', error);
      return;
    }

    setHasPlacedPen(!!data);
    setCanPlacePen(!data);
  };

  const handleTileClick = async (tile: {q: number, r: number, s: number, type: 'castle' | 'forest' | 'mountain' | 'plain' | 'mine' | 'chest'}) => {
    dispatch({ 
      type: 'SELECT_TILE', 
      payload: { ...tile, owner: 'player' } 
    });

    // Eğer kullanıcı henüz kalem yerleştirmemişse ve bu tile'da başka oyuncu yoksa
    if (canPlacePen && user) {
      const hasPlayerOnTile = userPositions.some(pos => pos.q === tile.q && pos.r === tile.r);
      
      if (!hasPlayerOnTile) {
        const shouldPlace = confirm('Bu konuma kaleminizi yerleştirmek istiyor musunuz? Bu hakkınızı sadece bir kez kullanabilirsiniz.');
        
        if (shouldPlace) {
          await placePenOnTile(tile);
        }
      } else {
        toast.error('Bu konumda zaten başka bir oyuncu var!');
      }
    }
  };

  const placePenOnTile = async (tile: {q: number, r: number, s: number}) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_positions')
      .insert([{
        user_id: user.id,
        q: tile.q,
        r: tile.r,
        s: tile.s
      }]);

    if (error) {
      toast.error('Kalem yerleştirilemedi: ' + error.message);
      return;
    }

    toast.success('Kaleminiz başarıyla yerleştirildi!');
    setHasPlacedPen(true);
    setCanPlacePen(false);
    await fetchUserPositions();
  };

  const getPlayerOnTile = (q: number, r: number) => {
    return userPositions.find(pos => pos.q === q && pos.r === r);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden">
      <div className="p-4">
        {canPlacePen && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-sm text-blue-800">
              🎯 Haritada bir konuma tıklayarak kaleminizi yerleştirebilirsiniz. Bu hakkınızı sadece bir kez kullanabilirsiniz!
            </p>
          </div>
        )}
        {hasPlacedPen && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Kaleminizi haritaya yerleştirdiniz! Artık diğer oyuncular sizi görebiliyor.
            </p>
          </div>
        )}
      </div>
      
      <div className="w-full h-full flex items-center justify-center">
        <svg width="600" height="600" viewBox="0 0 600 600">
          {tiles.map((tile, index) => {
            const playerOnTile = getPlayerOnTile(tile.q, tile.r);
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
              />
            );
          })}
        </svg>
      </div>
      
      <div className="p-4">
        <div className="bg-white/90 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Haritadaki Oyuncular ({userPositions.length})</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {userPositions.map(pos => (
              <div key={pos.id} className="flex items-center gap-1">
                <span className="text-blue-600">👤</span>
                <span>{pos.username}</span>
                <span className="text-gray-500">({pos.q},{pos.r})</span>
              </div>
            ))}
          </div>
          {userPositions.length === 0 && (
            <p className="text-xs text-gray-500">Henüz hiçbir oyuncu kalem yerleştirmemiş.</p>
          )}
        </div>
      </div>
    </div>
  );
};
