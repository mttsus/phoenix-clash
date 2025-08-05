
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Sword } from 'lucide-react';

interface Castle {
  id: string;
  team: 'player' | 'enemy';
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
}

interface Unit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire';
  team: 'player' | 'enemy';
  lane: number; // 0: top, 1: middle, 2: bottom
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  target?: Unit;
  isMoving: boolean;
  lastAttack: number;
}

const UNIT_CONFIGS = {
  swordsman: { icon: '⚔️', health: 100, damage: 25, speed: 50, cost: 2 },
  archer: { icon: '🏹', health: 80, damage: 35, speed: 60, cost: 3 },
  cavalry: { icon: '🐎', health: 150, damage: 40, speed: 80, cost: 4 },
  mage_fire: { icon: '🔥', health: 70, damage: 60, speed: 45, cost: 5 }
};

export const BattleField = () => {
  const { state, dispatch } = useGame();
  const [battleActive, setBattleActive] = useState(false);
  const [mana, setMana] = useState(10);
  const [units, setUnits] = useState<Unit[]>([]);
  const [castles, setCastles] = useState<Castle[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);

  // Initialize castles
  useEffect(() => {
    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 2500,
        maxHealth: 2500,
        position: { x: 50, y: 300 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy', 
        health: 2500,
        maxHealth: 2500,
        position: { x: 950, y: 300 }
      }
    ]);
  }, []);

  // Battle loop
  useEffect(() => {
    if (!battleActive || gameResult) return;

    const interval = setInterval(() => {
      setBattleTime(prev => prev + 1);
      
      // Mana regeneration (every 2 seconds)
      if (battleTime % 2 === 0 && mana < 10) {
        setMana(prev => Math.min(10, prev + 1));
      }

      // Move units and handle combat
      moveAndFightUnits();
      
      // Spawn enemy units occasionally
      if (battleTime % 8 === 0) {
        spawnEnemyUnit();
      }
      
    }, 1000);

    return () => clearInterval(interval);
  }, [battleActive, battleTime, mana, units, gameResult]);

  const startBattle = () => {
    setBattleActive(true);
    setBattleTime(0);
    setMana(10);
    setUnits([]);
    setGameResult(null);
    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 2500,
        maxHealth: 2500,
        position: { x: 50, y: 300 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy',
        health: 2500,
        maxHealth: 2500,
        position: { x: 950, y: 300 }
      }
    ]);
  };

  const endBattle = () => {
    setBattleActive(false);
    setGameResult(null);
    dispatch({ type: 'END_BATTLE' });
  };

  const deployUnit = (unitType: keyof typeof UNIT_CONFIGS, lane: number) => {
    const config = UNIT_CONFIGS[unitType];
    if (mana < config.cost) return;

    const newUnit: Unit = {
      id: `player-${Date.now()}-${Math.random()}`,
      type: unitType,
      team: 'player',
      lane,
      position: { x: 100, y: 150 + lane * 150 }, // Starting position based on lane
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0
    };

    setUnits(prev => [...prev, newUnit]);
    setMana(prev => prev - config.cost);
  };

  const spawnEnemyUnit = () => {
    const unitTypes = Object.keys(UNIT_CONFIGS) as (keyof typeof UNIT_CONFIGS)[];
    const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
    const randomLane = Math.floor(Math.random() * 3);
    const config = UNIT_CONFIGS[randomType];

    const enemyUnit: Unit = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      type: randomType,
      team: 'enemy',
      lane: randomLane,
      position: { x: 900, y: 150 + randomLane * 150 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0
    };

    setUnits(prev => [...prev, enemyUnit]);
  };

  const moveAndFightUnits = () => {
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(unit => {
        if (unit.health <= 0) return unit;

        // Find nearest enemy
        const enemies = prevUnits.filter(u => 
          u.team !== unit.team && 
          u.health > 0 && 
          u.lane === unit.lane &&
          Math.abs(u.position.x - unit.position.x) < 120
        );

        if (enemies.length > 0) {
          // Fight nearest enemy
          const nearestEnemy = enemies.reduce((closest, enemy) => {
            const distToEnemy = Math.abs(enemy.position.x - unit.position.x);
            const distToClosest = Math.abs(closest.position.x - unit.position.x);
            return distToEnemy < distToClosest ? enemy : closest;
          });

          const distance = Math.abs(nearestEnemy.position.x - unit.position.x);
          
          if (distance < 80) {
            // Attack if close enough and cooldown is ready
            if (battleTime - unit.lastAttack >= 1) {
              // This unit will attack the enemy (handled in next iteration)
              return { ...unit, target: nearestEnemy, isMoving: false, lastAttack: battleTime };
            }
            return { ...unit, isMoving: false };
          }
        }

        // No enemies nearby, move towards enemy castle
        if (unit.isMoving) {
          const direction = unit.team === 'player' ? 1 : -1;
          const newX = unit.position.x + (unit.speed / 10) * direction;
          
          // Check if reached enemy castle
          const enemyCastle = castles.find(c => c.team !== unit.team);
          if (enemyCastle && Math.abs(newX - enemyCastle.position.x) < 100) {
            // Attack castle
            if (battleTime - unit.lastAttack >= 1) {
              setCastles(prev => prev.map(castle => {
                if (castle.team !== unit.team) {
                  const newHealth = Math.max(0, castle.health - unit.damage);
                  return { ...castle, health: newHealth };
                }
                return castle;
              }));
              return { ...unit, lastAttack: battleTime };
            }
          }

          return { ...unit, position: { ...unit.position, x: newX } };
        }

        return unit;
      });

      // Handle combat damage
      const finalUnits = updatedUnits.map(unit => {
        if (unit.target && unit.lastAttack === battleTime) {
          // Find the target and damage it
          const targetIndex = updatedUnits.findIndex(u => u.id === unit.target?.id);
          if (targetIndex !== -1) {
            updatedUnits[targetIndex] = {
              ...updatedUnits[targetIndex],
              health: Math.max(0, updatedUnits[targetIndex].health - unit.damage)
            };
          }
          return { ...unit, target: undefined };
        }
        return unit;
      });

      // Remove dead units
      return finalUnits.filter(unit => unit.health > 0);
    });

    // Check win/lose conditions
    setCastles(prev => {
      const playerCastle = prev.find(c => c.team === 'player');
      const enemyCastle = prev.find(c => c.team === 'enemy');
      
      if (playerCastle && playerCastle.health <= 0) {
        setGameResult('lose');
        setBattleActive(false);
      } else if (enemyCastle && enemyCastle.health <= 0) {
        setGameResult('win');
        setBattleActive(false);
      }
      
      return prev;
    });
  };

  const getLaneColor = (lane: number) => {
    switch (lane) {
      case 0: return 'border-blue-400 bg-blue-50';
      case 1: return 'border-green-400 bg-green-50';
      case 2: return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const playerCastle = castles.find(c => c.team === 'player');
  const enemyCastle = castles.find(c => c.team === 'enemy');

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Savaş Alanı - Clash Royale Tarzı</h2>
            <p className="text-sm text-gray-600">
              Süre: {Math.floor(battleTime / 60)}:{String(battleTime % 60).padStart(2, '0')}
              {gameResult && (
                <span className={`ml-4 font-bold ${gameResult === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                  {gameResult === 'win' ? '🎉 KAZANDIN!' : '💀 KAYBETTİN!'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">Mana: {mana}/10</Badge>
            <Button onClick={endBattle} variant="outline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Panel - Unit Deployment */}
          <div className="w-72 border-r p-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Kale Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">Senin Kalen</span>
                    <span className="text-xs">{playerCastle?.health}/{playerCastle?.maxHealth}</span>
                  </div>
                  <Progress value={playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">Düşman Kalesi</span>
                    <span className="text-xs">{enemyCastle?.health}/{enemyCastle?.maxHealth}</span>
                  </div>
                  <Progress value={enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Unit Deployment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Asker Gönder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[0, 1, 2].map(lane => (
                  <div key={lane} className="space-y-2">
                    <div className="text-xs font-medium">
                      {lane === 0 ? 'Üst Yol' : lane === 1 ? 'Orta Yol' : 'Alt Yol'}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(UNIT_CONFIGS).map(([unitType, config]) => (
                        <Button
                          key={unitType}
                          size="sm"
                          variant="outline"
                          onClick={() => deployUnit(unitType as keyof typeof UNIT_CONFIGS, lane)}
                          disabled={mana < config.cost || !battleActive}
                          className="text-xs p-1 h-10 flex flex-col"
                        >
                          <span className="text-base">{config.icon}</span>
                          <span className="text-xs">{config.cost} mana</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
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

          {/* Battle Arena - Top Down View */}
          <div className="flex-1 relative bg-gradient-to-r from-green-200 via-yellow-100 to-green-200">
            {/* 3 Lanes */}
            <div className="absolute inset-4 grid grid-rows-3 gap-4">
              {[0, 1, 2].map(lane => (
                <div key={lane} className={`relative border-2 rounded ${getLaneColor(lane)} overflow-hidden`}>
                  <div className="absolute left-2 top-2 text-xs font-bold">
                    {lane === 0 ? 'ÜST YOL' : lane === 1 ? 'ORTA YOL' : 'ALT YOL'}
                  </div>
                  
                  {/* Player Castle */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-16 h-12 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xl">🏰</span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      {Math.round(((playerCastle?.health || 0) / 2500) * 100)}%
                    </div>
                  </div>

                  {/* Enemy Castle */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-16 h-12 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xl">🏰</span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      {Math.round(((enemyCastle?.health || 0) / 2500) * 100)}%
                    </div>
                  </div>

                  {/* Units in this lane */}
                  {units
                    .filter(unit => unit.lane === lane)
                    .map(unit => (
                      <div
                        key={unit.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
                          unit.team === 'player' ? 'text-blue-600' : 'text-red-600'
                        }`}
                        style={{
                          left: `${(unit.position.x / 1000) * 100}%`,
                          top: '50%'
                        }}
                      >
                        <div className="text-lg">
                          {UNIT_CONFIGS[unit.type].icon}
                        </div>
                        <div className="w-8 h-1 bg-gray-300 rounded mt-1">
                          <div 
                            className="h-full bg-green-500 rounded"
                            style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {/* Battle Statistics */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
              <div>Aktif Birimler: {units.length}</div>
              <div>Oyuncu Birimleri: {units.filter(u => u.team === 'player').length}</div>
              <div>Düşman Birimleri: {units.filter(u => u.team === 'enemy').length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
