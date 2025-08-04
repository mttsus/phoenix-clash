
import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface BattleUnit {
  id: string;
  type: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  isPlayerUnit: boolean;
  deployed: boolean;
}

export const BattleArena = () => {
  const { state, dispatch } = useGame();
  const [battleUnits, setBattleUnits] = useState<BattleUnit[]>([]);
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [deployMode, setDeployMode] = useState(false);

  const ARMY_UNITS = {
    swordsman: { name: 'Kılıçlı', icon: '⚔️' },
    archer: { name: 'Okçu', icon: '🏹' },
    cavalry: { name: 'Atlı', icon: '🐎' },
    mage_fire: { name: 'Ateş Büyücüsü', icon: '🔥' },
    mage_ice: { name: 'Buz Büyücüsü', icon: '❄️' },
    mage_lightning: { name: 'Şimşek Büyücüsü', icon: '⚡' }
  };

  const closeBattle = () => {
    dispatch({ type: 'END_BATTLE' });
  };

  const selectUnitToDeploy = (unitType: string) => {
    const availableUnit = state.army.find(unit => unit.type === unitType && unit.count > 0);
    if (availableUnit) {
      setSelectedUnitType(unitType);
      setDeployMode(true);
    }
  };

  const deployUnit = (x: number, y: number) => {
    if (!selectedUnitType || !deployMode) return;

    const availableUnit = state.army.find(unit => unit.type === selectedUnitType);
    if (!availableUnit || availableUnit.count <= 0) return;

    // Yeni battle unit oluştur
    const newBattleUnit: BattleUnit = {
      id: `${selectedUnitType}_${Date.now()}`,
      type: selectedUnitType,
      x: x,
      y: y,
      health: availableUnit.health,
      maxHealth: availableUnit.health,
      damage: availableUnit.damage,
      isPlayerUnit: true,
      deployed: true
    };

    setBattleUnits(prev => [...prev, newBattleUnit]);

    // Askeri birliğin sayısını azalt
    const updatedArmy = state.army.map(unit => 
      unit.type === selectedUnitType 
        ? { ...unit, count: unit.count - 1 }
        : unit
    ).filter(unit => unit.count > 0);

    dispatch({ 
      type: 'UPDATE_RESOURCES', 
      payload: {} 
    });

    setDeployMode(false);
    setSelectedUnitType('');
  };

  const handleArenaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!deployMode) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Sadece alt yarıda deployment yapılabilir
    if (y > rect.height / 2) {
      deployUnit(x, y);
    }
  };

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Savaş Arenası</h2>
            <p className="text-sm text-gray-600">
              Düşman: {state.battleState.enemy?.username}
            </p>
          </div>
          <Button onClick={closeBattle} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex">
          {/* Sol Panel - Asker Seçimi */}
          <div className="w-64 border-r p-4">
            <h3 className="font-semibold mb-4">Mevcut Askerler</h3>
            <div className="space-y-2">
              {state.army.map((unit, index) => (
                <Button
                  key={unit.id}
                  variant={selectedUnitType === unit.type ? "default" : "outline"}
                  onClick={() => selectUnitToDeploy(unit.type)}
                  className="w-full flex justify-between"
                  disabled={unit.count <= 0}
                >
                  <span className="flex items-center gap-2">
                    <span>{ARMY_UNITS[unit.type as keyof typeof ARMY_UNITS]?.icon}</span>
                    <span className="text-xs">{ARMY_UNITS[unit.type as keyof typeof ARMY_UNITS]?.name}</span>
                  </span>
                  <Badge variant="secondary">{unit.count}</Badge>
                </Button>
              ))}
              {state.army.length === 0 && (
                <p className="text-sm text-gray-500">Hiç asker yok</p>
              )}
            </div>

            {deployMode && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-700">
                  Alt alanda bir yere tıklayarak askeri yerleştirin
                </p>
              </div>
            )}
          </div>

          {/* Ana Arena */}
          <div className="flex-1 relative">
            <div 
              className={`w-full h-full bg-gradient-to-b from-red-100 via-yellow-50 to-green-100 relative overflow-hidden ${
                deployMode ? 'cursor-crosshair' : 'cursor-default'
              }`}
              onClick={handleArenaClick}
            >
              {/* Orta çizgi */}
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-400 transform -translate-y-0.5"></div>
              
              {/* Düşman bölgesi */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded">
                  <span>🏰</span>
                  <span className="text-sm font-semibold">
                    {state.battleState.enemy?.username} Kalesi
                  </span>
                </div>
              </div>

              {/* Oyuncu bölgesi */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded">
                  <span>👤</span>
                  <span className="text-sm font-semibold">Senin Bölgen</span>
                </div>
              </div>

              {/* Battle units */}
              {battleUnits.map(unit => (
                <div
                  key={unit.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: unit.x, top: unit.y }}
                >
                  <div className="text-lg">
                    {ARMY_UNITS[unit.type as keyof typeof ARMY_UNITS]?.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alt Panel - Kontroller */}
        <div className="p-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span>Toplam Yerleştirilen: {battleUnits.length}</span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeployMode(false);
                  setSelectedUnitType('');
                }}
                disabled={!deployMode}
              >
                İptal Et
              </Button>
              <Button onClick={closeBattle} variant="secondary">
                Savaşı Bitir
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
