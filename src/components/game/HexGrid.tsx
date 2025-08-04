
import { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';

interface HexPosition {
  q: number;
  r: number;
  s: number;
}

const HexTile = ({ q, r, s, type, onClick, isSelected }: {
  q: number;
  r: number;
  s: number;
  type: string;
  onClick: () => void;
  isSelected: boolean;
}) => {
  const size = 30;
  const width = size * 2;
  const height = size * Math.sqrt(3);
  
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  
  const getColor = () => {
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
        y="5" 
        textAnchor="middle" 
        className="text-xs fill-current text-foreground pointer-events-none"
      >
        {type[0].toUpperCase()}
      </text>
    </g>
  );
};

export const HexGrid = () => {
  const { state, dispatch } = useGame();
  const [tiles, setTiles] = useState<Array<{q: number, r: number, s: number, type: string}>>([]);

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
        let type = 'plain';
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

  const handleTileClick = (tile: {q: number, r: number, s: number, type: string}) => {
    dispatch({ 
      type: 'SELECT_TILE', 
      payload: { ...tile, owner: 'player' } 
    });
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden">
      <div className="w-full h-full flex items-center justify-center">
        <svg width="600" height="600" viewBox="0 0 600 600">
          {tiles.map((tile, index) => (
            <HexTile
              key={index}
              q={tile.q}
              r={tile.r}
              s={tile.s}
              type={tile.type}
              onClick={() => handleTileClick(tile)}
              isSelected={state.selectedTile?.q === tile.q && state.selectedTile?.r === tile.r}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
