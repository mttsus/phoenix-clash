
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

interface Tower {
  id: string;
  team: 'player' | 'enemy';
  side: 'left' | 'right'; // Only 2 defense towers per team
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  lastAttack: number;
}

interface Unit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire';
  team: 'player' | 'enemy';
  path: 'left' | 'center' | 'right'; // 3 possible paths
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  target?: Unit | Tower | Castle;
  isMoving: boolean;
  lastAttack: number;
  isAttackingBuilding: boolean;
  isInCombat: boolean;
}

const UNIT_CONFIGS = {
  swordsman: { icon: '⚔️', health: 400, damage: 100, speed: 80, cost: 2 },
  archer: { icon: '🏹', health: 300, damage: 120, speed: 90, cost: 3 },
  cavalry: { icon: '🐎', health: 600, damage: 140, speed: 120, cost: 4 },
  mage_fire: { icon: '🔥', health: 250, damage: 180, speed: 70, cost: 5 }
};

// Path configurations for 3 routes
const PATH_CONFIGS = {
  left: { startX: 150, centerX: 200, targetX: 250 },
  center: { startX: 350, centerX: 400, targetX: 450 },
  right: { startX: 550, centerX: 600, targetX: 650 }
};

export const BattleField = () => {
  const { state, dispatch } = useGame();
  const [battleActive, setBattleActive] = useState(false);
  const [mana, setMana] = useState(10);
  const [units, setUnits] = useState<Unit[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [castles, setCastles] = useState<Castle[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);

  // Initialize single castle system with defense towers
  useEffect(() => {
    const initialTowers: Tower[] = [
      // Player defense towers (left and right of castle)
      {
        id: 'player-tower-left',
        team: 'player',
        side: 'left',
        health: 800,
        maxHealth: 800,
        position: { x: 300, y: 520 },
        lastAttack: 0
      },
      {
        id: 'player-tower-right',
        team: 'player', 
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 500, y: 520 },
        lastAttack: 0
      },
      // Enemy defense towers
      {
        id: 'enemy-tower-left',
        team: 'enemy',
        side: 'left', 
        health: 800,
        maxHealth: 800,
        position: { x: 300, y: 180 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-right',
        team: 'enemy',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 500, y: 180 },
        lastAttack: 0
      }
    ];
    setTowers(initialTowers);

    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 580 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy', 
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 120 }
      }
    ]);
  }, []);

  // Main battle loop
  useEffect(() => {
    if (!battleActive || gameResult) return;

    const interval = setInterval(() => {
      setBattleTime(prev => prev + 1);
      
      // Mana regeneration
      if (battleTime % 3 === 0 && mana < 10) {
        setMana(prev => Math.min(10, prev + 1));
      }

      // Move and fight units
      moveAndFightUnits();
      
      // Spawn enemy units
      if (battleTime % 8 === 0) {
        spawnEnemyUnit();
      }
      
      // Tower attacks
      handleTowerAttacks();
      
    }, 300);

    return () => clearInterval(interval);
  }, [battleActive, battleTime, mana, units, towers, castles, gameResult]);

  const handleTowerAttacks = () => {
    towers.forEach(tower => {
      if (tower.health <= 0 || battleTime - tower.lastAttack < 4) return;

      // Find enemy units in range (wider range for tower attacks)
      const enemyUnitsInRange = units.filter(unit => {
        if (unit.team === tower.team || unit.health <= 0) return false;
        
        const distance = Math.sqrt(
          Math.pow(unit.position.x - tower.position.x, 2) + 
          Math.pow(unit.position.y - tower.position.y, 2)
        );
        return distance <= 120;
      });

      if (enemyUnitsInRange.length > 0) {
        // Kill multiple units (area damage)
        const unitsToKill = Math.min(enemyUnitsInRange.length, Math.floor(Math.random() * 8) + 3);
        const unitsToKillIds = enemyUnitsInRange.slice(0, unitsToKill).map(u => u.id);
        
        setUnits(prevUnits => 
          prevUnits.filter(unit => !unitsToKillIds.includes(unit.id))
        );

        setTowers(prevTowers => 
          prevTowers.map(t => 
            t.id === tower.id ? { ...t, lastAttack: battleTime } : t
          )
        );
      }
    });
  };

  const startBattle = () => {
    setBattleActive(true);
    setBattleTime(0);
    setMana(10);
    setUnits([]);
    setGameResult(null);
    
    // Reset buildings
    const initialTowers: Tower[] = [
      {
        id: 'player-tower-left',
        team: 'player',
        side: 'left',
        health: 800,
        maxHealth: 800,
        position: { x: 300, y: 520 },
        lastAttack: 0
      },
      {
        id: 'player-tower-right',
        team: 'player',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 500, y: 520 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-left',
        team: 'enemy',
        side: 'left',
        health: 800,
        maxHealth: 800,
        position: { x: 300, y: 180 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-right',
        team: 'enemy',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 500, y: 180 },
        lastAttack: 0
      }
    ];
    setTowers(initialTowers);

    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 580 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy',
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 120 }
      }
    ]);
  };

  const endBattle = () => {
    setBattleActive(false);
    setGameResult(null);
    dispatch({ type: 'END_BATTLE' });
  };

  const deployUnit = (unitType: keyof typeof UNIT_CONFIGS, path: 'left' | 'center' | 'right') => {
    const config = UNIT_CONFIGS[unitType];
    if (mana < config.cost) return;

    const pathConfig = PATH_CONFIGS[path];
    const newUnit: Unit = {
      id: `player-${Date.now()}-${Math.random()}`,
      type: unitType,
      team: 'player',
      path,
      position: { x: pathConfig.startX, y: 560 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      isAttackingBuilding: false,
      isInCombat: false
    };

    setUnits(prev => [...prev, newUnit]);
    setMana(prev => prev - config.cost);
  };

  const spawnEnemyUnit = () => {
    const unitTypes = Object.keys(UNIT_CONFIGS) as (keyof typeof UNIT_CONFIGS)[];
    const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
    const paths: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];
    const config = UNIT_CONFIGS[randomType];
    const pathConfig = PATH_CONFIGS[randomPath];

    const enemyUnit: Unit = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      type: randomType,
      team: 'enemy',
      path: randomPath,
      position: { x: pathConfig.startX, y: 140 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      isAttackingBuilding: false,
      isInCombat: false
    };

    setUnits(prev => [...prev, enemyUnit]);
  };

  const moveAndFightUnits = () => {
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(unit => {
        if (unit.health <= 0) return unit;

        // 1. Find enemy towers and castle
        const enemyBuildings = [
          ...towers.filter(tower => tower.team !== unit.team && tower.health > 0),
          ...castles.filter(castle => castle.team !== unit.team && castle.health > 0)
        ];

        // Find nearest enemy building
        let nearestBuilding = null;
        let minDistance = Infinity;
        
        for (const building of enemyBuildings) {
          const distance = Math.sqrt(
            Math.pow(building.position.x - unit.position.x, 2) + 
            Math.pow(building.position.y - unit.position.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestBuilding = building;
          }
        }

        // Attack building if in range
        if (nearestBuilding && minDistance < 80) {
          if (battleTime - unit.lastAttack >= 1) {
            if ('side' in nearestBuilding) {
              // Attack tower
              setTowers(prevTowers => prevTowers.map(tower => {
                if (tower.id === nearestBuilding.id) {
                  const newHealth = Math.max(0, tower.health - unit.damage);
                  return { ...tower, health: newHealth };
                }
                return tower;
              }));
            } else {
              // Attack castle
              setCastles(prevCastles => prevCastles.map(castle => {
                if (castle.id === nearestBuilding.id) {
                  const newHealth = Math.max(0, castle.health - unit.damage);
                  return { ...castle, health: newHealth };
                }
                return castle;
              }));
            }
            
            return { 
              ...unit, 
              lastAttack: battleTime, 
              isMoving: false, 
              isAttackingBuilding: true,
              isInCombat: false
            };
          }
          return { ...unit, isMoving: false, isAttackingBuilding: true, isInCombat: false };
        }

        // 2. Check for enemy units
        const enemies = prevUnits.filter(u => 
          u.team !== unit.team && 
          u.health > 0 && 
          Math.sqrt(
            Math.pow(u.position.x - unit.position.x, 2) + 
            Math.pow(u.position.y - unit.position.y, 2)
          ) < 60
        );

        if (enemies.length > 0) {
          const nearestEnemy = enemies[0];
          
          if (battleTime - unit.lastAttack >= 1) {
            return { 
              ...unit, 
              target: nearestEnemy, 
              isMoving: false, 
              lastAttack: battleTime,
              isAttackingBuilding: false,
              isInCombat: true
            };
          }
          return { ...unit, isMoving: false, isAttackingBuilding: false, isInCombat: true };
        }

        // 3. Move forward along path
        if (unit.isMoving) {
          const direction = unit.team === 'player' ? -1 : 1;
          const pathConfig = PATH_CONFIGS[unit.path];
          
          // Follow path towards center then to target
          let newX = unit.position.x;
          let newY = unit.position.y + (unit.speed / 8) * direction;
          
          // Adjust X position based on path
          if (Math.abs(unit.position.x - pathConfig.centerX) > 10) {
            const xDirection = pathConfig.centerX > unit.position.x ? 1 : -1;
            newX += (unit.speed / 12) * xDirection;
          }
          
          return { 
            ...unit, 
            position: { x: newX, y: newY },
            isAttackingBuilding: false,
            isInCombat: false
          };
        }

        return unit;
      });

      // Handle combat damage between units
      const finalUnits = updatedUnits.map(unit => {
        if (unit.target && unit.lastAttack === battleTime) {
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

  const getPathColor = (path: 'left' | 'center' | 'right') => {
    switch (path) {
      case 'left': return 'border-blue-400 bg-blue-50/30';
      case 'center': return 'border-green-400 bg-green-50/30';
      case 'right': return 'border-red-400 bg-red-50/30';
    }
  };

  const getUnitBoundaryStyle = (unit: Unit) => {
    if (unit.team === 'player') {
      return 'shadow-xl shadow-blue-500/50 border-2 border-blue-500 bg-blue-200/80 rounded-xl p-2 transform scale-110';
    } else {
      return 'shadow-xl shadow-red-500/50 border-2 border-red-500 bg-red-200/80 rounded-xl p-2 transform scale-110';
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
            <h2 className="text-xl font-bold">Clash Royale Tarzı Savaş Arenası</h2>
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
            <Badge variant="outline">Aktif Askerler: {units.length}</Badge>
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
                    <span className="text-xs">Senin Kalen 🏰</span>
                    <span className="text-xs">{playerCastle?.health}/{playerCastle?.maxHealth}</span>
                  </div>
                  <Progress value={playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs">Düşman Kalesi 🏰</span>
                    <span className="text-xs">{enemyCastle?.health}/{enemyCastle?.maxHealth}</span>
                  </div>
                  <Progress value={enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 100} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Unit Deployment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Asker Gönder - 3 Yol</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['left', 'center', 'right'] as const).map(path => (
                  <div key={path} className="space-y-2">
                    <div className="text-xs font-medium">
                      {path === 'left' ? '🔵 Sol Yol' : path === 'center' ? '🟢 Orta Yol' : '🔴 Sağ Yol'}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(UNIT_CONFIGS).map(([unitType, config]) => (
                        <Button
                          key={unitType}
                          size="sm"
                          variant="outline"
                          onClick={() => deployUnit(unitType as keyof typeof UNIT_CONFIGS, path)}
                          disabled={mana < config.cost || !battleActive}
                          className="text-xs p-2 h-12 flex flex-col"
                        >
                          <span className="text-lg">{config.icon}</span>
                          <span className="text-xs">{config.cost}⚡</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {!battleActive ? (
              <Button onClick={startBattle} className="w-full" size="lg">
                🚀 Savaşı Başlat
              </Button>
            ) : (
              <Button onClick={endBattle} variant="destructive" className="w-full" size="lg">
                🏃‍♂️ Savaştan Çık
              </Button>
            )}
          </div>

          {/* Battle Arena - 3D Style Single Castle System */}
          <div className="flex-1 relative bg-gradient-to-b from-red-300 via-yellow-200 to-blue-300 overflow-hidden">
            {/* 3D Arena Background */}
            <div className="absolute inset-0 bg-gradient-radial from-green-400/20 via-green-500/10 to-green-600/5" />
            
            {/* Path Indicators */}
            <div className="absolute inset-4">
              {(['left', 'center', 'right'] as const).map(path => {
                const pathConfig = PATH_CONFIGS[path];
                return (
                  <div
                    key={path}
                    className={`absolute w-24 h-full border-2 border-dashed rounded-lg ${getPathColor(path)} opacity-40`}
                    style={{
                      left: `${pathConfig.startX - 50}px`,
                      width: '100px'
                    }}
                  />
                );
              })}
              
              {/* Enemy Castle */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-32 h-24 bg-gradient-to-b from-red-700 to-red-900 rounded-lg shadow-2xl border-4 border-red-800 flex items-center justify-center transform perspective-1000 rotateX-12">
                  <span className="text-white text-3xl">🏰</span>
                </div>
                <div className="w-40 h-4 bg-gray-300 rounded-full mt-2 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300"
                    style={{ width: `${enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-xs text-center font-bold mt-1">
                  DÜŞMAN KALESİ {enemyCastle?.health}/{enemyCastle?.maxHealth}
                </div>
              </div>

              {/* Enemy Defense Towers */}
              {towers
                .filter(tower => tower.team === 'enemy' && tower.health > 0)
                .map(tower => (
                  <div
                    key={tower.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${tower.position.x}px`,
                      top: `${tower.position.y}px`
                    }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-b from-red-600 to-red-800 rounded-full shadow-xl border-3 border-red-700 flex items-center justify-center transform scale-110">
                      <span className="text-white text-xl">🗼</span>
                    </div>
                    <div className="w-24 h-3 bg-gray-300 rounded-full mt-1">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-center font-bold">
                      {tower.side === 'left' ? 'SOL' : 'SAĞ'} KULE
                    </div>
                  </div>
                ))}

              {/* Player Castle */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="w-32 h-24 bg-gradient-to-b from-blue-700 to-blue-900 rounded-lg shadow-2xl border-4 border-blue-800 flex items-center justify-center transform perspective-1000 rotateX-12">
                  <span className="text-white text-3xl">🏰</span>
                </div>
                <div className="w-40 h-4 bg-gray-300 rounded-full mt-2 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-xs text-center font-bold mt-1">
                  SENİN KALEN {playerCastle?.health}/{playerCastle?.maxHealth}
                </div>
              </div>

              {/* Player Defense Towers */}
              {towers
                .filter(tower => tower.team === 'player' && tower.health > 0)
                .map(tower => (
                  <div
                    key={tower.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${tower.position.x}px`,
                      top: `${tower.position.y}px`
                    }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full shadow-xl border-3 border-blue-700 flex items-center justify-center transform scale-110">
                      <span className="text-white text-xl">🗼</span>
                    </div>
                    <div className="w-24 h-3 bg-gray-300 rounded-full mt-1">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-center font-bold">
                      {tower.side === 'left' ? 'SOL' : 'SAĞ'} KULE
                    </div>
                  </div>
                ))}

              {/* Units with enhanced 3D styling */}
              {units.map(unit => (
                <div
                  key={unit.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200`}
                  style={{
                    left: `${unit.position.x}px`,
                    top: `${unit.position.y}px`,
                    zIndex: 10
                  }}
                >
                  <div className={getUnitBoundaryStyle(unit)}>
                    <div className="text-2xl text-center mb-1">
                      {UNIT_CONFIGS[unit.type].icon}
                    </div>
                    <div className="w-12 h-2 bg-gray-400 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-200"
                        style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                      />
                    </div>
                    {unit.isAttackingBuilding && (
                      <div className="text-xs text-center text-red-600 font-bold mt-1">⚔️ SALDIRI</div>
                    )}
                    {unit.isInCombat && (
                      <div className="text-xs text-center text-orange-600 font-bold mt-1">💥 SAVAŞ</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Battle Statistics */}
            <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-sm shadow-xl">
              <div className="font-bold mb-2">📊 Savaş İstatistikleri</div>
              <div>⚔️ Aktif Askerler: {units.length}</div>
              <div>🏰 Ayakta Kalan Kuleler: {towers.filter(t => t.health > 0).length}/4</div>
              <div>💥 Savaşta Olan: {units.filter(u => u.isInCombat || u.isAttackingBuilding).length}</div>
              <div>🎯 Oyuncu Askerleri: {units.filter(u => u.team === 'player').length}</div>
              <div>👹 Düşman Askerleri: {units.filter(u => u.team === 'enemy').length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
