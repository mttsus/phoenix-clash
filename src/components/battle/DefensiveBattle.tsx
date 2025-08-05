import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Tower {
  id: number;
  lane: number; // 0=left, 1=middle, 2=right
  position: number; // 0=front, 1=middle, 2=back
  health: number;
  maxHealth: number;
  damage: number;
  range: number;
  isDestroyed: boolean;
  x: number;
  y: number;
  team: 'player' | 'enemy';
}

interface Unit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  battalion: number; // 100 units per battalion
  x: number;
  y: number;
  lane: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  isMoving: boolean;
  targetTower?: Tower;
  targetCatapult?: Catapult;
  lastAttack: number;
}

interface Catapult {
  id: number;
  team: 'player' | 'enemy';
  lane: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  lastShot: number;
  isDestroyed: boolean;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  speed: number;
  lastSpawn: number;
}

const UNIT_STATS = {
  swordsman: { name: 'Kılıçlı', health: 100, damage: 100, speed: 1, cost: 1, icon: '⚔️' },
  archer: { name: 'Okçu', health: 80, damage: 100, speed: 1.2, cost: 1, icon: '🏹' },
  cavalry: { name: 'Atlı', health: 120, damage: 100, speed: 2.5, cost: 2, icon: '🐎' },
  mage_fire: { name: 'Ateş Büyücü', health: 60, damage: 100, speed: 0.8, cost: 2, icon: '🔥' },
  mage_ice: { name: 'Buz Büyücü', health: 70, damage: 100, speed: 0.8, cost: 2, icon: '❄️' },
  mage_lightning: { name: 'Şimşek Büyücü', health: 50, damage: 100, speed: 0.8, cost: 3, icon: '⚡' }
};

interface DefensiveBattleProps {
  battleType: 'resource' | 'pvp';
}

