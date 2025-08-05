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
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
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
  state: 'moving' | 'fighting' | 'attacking_building';
}

interface Catapult {
  id: string;
  team: 'player' | 'enemy';
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  lastShot: number;
}

const UNIT_CONFIGS = {
  swordsman: { icon: '⚔️', health: 100, damage: 50, speed: 80, cost: 2 },
  archer: { icon: '🏹', health: 80, damage: 40, speed: 90, cost: 3 },
  cavalry: { icon: '🐎', health: 120, damage: 70, speed: 120, cost: 4 },
  mage_fire: { icon: '🔥', health: 60, damage: 90, speed: 70, cost: 5 },
  mage_ice: { icon: '❄️', health: 70, damage: 80, speed: 70, cost: 5 },
  mage_lightning: { icon: '⚡', health: 50, damage: 100, speed: 70, cost: 5 }
};

const PATH_CONFIGS = {
  left: { startX: 150, centerX: 200, targetX: 200 },
  center: { startX: 400, centerX: 400, targetX: 400 },
  right: { startX: 650, centerX: 600, targetX: 600 }
};

export const BattleField = () => {
  const { state, dispatch } = useGame();
  const [battleActive, setBattleActive] = useState(false);
  const [mana, setMana] = useState(10);
  const [units, setUnits] = useState<Unit[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [castles, setCastles] = useState<Castle[]>([]);
  const [catapults, setCatapults] = useState<Catapult[]>([]);
  const [battleTime, setBattleTime] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [playerArmyRemaining, setPlayerArmyRemaining] = useState<{[key: string]: number}>({});
  const [enemyArmyRemaining, setEnemyArmyRemaining] = useState<{[key: string]: number}>({});

  // Initialize battle with real army data
  useEffect(() => {
    if (state.battleState.inBattle) {
      initializeBattleWithArmies();
    }
  }, [state.battleState.inBattle, state.army]);

  const initializeBattleWithArmies = () => {
    // Player ordusu - gerçek verilerden
    const playerArmy: {[key: string]: number} = {};
    state.army.forEach(unit => {
      playerArmy[unit.type] = unit.count;
    });
    setPlayerArmyRemaining(playerArmy);

    // Düşman ordusu - rastgele ama dengeli
    const enemyArmy: {[key: string]: number} = {};
    const totalPlayerUnits = Object.values(playerArmy).reduce((sum, count) => sum + count, 0);
    
    // Düşmanın da benzer sayıda askeri olsun
    const unitTypes = Object.keys(UNIT_CONFIGS);
    for (let i = 0; i < Math.min(totalPlayerUnits * 1.2, 2000); i++) {
      const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
      enemyArmy[randomType] = (enemyArmy[randomType] || 0) + 1;
    }
    setEnemyArmyRemaining(enemyArmy);

    // Initialize towers
    const initialTowers: Tower[] = [
      {
        id: 'player-tower-left',
        team: 'player',
        side: 'left',
        health: 1000,
        maxHealth: 1000,
        position: { x: 280, y: 450 },
        lastAttack: 0
      },
      {
        id: 'player-tower-right',
        team: 'player',
        side: 'right',
        health: 1000,
        maxHealth: 1000,
        position: { x: 520, y: 450 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-left',
        team: 'enemy',
        side: 'left',
        health: 1000,
        maxHealth: 1000,
        position: { x: 280, y: 250 },
        lastAttack: 0
      },
      {
        id: 'enemy-tower-right',
        team: 'enemy',
        side: 'right',
        health: 1000,
        maxHealth: 1000,
        position: { x: 520, y: 250 },
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
        position: { x: 400, y: 520 }
      },
      {
        id: 'enemy-castle',
        team: 'enemy',
        health: 3000,
        maxHealth: 3000,
        position: { x: 400, y: 180 }
      }
    ]);

    // Initialize catapults
    setCatapults([
      {
        id: 'player-catapult-1',
        team: 'player',
        position: { x: 300, y: 480 },
        health: 500,
        maxHealth: 500,
        lastShot: 0
      },
      {
        id: 'player-catapult-2',
        team: 'player',
        position: { x: 500, y: 480 },
        health: 500,
        maxHealth: 500,
        lastShot: 0
      },
      {
        id: 'enemy-catapult-1',
        team: 'enemy',
        position: { x: 300, y: 220 },
        health: 500,
        maxHealth: 500,
        lastShot: 0
      },
      {
        id: 'enemy-catapult-2',
        team: 'enemy',
        position: { x: 500, y: 220 },
        health: 500,
        maxHealth: 500,
        lastShot: 0
      }
    ]);
  };

  // Main battle loop
  useEffect(() => {
    if (!battleActive || gameResult) return;

    const interval = setInterval(() => {
      setBattleTime(prev => prev + 1);
      
      // Mana regeneration
      if (battleTime % 3 === 0 && mana < 10) {
        setMana(prev => Math.min(10, prev + 1));
      }

      // Unit AI
      updateUnitsWithBetterAI();
      
      // Enemy unit spawning (only if they have army)
      if (battleTime % 10 === 0) {
        spawnEnemyUnitFromArmy();
      }
      
      // Tower attacks
      handleTowerAttacks();
      
      // Catapult attacks every 8 seconds
      if (battleTime % 8 === 0) {
        handleCatapultAttacks();
      }
      
    }, 300);

    return () => clearInterval(interval);
  }, [battleActive, battleTime, mana, units, towers, castles, catapults, gameResult, enemyArmyRemaining]);

  const updateUnitsWithBetterAI = useCallback(() => {
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(unit => {
        if (unit.health <= 0) return unit;

        // Find nearest enemy unit first
        const enemyUnits = prevUnits.filter(u => 
          u.team !== unit.team && 
          u.health > 0
        );

        let nearestEnemyUnit = null;
        let minEnemyDistance = Infinity;

        enemyUnits.forEach(enemy => {
          const distance = Math.sqrt(
            Math.pow(enemy.position.x - unit.position.x, 2) + 
            Math.pow(enemy.position.y - unit.position.y, 2)
          );
          if (distance < minEnemyDistance) {
            minEnemyDistance = distance;
            nearestEnemyUnit = enemy;
          }
        });

        // If enemy unit is close, engage in combat
        if (nearestEnemyUnit && minEnemyDistance < 80) {
          if (battleTime - unit.lastAttack >= 2) {
            return { 
              ...unit, 
              target: nearestEnemyUnit, 
              isMoving: false, 
              lastAttack: battleTime,
              state: 'fighting' as const
            };
          }
          return { ...unit, isMoving: false, state: 'fighting' as const };
        }

        // Find nearest enemy building (towers and catapults first, then castle)
        const enemyBuildings = [
          ...towers.filter(tower => tower.team !== unit.team && tower.health > 0),
          ...catapults.filter(catapult => catapult.team !== unit.team && catapult.health > 0),
          ...castles.filter(castle => castle.team !== unit.team && castle.health > 0)
        ];

        let nearestBuilding = null;
        let minBuildingDistance = Infinity;
        
        enemyBuildings.forEach(building => {
          const distance = Math.sqrt(
            Math.pow(building.position.x - unit.position.x, 2) + 
            Math.pow(building.position.y - unit.position.y, 2)
          );
          if (distance < minBuildingDistance) {
            minBuildingDistance = distance;
            nearestBuilding = building;
          }
        });

        // Attack building if in range
        if (nearestBuilding && minBuildingDistance < 60) {
          if (battleTime - unit.lastAttack >= 2) {
            if ('side' in nearestBuilding) {
              // Attack tower
              setTowers(prevTowers => prevTowers.map(tower => {
                if (tower.id === nearestBuilding.id) {
                  const newHealth = Math.max(0, tower.health - unit.damage);
                  return { ...tower, health: newHealth };
                }
                return tower;
              }));
            } else if ('lastShot' in nearestBuilding) {
              // Attack catapult
              setCatapults(prevCatapults => prevCatapults.map(catapult => {
                if (catapult.id === nearestBuilding.id) {
                  const newHealth = Math.max(0, catapult.health - unit.damage);
                  return { ...catapult, health: newHealth };
                }
                return catapult;
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
              state: 'attacking_building' as const
            };
          }
          return { ...unit, isMoving: false, state: 'attacking_building' as const };
        }

        // Move toward nearest target
        if (nearestEnemyUnit && minEnemyDistance < 200) {
          const deltaX = nearestEnemyUnit.position.x - unit.position.x;
          const deltaY = nearestEnemyUnit.position.y - unit.position.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          if (distance > 80) {
            const moveSpeed = unit.speed / 8;
            const newX = unit.position.x + (deltaX / distance) * moveSpeed;
            const newY = unit.position.y + (deltaY / distance) * moveSpeed;
            
            return { 
              ...unit, 
              position: { x: newX, y: newY },
              isMoving: true,
              state: 'moving' as const
            };
          }
        } else if (nearestBuilding) {
          const deltaX = nearestBuilding.position.x - unit.position.x;
          const deltaY = nearestBuilding.position.y - unit.position.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          if (distance > 60) {
            const moveSpeed = unit.speed / 8;
            const newX = unit.position.x + (deltaX / distance) * moveSpeed;
            const newY = unit.position.y + (deltaY / distance) * moveSpeed;
            
            return { 
              ...unit, 
              position: { x: newX, y: newY },
              isMoving: true,
              state: 'moving' as const
            };
          }
        }

        return unit;
      });

      // Handle combat damage
      const finalUnits = updatedUnits.map(unit => {
        if (unit.target && unit.lastAttack === battleTime && unit.state === 'fighting') {
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

    checkGameEnd();
  }, [battleTime, towers, castles, catapults]);

  const checkGameEnd = () => {
    setCastles(prev => {
      const playerCastle = prev.find(c => c.team === 'player');
      const enemyCastle = prev.find(c => c.team === 'enemy');
      
      if (playerCastle && playerCastle.health <= 0 && !gameResult) {
        setGameResult('lose');
        setBattleActive(false);
        handleBattleEnd(false);
      } else if (enemyCastle && enemyCastle.health <= 0 && !gameResult) {
        setGameResult('win');
        setBattleActive(false);
        handleBattleEnd(true);
      }
      
      return prev;
    });
  };

  const handleBattleEnd = (won: boolean) => {
    if (won) {
      dispatch({
        type: 'UPDATE_RESOURCES',
        payload: {
          gold: state.resources.gold + 1000,
          wood: state.resources.wood + 500,
          iron: state.resources.iron + 500,
          wheat: state.resources.wheat + 300,
          stone: state.resources.stone + 300
        }
      });
    }
    
    dispatch({ type: 'BATTLE_RESULT', payload: { won } });
    
    // Clear army if lost
    if (!won) {
      dispatch({ type: 'UPDATE_RESOURCES', payload: {} }); // Reset army in context
    }
    
    setTimeout(() => {
      dispatch({ type: 'END_BATTLE' });
    }, 3000);
  };

  const startBattle = () => {
    setBattleActive(true);
    setBattleTime(0);
    setMana(10);
    setUnits([]);
    setGameResult(null);
    
    setTowers(prev => prev.map(tower => ({ 
      ...tower, 
      health: tower.maxHealth,
      lastAttack: 0 
    })));
    
    setCastles(prev => prev.map(castle => ({ 
      ...castle, 
      health: castle.maxHealth 
    })));

    setCatapults(prev => prev.map(catapult => ({
      ...catapult,
      health: catapult.maxHealth,
      lastShot: 0
    })));
  };

  const endBattle = () => {
    setBattleActive(false);
    setGameResult(null);
    dispatch({ type: 'END_BATTLE' });
  };

  const deployUnit = (unitType: keyof typeof UNIT_CONFIGS, path: 'left' | 'center' | 'right') => {
    const config = UNIT_CONFIGS[unitType];
    if (mana < config.cost) return;
    
    // Check if player has remaining units of this type
    if (!playerArmyRemaining[unitType] || playerArmyRemaining[unitType] <= 0) return;

    const pathConfig = PATH_CONFIGS[path];
    const newUnit: Unit = {
      id: `player-${Date.now()}-${Math.random()}`,
      type: unitType,
      team: 'player',
      path,
      position: { x: pathConfig.startX, y: 480 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      state: 'moving'
    };

    setUnits(prev => [...prev, newUnit]);
    setMana(prev => prev - config.cost);
    
    // Reduce army count
    setPlayerArmyRemaining(prev => ({
      ...prev,
      [unitType]: prev[unitType] - 1
    }));
  };

  const spawnEnemyUnitFromArmy = () => {
    const availableTypes = Object.entries(enemyArmyRemaining).filter(([_, count]) => count > 0);
    if (availableTypes.length === 0) return;

    const [randomType] = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const paths: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
    const randomPath = paths[Math.floor(Math.random() * paths.length)];
    const config = UNIT_CONFIGS[randomType as keyof typeof UNIT_CONFIGS];
    const pathConfig = PATH_CONFIGS[randomPath];

    const enemyUnit: Unit = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      type: randomType as keyof typeof UNIT_CONFIGS,
      team: 'enemy',
      path: randomPath,
      position: { x: pathConfig.startX, y: 220 },
      health: config.health,
      maxHealth: config.health,
      damage: config.damage,
      speed: config.speed,
      isMoving: true,
      lastAttack: 0,
      state: 'moving'
    };

    setUnits(prev => [...prev, enemyUnit]);
    
    // Reduce enemy army count
    setEnemyArmyRemaining(prev => ({
      ...prev,
      [randomType]: prev[randomType] - 1
    }));
  };

  const handleTowerAttacks = () => {
    towers.forEach(tower => {
      if (tower.health <= 0 || battleTime - tower.lastAttack < 3) return;

      const enemyUnitsInRange = units.filter(unit => {
        if (unit.team === tower.team || unit.health <= 0) return false;
        
        const distance = Math.sqrt(
          Math.pow(unit.position.x - tower.position.x, 2) + 
          Math.pow(unit.position.y - tower.position.y, 2)
        );
        return distance <= 120;
      });

      if (enemyUnitsInRange.length > 0) {
        const targetUnit = enemyUnitsInRange[0];
        
        setUnits(prevUnits => 
          prevUnits.map(unit => 
            unit.id === targetUnit.id 
              ? { ...unit, health: Math.max(0, unit.health - 200) }
              : unit
          ).filter(unit => unit.health > 0)
        );

        setTowers(prevTowers => 
          prevTowers.map(t => 
            t.id === tower.id ? { ...t, lastAttack: battleTime } : t
          )
        );
      }
    });
  };

  const handleCatapultAttacks = () => {
    catapults.forEach(catapult => {
      if (catapult.health <= 0) return;

      const enemyBuildings = [
        ...towers.filter(tower => tower.team !== catapult.team && tower.health > 0),
        ...castles.filter(castle => castle.team !== catapult.team && castle.health > 0)
      ];

      if (enemyBuildings.length > 0) {
        const target = enemyBuildings[Math.floor(Math.random() * enemyBuildings.length)];
        
        if ('side' in target) {
          // Attack tower
          setTowers(prevTowers => prevTowers.map(tower => {
            if (tower.id === target.id) {
              return { ...tower, health: Math.max(0, tower.health - 300) };
            }
            return tower;
          }));
        } else {
          // Attack castle
          setCastles(prevCastles => prevCastles.map(castle => {
            if (castle.id === target.id) {
              return { ...castle, health: Math.max(0, castle.health - 300) };
            }
            return castle;
          }));
        }
      }
    });
  };

  const getUnitStateIcon = (unit: Unit) => {
    switch (unit.state) {
      case 'fighting': return '⚔️';
      case 'attacking_building': return '🏗️';
      default: return '';
    }
  };

  const playerCastle = castles.find(c => c.team === 'player');
  const enemyCastle = castles.find(c => c.team === 'enemy');

  const getTotalPlayerArmyRemaining = () => {
    return Object.values(playerArmyRemaining).reduce((sum, count) => sum + count, 0);
  };

  const getTotalEnemyArmyRemaining = () => {
    return Object.values(enemyArmyRemaining).reduce((sum, count) => sum + count, 0);
  };

  if (!state.battleState.inBattle) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[96vw] h-[96vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-red-50 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🏰 Savaş Arenası</h2>
            <Badge variant="secondary">
              {Math.floor(battleTime / 60)}:{String(battleTime % 60).padStart(2, '0')}
            </Badge>
            {gameResult && (
              <Badge variant={gameResult === 'win' ? 'default' : 'destructive'}>
                {gameResult === 'win' ? '🎉 KAZANDIN!' : '💀 KAYBETTİN!'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-purple-50">⚡ {mana}/10</Badge>
            <Badge variant="outline" className="bg-blue-50">
              📦 Kalan Ordu: {getTotalPlayerArmyRemaining()}
            </Badge>
            <Badge variant="outline" className="bg-red-50">
              🔴 Düşman Ordusu: {getTotalEnemyArmyRemaining()}
            </Badge>
            <Button onClick={endBattle} variant="outline" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Panel */}
          <div className="w-80 border-r p-4 space-y-4 bg-gray-50/50">
            {/* Castle Status */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🏰 Kale Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-blue-700">🔵 Senin Kalen</span>
                    <span>{playerCastle?.health}/{playerCastle?.maxHealth}</span>
                  </div>
                  <Progress value={playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-red-700">🔴 Düşman Kalesi</span>
                    <span>{enemyCastle?.health}/{enemyCastle?.maxHealth}</span>
                  </div>
                  <Progress value={enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 100} />
                </div>
              </CardContent>
            </Card>

            {/* Player Army Status */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚔️ Mevcut Ordun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(playerArmyRemaining).map(([unitType, count]) => (
                  <div key={unitType} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{UNIT_CONFIGS[unitType as keyof typeof UNIT_CONFIGS]?.icon}</span>
                      <span>{unitType}</span>
                    </div>
                    <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
                  </div>
                ))}
                {getTotalPlayerArmyRemaining() === 0 && (
                  <div className="text-center text-red-600 text-sm font-medium">
                    ❌ Ordun Tükendi!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unit Deployment */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🚀 Asker Gönderimi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['left', 'center', 'right'] as const).map(path => (
                  <div key={path} className="border rounded-lg p-3 bg-white/60">
                    <div className="text-sm font-semibold mb-3 text-center">
                      {path === 'left' ? '🔵 Sol Yol' : path === 'center' ? '🟢 Orta Yol' : '🔴 Sağ Yol'}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(UNIT_CONFIGS).map(([unitType, config]) => {
                        const hasUnits = playerArmyRemaining[unitType] > 0;
                        return (
                          <Button
                            key={unitType}
                            size="sm"
                            variant={hasUnits ? "outline" : "secondary"}
                            onClick={() => deployUnit(unitType as keyof typeof UNIT_CONFIGS, path)}
                            disabled={mana < config.cost || !battleActive || !hasUnits}
                            className="h-16 flex flex-col gap-1"
                          >
                            <span className="text-lg">{config.icon}</span>
                            <span className="text-xs font-bold text-purple-600">{config.cost}⚡</span>
                            <span className="text-xs text-muted-foreground">
                              {playerArmyRemaining[unitType] || 0}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Battle Control */}
            {!battleActive ? (
              <Button 
                onClick={startBattle} 
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" 
                size="lg"
                disabled={getTotalPlayerArmyRemaining() === 0}
              >
                {getTotalPlayerArmyRemaining() === 0 ? '❌ Ordu Yok' : '🚀 Savaşı Başlat'}
              </Button>
            ) : (
              <Button onClick={endBattle} variant="destructive" className="w-full h-12 text-lg" size="lg">
                🏃‍♂️ Savaştan Çık
              </Button>
            )}
          </div>

          {/* Battle Arena */}
          <div className="flex-1 relative bg-gradient-to-b from-sky-200 via-green-200 to-yellow-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-radial from-green-300/30 via-green-400/20 to-green-500/10" />
            
            <div className="absolute inset-6">
              {/* Enemy Castle */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <div className="w-32 h-24 bg-gradient-to-b from-red-600 to-red-800 rounded-lg shadow-xl border-2 border-red-700 flex items-center justify-center">
                    <span className="text-white text-3xl">🏰</span>
                  </div>
                  <div className="w-40 h-4 bg-gray-300 rounded-full mt-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${enemyCastle ? (enemyCastle.health / enemyCastle.maxHealth) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-sm font-bold mt-1 text-red-800">DÜŞMAN KALESİ</div>
                  <div className="text-sm text-gray-600">{enemyCastle?.health}/{enemyCastle?.maxHealth}</div>
                </div>
              </div>

              {/* Enemy Towers */}
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
                      <div className="w-20 h-20 bg-gradient-to-b from-red-500 to-red-700 rounded-full shadow-lg border border-red-600 flex items-center justify-center">
                        <span className="text-white text-lg">🗼</span>
                      </div>
                      <div className="w-24 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Enemy Catapults */}
              {catapults
                .filter(catapult => catapult.team === 'enemy' && catapult.health > 0)
                .map(catapult => (
                  <div
                    key={catapult.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${catapult.position.x}px`,
                      top: `${catapult.position.y}px`
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-b from-orange-500 to-orange-700 rounded-lg shadow-lg border border-orange-600 flex items-center justify-center">
                        <span className="text-white text-sm">🎯</span>
                      </div>
                      <div className="w-20 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${(catapult.health / catapult.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Player Castle */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex flex-col items-center">
                  <div className="text-sm font-bold mb-1 text-blue-800">SENİN KALEN</div>
                  <div className="text-sm text-gray-600 mb-2">{playerCastle?.health}/{playerCastle?.maxHealth}</div>
                  <div className="w-40 h-4 bg-gray-300 rounded-full mb-2 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${playerCastle ? (playerCastle.health / playerCastle.maxHealth) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-32 h-24 bg-gradient-to-b from-blue-600 to-blue-800 rounded-lg shadow-xl border-2 border-blue-700 flex items-center justify-center">
                    <span className="text-white text-3xl">🏰</span>
                  </div>
                </div>
              </div>

              {/* Player Towers */}
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
                      <div className="w-20 h-20 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full shadow-lg border border-blue-600 flex items-center justify-center">
                        <span className="text-white text-lg">🗼</span>
                      </div>
                      <div className="w-24 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Player Catapults */}
              {catapults
                .filter(catapult => catapult.team === 'player' && catapult.health > 0)
                .map(catapult => (
                  <div
                    key={catapult.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${catapult.position.x}px`,
                      top: `${catapult.position.y}px`
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg shadow-lg border border-blue-500 flex items-center justify-center">
                        <span className="text-white text-sm">🎯</span>
                      </div>
                      <div className="w-20 h-2 bg-gray-300 rounded-full mt-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${(catapult.health / catapult.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Units */}
              {units.map(unit => (
                <div
                  key={unit.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                  style={{
                    left: `${unit.position.x}px`,
                    top: `${unit.position.y}px`,
                    zIndex: 20
                  }}
                >
                  <div className={`${
                    unit.team === 'player' 
                      ? 'shadow-lg shadow-blue-500/40 border border-blue-400 bg-blue-100/90' 
                      : 'shadow-lg shadow-red-500/40 border border-red-400 bg-red-100/90'
                    } rounded-lg p-1.5`}>
                    <div className="text-xl text-center mb-1">
                      {UNIT_CONFIGS[unit.type].icon}
                    </div>
                    <div className="w-12 h-2 bg-gray-400 rounded-full">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-200"
                        style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                      />
                    </div>
                    {unit.state !== 'moving' && (
                      <div className="text-xs text-center font-bold mt-1">
                        {getUnitStateIcon(unit)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border rounded-lg p-3 text-sm shadow-lg">
              <div className="font-bold mb-2 text-gray-800">📊 İstatistikler</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Sahada Asker:</span>
                  <span className="font-semibold">{units.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mavi Takım:</span>
                  <span className="font-semibold text-blue-600">{units.filter(u => u.team === 'player').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kırmızı Takım:</span>
                  <span className="font-semibold text-red-600">{units.filter(u => u.team === 'enemy').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kalan Ordun:</span>
                  <span className="font-semibold text-blue-800">{getTotalPlayerArmyRemaining()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Düşman Ordusu:</span>
                  <span className="font-semibold text-red-800">{getTotalEnemyArmyRemaining()}</span>
                </div>
              </div>
            </div>

            {/* Win/Lose notification */}
            {gameResult && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
                  <div className="text-6xl mb-4">
                    {gameResult === 'win' ? '🎉' : '💀'}
                  </div>
                  <div className="text-2xl font-bold mb-4">
                    {gameResult === 'win' ? 'KAZANDIN!' : 'KAYBETTİN!'}
                  </div>
                  {gameResult === 'win' && (
                    <div className="text-sm text-gray-600">
                      Ödüller: +1000 Altın, +500 Odun, +500 Demir, +300 Buğday, +300 Taş
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-2">
                    Ana haritaya dönülüyor...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
