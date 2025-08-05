
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DefenseTower {
  id: number;
  lane: number;
  position: number;
  isActive: boolean;
  upgrades: string[];
}

interface BattleStrategyProps {
  onStartBattle: (strategy: any) => void;
}

export const BattleStrategy = ({ onStartBattle }: BattleStrategyProps) => {
  const [defenseTowers, setDefenseTowers] = useState<DefenseTower[]>([
    // Initialize 9 towers (3 lanes x 3 positions)
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i,
      lane: Math.floor(i / 3),
      position: i % 3,
      isActive: true,
      upgrades: []
    }))
  ]);

  const [attackUnits, setAttackUnits] = useState({
    swordsman: 2000,
    archer: 2000,
    cavalry: 1000,
    mage_fire: 500,
    mage_ice: 500,
    mage_lightning: 200
  });

  const [defenseUnits, setDefenseUnits] = useState({
    swordsman: 1000,
    archer: 1500,
    cavalry: 500,
    mage_fire: 300,
    mage_ice: 200,
    mage_lightning: 100
  });

  const toggleTower = (towerId: number) => {
    setDefenseTowers(prev => 
      prev.map(tower => 
        tower.id === towerId 
          ? { ...tower, isActive: !tower.isActive }
          : tower
      )
    );
  };

  const getLaneLabel = (lane: number) => {
    return ['Sol Hat', 'Orta Hat', 'Sağ Hat'][lane];
  };

  const getPositionLabel = (position: number) => {
    return ['Ön', 'Orta', 'Arka'][position];
  };

  const handleStartBattle = () => {
    const strategy = {
      defenseTowers: defenseTowers.filter(t => t.isActive),
      attackUnits,
      defenseUnits
    };
    onStartBattle(strategy);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Defense Tower Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Savunma Kuleleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[0, 1, 2].map(lane => (
              <div key={lane} className="space-y-2">
                <h4 className="font-semibold text-sm">{getLaneLabel(lane)}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {defenseTowers
                    .filter(t => t.lane === lane)
                    .sort((a, b) => a.position - b.position)
                    .map(tower => (
                      <Button
                        key={tower.id}
                        variant={tower.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTower(tower.id)}
                        className="h-16 flex flex-col gap-1"
                      >
                        <span className="text-lg">🗼</span>
                        <span className="text-xs">{getPositionLabel(tower.position)}</span>
                      </Button>
                    ))}
                </div>
              </div>
            ))}
            
            <Separator />
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Her kule: 1000 HP</div>
              <div>• Mancınık hasarı: 100</div>
              <div>• Alan hasarı: 100-200 asker</div>
              <div>• Yıkım: 10 mancınık atışı</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attack Army Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Saldırı Ordusu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(attackUnits).map(([unitType, count]) => (
              <div key={unitType} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {unitType === 'swordsman' ? '⚔️' : 
                     unitType === 'archer' ? '🏹' :
                     unitType === 'cavalry' ? '🐎' :
                     unitType === 'mage_fire' ? '🔥' :
                     unitType === 'mage_ice' ? '❄️' : '⚡'}
                  </span>
                  <span className="text-sm font-medium">
                    {unitType === 'swordsman' ? 'Kılıçlı' :
                     unitType === 'archer' ? 'Okçu' :
                     unitType === 'cavalry' ? 'Atlı' :
                     unitType === 'mage_fire' ? 'Ateş Büyücü' :
                     unitType === 'mage_ice' ? 'Buz Büyücü' : 'Şimşek Büyücü'}
                  </span>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            
            <Separator />
            
            <div className="text-sm text-muted-foreground">
              <div>Toplam Saldırı Gücü: {Object.values(attackUnits).reduce((a, b) => a + b, 0)} asker</div>
              <div>Maksimum Kapasite: 10,000 asker</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defense Army Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Savunma Ordusu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(defenseUnits).map(([unitType, count]) => (
              <div key={unitType} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {unitType === 'swordsman' ? '⚔️' : 
                     unitType === 'archer' ? '🏹' :
                     unitType === 'cavalry' ? '🐎' :
                     unitType === 'mage_fire' ? '🔥' :
                     unitType === 'mage_ice' ? '❄️' : '⚡'}
                  </span>
                  <span className="text-sm font-medium">
                    {unitType === 'swordsman' ? 'Kılıçlı' :
                     unitType === 'archer' ? 'Okçu' :
                     unitType === 'cavalry' ? 'Atlı' :
                     unitType === 'mage_fire' ? 'Ateş Büyücü' :
                     unitType === 'mage_ice' ? 'Buz Büyücü' : 'Şimşek Büyücü'}
                  </span>
                </div>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Toplam Savunma: {Object.values(defenseUnits).reduce((a, b) => a + b, 0)} asker
              </div>
              
              <Button 
                onClick={handleStartBattle}
                className="w-full"
                size="lg"
              >
                Savaşı Başlat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