export const DefensiveBattle = ({ battleType }: DefensiveBattleProps) => {
  const { state, dispatch } = useGame();
  const [selectedUnit, setSelectedUnit] = useState<keyof typeof UNIT_STATS>('swordsman');
  const [towers, setTowers] = useState<Tower[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [catapults, setCatapults] = useState<Catapult[]>([]);
  const [gameTime, setGameTime] = useState(0);
  const [selectedUnitToFollow, setSelectedUnitToFollow] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 400, y: 500 });
  const [castleHealth, setCastleHealth] = useState({ player: 5000, enemy: 5000 });
  const [lastCatapultSpawn, setLastCatapultSpawn] = useState(0);
  const [battleResult, setBattleResult] = useState<{ won: boolean; rewards?: any } | null>(null);
  const [availableArmy, setAvailableArmy] = useState<{ [key: string]: number }>({});

  // Initialize available army from current game state
  useEffect(() => {
    const armyMap: { [key: string]: number } = {};
    state.army.forEach(unit => {
      armyMap[unit.type] = (armyMap[unit.type] || 0) + unit.count;
    });
    setAvailableArmy(armyMap);
  }, [state.army]);

  // Initialize towers with better positioning for full screen
  useEffect(() => {
    const initialTowers: Tower[] = [];
    
    // Enemy towers (top side) - better spacing
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        const x = 200 + (lane * 300);
        const y = 100 + (position * 80);
        initialTowers.push({
          id: lane * 3 + position,
          lane,
          position,
          health: 1000,
          maxHealth: 1000,
          damage: 150,
          range: 120,
          isDestroyed: false,
          x,
          y,
          team: 'enemy'
        });
      }
    }

    // Player towers (bottom side) - better spacing
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        const x = 200 + (lane * 300);
        const y = 700 - (position * 80);
        initialTowers.push({
          id: 9 + lane * 3 + position,
          lane,
          position,
          health: 1000,
          maxHealth: 1000,
          damage: 150,
          range: 120,
          isDestroyed: false,
          x,
          y,
          team: 'player'
        });
      }
    }
    
    setTowers(initialTowers);
  }, []);

  // Spawn catapults every 21 seconds from 3 lanes
  useEffect(() => {
    const catapultSpawnInterval = setInterval(() => {
      if (gameTime - lastCatapultSpawn >= 21) {
        // Spawn player catapults from 3 lanes
        const newPlayerCatapults: Catapult[] = [];
        for (let lane = 0; lane < 3; lane++) {
          const x = 200 + (lane * 300);
          const y = 760;
          newPlayerCatapults.push({
            id: Date.now() + lane,
            team: 'player',
            lane,
            x,
            y,
            health: 200, // Increased health so units need to attack them
            maxHealth: 200,
            damage: 100,
            lastShot: 0,
            isDestroyed: false,
            targetX: x,
            targetY: 400,
            isMoving: true,
            speed: 0.5,
            lastSpawn: gameTime
          });
        }

        // Spawn enemy catapults from 3 lanes
        const newEnemyCatapults: Catapult[] = [];
        for (let lane = 0; lane < 3; lane++) {
          const x = 200 + (lane * 300);
          const y = 40;
          newEnemyCatapults.push({
            id: Date.now() + lane + 10,
            team: 'enemy',
            lane,
            x,
            y,
            health: 200, // Increased health
            maxHealth: 200,
            damage: 100,
            lastShot: 0,
            isDestroyed: false,
            targetX: x,
            targetY: 400,
            isMoving: true,
            speed: 0.5,
            lastSpawn: gameTime
          });
        }

        setCatapults(prev => [...prev, ...newPlayerCatapults, ...newEnemyCatapults]);
        setLastCatapultSpawn(gameTime);
      }
    }, 1000);

    return () => clearInterval(catapultSpawnInterval);
  }, [gameTime, lastCatapultSpawn]);

  // Mana regeneration system
  useEffect(() => {
    const manaInterval = setInterval(() => {
      if (state.battleState.playerMana < state.battleState.maxMana) {
        dispatch({ type: 'UPDATE_MANA', payload: state.battleState.playerMana + 1 });
      }
    }, 3000);

    const timeInterval = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(manaInterval);
      clearInterval(timeInterval);
    };
  }, [state.battleState.playerMana, state.battleState.maxMana, dispatch]);

  // Main game loop with improved unit vs catapult vs tower combat
  useEffect(() => {
    const gameLoop = setInterval(() => {
      // Unit movement and combat - attack closest enemy target
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.battalion <= 0) return unit;

          // Find all possible enemy targets in the same lane
          const enemyCatapults = catapults.filter(c => 
            !c.isDestroyed && 
            c.team !== 'player' &&
            c.lane === unit.lane
          );

          const enemyTowers = towers.filter(t => 
            t.lane === unit.lane && 
            !t.isDestroyed && 
            t.team === 'enemy'
          );

          // Calculate distances and find closest target
          const catapultTargets = enemyCatapults.map(c => ({
            type: 'catapult',
            target: c,
            distance: Math.abs(c.y - unit.y),
            x: c.x,
            y: c.y
          }));

          const towerTargets = enemyTowers.map(t => ({
            type: 'tower',
            target: t,
            distance: Math.abs(t.y - unit.y),
            x: t.x,
            y: t.y
          }));

          // Enemy castle target
          const enemyCastleY = 40;
          const castleTarget = {
            type: 'castle',
            target: null,
            distance: Math.abs(enemyCastleY - unit.y),
            x: unit.x,
            y: enemyCastleY
          };

          // Combine all targets and find the closest one
          const allTargets = [...catapultTargets, ...towerTargets, castleTarget]
            .sort((a, b) => a.distance - b.distance);

          const closestTarget = allTargets[0];

          if (closestTarget && closestTarget.distance > 60) {
            // Move towards closest target
            return {
              ...unit,
              y: unit.y - unit.speed,
              isMoving: true,
              targetCatapult: closestTarget.type === 'catapult' ? closestTarget.target : undefined,
              targetTower: closestTarget.type === 'tower' ? closestTarget.target : undefined
            };
          } else if (closestTarget && closestTarget.distance <= 60) {
            // Attack closest target
            if (gameTime - unit.lastAttack > 1) {
              if (closestTarget.type === 'catapult') {
                setCatapults(prevCatapults => 
                  prevCatapults.map(c => 
                    c.id === closestTarget.target.id 
                      ? { 
                          ...c, 
                          health: Math.max(0, c.health - unit.damage),
                          isDestroyed: c.health - unit.damage <= 0 
                        }
                      : c
                  )
                );
              } else if (closestTarget.type === 'tower') {
                setTowers(prevTowers => 
                  prevTowers.map(t => 
                    t.id === closestTarget.target.id 
                      ? { ...t, health: Math.max(0, t.health - unit.damage), isDestroyed: t.health - unit.damage <= 0 }
                      : t
                  )
                );
              } else if (closestTarget.type === 'castle') {
                setCastleHealth(prev => ({
                  ...prev,
                  enemy: Math.max(0, prev.enemy - unit.damage)
                }));
              }
              return { ...unit, lastAttack: gameTime, isMoving: false };
            }
          }

          return unit;
        });
      });

      // Tower attacks on units
      towers.forEach(tower => {
        if (tower.isDestroyed || tower.health <= 0) return;

        const unitsInRange = units.filter(unit => {
          const distance = Math.sqrt(
            Math.pow(unit.x - tower.x, 2) + Math.pow(unit.y - tower.y, 2)
          );
          return distance <= tower.range && unit.battalion > 0;
        });

        if (unitsInRange.length > 0) {
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              if (unitsInRange.includes(unit)) {
                const casualties = Math.min(unit.battalion, 20);
                return {
                  ...unit,
                  battalion: Math.max(0, unit.battalion - casualties)
                };
              }
              return unit;
            })
          );
        }
      });

      // Catapult movement and targeting - ONLY target structures (towers and castle)
      setCatapults(prevCatapults => 
        prevCatapults.map(catapult => {
          if (catapult.isDestroyed || catapult.health <= 0) return { ...catapult, isDestroyed: true };

          // Move catapults towards enemy towers in their lane
          const enemyTeam = catapult.team === 'player' ? 'enemy' : 'player';
          const enemyTowersInLane = towers.filter(t => 
            !t.isDestroyed && 
            t.team === enemyTeam && 
            t.lane === catapult.lane
          ).sort((a, b) => Math.abs(a.y - catapult.y) - Math.abs(b.y - catapult.y));

          let targetY = catapult.team === 'player' ? 70 : 730;
          
          if (enemyTowersInLane.length > 0) {
            targetY = enemyTowersInLane[0].y;
          }

          // Move towards target
          if (catapult.isMoving) {
            const distance = Math.abs(targetY - catapult.y);
            if (distance > 10) {
              const newY = catapult.team === 'player' 
                ? catapult.y - catapult.speed 
                : catapult.y + catapult.speed;
              catapult.y = newY;
            } else {
              catapult.isMoving = false;
            }
          }

          // Auto-fire every 3 seconds when in range - ONLY at structures
          if (gameTime - catapult.lastShot >= 3) {
            // Priority 1: Attack towers in lane
            if (enemyTowersInLane.length > 0) {
              const targetTower = enemyTowersInLane[0];
              const distance = Math.abs(targetTower.y - catapult.y);
              
              if (distance <= 150) {
                setTowers(prevTowers =>
                  prevTowers.map(t =>
                    t.id === targetTower.id
                      ? { 
                          ...t, 
                          health: Math.max(0, t.health - catapult.damage),
                          isDestroyed: t.health - catapult.damage <= 0 
                        }
                      : t
                  )
                );
                return { ...catapult, lastShot: gameTime };
              }
            } else {
              // Priority 2: Attack enemy castle if no towers
              const enemyCastleY = catapult.team === 'player' ? 40 : 760;
              const distance = Math.abs(enemyCastleY - catapult.y);
              
              if (distance <= 150) {
                if (catapult.team === 'player') {
                  setCastleHealth(prev => ({
                    ...prev,
                    enemy: Math.max(0, prev.enemy - catapult.damage)
                  }));
                } else {
                  setCastleHealth(prev => ({
                    ...prev,
                    player: Math.max(0, prev.player - catapult.damage)
                  }));
                }
                return { ...catapult, lastShot: gameTime };
              }
            }
          }
          
          return catapult;
        })
      );

      // Check win conditions with rewards
      if (castleHealth.enemy <= 0) {
        const rewards = {
          wood: 3000,
          gold: 3000,
          iron: 3000,
          wheat: 3000,
          stone: 3000
        };
        
        setBattleResult({ won: true, rewards });
        
        setTimeout(() => {
          dispatch({ type: 'BATTLE_RESULT', payload: { won: true } });
          dispatch({ 
            type: 'UPDATE_RESOURCES', 
            payload: {
              wood: state.resources.wood + rewards.wood,
              gold: state.resources.gold + rewards.gold,
              iron: state.resources.iron + rewards.iron,
              wheat: state.resources.wheat + rewards.wheat,
              stone: state.resources.stone + rewards.stone
            }
          });
        }, 2000);
      } else if (castleHealth.player <= 0) {
        setBattleResult({ won: false });
        
        setTimeout(() => {
          dispatch({ type: 'BATTLE_RESULT', payload: { won: false } });
        }, 2000);
      }
    }, 100);

    return () => clearInterval(gameLoop);
  }, [units, towers, catapults, gameTime, castleHealth, dispatch, state.resources]);

  // Deploy unit battalion
  const deployUnit = useCallback((lane: number) => {
    const unitData = UNIT_STATS[selectedUnit];
    const availableCount = availableArmy[selectedUnit] || 0;
    
    if (state.battleState.playerMana >= unitData.cost && availableCount >= 100) {
      const newUnit: Unit = {
        id: `${selectedUnit}_${Date.now()}`,
        type: selectedUnit,
        battalion: 100,
        x: 200 + (lane * 300),
        y: 720,
        lane,
        health: unitData.health,
        maxHealth: unitData.health,
        damage: unitData.damage,
        speed: unitData.speed,
        isMoving: true,
        lastAttack: 0
      };

      setUnits(prev => [...prev, newUnit]);
      setAvailableArmy(prev => ({
        ...prev,
        [selectedUnit]: prev[selectedUnit] - 100
      }));
      dispatch({ 
        type: 'UPDATE_MANA', 
        payload: state.battleState.playerMana - unitData.cost 
      });
    }
  }, [selectedUnit, state.battleState.playerMana, availableArmy, dispatch]);

  // Follow unit camera
  useEffect(() => {
    if (selectedUnitToFollow) {
      const unit = units.find(u => u.id === selectedUnitToFollow);
      if (unit) {
        setCameraPosition({ x: unit.x - 400, y: unit.y - 500 });
      }
    }
  }, [selectedUnitToFollow, units]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const closeBattleResult = () => {
    setBattleResult(null);
    dispatch({ type: 'END_BATTLE' });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Battle Result Modal */}
      <Dialog open={!!battleResult} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {battleResult?.won ? '🎉 Zafer!' : '💀 Yenilgi'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg mb-4">
                {battleResult?.won 
                  ? 'Düşman kalesini yıktınız!' 
                  : 'Kaleniz yıkıldı...'}
              </p>
              
              {battleResult?.won && battleResult.rewards && (
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h3 className="font-bold text-green-800 mb-3">🎁 Kazandığınız Ödüller:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>🪵 Odun:</span>
                      <span className="font-bold">+{battleResult.rewards.wood}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🪙 Altın:</span>
                      <span className="font-bold">+{battleResult.rewards.gold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⚒️ Demir:</span>
                      <span className="font-bold">+{battleResult.rewards.iron}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🌾 Buğday:</span>
                      <span className="font-bold">+{battleResult.rewards.wheat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🪨 Taş:</span>
                      <span className="font-bold">+{battleResult.rewards.stone}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Button onClick={closeBattleResult} className="w-full">
              Haritaya Dön
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top HUD */}
      <div className="h-16 bg-gray-800 text-white p-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold">{formatTime(gameTime)}</div>
          <div className="flex items-center gap-2">
            <span>💜</span>
            <span>{state.battleState.playerMana}/{state.battleState.maxMana}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Düşman Kalesi:</span>
            <Progress value={(castleHealth.enemy / 5000) * 100} className="w-32" />
          </div>
          <div className="flex items-center gap-2">
            <span>Kale Sağlığı:</span>
            <Progress value={(castleHealth.player / 5000) * 100} className="w-32" />
          </div>
        </div>

        <Button 
          onClick={() => setCameraPosition({ x: 400, y: 500 })}
          variant="outline"
          size="sm"
        >
          Kaleye Dön (G)
        </Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Unit Control */}
        <div className="w-64 bg-gray-800 text-white p-4 flex-shrink-0 overflow-y-auto">
          <h3 className="text-lg font-bold mb-4">Birim Kontrolü</h3>
          
          {/* Available Army Display */}
          <div className="mb-4 p-3 bg-gray-700 rounded">
            <h4 className="text-sm font-medium mb-2">Mevcut Ordu:</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(UNIT_STATS).map(([key, unit]) => (
                <div key={key} className="flex justify-between">
                  <span>{unit.icon} {unit.name}:</span>
                  <span className="font-bold">{availableArmy[key] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Unit Selection */}
          <div className="space-y-2 mb-4">
            {Object.entries(UNIT_STATS).map(([key, unit]) => {
              const availableCount = availableArmy[key] || 0;
              return (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all ${
                    selectedUnit === key ? 'ring-2 ring-blue-400' : ''
                  } ${
                    state.battleState.playerMana >= unit.cost && availableCount >= 100
                      ? 'opacity-100' 
                      : 'opacity-50'
                  }`}
                  onClick={() => setSelectedUnit(key as keyof typeof UNIT_STATS)}
                >
                  <CardContent className="p-2 flex items-center gap-2">
                    <span className="text-lg">{unit.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{unit.name}</div>
                      <div className="text-xs text-gray-400">
                        {unit.cost}💜 • {availableCount} mevcut
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Lane Deployment */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium">Hat Seçimi:</h4>
            {['Sol Hat', 'Orta Hat', 'Sağ Hat'].map((lane, index) => {
              const availableCount = availableArmy[selectedUnit] || 0;
              return (
                <Button
                  key={index}
                  onClick={() => deployUnit(index)}
                  disabled={
                    state.battleState.playerMana < UNIT_STATS[selectedUnit].cost ||
                    availableCount < 100
                  }
                  variant="outline"
                  size="sm"
                  className="w-full text-black"
                >
                  {lane} - 100 {UNIT_STATS[selectedUnit].name}
                </Button>
              );
            })}
          </div>

          {/* Active Units */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Aktif Birlikler:</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {units.filter(u => u.battalion > 0).map(unit => (
                <div
                  key={unit.id}
                  className={`p-2 bg-gray-700 rounded cursor-pointer text-xs ${
                    selectedUnitToFollow === unit.id ? 'ring-1 ring-blue-400' : ''
                  }`}
                  onClick={() => setSelectedUnitToFollow(unit.id)}
                >
                  <div className="flex justify-between">
                    <span>{UNIT_STATS[unit.type].icon} {UNIT_STATS[unit.type].name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {unit.battalion}
                    </Badge>
                  </div>
                  <div className="text-gray-400">
                    Hat {unit.lane + 1} - Y: {Math.round(unit.y)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Screen Battle Field */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="w-full h-full bg-gradient-to-b from-red-900 via-green-500 to-blue-900 relative"
            style={{
              backgroundImage: `
                linear-gradient(180deg, rgba(139,69,19,0.3) 0%, rgba(34,139,34,0.6) 50%, rgba(30,144,255,0.3) 100%),
                repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 2px, transparent 300px, rgba(0,0,0,0.05) 302px)
              `
            }}
          >
            {/* Lane Dividers - Vertical with better spacing */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-0 left-1/3 w-px h-full bg-black opacity-20"></div>
              <div className="absolute top-0 left-2/3 w-px h-full bg-black opacity-20"></div>
            </div>

            {/* Enemy Castle - Larger */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-32 h-24 bg-red-800 rounded-b-lg flex items-center justify-center text-4xl border-2 border-red-600">
                🏰
              </div>
              <div className="mt-1 w-32 h-3 bg-red-500 rounded">
                <div 
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${(castleHealth.enemy / 5000) * 100}%` }}
                />
              </div>
            </div>

            {/* Player Castle - Larger */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="w-32 h-24 bg-blue-800 rounded-t-lg flex items-center justify-center text-4xl border-2 border-blue-600">
                🏰
              </div>
              <div className="mb-1 w-32 h-3 bg-red-500 rounded">
                <div 
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${(castleHealth.player / 5000) * 100}%` }}
                />
              </div>
            </div>

            {/* Defense Towers - Larger */}
            {towers.map(tower => (
              <div
                key={tower.id}
                className="absolute"
                style={{
                  left: `${tower.x}px`,
                  top: `${tower.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`w-12 h-16 ${tower.isDestroyed ? 'bg-gray-500' : tower.team === 'player' ? 'bg-blue-600' : 'bg-red-600'} rounded flex items-center justify-center text-lg border-2 ${tower.isDestroyed ? 'border-gray-400' : tower.team === 'player' ? 'border-blue-400' : 'border-red-400'}`}>
                  {tower.isDestroyed ? '💥' : '🗼'}
                </div>
                {!tower.isDestroyed && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-red-500 rounded">
                    <div 
                      className="h-full bg-green-500 rounded transition-all"
                      style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Units - Larger */}
            {units.filter(u => u.battalion > 0).map(unit => (
              <div
                key={unit.id}
                className="absolute transition-all duration-300"
                style={{
                  left: `${unit.x}px`,
                  top: `${unit.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg border-2 border-blue-400">
                    {UNIT_STATS[unit.type].icon}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 text-xs p-0 px-1 h-5"
                  >
                    {unit.battalion}
                  </Badge>
                  {unit.targetCatapult && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold">
                      Mancınık!
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Catapults - Larger with health bars */}
            {catapults.filter(c => !c.isDestroyed).map(catapult => (
              <div
                key={catapult.id}
                className="absolute"
                style={{
                  left: `${catapult.x}px`,
                  top: `${catapult.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`w-12 h-12 ${catapult.team === 'player' ? 'bg-blue-700' : 'bg-red-700'} rounded-full flex items-center justify-center text-2xl border-2 ${catapult.team === 'player' ? 'border-blue-400' : 'border-red-400'}`}>
                  🎯
                </div>
                {/* Health bar for catapults */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-red-500 rounded">
                  <div 
                    className="h-full bg-green-500 rounded transition-all"
                    style={{ width: `${(catapult.health / catapult.maxHealth) * 100}%` }}
                  />
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                  {Math.max(0, 3 - (gameTime - catapult.lastShot))}s
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
