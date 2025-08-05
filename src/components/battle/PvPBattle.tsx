
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
  const [castleHealth, setCastleHealth] = useState(5000);
  const [maxCastleHealth] = useState(5000);
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
    moving: boolean;
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
      setCastleHealth(maxCastleHealth);
      setBattleLog([`${enemy.username} kalesine saldırı başlıyor!`]);
      setIsActive(true);
      
      // Initialize enemy castle at top-center of arena
      setEnemyCastle({
        x: 320, // Center of arena
        y: 40,  // Top area
        health: maxCastleHealth,
        maxHealth: maxCastleHealth,
        defending: false
      });

      // Initialize army units at bottom of arena
      const initialUnits = playerArmy.flatMap((armyUnit, armyIndex) => 
        Array.from({ length: armyUnit.count }, (_, unitIndex) => ({
          id: `${armyUnit.id}-${unitIndex}`,
          type: armyUnit.type,
          x: 180 + (armyIndex * 70) + (unitIndex * 25),
          y: 320 + (Math.random() * 40),
          health: armyUnit.health,
          maxHealth: armyUnit.health,
          attacking: false,
          moving: true
        }))
      );
      setUnits(initialUnits);
      
      // Start the battle simulation
      setTimeout(() => startBattleSimulation(), 1000);
    }
  }, [enemy]);

  const startBattleSimulation = useCallback(() => {
    if (!enemy || !playerArmy.length) return;

    // Move units towards castle
    const moveInterval = setInterval(() => {
      setUnits(prev => prev.map(unit => {
        if (unit.moving && unit.y > 180) {
          return { 
            ...unit, 
            y: unit.y - 1.5, 
            x: unit.x + (Math.random() - 0.5) * 1.5 
          };
        }
        return { ...unit, moving: false };
      }));
    }, 100);

    // Battle simulation
    const battleInterval = setInterval(() => {
      setCastleHealth(currentHealth => {
        if (currentHealth <= 0) {
          clearInterval(battleInterval);
          clearInterval(moveInterval);
          return 0;
        }

        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.25);
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-8),
          `Ordu ${damagePerSecond} hasar veriyor! ${enemy.username} kale canı: ${newHealth}/${maxCastleHealth}`
        ]);

        // Update castle health visually
        setEnemyCastle(prev => prev ? { ...prev, health: newHealth, defending: true } : null);

        // Make units attack animation
        setUnits(prev => prev.map(unit => ({ ...unit, attacking: true })));
        setTimeout(() => {
          setUnits(prev => prev.map(unit => ({ ...unit, attacking: false })));
          setEnemyCastle(prev => prev ? { ...prev, defending: false } : null);
        }, 700);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, `🎉 ${enemy.username} kalesi yenildi! Zafer kazandınız!`]);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1400);

    // Castle defense system
    const defenseInterval = setInterval(() => {
      setBattleLog(prev => [
        ...prev.slice(-8),
        `${enemy.username} kalesi savunma yapıyor! Okçu kuleleri ateş ediyor...`
      ]);
      setEnemyCastle(prev => prev ? { ...prev, defending: true } : null);
      
      setTimeout(() => {
        setEnemyCastle(prev => prev ? { ...prev, defending: false } : null);
      }, 1000);
    }, 3500);

    return () => {
      clearInterval(battleInterval);
      clearInterval(moveInterval);
      clearInterval(defenseInterval);
    };
  }, [enemy, playerArmy, maxCastleHealth]);

  const completeBattle = async (victory: boolean) => {
    if (!enemy || !user) return;

    setIsActive(false);
    
    try {
      const damageDealt = maxCastleHealth - castleHealth;

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
            wood: state.resources.wood + 2500,
            gold: state.resources.gold + 2500,
            iron: state.resources.iron + 2500,
            wheat: state.resources.wheat + 2500,
            stone: state.resources.stone + 2500
          }
        });
        
        toast.success(`🎉 ${enemy.username} kalesini ele geçirdiniz! +2500 kaynak kazandınız!`);
      } else {
        toast.info(`${enemy.username} kalesine ${damageDealt} hasar verdiniz ama yenemediniz.`);
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

  const healthPercentage = maxCastleHealth > 0 ? (castleHealth / maxCastleHealth) * 100 : 0;

  return (
    <div className="h-full flex flex-col p-4 space-y-3">
      {/* Castle Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Castle className="w-6 h-6 text-red-600" />
            {enemy.username} Kalesi ile Savaş
            <Crown className="w-5 h-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Kale Canı:</span>
            <span className="text-sm">{castleHealth} / {maxCastleHealth}</span>
          </div>
          <Progress value={healthPercentage} className="h-3" />
          <div className="mt-2 text-xs text-muted-foreground">
            Konum: ({enemy.q}, {enemy.r}) • Düşman: {enemy.username}
          </div>
        </CardContent>
      </Card>

      {/* Clash Royale Style PvP Arena */}
      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          <div className="relative w-full h-full min-h-96 bg-gradient-to-b from-sky-400 via-green-300 to-green-600 border-4 border-stone-600 rounded-lg overflow-hidden">
            {/* Arena Background Elements */}
            <div className="absolute inset-0">
              {/* Central river */}
              <div className="absolute top-1/2 left-0 right-0 h-16 bg-blue-500 opacity-70 transform -translate-y-8" />
              <div className="absolute top-1/2 left-1/4 right-1/4 h-10 bg-stone-600 transform -translate-y-5 rounded-lg" />
              
              {/* Side structures */}
              <div className="absolute left-4 top-1/3 w-8 h-12 bg-stone-500 rounded border-2 border-stone-400" />
              <div className="absolute right-4 top-1/3 w-8 h-12 bg-stone-500 rounded border-2 border-stone-400" />
              
              {/* Trees and environment */}
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 text-green-800 text-lg"
                  style={{
                    left: `${20 + (i * 65)}px`,
                    top: `${30 + (i % 3) * 25}px`
                  }}
                >
                  🌳
                </div>
              ))}
            </div>

            {/* Enemy Castle Area - Top */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-40 h-20 bg-red-800 rounded-lg border-4 border-red-600 flex items-center justify-center">
              <div className="text-red-200 text-xs font-bold text-center">
                {enemy.username.toUpperCase()}<br/>KALESİ
              </div>
            </div>

            {/* Player Army Area - Bottom */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-40 h-16 bg-blue-800 rounded-lg border-4 border-blue-600 flex items-center justify-center">
              <div className="text-blue-200 text-xs font-bold">SİZİN ORDUNUZ</div>
            </div>

            {/* Army Units */}
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`absolute transition-all duration-400 ${
                  unit.attacking ? 'scale-125 animate-pulse' : 'scale-100'
                } ${unit.moving ? 'animate-bounce' : ''}`}
                style={{
                  left: `${Math.max(15, Math.min(650, unit.x))}px`,
                  top: `${Math.max(15, Math.min(340, unit.y))}px`,
                  transform: unit.attacking ? 'translateY(-8px) rotateZ(5deg)' : 'translateY(0px) rotateZ(0deg)',
                  zIndex: 20
                }}
              >
                <div className="relative">
                  {/* Unit with team banner */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-2xl border-3 ${
                    unit.type === 'swordsman' ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300' :
                    unit.type === 'archer' ? 'bg-gradient-to-b from-green-500 to-green-700 border-green-300' :
                    unit.type === 'cavalry' ? 'bg-gradient-to-b from-red-500 to-red-700 border-red-300' :
                    'bg-gradient-to-b from-purple-500 to-purple-700 border-purple-300'
                  }`}>
                    {unit.type === 'swordsman' ? '⚔️' :
                     unit.type === 'archer' ? '🏹' :
                     unit.type === 'cavalry' ? '🐎' :
                     '🔮'}
                  </div>
                  
                  {/* Health Bar */}
                  <div className="absolute -top-3 left-0 w-9 h-2 bg-gray-900 rounded border">
                    <div 
                      className="h-full bg-green-500 rounded transition-all duration-300"
                      style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Team flag */}
                  <div className="absolute -top-1 -right-1 w-3 h-2 bg-blue-600 border border-blue-400" />

                  {/* Attack Effect */}
                  {unit.attacking && (
                    <div className="absolute -top-2 -right-3 text-yellow-400 font-bold animate-ping text-xl">
                      ⚡
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Enemy Castle */}
            {enemyCastle && (
              <div
                className={`absolute transition-all duration-600 ${
                  enemyCastle.defending ? 'scale-110 animate-pulse' : 'scale-100'
                }`}
                style={{
                  left: `${enemyCastle.x}px`,
                  top: `${enemyCastle.y}px`,
                  zIndex: 30
                }}
              >
                <div className="relative">
                  {/* Castle Foundation */}
                  <div className="absolute -bottom-3 -left-8 w-24 h-8 bg-stone-700 rounded-full opacity-80" />
                  
                  {/* Main Castle */}
                  <div className="w-20 h-28 bg-gradient-to-b from-stone-500 to-stone-800 rounded-t-lg flex flex-col items-center justify-center shadow-2xl border-4 border-stone-400">
                    <div className="text-4xl mb-1">🏰</div>
                    <div className="text-xs text-stone-200 font-bold text-center">
                      {enemy.username}
                    </div>
                  </div>
                  
                  {/* Castle Health Bar */}
                  <div className="absolute -top-5 left-0 w-20 h-4 bg-gray-900 rounded border-2 border-gray-700">
                    <div 
                      className="h-full bg-red-500 rounded transition-all duration-300"
                      style={{ width: `${(enemyCastle.health / enemyCastle.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Defense Towers */}
                  <div className="absolute -top-3 -left-4 w-7 h-10 bg-stone-600 rounded-t border-2 border-stone-400 flex items-end justify-center">
                    <div className="text-sm">🏹</div>
                  </div>
                  <div className="absolute -top-3 -right-4 w-7 h-10 bg-stone-600 rounded-t border-2 border-stone-400 flex items-end justify-center">
                    <div className="text-sm">🏹</div>
                  </div>

                  {/* Castle Flag */}
                  <div className="absolute -top-8 left-8 w-4 h-3 bg-red-600 border border-red-400" />

                  {/* Defense Effects */}
                  {enemyCastle.defending && (
                    <>
                      <div className="absolute -left-6 top-12 text-orange-500 font-bold animate-ping text-2xl">
                        🔥
                      </div>
                      <div className="absolute -right-6 top-12 text-red-500 font-bold animate-ping text-xl">
                        💥
                      </div>
                      <div className="absolute top-4 left-10 text-yellow-400 font-bold animate-bounce text-lg">
                        ⚡
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Battle Status HUD */}
            <div className="absolute top-3 left-3 z-40">
              {isActive ? (
                <div className="bg-red-700 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg">
                  ⚔️ KALE KUŞATMASI
                </div>
              ) : (
                <div className="bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  🏁 SAVAŞ SONA ERDİ
                </div>
              )}
            </div>

            {/* Battle Timer */}
            <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg">
              ⏰ {Math.floor(Date.now() / 1000) % 120}s
            </div>

            {/* Army Status Mini */}
            <div className="absolute bottom-3 left-3 bg-blue-900 bg-opacity-80 text-white px-3 py-1 rounded text-xs font-bold">
              Ordu: {units.length} birlik
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Battle Log */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Savaş Raporu</span>
          </div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {battleLog.slice(-3).map((log, index) => (
              <div key={index} className="text-xs font-mono p-1 bg-gray-50 rounded">
                {log}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Battle Controls */}
      <Button 
        onClick={() => dispatch({ type: 'END_BATTLE' })}
        variant={isActive ? "secondary" : "default"}
        disabled={isActive}
        className="w-full"
      >
        {isActive ? 'Savaş Devam Ediyor...' : 'Haritaya Dön'}
      </Button>
    </div>
  );
};
