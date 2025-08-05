
import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { BattleUnit } from '@/contexts/GameContext';

const UNIT_STATS = {
  swordsman: { name: 'Kılıçlı', damage: 50, health: 100, icon: '⚔️', cost: 2 },
  archer: { name: 'Okçu', damage: 40, health: 80, icon: '🏹', cost: 2 },
  cavalry: { name: 'Atlı', damage: 70, health: 120, icon: '🐎', cost: 3 },
  mage_fire: { name: 'Ateş Büyücü', damage: 90, health: 60, icon: '🔥', cost: 4 },
  mage_ice: { name: 'Buz Büyücü', damage: 80, health: 70, icon: '❄️', cost: 4 },
  mage_lightning: { name: 'Şimşek Büyücü', damage: 100, health: 50, icon: '⚡', cost: 5 }
};

interface ClashArenaProps {
  battleType: 'resource' | 'pvp';
}

export const ClashArena = ({ battleType }: ClashArenaProps) => {
  const { state, dispatch } = useGame();
  const [selectedUnit, setSelectedUnit] = useState<keyof typeof UNIT_STATS>('swordsman');
  const [battleUnits, setBattleUnits] = useState<BattleUnit[]>([]);
  const [gameTime, setGameTime] = useState(0);

  // Mana rejenerasyon sistemi
  useEffect(() => {
    const manaInterval = setInterval(() => {
      if (state.battleState.playerMana < state.battleState.maxMana) {
        dispatch({ type: 'UPDATE_MANA', payload: state.battleState.playerMana + 1 });
      }
    }, 3000); // 3 saniyede 1 mana

    const timeInterval = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(manaInterval);
      clearInterval(timeInterval);
    };
  }, [state.battleState.playerMana, state.battleState.maxMana, dispatch]);

  // Birim hareketi ve savaş sistemi
  useEffect(() => {
    const battleInterval = setInterval(() => {
      setBattleUnits(prevUnits => {
        const newUnits = [...prevUnits];
        const enemyTarget = battleType === 'resource' 
          ? { x: 400, y: 50 }  // Boss pozisyonu
          : { x: 400, y: 30 }; // Kale pozisyonu

        newUnits.forEach(unit => {
          if (unit.team === 'player' && unit.health > 0) {
            // Hedefe doğru hareket
            if (!unit.target) {
              unit.target = enemyTarget;
              unit.isMoving = true;
            }

            if (unit.isMoving && unit.target) {
              const deltaX = unit.target.x - unit.x;
              const deltaY = unit.target.y - unit.y;
              const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

              if (distance > 50) {
                // Hareket devam et
                const speed = 2;
                unit.x += (deltaX / distance) * speed;
                unit.y += (deltaY / distance) * speed;
              } else {
                // Hedefe ulaştı, saldır
                unit.isMoving = false;
                unit.isAttacking = true;
                
                // Düşmana hasar ver
                setTimeout(() => {
                  const currentHealth = state.battleState.enemyHealth - unit.damage;
                  dispatch({ type: 'UPDATE_ENEMY_HEALTH', payload: currentHealth });
                  
                  if (currentHealth <= 0) {
                    // Savaş kazanıldı
                    setTimeout(() => {
                      dispatch({ type: 'BATTLE_RESULT', payload: { won: true } });
                      dispatch({ type: 'END_BATTLE' });
                    }, 1000);
                  }
                }, 500);

                setTimeout(() => {
                  unit.isAttacking = false;
                }, 1000);
              }
            }
          }
        });

        return newUnits;
      });
    }, 100);

    return () => clearInterval(battleInterval);
  }, [battleType, state.battleState.enemyHealth, dispatch]);

  const deployUnit = useCallback((x: number, y: number) => {
    const unitData = UNIT_STATS[selectedUnit];
    
    if (state.battleState.playerMana >= unitData.cost) {
      const newUnit: BattleUnit = {
        id: `${selectedUnit}_${Date.now()}`,
        type: selectedUnit,
        x: x,
        y: y,
        health: unitData.health,
        maxHealth: unitData.health,
        damage: unitData.damage,
        team: 'player',
        isMoving: false,
        isAttacking: false
      };

      setBattleUnits(prev => [...prev, newUnit]);
      dispatch({ 
        type: 'UPDATE_MANA', 
        payload: state.battleState.playerMana - unitData.cost 
      });
    }
  }, [selectedUnit, state.battleState.playerMana, dispatch]);

  const handleArenaClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Sadece alt yarıda deployment'a izin ver
    if (y > 300) {
      deployUnit(x, y);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const healthPercentage = state.battleState.maxEnemyHealth > 0 
    ? (state.battleState.enemyHealth / state.battleState.maxEnemyHealth) * 100 
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Üst Panel - Düşman Sağlığı ve Süre */}
      <div className="h-20 bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold">{formatTime(gameTime)}</div>
          {battleType === 'resource' && (
            <div className="flex items-center gap-2">
              <span className="text-xl">👹</span>
              <span>Boss</span>
            </div>
          )}
          {battleType === 'pvp' && (
            <div className="flex items-center gap-2">
              <span className="text-xl">🏰</span>
              <span>Düşman Kalesi</span>
            </div>
          )}
        </div>
        <div className="flex-1 mx-4">
          <div className="text-center text-sm mb-1">
            {state.battleState.enemyHealth} / {state.battleState.maxEnemyHealth}
          </div>
          <Progress value={healthPercentage} className="h-4" />
        </div>
      </div>

      {/* Savaş Arenası */}
      <div className="flex-1 relative">
        <div 
          className="w-full h-full bg-gradient-to-b from-blue-300 via-green-300 to-green-500 cursor-crosshair relative overflow-hidden"
          onClick={handleArenaClick}
        >
          {/* Arka plan elemanları */}
          <div className="absolute inset-0">
            {/* Nehir/Köprü ortada */}
            <div className="absolute top-1/2 left-0 right-0 h-16 bg-blue-400 opacity-60 transform -translate-y-8" />
            <div className="absolute top-1/2 left-1/3 right-1/3 h-6 bg-amber-700 transform -translate-y-3 rounded" />
            
            {/* Ağaçlar */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl"
                style={{
                  left: `${50 + (i * 120)}px`,
                  top: `${30 + (i % 2) * 50}px`
                }}
              >
                🌳
              </div>
            ))}
          </div>

          {/* Düşman (Boss veya Kale) */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
            {battleType === 'resource' ? (
              <div className="w-20 h-20 bg-red-800 rounded-full flex items-center justify-center text-4xl border-4 border-red-600">
                👹
              </div>
            ) : (
              <div className="w-32 h-24 bg-stone-600 rounded-t-lg flex items-center justify-center text-4xl border-4 border-stone-400">
                🏰
              </div>
            )}
          </div>

          {/* Deployment çizgisi */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 opacity-50" style={{ top: '75%' }}>
            <div className="text-yellow-300 text-xs text-center">
              ⬇️ Askerlerinizi buraya yerleştirin ⬇️
            </div>
          </div>

          {/* Savaş Birimleri */}
          {battleUnits.map((unit) => (
            <div
              key={unit.id}
              className={`absolute transition-all duration-200 ${
                unit.isAttacking ? 'scale-125 animate-pulse' : 'scale-100'
              } ${unit.isMoving ? 'transition-all duration-1000' : ''}`}
              style={{
                left: `${Math.max(10, Math.min(750, unit.x - 15))}px`,
                top: `${Math.max(10, Math.min(450, unit.y - 15))}px`,
                zIndex: 20
              }}
            >
              <div className="relative">
                {/* Birim ikonu */}
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center text-lg shadow-lg">
                  {UNIT_STATS[unit.type].icon}
                </div>
                
                {/* Sağlık çubuğu */}
                <div className="absolute -top-2 left-0 w-8 h-1 bg-gray-800 rounded">
                  <div 
                    className="h-full bg-green-400 rounded transition-all duration-300"
                    style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                  />
                </div>

                {/* Saldırı efekti */}
                {unit.isAttacking && (
                  <div className="absolute -top-1 -right-2 text-orange-400 font-bold animate-ping text-xl">
                    💥
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alt Panel - Birim Seçimi ve Mana */}
      <div className="h-24 bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between h-full">
          {/* Mana */}
          <div className="flex items-center gap-2">
            <div className="text-purple-400 text-2xl">💜</div>
            <div className="text-xl font-bold">{state.battleState.playerMana}</div>
            <div className="text-sm text-gray-400">/ {state.battleState.maxMana}</div>
          </div>

          {/* Birim kartları */}
          <div className="flex gap-2">
            {Object.entries(UNIT_STATS).map(([key, unit]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedUnit === key ? 'ring-2 ring-yellow-400' : ''
                } ${
                  state.battleState.playerMana >= unit.cost 
                    ? 'opacity-100 hover:scale-105' 
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => state.battleState.playerMana >= unit.cost && setSelectedUnit(key as keyof typeof UNIT_STATS)}
              >
                <CardContent className="p-2 w-16 h-20 flex flex-col items-center justify-center">
                  <div className="text-2xl">{unit.icon}</div>
                  <div className="text-xs text-center">{unit.cost}💜</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Çıkış butonu */}
          <Button 
            onClick={() => dispatch({ type: 'END_BATTLE' })}
            variant="destructive"
            size="sm"
          >
            Çıkış
          </Button>
        </div>
      </div>
    </div>
  );
};
