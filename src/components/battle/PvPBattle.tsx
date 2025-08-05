
import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Shield, Sword, Castle } from 'lucide-react';

export const PvPBattle = () => {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [enemyHealth, setEnemyHealth] = useState(5000);
  const [maxEnemyHealth] = useState(5000);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [units, setUnits] = useState<Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    attacking: boolean;
  }>>([]);
  const [enemyCastle, setEnemyCastle] = useState<{
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    defending: boolean;
  } | null>(null);

  const enemy = state.battleState.enemy;
  const playerArmy = state.battleState.playerArmy;

  useEffect(() => {
    if (enemy) {
      setEnemyHealth(maxEnemyHealth);
      setBattleLog([`${enemy.username} kalesine saldırı başlıyor!`]);
      setIsActive(true);
      
      // Initialize enemy castle
      setEnemyCastle({
        x: 650,
        y: 150,
        health: maxEnemyHealth,
        maxHealth: maxEnemyHealth,
        defending: false
      });

      // Initialize army units
      const initialUnits = playerArmy.map((unit, index) => ({
        id: unit.id,
        type: unit.type,
        x: 80 + (index * 45),
        y: 160 + (Math.random() * 100),
        health: unit.health,
        maxHealth: unit.health,
        attacking: false
      }));
      setUnits(initialUnits);
      
      // Start the battle simulation
      setTimeout(() => startBattleSimulation(), 1000);
    }
  }, [enemy]);

  const startBattleSimulation = useCallback(() => {
    if (!enemy || !playerArmy.length) return;

    const interval = setInterval(() => {
      setEnemyHealth(currentHealth => {
        if (currentHealth <= 0) {
          clearInterval(interval);
          return 0;
        }

        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.2);
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-10),
          `Ordu ${damagePerSecond} hasar veriyor! ${enemy.username} kale canı: ${newHealth}/${maxEnemyHealth}`
        ]);

        // Update castle health visually
        setEnemyCastle(prev => prev ? { ...prev, health: newHealth, defending: true } : null);

        // Make units attack animation
        setUnits(prev => prev.map(unit => ({ ...unit, attacking: true })));
        setTimeout(() => {
          setUnits(prev => prev.map(unit => ({ ...unit, attacking: false })));
          setEnemyCastle(prev => prev ? { ...prev, defending: false } : null);
        }, 600);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, `🎉 ${enemy.username} kalesi yenildi! Zafer kazandınız!`]);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1000);

    const defenseInterval = setInterval(() => {
      setBattleLog(prev => [
        ...prev.slice(-10),
        `${enemy.username} kalesi savunma yapıyor! Kuleler ateş ediyor...`
      ]);
      setEnemyCastle(prev => prev ? { ...prev, defending: true } : null);
      setTimeout(() => {
        setEnemyCastle(prev => prev ? { ...prev, defending: false } : null);
      }, 800);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(defenseInterval);
    };
  }, [enemy, playerArmy, maxEnemyHealth]);

  const completeBattle = async (victory: boolean) => {
    if (!enemy || !user) return;

    setIsActive(false);
    
    try {
      const damageDealt = maxEnemyHealth - enemyHealth;

      const { error: battleError } = await supabase
        .from('pvp_battles')
        .insert({
          attacker_id: user.id,
          defender_id: enemy.user_id,
          army_count: playerArmy.reduce((total, unit) => total + unit.count, 0),
          damage_dealt: damageDealt,
          victory: victory,
          battle_log: battleLog
        });

      if (battleError) {
        console.error('PvP battle log save error:', battleError);
      }

      if (victory) {
        dispatch({
          type: 'UPDATE_RESOURCES',
          payload: {
            wood: state.resources.wood + 2000,
            gold: state.resources.gold + 2000,
            iron: state.resources.iron + 2000,
            wheat: state.resources.wheat + 2000,
            stone: state.resources.stone + 2000
          }
        });
        
        toast.success(`🎉 ${enemy.username} kalesini ele geçirdiniz! +2000 kaynak kazandınız!`);
      } else {
        toast.info(`${enemy.username} kalesine ${damageDealt} hasar verdiniz ama yenemediniz..`);
      }

      dispatch({ type: 'BATTLE_RESULT', payload: { won: victory } });

    } catch (err) {
      console.error('PvP battle completion error:', err);
      toast.error('Savaş tamamlanırken bir hata oluştu');
    }

    setTimeout(() => {
      dispatch({ type: 'END_BATTLE' });
    }, 3000);
  };

  if (!enemy) return null;

  const healthPercentage = maxEnemyHealth > 0 ? (enemyHealth / maxEnemyHealth) * 100 : 0;

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Enemy Castle Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Castle className="w-6 h-6 text-red-600" />
            {enemy.username} Kalesi ile Savaş
            <Crown className="w-5 h-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Kale Canı:</span>
                <span>{enemyHealth} / {maxEnemyHealth}</span>
              </div>
              <Progress value={healthPercentage} className="h-4" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Düşman:</span>
                <div className="text-red-600 font-semibold">{enemy.username}</div>
              </div>
              <div>
                <span className="font-medium">Konum:</span>
                <div>({enemy.q}, {enemy.r})</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live PvP Arena */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Canlı Kale Kuşatması
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full h-80 bg-gradient-to-b from-blue-200 to-green-300 border-2 border-gray-300 overflow-hidden">
            {/* Army Units */}
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`absolute transition-all duration-500 ${unit.attacking ? 'scale-125' : 'scale-100'}`}
                style={{
                  left: `${unit.x}px`,
                  top: `${unit.y}px`,
                  transform: unit.attacking ? 'translateX(20px)' : 'translateX(0px)'
                }}
              >
                <div className="relative">
                  {/* Unit Sprite */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 ${
                    unit.type === 'swordsman' ? 'bg-blue-700 border-blue-500' :
                    unit.type === 'archer' ? 'bg-green-700 border-green-500' :
                    unit.type === 'cavalry' ? 'bg-red-700 border-red-500' :
                    'bg-purple-700 border-purple-500'
                  }`}>
                    {unit.type === 'swordsman' ? '⚔️' :
                     unit.type === 'archer' ? '🏹' :
                     unit.type === 'cavalry' ? '🐎' :
                     '🔮'}
                  </div>
                  
                  {/* Health Bar */}
                  <div className="absolute -top-2 left-0 w-10 h-1.5 bg-gray-300 rounded">
                    <div 
                      className="h-full bg-green-500 rounded transition-all duration-300"
                      style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Attack Effect */}
                  {unit.attacking && (
                    <div className="absolute -right-3 top-2 text-orange-500 font-bold animate-bounce text-lg">
                      💥
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Enemy Castle */}
            {enemyCastle && (
              <div
                className={`absolute transition-all duration-500 ${enemyCastle.defending ? 'animate-pulse scale-110' : 'scale-100'}`}
                style={{
                  left: `${enemyCastle.x}px`,
                  top: `${enemyCastle.y}px`
                }}
              >
                <div className="relative">
                  {/* Castle Sprite */}
                  <div className="w-20 h-24 bg-stone-600 rounded-t-lg flex flex-col items-center justify-center text-white font-bold shadow-xl border-4 border-stone-400">
                    <div className="text-3xl mb-1">🏰</div>
                    <div className="text-xs">{enemy.username}</div>
                  </div>
                  
                  {/* Castle Health Bar */}
                  <div className="absolute -top-4 left-0 w-20 h-3 bg-gray-300 rounded">
                    <div 
                      className="h-full bg-red-600 rounded transition-all duration-300"
                      style={{ width: `${(enemyCastle.health / enemyCastle.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Defense Towers */}
                  <div className="absolute -top-2 -left-3 w-6 h-8 bg-stone-500 rounded-t border-2 border-stone-300 flex items-end justify-center">
                    <div className="text-xs">🏹</div>
                  </div>
                  <div className="absolute -top-2 -right-3 w-6 h-8 bg-stone-500 rounded-t border-2 border-stone-300 flex items-end justify-center">
                    <div className="text-xs">🏹</div>
                  </div>

                  {/* Defense Effect */}
                  {enemyCastle.defending && (
                    <div className="absolute -left-6 top-8 text-red-500 font-bold animate-ping text-xl">
                      🔥
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Battle Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {isActive && (
                <div className="absolute top-4 left-4 text-red-500 font-bold animate-pulse text-lg">
                  ⚔️ KALE KUŞATMASI
                </div>
              )}
            </div>

            {/* Battlefield Elements */}
            <div className="absolute bottom-0 left-0 w-full h-8 bg-green-600 opacity-30" />
            <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-brown-600 rounded-full" />
            <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-brown-600 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Army Status (Compressed) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sword className="w-4 h-4" />
            Saldıran Ordunuz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {playerArmy.slice(0, 4).map(unit => (
              <div key={unit.id} className="flex justify-between">
                <span>{unit.count}x {unit.type}</span>
                <span>{unit.damage * unit.count} dmg</span>
              </div>
            ))}
            <div className="col-span-2 border-t pt-1">
              <div className="flex justify-between font-medium">
                <span>Toplam Güç:</span>
                <span>{playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle Log (Compressed) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" />
            Savaş Raporu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {battleLog.slice(-3).map((log, index) => (
              <div key={index} className="text-xs font-mono p-1 bg-gray-50 rounded">
                {log}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Battle Controls */}
      <div className="flex gap-2">
        <Button 
          onClick={() => dispatch({ type: 'END_BATTLE' })}
          variant="outline"
          disabled={isActive}
          className="flex-1"
        >
          {isActive ? 'Savaş Devam Ediyor...' : 'Haritaya Dön'}
        </Button>
      </div>
    </div>
  );
};
