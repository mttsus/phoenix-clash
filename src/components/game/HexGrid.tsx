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
  const [tiles, setTiles] = useState(state.hexTiles);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [usernames, setUsernames] = useState<{ [userId: string]: string }>({});
  const [resourceRegions, setResourceRegions] = useState<any[]>([]);

  const [selectedCastle, setSelectedCastle] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserPosition();
      fetchUsernames();
      fetchResourceRegions();
    }
  }, [user]);

  useEffect(() => {
    setTiles(state.hexTiles);
  }, [state.hexTiles]);

  const fetchUserPosition = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_positions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user position:', error);
        return;
      }

      setUserPosition({
        q: data.q,
        r: data.r,
        s: data.s
      });
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
    
    const hexKey = `${q},${r},${s}`;
    const clickedTile = tiles.find(tile => tile.q === q && tile.r === r && tile.s === s);
    
    if (!clickedTile) {
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

        // Kullanıcı pozisyonunu güncelle
        setUserPosition({ q, r, s });
        toast.success('Kale başarıyla taşındı!');
        
        // Tutorial event trigger
        if (onCastleMoved) {
          onCastleMoved();
        }

      } catch (err) {
        console.error('Unexpected error:', err);
        toast.error('Beklenmeyen bir hata oluştu');
      }
    } else if (clickedTile.type === 'castle' && clickedTile.owner === user.id) {
      // Kendi kalesi - kale içine gir
      setSelectedCastle({
        id: clickedTile.owner,
        user_id: clickedTile.owner,
        username: usernames[clickedTile.owner] || 'Unknown',
        q: clickedTile.q,
        r: clickedTile.r,
        s: clickedTile.s
      });
      
      // Tutorial event trigger
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

      // Tutorial event trigger
      if (onBattleStarted) {
        onBattleStarted();
      }
    } else if (clickedTile.type === 'mine' || clickedTile.type === 'forest') {
      // Kaynak bölgesi
      const resourceRegion = resourceRegions.find(
        region => region.q === q && region.r === r && region.s === s
      );

      if (resourceRegion && resourceRegion.boss_health > 0) {
        dispatch({ 
          type: 'START_BATTLE', 
          payload: { 
            resourceRegion,
            playerArmy: state.army,
            battleType: 'resource'
          } 
        });
      }
    }
  };

  const gridStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundImage: 'url("/images/grass_bg.png")',
    backgroundSize: 'cover',
  };

  return (
    <div style={gridStyle}>
      {tiles.map((tile) => (
        <Hexagon
          key={`${tile.q},${tile.r},${tile.s}`}
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
    </div>
  );
};
