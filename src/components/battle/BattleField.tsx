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
  side: 'left' | 'right';
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  lastAttack: number;
}

interface Unit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire';
  team: 'player' | 'enemy';
  path: 'left' | 'center' | 'right';
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
  swordsman: { icon: '⚔️', health: 400, damage: 100, speed: 100, cost: 2 },
  archer: { icon: '🏹', health: 300, damage: 120, speed: 110, cost: 3 },
  cavalry: { icon: '🐎', health: 600, damage: 140, speed: 130, cost: 4 },
  mage_fire: { icon: '🔥', health: 250, damage: 180, speed: 90, cost: 5 }
};

// Improved path configurations for cleaner layout
const PATH_CONFIGS = {
  left: { startX: 200, centerX: 250, targetX: 300 },
  center: { startX: 400, centerX: 400, targetX: 400 },
  right: { startX: 600, centerX: 550, targetX: 500 }
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
      // Player defense towers (symmetrically positioned)
      {
        id: 'player-tower-left',
        team: 'player',
        side: 'left',
        health: 800,
        maxHealth: 800,
        position: { x: 320, y: 480 },
        lastAttack: 0
      },
      {
        id: 'player-tower-right',
        team: 'player', 
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 480, y: 480 },
        lastAttack: 0
      },
      // Enemy defense towers (symmetrically positioned)
      {
        id: 'enemy-tower-left',
        team: 'enemy',
        side: 'left', 
        health: 800,
        maxHealth: 800,
        position: { x: 320, y: 220 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-right',
        team: 'enemy',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 480, y: 220 },
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
        position: { x: 400, y: 550 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy', 
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 150 }
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
        position: { x: 320, y: 480 },
        lastAttack: 0
      },
      {
        id: 'player-tower-right',
        team: 'player',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 480, y: 480 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-left',
        team: 'enemy',
        side: 'left',
        health: 800,
        maxHealth: 800,
        position: { x: 320, y: 220 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-right',
        team: 'enemy',
        side: 'right',
        health: 800,
        maxHealth: 800,
        position: { x: 480, y: 220 },
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
        position: { x: 400, y: 550 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy',
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 150 }
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
      position: { x: pathConfig.startX, y: 520 },
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
      position: { x: pathConfig.startX, y: 180 },
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
      case 'left': return 'border-blue-400/60 bg-blue-50/20';
      case 'center': return 'border-green-400/60 bg-green-50/20';
      case 'right': return 'border-red-400/60 bg-red-50/20';
    }
  };

  const getUnitBoundaryStyle = (unit: Unit) => {
    if (unit.team === 'player') {
      return 'shadow-lg shadow-blue-500/40 border border-blue-400 bg-blue-100/90 rounded-lg p-1.5';
    } else {
      return 'shadow-lg shadow-red-500/40 border border-red-400 bg-red-100/90 rounded-lg p-1.5';
    }
  };

  const playerCastle = castles.find(c => c.team === 'player');
  const enemyCastle = castles.find(c => c.team === 'enemy');

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[96vw] h-[96vh] flex flex-col shadow-2xl">
        {/* Clean Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🏰 Savaş Arenası</h2>
            <Badge variant="secondary" className="text-sm">
              {Math.floor(battleTime / 60)}:{String(battleTime % 60).padStart(2, '0')}
            </Badge>
            {gameResult && (
              <Badge variant={gameResult === 'win' ? 'default' : 'destructive'} className="text-sm">
                {gameResult === 'win' ? '🎉 KAZANDIN!' : '💀 KAYBETTİN!'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-50">⚡ {mana}/10</Badge>
            <Badge variant="outline" className="bg-yellow-50">⚔️ {units.length}</Badge>
            <Button onClick={endBattle} variant="outline" size="sm" className="hover:bg-red-50">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Organized Left Panel */}
          <div className="w-80 border-r p-4 space-y-4 bg-gray-50/50">
            {/* Castle Status */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🏰 Kale Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-blue-700">🔵 Senin Kalen</span>
                    <span className="text-gray-600">{playerCastle?.health}/{playerCastle?.maxHealth}</span>
                  </div>
                  <Progress value={playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-red-700">🔴 Düşman Kalesi</span>
                    <span className="text-gray-600">{enemyCastle?.health}/{enemyCastle?.maxHealth}</span>
                  </div>
                  <Progress value={enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Unit Deployment - Organized */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚔️ Asker Gönderimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['left', 'center', 'right'] as const).map(path => (
                  <div key={path} className="border rounded-lg p-3 bg-white/60">
                    <div className="text-sm font-semibold mb-3 text-center">
                      {path === 'left' ? '🔵 Sol Yol' : path === 'center' ? '🟢 Orta Yol' : '🔴 Sağ Yol'}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(UNIT_CONFIGS).map(([unitType, config]) => (
                        <Button
                          key={unitType}
                          size="sm"
                          variant="outline"
                          onClick={() => deployUnit(unitType as keyof typeof UNIT_CONFIGS, path)}
                          disabled={mana < config.cost || !battleActive}
                          className="h-16 flex flex-col gap-1 hover:scale-105 transition-transform"
                        >
                          <span className="text-lg">{config.icon}</span>
                          <span className="text-xs font-bold text-purple-600">{config.cost}⚡</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Battle Control */}
            {!battleActive ? (
              <Button onClick={startBattle} className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" size="lg">
                🚀 Savaşı Başlat
              </Button>
            ) : (
              <Button onClick={endBattle} variant="destructive" className="w-full h-12 text-lg" size="lg">
                🏃‍♂️ Savaştan Çık
              </Button>
            )}
          </div>

          {/* Clean Battle Arena */}
          <div className="flex-1 relative bg-gradient-to-b from-sky-200 via-green-200 to-yellow-200 overflow-hidden">
            {/* Arena Background */}
            <div className="absolute inset-0 bg-gradient-radial from-green-300/30 via-green-400/20 to-green-500/10" />
            
            {/* Clean Path Indicators */}
            <div className="absolute inset-6">
              {(['left', 'center', 'right'] as const).map(path => {
                const pathConfig = PATH_CONFIGS[path];
                return (
                  <div
                    key={path}
                    className={`absolute h-full border-2 border-dashed rounded-lg ${getPathColor(path)} opacity-50`}
                    style={{
                      left: `${pathConfig.startX - 60}px`,
                      width: '120px'
                    }}
                  />
                );
              })}
              
              {/* Enemy Castle - Clean Design */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <div className="w-28 h-20 bg-gradient-to-b from-red-600 to-red-800 rounded-lg shadow-xl border-2 border-red-700 flex items-center justify-center">
                    <span className="text-white text-2xl">🏰</span>
                  </div>
                  <div className="w-32 h-3 bg-gray-300 rounded-full mt-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-center font-bold mt-1 text-red-800">
                    DÜŞMAN KALESİ
                  </div>
                  <div className="text-xs text-center text-gray-600">
                    {enemyCastle?.health}/{enemyCastle?.maxHealth}
                  </div>
                </div>
              </div>

              {/* Enemy Defense Towers - Clean Design */}
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
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-b from-red-500 to-red-700 rounded-full shadow-lg border border-red-600 flex items-center justify-center">
                        <span className="text-white text-sm">🗼</span>
                      </div>
                      <div className="w-20 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-center font-semibold text-red-700">
                        {tower.side === 'left' ? 'SOL' : 'SAĞ'}
                      </div>
                    </div>
                  </div>
                ))}

              {/* Player Castle - Clean Design */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-center font-bold mb-1 text-blue-800">
                    SENİN KALEN
                  </div>
                  <div className="text-xs text-center text-gray-600 mb-2">
                    {playerCastle?.health}/{playerCastle?.maxHealth}
                  </div>
                  <div className="w-32 h-3 bg-gray-300 rounded-full mb-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-28 h-20 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg shadow-xl border-2 border-blue-700 flex items-center justify-center">
                    <span className="text-white text-2xl">🏰</span>
                  </div>
                </div>
              </div>

              {/* Player Defense Towers - Clean Design */}
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
                    <div className="flex flex-col items-center">
                      <div className="text-xs text-center font-semibold text-blue-700 mb-1">
                        {tower.side === 'left' ? 'SOL' : 'SAĞ'}
                      </div>
                      <div className="w-16 h-16 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full shadow-lg border border-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm">🗼</span>
                      </div>
                      <div className="w-20 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Clean Units with Better Styling */}
              {units.map(unit => (
                <div
                  key={unit.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                  style={{
                    left: `${unit.position.x}px`,
                    top: `${unit.position.y}px`,
                    zIndex: 10
                  }}
                >
                  <div className={getUnitBoundaryStyle(unit)}>
                    <div className="text-xl text-center mb-1">
                      {UNIT_CONFIGS[unit.type].icon}
                    </div>
                    <div className="w-10 h-1.5 bg-gray-400 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-200"
                        style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                      />
                    </div>
                    {unit.isAttackingBuilding && (
                      <div className="text-xs text-center text-red-600 font-bold mt-1">⚔️</div>
                    )}
                    {unit.isInCombat && (
                      <div className="text-xs text-center text-orange-600 font-bold mt-1">💥</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Clean Statistics Panel */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border rounded-lg p-3 text-sm shadow-lg">
              <div className="font-bold mb-2 text-gray-800">📊 İstatistikler</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Aktif Askerler:</span>
                  <span className="font-semibold">{units.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kuleler:</span>
                  <span className="font-semibold">{towers.filter(t => t.health > 0).length}/4</span>
                </div>
                <div className="flex justify-between">
                  <span>Mavi Takım:</span>
                  <span className="font-semibold text-blue-600">{units.filter(u => u.team === 'player').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kırmızı Takım:</span>
                  <span className="font-semibold text-red-600">{units.filter(u => u.team === 'enemy').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
