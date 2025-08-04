
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const ARMY_UNITS = {
  swordsman: { name: 'Kılıçlı', damage: 50, health: 100, icon: '⚔️' },
  archer: { name: 'Okçu', damage: 40, health: 80, icon: '🏹' },
  cavalry: { name: 'Atlı', damage: 70, health: 120, icon: '🐎' },
  mage_fire: { name: 'Ateş Büyücüsü', damage: 90, health: 60, icon: '🔥' },
  mage_ice: { name: 'Buz Büyücüsü', damage: 80, health: 70, icon: '❄️' },
  mage_lightning: { name: 'Şimşek Büyücüsü', damage: 100, health: 50, icon: '⚡' }
};

export const ArmyPanel = () => {
  const { state, dispatch } = useGame();
  const [selectedUnitType, setSelectedUnitType] = useState<keyof typeof ARMY_UNITS>('swordsman');

  const canCreateArmy = () => {
    const cost = 500;
    return Object.values(state.resources).every(resource => resource >= cost);
  };

  const createArmyUnit = () => {
    if (!canCreateArmy()) return;

    const unitData = ARMY_UNITS[selectedUnitType];
    const newUnit = {
      id: `${selectedUnitType}_${Date.now()}`,
      type: selectedUnitType,
      count: 100, // Her üretimde 100 asker
      damage: unitData.damage,
      health: unitData.health
    };

    dispatch({ type: 'CREATE_ARMY_UNIT', payload: newUnit });
  };

  const getTotalArmyCount = () => {
    return state.army.reduce((total, unit) => total + unit.count, 0);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Ordu Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Toplam Asker:</span>
              <Badge variant="secondary">{getTotalArmyCount()} / 10.000</Badge>
            </div>
            <div className="flex justify-between">
              <span>Mana:</span>
              <Badge variant="default">10 / 10</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Ordu Üretimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ARMY_UNITS).map(([key, unit]) => (
                <Button
                  key={key}
                  variant={selectedUnitType === key ? "default" : "outline"}
                  onClick={() => setSelectedUnitType(key as keyof typeof ARMY_UNITS)}
                  className="p-2 h-auto flex flex-col"
                  size="sm"
                >
                  <span className="text-lg">{unit.icon}</span>
                  <span className="text-xs">{unit.name}</span>
                </Button>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div>Hasar: {ARMY_UNITS[selectedUnitType].damage}</div>
              <div>Sağlık: {ARMY_UNITS[selectedUnitType].health}</div>
              <div className="mt-2">Maliyet: 500 her kaynak</div>
            </div>
            
            <Button 
              onClick={createArmyUnit} 
              disabled={!canCreateArmy()}
              className="w-full"
            >
              100 {ARMY_UNITS[selectedUnitType].name} Üret
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">Mevcut Ordu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {state.army.map((unit, index) => (
              <div key={unit.id} className="flex justify-between items-center p-2 bg-muted rounded">
                <div className="flex items-center space-x-2">
                  <span>{ARMY_UNITS[unit.type].icon}</span>
                  <span className="text-sm">{ARMY_UNITS[unit.type].name}</span>
                </div>
                <Badge variant="outline">{unit.count}</Badge>
              </div>
            ))}
            {state.army.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Henüz ordu yok
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
