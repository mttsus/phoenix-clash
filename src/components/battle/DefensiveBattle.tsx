
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
  const [cameraPosition, setCameraPosition] = useState({ x: 400, y: 300 });

  // Initialize towers (3 lanes x 3 positions = 9 towers)
  useEffect(() => {
    const initialTowers: Tower[] = [];
    for (let lane = 0; lane < 3; lane++) {
      for (let position = 0; position < 3; position++) {
        const x = 600 + (position * 80); // Enemy towers on the right
        const y = 100 + (lane * 120);
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
          y
        });
      }
    }
    setTowers(initialTowers);

    // Initialize catapults
    setCatapults([
      {
        id: 0,
        team: 'player',
        x: 50,
        y: 200,
        health: 100,
        maxHealth: 100,
        lastShot: 0,
        isDestroyed: false
      },
      {
        id: 1,
        team: 'enemy',
        x: 750,
        y: 200,
        health: 100,
        maxHealth: 100,
        lastShot: 0,
        isDestroyed: false
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

          // Find closest tower in the same lane
          const laneTowers = towers.filter(t => t.lane === unit.lane && !t.isDestroyed);
          const closestTower = laneTowers.sort((a, b) => 
            Math.abs(a.x - unit.x) - Math.abs(b.x - unit.x)
          )[0];

          if (closestTower) {
            const distance = Math.abs(closestTower.x - unit.x);
            
            if (distance > 30) {
              // Move towards tower
              return {
                ...unit,
                x: unit.x + unit.speed,
                isMoving: true,
                targetTower: closestTower
              };
            } else {
              // Attack tower
              if (gameTime - unit.lastAttack > 1) { // Attack every second
                // Tower takes damage
                setTowers(prevTowers => 
                  prevTowers.map(t => 
                    t.id === closestTower.id 
                      ? { ...t, health: Math.max(0, t.health - unit.damage) }
                      : t
                  )
                );
                return { ...unit, lastAttack: gameTime, isMoving: false };
              }
            }
          }

          return unit;
        });
      });

      // Tower attacks on units
      towers.forEach(tower => {
        if (tower.isDestroyed || tower.health <= 0) {
          setTowers(prev => prev.map(t => 
            t.id === tower.id ? { ...t, isDestroyed: true } : t
          ));
          return;
        }

        // Find units in range
        const unitsInRange = units.filter(unit => {
          const distance = Math.sqrt(
            Math.pow(unit.x - tower.x, 2) + Math.pow(unit.y - tower.y, 2)
          );
          return distance <= tower.range && unit.battalion > 0;
        });

        if (unitsInRange.length > 0) {
          // Tower attacks (AoE damage)
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              if (unitsInRange.includes(unit)) {
                const casualties = Math.min(unit.battalion, Math.floor(tower.damage / 100 * 150)); // 100-200 casualties
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

      // Catapult auto-fire every 21 seconds
      setCatapults(prevCatapults => 
        prevCatapults.map(catapult => {
          if (!catapult.isDestroyed && gameTime - catapult.lastShot >= 21) {
            // Auto-fire at random tower
            const activeTowers = towers.filter(t => !t.isDestroyed);
            if (activeTowers.length > 0) {
              const targetTower = activeTowers[Math.floor(Math.random() * activeTowers.length)];
              setTowers(prevTowers =>
                prevTowers.map(t =>
                  t.id === targetTower.id
                    ? { ...t, health: Math.max(0, t.health - 100) }
                    : t
                )
              );
            }
            return { ...catapult, lastShot: gameTime };
          }
          return catapult;
        })
      );
    }, 100);

    return () => clearInterval(gameLoop);
  }, [units, towers, gameTime]);

  // Deploy unit battalion
  const deployUnit = useCallback((lane: number) => {
    const unitData = UNIT_STATS[selectedUnit];
    
    if (state.battleState.playerMana >= unitData.cost) {
      const newUnit: Unit = {
        id: `${selectedUnit}_${Date.now()}`,
        type: selectedUnit,
        battalion: 100,
        x: 100,
        y: 100 + (lane * 120),
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
        setCameraPosition({ x: unit.x - 400, y: unit.y - 300 });
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
        
        <div className="flex items-center gap-2">
          <span>Kale Sağlığı:</span>
          <Progress value={75} className="w-32" />
        </div>

        <Button 
          onClick={() => setCameraPosition({ x: 400, y: 300 })}
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
                    Hat {unit.lane + 1} - X: {Math.round(unit.x)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Battle Field */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            className="w-full h-full bg-gradient-to-r from-green-600 via-green-500 to-green-400 relative"
            style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(0,0,0,0.3) 100%),
                repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, transparent 2px, transparent 120px, rgba(0,0,0,0.05) 122px)
              `
            }}
          >
            {/* Lane Dividers */}
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-1/3 left-0 w-full h-px bg-black opacity-20"></div>
              <div className="absolute top-2/3 left-0 w-full h-px bg-black opacity-20"></div>
            </div>

            {/* Middle Bridge */}
            <div className="absolute top-1/2 left-1/3 w-1/3 h-4 bg-amber-600 transform -translate-y-2 rounded shadow"></div>

            {/* Player Castle */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div className="w-16 h-20 bg-blue-800 rounded-t-lg flex items-center justify-center text-2xl border-2 border-blue-600">
                🏰
              </div>
            </div>

            {/* Enemy Castle */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-16 h-20 bg-red-800 rounded-t-lg flex items-center justify-center text-2xl border-2 border-red-600">
                🏰
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
                <div className={`w-8 h-10 ${tower.isDestroyed ? 'bg-gray-500' : 'bg-stone-600'} rounded-t-lg flex items-center justify-center text-sm border-2 ${tower.isDestroyed ? 'border-gray-400' : 'border-stone-400'}`}>
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
