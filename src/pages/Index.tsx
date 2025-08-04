
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HexGrid } from '@/components/game/HexGrid';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { ArmyPanel } from '@/components/game/ArmyPanel';
import { BattleSystem } from '@/components/game/BattleSystem';
import { GameProvider } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <GameProvider>
      <div className="min-h-screen bg-background">
        {/* Ana Oyun Arayüzü */}
        <div className="flex flex-col h-screen">
          {/* Üst Panel - Kaynaklar ve Arena Butonu */}
          <div className="h-20 border-b border-border flex">
            <div className="flex-1">
              <ResourcePanel />
            </div>
            <div className="flex items-center px-4">
              <Button
                onClick={() => navigate('/arena')}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Swords className="w-4 h-4" />
                Multiplayer Arena
              </Button>
            </div>
          </div>
          
          {/* Ana Oyun Alanı */}
          <div className="flex-1 flex">
            {/* Sol Panel - Ordu Yönetimi */}
            <div className="w-80 border-r border-border bg-card">
              <ArmyPanel />
            </div>
            
            {/* Merkez - Hex Grid Harita */}
            <div className="flex-1 relative">
              <HexGrid />
            </div>
            
            {/* Sağ Panel - Savaş Sistemi */}
            <div className="w-80 border-l border-border bg-card">
              <BattleSystem />
            </div>
          </div>
        </div>
      </div>
    </GameProvider>
  );
};

export default Index;
