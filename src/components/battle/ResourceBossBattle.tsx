
import { useEffect, useState, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Shield, Sword } from 'lucide-react';

export const ResourceBossBattle = () => {
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [bossHealth, setBossHealth] = useState(0);
  const [maxBossHealth, setMaxBossHealth] = useState(0);
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
  const [boss, setBoss] = useState<{
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    attacking: boolean;
  } | null>(null);

  const resourceRegion = state.battleState.resourceRegion;
  const playerArmy = state.battleState.playerArmy;

  useEffect(() => {
    if (resourceRegion) {
      setBossHealth(resourceRegion.boss_health);
      setMaxBossHealth(resourceRegion.max_boss_health);
      setBattleLog([`${resourceRegion.resource_type.toUpperCase()} Boss'u ile savaş başlıyor!`]);
      setIsActive(true);
      
      // Initialize boss at center-top of arena
      setBoss({
        x: 360, // Center of 720px width
        y: 50,  // Top area
        health: resourceRegion.boss_health,
        maxHealth: resourceRegion.max_boss_health,
        attacking: false
      });

      // Initialize army units at bottom of arena
      const initialUnits = playerArmy.flatMap((armyUnit, armyIndex) => 
        Array.from({ length: armyUnit.count }, (_, unitIndex) => ({
          id: `${armyUnit.id}-${unitIndex}`,
          type: armyUnit.type,
          x: 200 + (armyIndex * 80) + (unitIndex * 20),
          y: 350 + (Math.random() * 30),
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
  }, [resourceRegion]);

  const startBattleSimulation = useCallback(() => {
    if (!resourceRegion || !playerArmy.length) return;

    // Move units towards boss
    const moveInterval = setInterval(() => {
      setUnits(prev => prev.map(unit => {
        if (unit.moving && unit.y > 200) {
          return { ...unit, y: unit.y - 2, x: unit.x + (Math.random() - 0.5) * 2 };
        }
        return { ...unit, moving: false };
      }));
    }, 100);

    // Battle simulation
    const battleInterval = setInterval(() => {
      setBossHealth(currentHealth => {
        if (currentHealth <= 0) {
          clearInterval(battleInterval);
          clearInterval(moveInterval);
          return 0;
        }

        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.15);
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-8),
          `Ordu ${damagePerSecond} hasar veriyor! Boss canı: ${newHealth}/${maxBossHealth}`
        ]);

        // Update boss health visually
        setBoss(prev => prev ? { ...prev, health: newHealth, attacking: true } : null);

        // Make units attack animation
        setUnits(prev => prev.map(unit => ({ ...unit, attacking: true })));
        setTimeout(() => {
          setUnits(prev => prev.map(unit => ({ ...unit, attacking: false })));
          setBoss(prev => prev ? { ...prev, attacking: false } : null);
        }, 600);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, '🎉 Boss yenildi! Bölge ele geçirildi!']);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1200);

    return () => {
      clearInterval(battleInterval);
      clearInterval(moveInterval);
    };
  }, [resourceRegion, playerArmy, maxBossHealth]);

  const completeBattle = async (victory: boolean) => {
    if (!resourceRegion || !user) return;

    setIsActive(false);
    
    try {
      const damageDealt = resourceRegion.boss_health - bossHealth;

      const { error: battleError } = await supabase
        .from('resource_battles')
        .insert({
          region_id: resourceRegion.id,
          attacker_id: user.id,
          army_count: playerArmy.reduce((total, unit) => total + unit.count, 0),
          damage_dealt: damageDealt,
          boss_health_remaining: bossHealth,
          victory: victory,
          battle_log: battleLog
        });

      if (battleError) {
        console.error('Battle log save error:', battleError);
      }

      const updateData: any = {
        boss_health: bossHealth
      };

      if (victory) {
        updateData.owner_id = user.id;
        updateData.captured_at = new Date().toISOString();
        updateData.boss_health = resourceRegion.max_boss_health;
      }

      const { error: updateError } = await supabase
        .from('resource_regions')
        .update(updateData)
        .eq('id', resourceRegion.id);

      if (updateError) {
        console.error('Region update error:', updateError);
        toast.error('Bölge güncellenemedi: ' + updateError.message);
      } else {
        if (victory) {
          toast.success(`🎉 ${resourceRegion.resource_type.toUpperCase()} bölgesini ele geçirdiniz! +${resourceRegion.production_bonus}/saat üretim bonusu!`);
        } else {
          toast.info(`Boss'a ${damageDealt} hasar verdiniz.`);
        }
      }
    } catch (err) {
      console.error('Battle completion error:', err);
      toast.error('Savaş tamamlanırken bir hata oluştu');
    }

    setTimeout(() => {
      dispatch({ type: 'END_BATTLE' });
    }, 3000);
  };

  const resourceIcons = {
    wood: '🪵',
    gold: '🪙', 
    iron: '⚒️',
    wheat: '🌾',
    stone: '🪨'
  };

  if (!resourceRegion) return null;

  const healthPercentage = maxBossHealth > 0 ? (bossHealth / maxBossHealth) * 100 : 0;

  return (
    <div className="h-full flex flex-col p-4 space-y-3">
      {/* Boss Info Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">{resourceIcons[resourceRegion.resource_type as keyof typeof resourceIcons]}</span>
            {resourceRegion.resource_type.toUpperCase()} Boss Savaşı
            <Crown className="w-5 h-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Boss Canı:</span>
            <span className="text-sm">{bossHealth} / {maxBossHealth}</span>
          </div>
          <Progress value={healthPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Clash Royale Style Battle Arena */}
      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          <div className="relative w-full h-full min-h-96 bg-gradient-to-b from-blue-300 via-green-300 to-green-500 border-4 border-amber-600 rounded-lg overflow-hidden">
            {/* Arena Background Elements */}
            <div className="absolute inset-0">
              {/* River/Bridge in middle */}
              <div className="absolute top-1/2 left-0 right-0 h-12 bg-blue-400 opacity-60 transform -translate-y-6" />
              <div className="absolute top-1/2 left-1/3 right-1/3 h-8 bg-amber-700 transform -translate-y-4 rounded" />
              
              {/* Trees around the arena */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-6 h-6 text-green-800 text-xl"
                  style={{
                    left: `${10 + (i * 110)}px`,
                    top: `${20 + (i % 2) * 40}px`
                  }}
                >
                  🌳
                </div>
              ))}
              
              {/* Bottom trees */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`bottom-${i}`}
                  className="absolute w-6 h-6 text-green-800 text-xl"
                  style={{
                    left: `${50 + (i * 100)}px`,
                    bottom: `${20 + (i % 2) * 30}px`
                  }}
                >
                  🌳
                </div>
              ))}
            </div>

            {/* Boss Arena - Top Area */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-24 bg-red-900 rounded-lg border-4 border-red-700 flex items-center justify-center">
              <div className="text-red-200 text-xs font-bold text-center">BOSS ALANI</div>
            </div>

            {/* Army Units */}
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`absolute transition-all duration-300 ${
                  unit.attacking ? 'scale-125 animate-pulse' : 'scale-100'
                } ${unit.moving ? 'animate-bounce' : ''}`}
                style={{
                  left: `${Math.max(10, Math.min(680, unit.x))}px`,
                  top: `${Math.max(10, Math.min(350, unit.y))}px`,
                  transform: unit.attacking ? 'translateY(-5px)' : 'translateY(0px)',
                  zIndex: 20
                }}
              >
                <div className="relative">
                  {/* Unit Sprite with team colors */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xl border-2 ${
                    unit.type === 'swordsman' ? 'bg-blue-700 border-blue-400' :
                    unit.type === 'archer' ? 'bg-green-700 border-green-400' :
                    unit.type === 'cavalry' ? 'bg-red-700 border-red-400' :
                    'bg-purple-700 border-purple-400'
                  }`}>
                    {unit.type === 'swordsman' ? '⚔️' :
                     unit.type === 'archer' ? '🏹' :
                     unit.type === 'cavalry' ? '🐎' :
                     '🔮'}
                  </div>
                  
                  {/* Health Bar */}
                  <div className="absolute -top-2 left-0 w-8 h-1.5 bg-gray-800 rounded">
                    <div 
                      className="h-full bg-green-400 rounded transition-all duration-300"
                      style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Attack Effect */}
                  {unit.attacking && (
                    <div className="absolute -top-1 -right-2 text-orange-400 font-bold animate-ping text-lg">
                      💥
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Boss */}
            {boss && (
              <div
                className={`absolute transition-all duration-500 ${
                  boss.attacking ? 'scale-110 animate-pulse' : 'scale-100'
                }`}
                style={{
                  left: `${boss.x}px`,
                  top: `${boss.y}px`,
                  zIndex: 30
                }}
              >
                <div className="relative">
                  {/* Boss Platform */}
                  <div className="absolute -bottom-2 -left-6 w-20 h-6 bg-stone-600 rounded-full opacity-70" />
                  
                  {/* Boss Sprite */}
                  <div className="w-16 h-20 bg-gradient-to-b from-red-600 to-red-900 rounded-t-full flex flex-col items-center justify-center text-white font-bold shadow-2xl border-4 border-red-400">
                    <div className="text-3xl mb-1">👹</div>
                    <div className="text-xs">{resourceRegion.resource_type.toUpperCase()}</div>
                  </div>
                  
                  {/* Boss Health Bar */}
                  <div className="absolute -top-4 left-0 w-16 h-3 bg-gray-800 rounded border">
                    <div 
                      className="h-full bg-red-500 rounded transition-all duration-300"
                      style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Boss Attack Effect */}
                  {boss.attacking && (
                    <>
                      <div className="absolute -left-4 top-8 text-red-400 font-bold animate-ping text-xl">
                        🔥
                      </div>
                      <div className="absolute -right-4 top-8 text-orange-400 font-bold animate-ping text-xl">
                        ⚡
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Battle Status */}
            <div className="absolute top-2 left-2 z-40">
              {isActive ? (
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  ⚔️ SAVAŞ SÜRÜYOR
                </div>
              ) : (
                <div className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  🏁 SAVAŞ BİTTİ
                </div>
              )}
            </div>

            {/* Battle Timer */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm font-mono">
              {Math.floor(Date.now() / 1000) % 60}s
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Battle Log */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Son Aktiviteler</span>
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
