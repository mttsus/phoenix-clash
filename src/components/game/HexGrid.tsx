import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Hexagon } from './Hexagon';

interface UserPosition {
  q: number;
  r: number;
  s: number;
}

interface HexGridProps {
  onCastleMoved?: () => void;
  onCastleClicked?: () => void;
  onBattleStarted?: () => void;
}

export const HexGrid = ({ 
  onCastleMoved, 
  onCastleClicked, 
  onBattleStarted 
}: HexGridProps) => {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [tiles, setTiles] = useState<any[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
  const [resourceRegions, setResourceRegions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      initializeMap();
      fetchUserPosition();
      fetchUsernames();
      fetchResourceRegions();
    }
  }, [user]);

  const initializeMap = () => {
    // Başlangıç haritası oluştur - küçük bir grid
    const initialTiles = [];
    
    // Kullanıcının başlangıç kalesi
    if (userPosition) {
      initialTiles.push({
        q: userPosition.q,
        r: userPosition.r,
        s: userPosition.s,
        type: 'castle',
        owner: user?.id
      });
    } else {
      // Varsayılan başlangıç pozisyonu
      initialTiles.push({
        q: 0,
        r: 0,
        s: 0,
        type: 'castle',
        owner: user?.id
      });
    }

    // Çevresine boş alanlar ekle
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const s = -q - r;
        if (Math.abs(q) + Math.abs(r) + Math.abs(s) <= 6) {
          // Merkez kale pozisyonu değilse boş alan ekle
          if (!(q === 0 && r === 0 && s === 0)) {
            initialTiles.push({
              q,
              r,
              s,
              type: null,
              owner: null
            });
          }
        }
      }
    }

    // Birkaç kaynak bölgesi ekle
    initialTiles.push(
      { q: 2, r: 1, s: -3, type: 'mine', owner: null },
      { q: -1, r: 2, s: -1, type: 'forest', owner: null },
      { q: 1, r: -2, s: 1, type: 'mine', owner: null }
    );

    console.log('Initializing map with tiles:', initialTiles);
    setTiles(initialTiles);
    
    // GameContext'e de aktar
    dispatch({ type: 'SET_HEX_TILES', payload: initialTiles });
  };

  const fetchUserPosition = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_positions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user position:', error);
        return;
      }

      if (data) {
        setUserPosition({
          q: data.q,
          r: data.r,
          s: data.s
        });
      } else {
        // Kullanıcı pozisyonu yoksa oluştur
        const { error: insertError } = await supabase
          .from('user_positions')
          .insert({
            user_id: user.id,
            q: 0,
            r: 0,
            s: 0
          });

        if (!insertError) {
          setUserPosition({ q: 0, r: 0, s: 0 });
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const fetchUsernames = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username');

      if (error) {
        console.error('Error fetching usernames:', error);
        return;
      }

      const names: { [userId: string]: string } = {};
      data.forEach(profile => {
        names[profile.id] = profile.username;
      });
      setUsernames(names);
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const fetchResourceRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_regions')
        .select('*');

      if (error) {
        console.error('Error fetching resource regions:', error);
        return;
      }

      setResourceRegions(data);
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const handleHexClick = async (q: number, r: number, s: number) => {
    if (!user) return;

    console.log(`Hex clicked: q=${q}, r=${r}, s=${s}`);
    
    const clickedTile = tiles.find(tile => tile.q === q && tile.r === r && tile.s === s);
    
    if (!clickedTile || !clickedTile.type) {
      // Boş alan - kaleyi taşı
      try {
        const { error } = await supabase.rpc('move_castle', {
          target_q: q,
          target_r: r,
          target_s: s
        });

        if (error) {
          console.error('Castle move error:', error);
          toast.error('Kale taşıma hatası: ' + error.message);
          return;
        }

        // Haritayı güncelle
        const updatedTiles = tiles.map(tile => {
          if (tile.owner === user.id && tile.type === 'castle') {
            return { ...tile, type: null, owner: null };
          }
          if (tile.q === q && tile.r === r && tile.s === s) {
            return { ...tile, type: 'castle', owner: user.id };
          }
          return tile;
        });

        setTiles(updatedTiles);
        setUserPosition({ q, r, s });
        toast.success('Kale başarıyla taşındı!');
        
        if (onCastleMoved) {
          onCastleMoved();
        }

      } catch (err) {
        console.error('Unexpected error:', err);
        toast.error('Beklenmeyen bir hata oluştu');
      }
    } else if (clickedTile.type === 'castle' && clickedTile.owner === user.id) {
      // Kendi kalesi - kale içine gir
      if (onCastleClicked) {
        onCastleClicked();
      }
    } else if (clickedTile.type === 'castle' && clickedTile.owner !== user.id) {
      // Başka birinin kalesi - saldır
      const enemyCastle = {
        id: clickedTile.owner!,
        user_id: clickedTile.owner!,
        username: usernames[clickedTile.owner!] || 'Unknown Player',
        q: clickedTile.q,
        r: clickedTile.r,
        s: clickedTile.s
      };

      dispatch({ 
        type: 'START_BATTLE', 
        payload: { 
          enemy: enemyCastle, 
          playerArmy: state.army,
          battleType: 'pvp' 
        } 
      });

      if (onBattleStarted) {
        onBattleStarted();
      }
    }
  };

  const gridStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundImage: 'url("/images/grass_bg.png")',
    backgroundSize: 'cover',
    minHeight: '600px'
  };

  console.log('Rendering HexGrid with tiles:', tiles);

  return (
    <div style={gridStyle}>
      <svg width="100%" height="100%" viewBox="0 0 800 600">
        {tiles.map((tile, index) => (
          <Hexagon
            key={`${tile.q},${tile.r},${tile.s}-${index}`}
            q={tile.q}
            r={tile.r}
            s={tile.s}
            type={tile.type}
            owner={tile.owner}
            isUserCastle={userPosition && tile.q === userPosition.q && tile.r === userPosition.r && tile.s === userPosition.s}
            username={tile.owner ? usernames[tile.owner] : null}
            onClick={handleHexClick}
          />
        ))}
      </svg>
    </div>
  );
};
