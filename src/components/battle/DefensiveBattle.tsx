
import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  lastAttack: number;
}

interface Catapult {
  id: number;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  lastShot: number;
  isDestroyed: boolean;
  targetX: number;
  targetY: number;
  isMoving: boolean;
}

const UNIT_STATS = {
  swordsman: { name: 'Kılıçlı', health: 100, damage: 1, speed: 1, cost: 1, icon: '⚔️' },
  archer: { name: 'Okçu', health: 80, damage: 1, speed: 1.2, cost: 1, icon: '🏹' },
  cavalry: { name: 'Atlı', health: 120, damage: 1, speed: 2.5, cost: 2, icon: '🐎' },
  mage_fire: { name: 'Ateş Büyücü', health: 60, damage: 2, speed: 0.8, cost: 2, icon: '🔥' },
  mage_ice: { name: 'Buz Büyücü', health: 70, damage: 1, speed: 0.8, cost: 2, icon: '❄️' },
  mage_lightning: { name: 'Şimşek Büyücü', health: 50, damage: 3, speed: 0.8, cost: 3, icon: '⚡' }
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
  const [cameraPosition, setCameraPosition] = useState({ x: 300, y: 400 });
  const [castleHealth, setCastleHealth] = useState({ player: 5000, enemy: 5000 });

  // Initialize towers (Both player and enemy towers - 3 lanes x 3 positions each)
  useEffect(() => {
    const initialTowers: Tower[] = [];
    
    // Enemy towers (top side)
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        const x = 150 + (lane * 200);
        const y = 80 + (position * 60);
        initialTowers.push({
          id: lane * 3 + position,
          lane,
          position,
          health: 1000,
          maxHealth: 1000,
          damage: 150,
          range: 80,
          isDestroyed: false,
          x,
          y,
          team: 'enemy'
        });
      }
    }

    // Player towers (bottom side)
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        const x = 150 + (lane * 200);
        const y = 520 - (position * 60);
        initialTowers.push({
          id: 9 + lane * 3 + position, // Offset by 9 for enemy towers
          lane,
          position,
          health: 1000,
          maxHealth: 1000,
          damage: 150,
          range: 80,
          isDestroyed: false,
          x,
          y,
          team: 'player'
        });
      }
    }
    
    setTowers(initialTowers);

    // Initialize catapults
    setCatapults([
      {
        id: 0,
        team: 'player',
        x: 300,
        y: 580,
        health: 100,
        maxHealth: 100,
        lastShot: 0,
        isDestroyed: false,
        targetX: 300,
        targetY: 300,
        isMoving: false
      },
      {
        id: 1,
        team: 'enemy',
        x: 300,
        y: 20,
        health: 100,
        maxHealth: 100,
        lastShot: 0,
        isDestroyed: false,
        targetX: 300,
        targetY: 300,
        isMoving: false
      }
    ]);
  }, []);

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

  // Main game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      // Unit movement and combat
      setUnits(prevUnits => {
        return prevUnits.map(unit => {
          if (unit.battalion <= 0) return unit;

          // Find enemy towers in the same lane that are not destroyed
          const laneTowers = towers.filter(t => 
            t.lane === unit.lane && 
            !t.isDestroyed && 
            t.team === 'enemy'
          ).sort((a, b) => Math.abs(a.y - unit.y) - Math.abs(b.y - unit.y));

          const closestTower = laneTowers[0];

          if (closestTower) {
            const distance = Math.abs(closestTower.y - unit.y);
            
            if (distance > 40) {
              // Move towards tower (vertical movement)
              return {
                ...unit,
                y: unit.y - unit.speed,
                isMoving: true,
                targetTower: closestTower
              };
            } else {
              // Attack tower
              if (gameTime - unit.lastAttack > 1) {
                setTowers(prevTowers => 
                  prevTowers.map(t => 
                    t.id === closestTower.id 
                      ? { ...t, health: Math.max(0, t.health - unit.damage), isDestroyed: t.health - unit.damage <= 0 }
                      : t
                  )
                );
                return { ...unit, lastAttack: gameTime, isMoving: false };
              }
            }
          } else {
            // No towers in this lane, move towards enemy castle
            const enemyCastleY = 20;
            const distance = Math.abs(enemyCastleY - unit.y);
            
            if (distance > 40) {
              return {
                ...unit,
                y: unit.y - unit.speed,
                isMoving: true
              };
            } else {
              // Attack enemy castle
              if (gameTime - unit.lastAttack > 1) {
                setCastleHealth(prev => ({
                  ...prev,
                  enemy: Math.max(0, prev.enemy - unit.damage)
                }));
                return { ...unit, lastAttack: gameTime, isMoving: false };
              }
            }
          }

          return unit;
        });
      });

      // Tower attacks on units - Fixed to kill only 20 units
      towers.forEach(tower => {
        if (tower.isDestroyed || tower.health <= 0) return;

        // Find units in range
        const unitsInRange = units.filter(unit => {
          const distance = Math.sqrt(
            Math.pow(unit.x - tower.x, 2) + Math.pow(unit.y - tower.y, 2)
          );
          return distance <= tower.range && unit.battalion > 0;
        });

        if (unitsInRange.length > 0) {
          // Tower attacks - kills exactly 20 units
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              if (unitsInRange.includes(unit)) {
                const casualties = Math.min(unit.battalion, 20); // Fixed to 20 units
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

      // Catapult movement and auto-fire
      setCatapults(prevCatapults => 
        prevCatapults.map(catapult => {
          if (catapult.isDestroyed) return catapult;

          // Move catapults automatically towards center
          if (!catapult.isMoving) {
            const centerY = 300;
            const distance = Math.abs(centerY - catapult.y);
            if (distance > 5) {
              catapult.isMoving = true;
              if (catapult.team === 'player') {
                catapult.targetY = centerY + 50;
              } else {
                catapult.targetY = centerY - 50;
              }
            }
          }

          // Auto-fire every 21 seconds
          if (gameTime - catapult.lastShot >= 21) {
            const enemyTeam = catapult.team === 'player' ? 'enemy' : 'player';
            const enemyTowers = towers.filter(t => !t.isDestroyed && t.team === enemyTeam);
            if (enemyTowers.length > 0) {
              const targetTower = enemyTowers[Math.floor(Math.random() * enemyTowers.length)];
              setTowers(prevTowers =>
                prevTowers.map(t =>
                  t.id === targetTower.id
                    ? { 
                        ...t, 
                        health: Math.max(0, t.health - 100),
                        isDestroyed: t.health - 100 <= 0 
                      }
                    : t
                )
              );
            }
            return { ...catapult, lastShot: gameTime };
          }
          return catapult;
        })
      );

      // Check win conditions
      if (castleHealth.enemy <= 0) {
        setTimeout(() => {
          dispatch({ type: 'BATTLE_RESULT', payload: { won: true } });
          dispatch({ type: 'END_BATTLE' });
        }, 1000);
      } else if (castleHealth.player <= 0) {
        setTimeout(() => {
          dispatch({ type: 'BATTLE_RESULT', payload: { won: false } });
          dispatch({ type: 'END_BATTLE' });
        }, 1000);
      }
    }, 100);

    return () => clearInterval(gameLoop);
  }, [units, towers, gameTime, castleHealth, dispatch]);

  // Deploy unit battalion
  const deployUnit = useCallback((lane: number) => {
    const unitData = UNIT_STATS[selectedUnit];
    
    if (state.battleState.playerMana >= unitData.cost) {
      const newUnit: Unit = {
        id: `${selectedUnit}_${Date.now()}`,
        type: selectedUnit,
        battalion: 100,
        x: 150 + (lane * 200),
        y: 550,
        lane,
        health: unitData.health,
        maxHealth: unitData.health,
        damage: unitData.damage,
        speed: unitData.speed,
        isMoving: true,
        lastAttack: 0
      };

      setUnits(prev => [...prev, newUnit]);
      dispatch({ 
        type: 'UPDATE_MANA', 
        payload: state.battleState.playerMana - unitData.cost 
      });
    }
  }, [selectedUnit, state.battleState.playerMana, dispatch]);

  // Follow unit camera
  useEffect(() => {
    if (selectedUnitToFollow) {
      const unit = units.find(u => u.id === selectedUnitToFollow);
      if (unit) {
        setCameraPosition({ x: unit.x - 300, y: unit.y - 400 });
      }
    }
  }, [selectedUnitToFollow, units]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Top HUD */}
      <div className="h-16 bg-gray-800 text-white p-2 flex items-center justify-between">
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
          onClick={() => setCameraPosition({ x: 300, y: 400 })}
          variant="outline"
          size="sm"
        >
          Kaleye Dön (G)
        </Button>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Unit Control */}
        <div className="w-64 bg-gray-800 text-white p-4">
          <h3 className="text-lg font-bold mb-4">Birim Kontrolü</h3>
          
          {/* Unit Selection */}
          <div className="space-y-2 mb-4">
            {Object.entries(UNIT_STATS).map(([key, unit]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedUnit === key ? 'ring-2 ring-blue-400' : ''
                } ${
                  state.battleState.playerMana >= unit.cost 
                    ? 'opacity-100' 
                    : 'opacity-50'
                }`}
                onClick={() => setSelectedUnit(key as keyof typeof UNIT_STATS)}
              >
                <CardContent className="p-2 flex items-center gap-2">
                  <span className="text-lg">{unit.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{unit.name}</div>
                    <div className="text-xs text-gray-400">{unit.cost}💜</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lane Deployment */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium">Hat Seçimi:</h4>
            {['Sol Hat', 'Orta Hat', 'Sağ Hat'].map((lane, index) => (
              <Button
                key={index}
                onClick={() => deployUnit(index)}
                disabled={state.battleState.playerMana < UNIT_STATS[selectedUnit].cost}
                variant="outline"
                size="sm"
                className="w-full text-black"
              >
                {lane} - 100 {UNIT_STATS[selectedUnit].name}
              </Button>
            ))}
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

        {/* Vertical Battle Field */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="w-full h-full bg-gradient-to-b from-red-900 via-green-500 to-blue-900 relative"
            style={{
              backgroundImage: `
                linear-gradient(180deg, rgba(139,69,19,0.3) 0%, rgba(34,139,34,0.6) 50%, rgba(30,144,255,0.3) 100%),
                repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 2px, transparent 200px, rgba(0,0,0,0.05) 202px)
              `
            }}
          >
            {/* Lane Dividers - Vertical */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-0 left-1/4 w-px h-full bg-black opacity-20"></div>
              <div className="absolute top-0 left-1/2 w-px h-full bg-black opacity-20"></div>
              <div className="absolute top-0 left-3/4 w-px h-full bg-black opacity-20"></div>
            </div>

            {/* Enemy Castle */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <div className="w-20 h-16 bg-red-800 rounded-b-lg flex items-center justify-center text-2xl border-2 border-red-600">
                🏰
              </div>
              <div className="mt-1 w-20 h-2 bg-red-500 rounded">
                <div 
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${(castleHealth.enemy / 5000) * 100}%` }}
                />
              </div>
            </div>

            {/* Player Castle */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="w-20 h-16 bg-blue-800 rounded-t-lg flex items-center justify-center text-2xl border-2 border-blue-600">
                🏰
              </div>
              <div className="mb-1 w-20 h-2 bg-red-500 rounded">
                <div 
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${(castleHealth.player / 5000) * 100}%` }}
                />
              </div>
            </div>

            {/* Defense Towers */}
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
                <div className={`w-8 h-10 ${tower.isDestroyed ? 'bg-gray-500' : tower.team === 'player' ? 'bg-blue-600' : 'bg-red-600'} rounded flex items-center justify-center text-sm border-2 ${tower.isDestroyed ? 'border-gray-400' : tower.team === 'player' ? 'border-blue-400' : 'border-red-400'}`}>
                  {tower.isDestroyed ? '💥' : '🗼'}
                </div>
                {!tower.isDestroyed && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded">
                    <div 
                      className="h-full bg-green-500 rounded transition-all"
                      style={{ width: `${(tower.health / tower.maxHealth) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Units */}
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
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs border-2 border-blue-400">
                    {UNIT_STATS[unit.type].icon}
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 -right-2 text-xs p-0 px-1 h-4"
                  >
                    {unit.battalion}
                  </Badge>
                </div>
              </div>
            ))}

            {/* Catapults */}
            {catapults.map(catapult => (
              <div
                key={catapult.id}
                className="absolute"
                style={{
                  left: `${catapult.x}px`,
                  top: `${catapult.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`w-8 h-8 ${catapult.team === 'player' ? 'bg-blue-700' : 'bg-red-700'} rounded-full flex items-center justify-center text-lg`}>
                  🎯
                </div>
                {!catapult.isDestroyed && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
                    {Math.max(0, 21 - (gameTime - catapult.lastShot))}s
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
