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
  lane: number;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  lastAttack: number;
}

interface Unit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire';
  team: 'player' | 'enemy';
  lane: number;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  target?: Unit | Tower | Castle;
  isMoving: boolean;
  lastAttack: number;
  isAttackingTower: boolean;
  isInCombat: boolean;
}

interface Catapult {
  id: string;
  team: 'player' | 'enemy';
  lane: number;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  target?: Tower | Castle;
  isMoving: boolean;
  lastAttack: number;
  lastShot: number;
}

const UNIT_CONFIGS = {
  swordsman: { icon: '⚔️', health: 200, damage: 50, speed: 80, cost: 2 },
  archer: { icon: '🏹', health: 150, damage: 60, speed: 90, cost: 3 },
  cavalry: { icon: '🐎', health: 250, damage: 70, speed: 120, cost: 4 },
  mage_fire: { icon: '🔥', health: 120, damage: 100, speed: 70, cost: 5 }
};

const CATAPULT_CONFIG = {
  icon: '🎯',
  health: 1,
  maxHealth: 1,
  damage: 200,
  speed: 30,
  attackRange: 200,
  attackCooldown: 3,
  spawnInterval: 21
};

export const BattleField = () => {
  const { state, dispatch } = useGame();
  const [battleActive, setBattleActive] = useState(false);
  const [mana, setMana] = useState(10);
  const [units, setUnits] = useState<Unit[]>([]);
  const [catapults, setCatapults] = useState<Catapult[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [castles, setCastles] = useState<Castle[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [lastCatapultSpawn, setLastCatapultSpawn] = useState({ player: 0, enemy: 0 });

  // Initialize towers and castles
  useEffect(() => {
    // Initialize towers (3 per lane, 9 total for each team)
    const initialTowers: Tower[] = [];
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        // Player towers (bottom)
        initialTowers.push({
          id: `player-tower-${lane}-${position}`,
          team: 'player',
          lane,
          health: 300,
          maxHealth: 300,
          position: { x: 200 + lane * 200, y: 500 - position * 100 },
          lastAttack: 0
        });
        
        // Enemy towers (top)
        initialTowers.push({
          id: `enemy-tower-${lane}-${position}`,
          team: 'enemy',
          lane,
          health: 300,
          maxHealth: 300,
          position: { x: 200 + lane * 200, y: 200 + position * 100 },
          lastAttack: 0
        });
      }
    }
    setTowers(initialTowers);

    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 1500,
        maxHealth: 1500,
        position: { x: 400, y: 650 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy', 
        health: 1500,
        maxHealth: 1500,
        position: { x: 400, y: 50 }
      }
    ]);
  }, []);

  // Main battle loop
  useEffect(() => {
    if (!battleActive || gameResult) return;

    const interval = setInterval(() => {
      setBattleTime(prev => prev + 1);
      
      // Mana regeneration (every 2 seconds)
      if (battleTime % 2 === 0 && mana < 10) {
        setMana(prev => Math.min(10, prev + 1));
      }

      // Spawn catapults automatically every 21 seconds
      spawnCatapults();

      // Move units and catapults
      moveAndFightUnits();
      moveAndAttackCatapults();
      
      // Spawn enemy units occasionally
      if (battleTime % 8 === 0) {
        spawnEnemyUnit();
      }
      
      // Tower attacks
      handleTowerAttacks();
      
    }, 500); // Faster update rate for smoother movement

    return () => clearInterval(interval);
  }, [battleActive, battleTime, mana, units, catapults, towers, castles, gameResult, lastCatapultSpawn]);

  const spawnCatapults = () => {
    // Spawn player catapults
    if (battleTime - lastCatapultSpawn.player >= CATAPULT_CONFIG.spawnInterval) {
      for (let lane = 0; lane < 3; lane++) {
        const newCatapult: Catapult = {
          id: `player-catapult-${Date.now()}-${lane}`,
          team: 'player',
          lane,
          position: { x: 200 + lane * 200, y: 600 },
          health: CATAPULT_CONFIG.health,
          maxHealth: CATAPULT_CONFIG.maxHealth,
          damage: CATAPULT_CONFIG.damage,
          speed: CATAPULT_CONFIG.speed,
          isMoving: true,
          lastAttack: 0,
          lastShot: 0
        };
        setCatapults(prev => [...prev, newCatapult]);
      }
      setLastCatapultSpawn(prev => ({ ...prev, player: battleTime }));
    }

    // Spawn enemy catapults
    if (battleTime - lastCatapultSpawn.enemy >= CATAPULT_CONFIG.spawnInterval) {
      for (let lane = 0; lane < 3; lane++) {
        const newCatapult: Catapult = {
          id: `enemy-catapult-${Date.now()}-${lane}`,
          team: 'enemy',
          lane,
          position: { x: 200 + lane * 200, y: 100 },
          health: CATAPULT_CONFIG.health,
          maxHealth: CATAPULT_CONFIG.maxHealth,
          damage: CATAPULT_CONFIG.damage,
          speed: CATAPULT_CONFIG.speed,
          isMoving: true,
          lastAttack: 0,
          lastShot: 0
        };
        setCatapults(prev => [...prev, newCatapult]);
      }
      setLastCatapultSpawn(prev => ({ ...prev, enemy: battleTime }));
    }
  };

  const moveAndAttackCatapults = () => {
    setCatapults(prevCatapults => {
      return prevCatapults.map(catapult => {
        if (catapult.health <= 0) return catapult;

        // Find target towers or castles in range
        const targets = [
          ...towers.filter(t => 
            t.team !== catapult.team && 
            t.health > 0 && 
            t.lane === catapult.lane &&
            Math.abs(t.position.y - catapult.position.y) <= CATAPULT_CONFIG.attackRange
          ),
          ...castles.filter(c => 
            c.team !== catapult.team && 
            c.health > 0 &&
            Math.abs(c.position.y - catapult.position.y) <= CATAPULT_CONFIG.attackRange
          )
        ];

        if (targets.length > 0) {
          const nearestTarget = targets.reduce((closest, target) => {
            const distToTarget = Math.abs(target.position.y - catapult.position.y);
            const distToClosest = Math.abs(closest.position.y - catapult.position.y);
            return distToTarget < distToClosest ? target : closest;
          });

          // Attack if cooldown is ready
          if (battleTime - catapult.lastShot >= CATAPULT_CONFIG.attackCooldown) {
            // Attack the target
            if ('lane' in nearestTarget) {
              // It's a tower
              setTowers(prevTowers => prevTowers.map(tower => {
                if (tower.id === nearestTarget.id) {
                  const newHealth = Math.max(0, tower.health - CATAPULT_CONFIG.damage);
                  return { ...tower, health: newHealth };
                }
                return tower;
              }));
            } else {
              // It's a castle
              setCastles(prevCastles => prevCastles.map(castle => {
                if (castle.id === nearestTarget.id) {
                  const newHealth = Math.max(0, castle.health - CATAPULT_CONFIG.damage);
                  return { ...castle, health: newHealth };
                }
                return castle;
              }));
            }
            
            return { ...catapult, lastShot: battleTime, isMoving: false };
          }
          return { ...catapult, isMoving: false };
        }

        // No targets in range, move forward
        if (catapult.isMoving) {
          const direction = catapult.team === 'player' ? -1 : 1;
          const newY = catapult.position.y + (catapult.speed / 20) * direction;
          
          return { ...catapult, position: { ...catapult.position, y: newY } };
        }

        return catapult;
      }).filter(catapult => catapult.health > 0);
    });
  };

  const handleTowerAttacks = () => {
    towers.forEach(tower => {
      if (tower.health <= 0 || battleTime - tower.lastAttack < 5) return;

      // Find enemy units in range
      const enemyUnitsInRange = units.filter(unit => 
        unit.team !== tower.team &&
        unit.lane === tower.lane &&
        unit.health > 0 &&
        Math.abs(unit.position.y - tower.position.y) <= 120
      );

      if (enemyUnitsInRange.length > 0) {
        // Kill fewer units (10-30)
        const unitsToKill = Math.min(enemyUnitsInRange.length, Math.floor(Math.random() * 21) + 10);
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

      // Attack catapults (one shot kill)
      const enemyCatapultsInRange = catapults.filter(catapult => 
        catapult.team !== tower.team &&
        catapult.lane === tower.lane &&
        catapult.health > 0 &&
        Math.abs(catapult.position.y - tower.position.y) <= 120
      );

      if (enemyCatapultsInRange.length > 0) {
        const catapultToKillId = enemyCatapultsInRange[0].id;
        setCatapults(prevCatapults => 
          prevCatapults.filter(catapult => catapult.id !== catapultToKillId)
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
    setCatapults([]);
    setGameResult(null);
    setLastCatapultSpawn({ player: 0, enemy: 0 });
    
    // Reset towers
    const initialTowers: Tower[] = [];
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        initialTowers.push({
          id: `player-tower-${lane}-${position}`,
          team: 'player',
          lane,
          health: 300,
          maxHealth: 300,
          position: { x: 200 + lane * 200, y: 500 - position * 100 },
          lastAttack: 0
        });
        
        initialTowers.push({
          id: `enemy-tower-${lane}-${position}`,
          team: 'enemy',
          lane,
          health: 300,
          maxHealth: 300,
          position: { x: 200 + lane * 200, y: 200 + position * 100 },
          lastAttack: 0
        });
      }
    }
    setTowers(initialTowers);

    setCastles([
      {
        id: 'player-castle',
        team: 'player',
        health: 1500,
        maxHealth: 1500,
        position: { x: 400, y: 650 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy',
        health: 1500,
        maxHealth: 1500,
        position: { x: 400, y: 50 }
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
      position: { x: 200 + lane * 200, y: 580 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      isAttackingTower: false,
      isInCombat: false
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
      position: { x: 200 + randomLane * 200, y: 120 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      isAttackingTower: false,
      isInCombat: false
    };

    setUnits(prev => [...prev, enemyUnit]);
  };

  const moveAndFightUnits = () => {
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(unit => {
        if (unit.health <= 0) return unit;

        // 1. Check for enemy towers first
        const enemyTowersInLane = towers.filter(tower => 
          tower.team !== unit.team && 
          tower.health > 0 && 
          tower.lane === unit.lane
        );

        let nearestEnemyTower = null;
        let minTowerDistance = Infinity;
        
        for (const tower of enemyTowersInLane) {
          const distance = Math.abs(tower.position.y - unit.position.y);
          if (distance < minTowerDistance) {
            minTowerDistance = distance;
            nearestEnemyTower = tower;
          }
        }

        // Attack tower if close enough
        if (nearestEnemyTower && minTowerDistance < 60) {
          if (battleTime - unit.lastAttack >= 2) {
            setTowers(prevTowers => prevTowers.map(tower => {
              if (tower.id === nearestEnemyTower.id) {
                const newHealth = Math.max(0, tower.health - unit.damage);
                return { ...tower, health: newHealth };
              }
              return tower;
            }));
            
            return { 
              ...unit, 
              lastAttack: battleTime, 
              isMoving: false, 
              isAttackingTower: true,
              isInCombat: false
            };
          }
          return { ...unit, isMoving: false, isAttackingTower: true, isInCombat: false };
        }

        // 2. Check for enemy units
        const enemies = prevUnits.filter(u => 
          u.team !== unit.team && 
          u.health > 0 && 
          u.lane === unit.lane &&
          Math.abs(u.position.y - unit.position.y) < 50
        );

        if (enemies.length > 0) {
          const nearestEnemy = enemies[0];
          
          if (battleTime - unit.lastAttack >= 2) {
            return { 
              ...unit, 
              target: nearestEnemy, 
              isMoving: false, 
              lastAttack: battleTime,
              isAttackingTower: false,
              isInCombat: true
            };
          }
          return { ...unit, isMoving: false, isAttackingTower: false, isInCombat: true };
        }

        // 3. Check enemy castle
        const enemyCastle = castles.find(c => c.team !== unit.team);
        if (enemyCastle && Math.abs(unit.position.y - enemyCastle.position.y) < 60) {
          if (battleTime - unit.lastAttack >= 2) {
            setCastles(prev => prev.map(castle => {
              if (castle.team !== unit.team) {
                const newHealth = Math.max(0, castle.health - unit.damage);
                return { ...castle, health: newHealth };
              }
              return castle;
            }));
            return { ...unit, lastAttack: battleTime, isAttackingTower: false, isInCombat: false };
          }
        }

        // 4. Move forward if no enemies
        if (unit.isMoving) {
          const direction = unit.team === 'player' ? -1 : 1;
          const newY = unit.position.y + (unit.speed / 20) * direction;
          
          return { 
            ...unit, 
            position: { ...unit.position, y: newY },
            isAttackingTower: false,
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

  const getLaneColor = (lane: number) => {
    switch (lane) {
      case 0: return 'border-blue-400 bg-blue-50';
      case 1: return 'border-green-400 bg-green-50';
      case 2: return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const getUnitBoundaryStyle = (unit: Unit) => {
    if (unit.team === 'player') {
      return 'shadow-lg shadow-blue-300 border-2 border-blue-400 bg-blue-100/30 rounded-full p-1';
    } else {
      return 'shadow-lg shadow-red-300 border-2 border-red-400 bg-red-100/30 rounded-full p-1';
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
            <h2 className="text-xl font-bold">Savaş Alanı - Dikey 3 Şeritli Kale Savunması</h2>
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
            <Badge variant="outline">Mancınıklar: {catapults.length}</Badge>
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
                      {lane === 0 ? 'Sol Şerit' : lane === 1 ? 'Orta Şerit' : 'Sağ Şerit'}
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

          {/* Battle Arena - Vertical View */}
          <div className="flex-1 relative bg-gradient-to-b from-red-200 via-yellow-100 to-blue-200">
            {/* 3 Lanes - Vertical */}
            <div className="absolute inset-4 grid grid-cols-3 gap-4">
              {[0, 1, 2].map(lane => (
                <div key={lane} className={`relative border-2 rounded ${getLaneColor(lane)} overflow-hidden`}>
                  <div className="absolute top-2 left-2 text-xs font-bold">
                    {lane === 0 ? 'SOL ŞERİT' : lane === 1 ? 'ORTA ŞERİT' : 'SAĞ ŞERİT'}
                  </div>
                  
                  {/* Enemy Castle */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-20 h-16 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xl">🏰</span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      {Math.round(((enemyCastle?.health || 0) / (enemyCastle?.maxHealth || 1)) * 100)}%
                    </div>
                  </div>

                  {/* Enemy Towers */}
                  {towers
                    .filter(tower => tower.team === 'enemy' && tower.lane === lane && tower.health > 0)
                    .map(tower => (
                      <div
                        key={tower.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: '50%',
                          top: `${(tower.position.y / 700) * 100}%`
                        }}
                      >
                        <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center">
                          <span className="text-white text-sm">🗼</span>
                        </div>
                        <div className="text-xs text-center">
                          {Math.round((tower.health / tower.maxHealth) * 100)}%
                        </div>
                      </div>
                    ))}

                  {/* Player Castle */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-20 h-16 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xl">🏰</span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      {Math.round(((playerCastle?.health || 0) / (playerCastle?.maxHealth || 1)) * 100)}%
                    </div>
                  </div>

                  {/* Player Towers */}
                  {towers
                    .filter(tower => tower.team === 'player' && tower.lane === lane && tower.health > 0)
                    .map(tower => (
                      <div
                        key={tower.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: '50%',
                          top: `${(tower.position.y / 700) * 100}%`
                        }}
                      >
                        <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-sm">🗼</span>
                        </div>
                        <div className="text-xs text-center">
                          {Math.round((tower.health / tower.maxHealth) * 100)}%
                        </div>
                      </div>
                    ))}

                  {/* Units in this lane with team boundaries */}
                  {units
                    .filter(unit => unit.lane === lane)
                    .map(unit => (
                      <div
                        key={unit.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500`}
                        style={{
                          left: '50%',
                          top: `${(unit.position.y / 700) * 100}%`
                        }}
                      >
                        <div className={getUnitBoundaryStyle(unit)}>
                          <div className="text-lg">
                            {UNIT_CONFIGS[unit.type].icon}
                          </div>
                          <div className="w-8 h-1 bg-gray-300 rounded mt-1">
                            <div 
                              className="h-full bg-green-500 rounded"
                              style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                            />
                          </div>
                          {unit.isAttackingTower && (
                            <div className="text-xs text-center text-red-600 font-bold">⚔️</div>
                          )}
                          {unit.isInCombat && (
                            <div className="text-xs text-center text-orange-600 font-bold">💥</div>
                          )}
                        </div>
                      </div>
                    ))}

                  {/* Catapults in this lane */}
                  {catapults
                    .filter(catapult => catapult.lane === lane)
                    .map(catapult => (
                      <div
                        key={catapult.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
                          catapult.team === 'player' ? 'text-blue-800' : 'text-red-800'
                        }`}
                        style={{
                          left: '50%',
                          top: `${(catapult.position.y / 700) * 100}%`
                        }}
                      >
                        <div className="text-lg">
                          {CATAPULT_CONFIG.icon}
                        </div>
                        <div className="text-xs text-center">
                          {battleTime - catapult.lastShot < CATAPULT_CONFIG.attackCooldown ? '⏳' : '🎯'}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {/* Battle Statistics */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
              <div>Aktif Birimler: {units.length}</div>
              <div>Aktif Mancınıklar: {catapults.length}</div>
              <div>Aktif Kuleler: {towers.filter(t => t.health > 0).length}</div>
              <div>Savaşta Olan: {units.filter(u => u.isInCombat || u.isAttackingTower).length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
