
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
  swordsman: { icon: '⚔️', health: 100, damage: 25, speed: 50, cost: 2 },
  archer: { icon: '🏹', health: 80, damage: 35, speed: 60, cost: 3 },
  cavalry: { icon: '🐎', health: 150, damage: 40, speed: 80, cost: 4 },
  mage_fire: { icon: '🔥', health: 70, damage: 60, speed: 45, cost: 5 }
};

const CATAPULT_CONFIG = {
  icon: '🎯',
  health: 1,
  maxHealth: 1,
  damage: 100,
  speed: 30,
  attackRange: 150,
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
        // Player towers
        initialTowers.push({
          id: `player-tower-${lane}-${position}`,
          team: 'player',
          lane,
          health: 1000,
          maxHealth: 1000,
          position: { x: 200 + position * 150, y: 150 + lane * 150 },
          lastAttack: 0
        });
        
        // Enemy towers
        initialTowers.push({
          id: `enemy-tower-${lane}-${position}`,
          team: 'enemy',
          lane,
          health: 1000,
          maxHealth: 1000,
          position: { x: 650 - position * 150, y: 150 + lane * 150 },
          lastAttack: 0
        });
      }
    }
    setTowers(initialTowers);

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
      
    }, 1000);

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
          position: { x: 100, y: 150 + lane * 150 },
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
          position: { x: 900, y: 150 + lane * 150 },
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
            Math.abs(t.position.x - catapult.position.x) <= CATAPULT_CONFIG.attackRange
          ),
          ...castles.filter(c => 
            c.team !== catapult.team && 
            c.health > 0 &&
            Math.abs(c.position.x - catapult.position.x) <= CATAPULT_CONFIG.attackRange
          )
        ];

        if (targets.length > 0) {
          const nearestTarget = targets.reduce((closest, target) => {
            const distToTarget = Math.abs(target.position.x - catapult.position.x);
            const distToClosest = Math.abs(closest.position.x - catapult.position.x);
            return distToTarget < distToClosest ? target : closest;
          });

          // Attack if cooldown is ready
          if (battleTime - catapult.lastShot >= CATAPULT_CONFIG.attackCooldown) {
            // Attack the target
            if ('lane' in nearestTarget) {
              // It's a tower
              setTowers(prevTowers => prevTowers.map(tower => {
                if (tower.id === nearestTarget.id) {
                  return { ...tower, health: Math.max(0, tower.health - CATAPULT_CONFIG.damage) };
                }
                return tower;
              }));
            } else {
              // It's a castle
              setCastles(prevCastles => prevCastles.map(castle => {
                if (castle.id === nearestTarget.id) {
                  return { ...castle, health: Math.max(0, castle.health - CATAPULT_CONFIG.damage) };
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
          const direction = catapult.team === 'player' ? 1 : -1;
          const newX = catapult.position.x + (catapult.speed / 10) * direction;
          
          return { ...catapult, position: { ...catapult.position, x: newX } };
        }

        return catapult;
      }).filter(catapult => catapult.health > 0);
    });
  };

  const handleTowerAttacks = () => {
    towers.forEach(tower => {
      if (tower.health <= 0 || battleTime - tower.lastAttack < 2) return;

      // Find enemy units in range (AoE attack)
      const enemyUnitsInRange = units.filter(unit => 
        unit.team !== tower.team &&
        unit.lane === tower.lane &&
        unit.health > 0 &&
        Math.abs(unit.position.x - tower.position.x) <= 200
      );

      if (enemyUnitsInRange.length > 0) {
        // AoE attack - can kill 100-200 units
        const unitsToKill = Math.min(enemyUnitsInRange.length, Math.floor(Math.random() * 101) + 100);
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
        Math.abs(catapult.position.x - tower.position.x) <= 200
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
          health: 1000,
          maxHealth: 1000,
          position: { x: 200 + position * 150, y: 150 + lane * 150 },
          lastAttack: 0
        });
        
        initialTowers.push({
          id: `enemy-tower-${lane}-${position}`,
          team: 'enemy',
          lane,
          health: 1000,
          maxHealth: 1000,
          position: { x: 650 - position * 150, y: 150 + lane * 150 },
          lastAttack: 0
        });
      }
    }
    setTowers(initialTowers);

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
      position: { x: 100, y: 150 + lane * 150 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      isAttackingTower: false
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
      lastAttack: 0,
      isAttackingTower: false
    };

    setUnits(prev => [...prev, enemyUnit]);
  };

  const moveAndFightUnits = () => {
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(unit => {
        if (unit.health <= 0) return unit;

        // 1. Önce düşman kulelerini kontrol et
        const enemyTowersInLane = towers.filter(tower => 
          tower.team !== unit.team && 
          tower.health > 0 && 
          tower.lane === unit.lane
        );

        // En yakın düşman kuleyi bul
        let nearestEnemyTower = null;
        let minTowerDistance = Infinity;
        
        for (const tower of enemyTowersInLane) {
          const distance = Math.abs(tower.position.x - unit.position.x);
          if (distance < minTowerDistance) {
            minTowerDistance = distance;
            nearestEnemyTower = tower;
          }
        }

        // Eğer kule yakınsa (80 pixel içinde) ona saldır
        if (nearestEnemyTower && minTowerDistance < 80) {
          if (battleTime - unit.lastAttack >= 1) {
            // Kuleye saldır
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
              isAttackingTower: true 
            };
          }
          return { ...unit, isMoving: false, isAttackingTower: true };
        }

        // 2. Kule yoksa veya uzaksa, düşman askerleri kontrol et
        const enemies = prevUnits.filter(u => 
          u.team !== unit.team && 
          u.health > 0 && 
          u.lane === unit.lane &&
          Math.abs(u.position.x - unit.position.x) < 120
        );

        if (enemies.length > 0) {
          const nearestEnemy = enemies.reduce((closest, enemy) => {
            const distToEnemy = Math.abs(enemy.position.x - unit.position.x);
            const distToClosest = Math.abs(closest.position.x - unit.position.x);
            return distToEnemy < distToClosest ? enemy : closest;
          });

          const distance = Math.abs(nearestEnemy.position.x - unit.position.x);
          
          if (distance < 80) {
            if (battleTime - unit.lastAttack >= 1) {
              return { 
                ...unit, 
                target: nearestEnemy, 
                isMoving: false, 
                lastAttack: battleTime,
                isAttackingTower: false 
              };
            }
            return { ...unit, isMoving: false, isAttackingTower: false };
          }
        }

        // 3. Düşman kale kontrolü
        const enemyCastle = castles.find(c => c.team !== unit.team);
        if (enemyCastle && Math.abs(unit.position.x - enemyCastle.position.x) < 100) {
          if (battleTime - unit.lastAttack >= 1) {
            setCastles(prev => prev.map(castle => {
              if (castle.team !== unit.team) {
                const newHealth = Math.max(0, castle.health - unit.damage);
                return { ...castle, health: newHealth };
              }
              return castle;
            }));
            return { ...unit, lastAttack: battleTime, isAttackingTower: false };
          }
        }

        // 4. Hiç düşman yoksa ilerle
        if (unit.isMoving) {
          const direction = unit.team === 'player' ? 1 : -1;
          const newX = unit.position.x + (unit.speed / 10) * direction;
          
          return { 
            ...unit, 
            position: { ...unit.position, x: newX },
            isAttackingTower: false
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

  const playerCastle = castles.find(c => c.team === 'player');
  const enemyCastle = castles.find(c => c.team === 'enemy');

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Savaş Alanı - 3 Şeritli Kale Savunması</h2>
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

            {/* Mancınık Bilgisi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mancınık Sistemi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs">
                  <p>• Her 21 saniyede otomatik spawn</p>
                  <p>• 3 saniyede bir atış (100 hasar)</p>
                  <p>• Kulelere ve kalelere odaklanır</p>
                  <p>• Tek vuruşla yok edilebilir</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span>Oyuncu: {catapults.filter(c => c.team === 'player').length}</span>
                  </div>
                  <div>
                    <span>Düşman: {catapults.filter(c => c.team === 'enemy').length}</span>
                  </div>
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
                      {lane === 0 ? 'Üst Şerit' : lane === 1 ? 'Orta Şerit' : 'Alt Şerit'}
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
                    {lane === 0 ? 'ÜST ŞERİT' : lane === 1 ? 'ORTA ŞERİT' : 'ALT ŞERİT'}
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

                  {/* Player Towers */}
                  {towers
                    .filter(tower => tower.team === 'player' && tower.lane === lane && tower.health > 0)
                    .map(tower => (
                      <div
                        key={tower.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${(tower.position.x / 1000) * 100}%`,
                          top: '50%'
                        }}
                      >
                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-sm">🗼</span>
                        </div>
                        <div className="text-xs text-center">
                          {Math.round((tower.health / tower.maxHealth) * 100)}%
                        </div>
                      </div>
                    ))}

                  {/* Enemy Castle */}
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-16 h-12 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white text-xl">🏰</span>
                    </div>
                    <div className="text-xs text-center mt-1">
                      {Math.round(((enemyCastle?.health || 0) / 2500) * 100)}%
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
                          left: `${(tower.position.x / 1000) * 100}%`,
                          top: '50%'
                        }}
                      >
                        <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                          <span className="text-white text-sm">🗼</span>
                        </div>
                        <div className="text-xs text-center">
                          {Math.round((tower.health / tower.maxHealth) * 100)}%
                        </div>
                      </div>
                    ))}

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
                        {unit.isAttackingTower && (
                          <div className="text-xs text-center text-red-600 font-bold">⚔️</div>
                        )}
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
                          left: `${(catapult.position.x / 1000) * 100}%`,
                          top: '50%'
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
              <div>Kule Saldırısı Yapan: {units.filter(u => u.isAttackingTower).length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
