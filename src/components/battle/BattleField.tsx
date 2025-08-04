
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { DefenseTowers } from './DefenseTowers';
import { CatapultSystem } from './CatapultSystem';
import { UnitBattalions } from './UnitBattalions';

interface Tower {
  id: number;
  lane: number; // 0: sol, 1: orta, 2: sağ
  position: number; // 0, 1, 2 (önden arkaya)
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
}

interface Catapult {
  id: number;
  team: 'player' | 'enemy';
  health: number;
  lastShot: number;
  isDestroyed: boolean;
}

interface Battalion {
  id: number;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  lane: number;
  position: number;
  units: number;
  isMoving: boolean;
  reachedTower: boolean;
}

export const BattleField = () => {
  const { state, dispatch } = useGame();
  const [battleActive, setBattleActive] = useState(false);
  const [mana, setMana] = useState(10);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [catapults, setCatapults] = useState<Catapult[]>([]);
  const [playerBattalions, setPlayerBattalions] = useState<Battalion[]>([]);
  const [enemyBattalions, setEnemyBattalions] = useState<Battalion[]>([]);
  const [battleTime, setBattleTime] = useState(0);

  // 9 kuleyi başlat (3 hat x 3 pozisyon)
  useEffect(() => {
    const initialTowers: Tower[] = [];
    for (let lane = 0; lane < 3; lane++) {
      for (let pos = 0; pos < 3; pos++) {
        initialTowers.push({
          id: lane * 3 + pos,
          lane,
          position: pos,
          health: 1000,
          maxHealth: 1000,
          isDestroyed: false
        });
      }
    }
    setTowers(initialTowers);

    // Mancınıkları başlat
    setCatapults([
      { id: 0, team: 'player', health: 1, lastShot: 0, isDestroyed: false },
      { id: 1, team: 'enemy', health: 1, lastShot: 0, isDestroyed: false }
    ]);
  }, []);

  // Savaş döngüsü
  useEffect(() => {
    if (!battleActive) return;

    const interval = setInterval(() => {
      setBattleTime(prev => prev + 1);
      
      // Mana yenileme (3 saniyede 1)
      if (battleTime % 3 === 0 && mana < 10) {
        setMana(prev => Math.min(10, prev + 1));
      }

      // Mancınık otomatik atış (21 saniyede bir)
      if (battleTime % 21 === 0) {
        fireCatapults();
      }

      // Taburları hareket ettir
      moveUnits();
      
      // Kule saldırıları
      towerAttacks();
      
    }, 1000); // 1 saniye = 1 savaş saniyesi

    return () => clearInterval(interval);
  }, [battleActive, battleTime, mana, playerBattalions, enemyBattalions, towers]);

  const startBattle = () => {
    setBattleActive(true);
    setBattleTime(0);
    setMana(10);
  };

  const endBattle = () => {
    setBattleActive(false);
    dispatch({ type: 'END_BATTLE' });
  };

  const deployBattalion = (unitType: string, lane: number) => {
    if (mana <= 0) return;
    
    const availableUnits = state.army.filter(unit => unit.type === unitType && unit.count >= 100);
    if (availableUnits.length === 0) return;

    const newBattalion: Battalion = {
      id: Date.now(),
      type: unitType as any,
      lane,
      position: 0, // Başlangıç pozisyonu
      units: 100,
      isMoving: true,
      reachedTower: false
    };

    setPlayerBattalions(prev => [...prev, newBattalion]);
    setMana(prev => prev - 1);

    // Ordudan askeri düş
    dispatch({
      type: 'UPDATE_RESOURCES',
      payload: {}
    });
  };

  const fireCatapults = () => {
    setCatapults(prev => prev.map(catapult => {
      if (catapult.isDestroyed) return catapult;

      // Rastgele kuleye saldır
      const targetLane = Math.floor(Math.random() * 3);
      const availableTowers = towers.filter(t => t.lane === targetLane && !t.isDestroyed);
      
      if (availableTowers.length > 0) {
        const targetTower = availableTowers[Math.floor(Math.random() * availableTowers.length)];
        damageTower(targetTower.id, 100);
      }

      return { ...catapult, lastShot: battleTime };
    }));
  };

  const moveUnits = () => {
    setPlayerBattalions(prev => prev.map(battalion => {
      if (!battalion.isMoving || battalion.reachedTower) return battalion;

      // Atlılar 7 saniyede ortaya ulaşır (pozisyon 1)
      const moveSpeed = battalion.type === 'cavalry' ? 7 : 10;
      const shouldMove = battleTime % moveSpeed === 0;

      if (shouldMove && battalion.position < 2) {
        return { ...battalion, position: battalion.position + 1 };
      }

      // Son pozisyona ulaştı
      if (battalion.position >= 2) {
        return { ...battalion, reachedTower: true, isMoving: false };
      }

      return battalion;
    }));
  };

  const towerAttacks = () => {
    // Her kule saldırısı (AoE - 100-200 asker öldürür)
    towers.forEach(tower => {
      if (tower.isDestroyed) return;

      const nearbyBattalions = playerBattalions.filter(
        b => b.lane === tower.lane && b.position >= tower.position && b.units > 0
      );

      nearbyBattalions.forEach(battalion => {
        const casualties = Math.min(battalion.units, Math.floor(Math.random() * 100) + 100);
        battalion.units -= casualties;
        
        if (battalion.units <= 0) {
          setPlayerBattalions(prev => prev.filter(b => b.id !== battalion.id));
        }
      });
    });
  };

  const damageTower = (towerId: number, damage: number) => {
    setTowers(prev => prev.map(tower => {
      if (tower.id === towerId && !tower.isDestroyed) {
        const newHealth = Math.max(0, tower.health - damage);
        return {
          ...tower,
          health: newHealth,
          isDestroyed: newHealth <= 0
        };
      }
      return tower;
    }));
  };

  const getLaneLabel = (lane: number) => {
    switch (lane) {
      case 0: return 'Sol Hat';
      case 1: return 'Orta Hat';
      case 2: return 'Sağ Hat';
      default: return `Hat ${lane + 1}`;
    }
  };

  const activeTowers = towers.filter(t => !t.isDestroyed).length;
  const totalUnitsDeployed = playerBattalions.reduce((sum, b) => sum + b.units, 0);

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Savaş Alanı</h2>
            <p className="text-sm text-gray-600">
              Düşman: {state.battleState.enemy?.username} | Süre: {Math.floor(battleTime / 60)}:{String(battleTime % 60).padStart(2, '0')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <Badge variant="secondary">Mana: {mana}/10</Badge>
            </div>
            <Button onClick={endBattle} variant="outline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Sol Panel - Kontroller */}
          <div className="w-80 border-r p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Savaş Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">Aktif Kuleler</span>
                    <span className="text-xs">{activeTowers}/9</span>
                  </div>
                  <Progress value={(activeTowers / 9) * 100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">Mevcut Birimler</span>
                    <span className="text-xs">{totalUnitsDeployed}</span>
                  </div>
                  <Progress value={Math.min((totalUnitsDeployed / 10000) * 100, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Tabu Gönderme */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tabur Gönder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[0, 1, 2].map(lane => (
                  <div key={lane} className="space-y-2">
                    <div className="text-xs font-medium">{getLaneLabel(lane)}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {['swordsman', 'archer', 'cavalry', 'mage_fire'].map(unitType => (
                        <Button
                          key={unitType}
                          size="sm"
                          variant="outline"
                          onClick={() => deployBattalion(unitType, lane)}
                          disabled={mana <= 0 || !battleActive}
                          className="text-xs p-1 h-8"
                        >
                          {unitType === 'swordsman' && '⚔️'}
                          {unitType === 'archer' && '🏹'}
                          {unitType === 'cavalry' && '🐎'}
                          {unitType === 'mage_fire' && '🔥'}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500">Her tabur 100 asker içerir</p>
              </CardContent>
            </Card>

            {!battleActive ? (
              <Button onClick={startBattle} className="w-full">
                Savaşı Başlat
              </Button>
            ) : (
              <Button onClick={endBattle} variant="destructive" className="w-full">
                Savaştan Çık
              </Button>
            )}
          </div>

          {/* Ana Savaş Alanı */}
          <div className="flex-1 relative bg-gradient-to-r from-green-100 via-yellow-50 to-red-100">
            {/* 3 Hat Sistemi */}
            <div className="absolute inset-0 grid grid-rows-3 gap-2 p-4">
              {[0, 1, 2].map(lane => (
                <div key={lane} className="relative border-2 border-gray-300 rounded bg-white/50">
                  <div className="absolute left-2 top-1 text-xs font-bold">
                    {getLaneLabel(lane)}
                  </div>
                  
                  {/* Kuleler */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex gap-2">
                    {towers.filter(t => t.lane === lane).map(tower => (
                      <div
                        key={tower.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                          tower.isDestroyed ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                        }`}
                        title={`Kule ${tower.position + 1}: ${tower.health}/${tower.maxHealth} HP`}
                      >
                        {tower.isDestroyed ? '💥' : '🏰'}
                      </div>
                    ))}
                  </div>

                  {/* Taburlar */}
                  <div className="absolute left-16 top-1/2 transform -translate-y-1/2 flex gap-1">
                    {playerBattalions
                      .filter(b => b.lane === lane)
                      .map(battalion => (
                        <div
                          key={battalion.id}
                          className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs text-white"
                          style={{
                            transform: `translateX(${battalion.position * 40}px)`
                          }}
                          title={`${battalion.units} ${battalion.type}`}
                        >
                          {battalion.type === 'cavalry' ? '🐎' : '⚔️'}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mancınık Göstergesi */}
            <div className="absolute bottom-4 left-4 flex gap-4">
              <div className="bg-blue-100 p-2 rounded">
                <div className="text-xs">Mancınık (Sen)</div>
                <div className="text-lg">🎯</div>
              </div>
              <div className="bg-red-100 p-2 rounded">
                <div className="text-xs">Düşman Mancınığı</div>
                <div className="text-lg">🎯</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
