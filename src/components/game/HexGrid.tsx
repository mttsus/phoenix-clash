
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
  const [allUserPositions, setAllUserPositions] = useState<any[]>([]);
  const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
  const [resourceRegions, setResourceRegions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchRealMapData();
    }
  }, [user]);

  const fetchRealMapData = async () => {
    try {
      console.log('Fetching real map data...');
      
      // Tüm kullanıcı pozisyonlarını getir
      const { data: positions, error: posError } = await supabase
        .from('user_positions')
        .select('*');

      if (posError) {
        console.error('Error fetching user positions:', posError);
        return;
      }

      console.log('User positions:', positions);
      setAllUserPositions(positions || []);

      // Kullanıcı adlarını getir
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      } else {
        const names: { [userId: string]: string } = {};
        profiles?.forEach(profile => {
          names[profile.id] = profile.username;
        });
        setUsernames(names);
        console.log('Usernames:', names);
      }

      // Kaynak bölgelerini getir
      const { data: regions, error: regError } = await supabase
        .from('resource_regions')
        .select('*');

      if (regError) {
        console.error('Error fetching resource regions:', regError);
      } else {
        setResourceRegions(regions || []);
        console.log('Resource regions:', regions);
      }

      // Haritayı oluştur
      createRealMap(positions || [], regions || []);

    } catch (error) {
      console.error('Unexpected error fetching map data:', error);
    }
  };

  const createRealMap = (userPositions: any[], regions: any[]) => {
    const mapTiles = [];
    
    console.log('Creating real map with positions:', userPositions, 'regions:', regions);

    // Önce boş hex'leri oluştur (geniş alan)
    for (let q = -10; q <= 10; q++) {
      for (let r = -10; r <= 10; r++) {
        const s = -q - r;
        if (Math.abs(q) + Math.abs(r) + Math.abs(s) <= 20) {
          mapTiles.push({
            q,
            r,
            s,
            type: null,
            owner: null
          });
        }
      }
    }

    // Kullanıcı kalelerini ekle
    userPositions.forEach(pos => {
      const existingTileIndex = mapTiles.findIndex(
        tile => tile.q === pos.q && tile.r === pos.r && tile.s === pos.s
      );
      
      if (existingTileIndex !== -1) {
        mapTiles[existingTileIndex] = {
          q: pos.q,
          r: pos.r,
          s: pos.s,
          type: 'castle',
          owner: pos.user_id
        };
      } else {
        mapTiles.push({
          q: pos.q,
          r: pos.r,
          s: pos.s,
          type: 'castle',
          owner: pos.user_id
        });
      }
    });

    // Kaynak bölgelerini ekle
    regions.forEach(region => {
      const existingTileIndex = mapTiles.findIndex(
        tile => tile.q === region.q && tile.r === region.r && tile.s === region.s
      );
      
      const resourceType = region.resource_type === 'wood' ? 'forest' : 'mine';
      
      if (existingTileIndex !== -1) {
        mapTiles[existingTileIndex] = {
          q: region.q,
          r: region.r,
          s: region.s,
          type: resourceType,
          owner: region.owner_id
        };
      } else {
        mapTiles.push({
          q: region.q,
          r: region.r,
          s: region.s,
          type: resourceType,
          owner: region.owner_id
        });
      }
    });

    console.log('Generated map tiles:', mapTiles);
    setTiles(mapTiles);
    dispatch({ type: 'SET_HEX_TILES', payload: mapTiles });
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

        // Haritayı yeniden yükle
        await fetchRealMapData();
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
      // Başka birinin kalesi - savaş başlat
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
    } else if ((clickedTile.type === 'forest' || clickedTile.type === 'mine') && !clickedTile.owner) {
      // Boş kaynak bölgesi - savaş başlat
      const region = resourceRegions.find(r => r.q === q && r.r === r && r.s === s);
      if (region) {
        dispatch({
          type: 'START_BATTLE',
          payload: {
            resourceRegion: region,
            playerArmy: state.army,
            battleType: 'resource'
          }
        });

        if (onBattleStarted) {
          onBattleStarted();
        }
      }
    }
  };

  const getUserPosition = () => {
    return allUserPositions.find(pos => pos.user_id === user?.id);
  };

  const gridStyle: React.CSSProperties = {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    backgroundImage: 'url("/images/grass_bg.png")',
    backgroundSize: 'cover',
    minHeight: '600px'
  };

  console.log('Rendering HexGrid with tiles:', tiles.length, 'tiles');

  return (
    <div style={gridStyle}>
      <svg width="100%" height="100%" viewBox="0 0 800 600">
        {tiles.map((tile, index) => {
          const userPos = getUserPosition();
          const isUserCastle = userPos && 
            tile.q === userPos.q && 
            tile.r === userPos.r && 
            tile.s === userPos.s && 
            tile.owner === user?.id;

          return (
            <Hexagon
              key={`${tile.q},${tile.r},${tile.s}-${index}`}
              q={tile.q}
              r={tile.r}
              s={tile.s}
              type={tile.type}
              owner={tile.owner}
              isUserCastle={isUserCastle}
              username={tile.owner ? usernames[tile.owner] : null}
              onClick={handleHexClick}
            />
          );
        })}
      </svg>
    </div>
  );
};
