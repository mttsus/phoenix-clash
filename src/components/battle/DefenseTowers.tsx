
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Tower {
  id: number;
  lane: number;
  position: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
}

interface DefenseTowersProps {
  towers: Tower[];
  onTowerSelect: (towerId: number) => void;
  selectedTower: number | null;
}

export const DefenseTowers = ({ towers, onTowerSelect, selectedTower }: DefenseTowersProps) => {
  const getLaneLabel = (lane: number) => {
    switch (lane) {
      case 0: return 'Sol Hat';
      case 1: return 'Orta Hat';
      case 2: return 'Sağ Hat';
      default: return `Hat ${lane + 1}`;
    }
  };

  const getPositionLabel = (position: number) => {
    switch (position) {
      case 0: return 'Ön';
      case 1: return 'Orta';
      case 2: return 'Arka';
      default: return `Pos ${position + 1}`;
    }
  };

  const activeTowers = towers.filter(t => !t.isDestroyed);
  const destroyedTowers = towers.filter(t => t.isDestroyed);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Savunma Kuleleri
          <Badge variant="secondary">
            {activeTowers.length}/9 Aktif
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hat bazında kuleler */}
        {[0, 1, 2].map(lane => (
          <div key={lane} className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">
              {getLaneLabel(lane)}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {towers
                .filter(t => t.lane === lane)
                .sort((a, b) => a.position - b.position)
                .map(tower => (
                  <div
                    key={tower.id}
                    className={`p-2 border rounded cursor-pointer transition-all ${
                      selectedTower === tower.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    } ${tower.isDestroyed ? 'opacity-50' : ''}`}
                    onClick={() => onTowerSelect(tower.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {getPositionLabel(tower.position)}
                      </span>
                      <span className="text-lg">
                        {tower.isDestroyed ? '💥' : '🏰'}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Can</span>
                        <span>{tower.health}/{tower.maxHealth}</span>
                      </div>
                      <Progress 
                        value={(tower.health / tower.maxHealth) * 100}
                        className="h-1"
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      {tower.isDestroyed ? 'Yıkıldı' : 'Aktif'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Genel İstatistikler */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Toplam Hasar Kapasitesi:</span>
            <span className="font-semibold">
              {activeTowers.length * 150} DPS
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Alan Hasarı (AoE):</span>
            <span className="font-semibold">100-200 asker/atış</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Mancınık Direnci:</span>
            <span className="font-semibold">10 atış = Yıkım</span>
          </div>
        </div>

        {destroyedTowers.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-sm font-medium text-red-800 mb-1">
              Yıkılan Kuleler ({destroyedTowers.length})
            </div>
            <div className="text-xs text-red-700">
              {destroyedTowers.map(t => 
                `${getLaneLabel(t.lane)} - ${getPositionLabel(t.position)}`
              ).join(', ')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
