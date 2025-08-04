
import { useState, useEffect } from 'react';
import { HexGrid } from '@/components/game/HexGrid';
import { ResourcePanel } from '@/components/game/ResourcePanel';
import { ArmyPanel } from '@/components/game/ArmyPanel';
import { BattleSystem } from '@/components/game/BattleSystem';
import { GameProvider } from '@/contexts/GameContext';

const Index = () => {
  return (
    <GameProvider>
      <div className="min-h-screen bg-background">
        {/* Ana Oyun Arayüzü */}
        <div className="flex flex-col h-screen">
          {/* Üst Panel - Kaynaklar */}
          <div className="h-20 border-b border-border">
            <ResourcePanel />
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
