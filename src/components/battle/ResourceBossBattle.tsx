
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
      
      // Initialize boss position
      setBoss({
        x: 700,
        y: 200,
        health: resourceRegion.boss_health,
        maxHealth: resourceRegion.max_boss_health,
        attacking: false
      });

      // Initialize army units
      const initialUnits = playerArmy.map((unit, index) => ({
        id: unit.id,
        type: unit.type,
        x: 50 + (index * 40),
        y: 180 + (Math.random() * 80),
        health: unit.health,
        maxHealth: unit.health,
        attacking: false
      }));
      setUnits(initialUnits);
      
      // Start the battle simulation
      setTimeout(() => startBattleSimulation(), 1000);
    }
  }, [resourceRegion]);

  const startBattleSimulation = useCallback(() => {
    if (!resourceRegion || !playerArmy.length) return;

    const interval = setInterval(() => {
      setBossHealth(currentHealth => {
        if (currentHealth <= 0) {
          clearInterval(interval);
          return 0;
        }

        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.1);
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-10),
          `Ordu ${damagePerSecond} hasar veriyor! Boss canı: ${newHealth}/${maxBossHealth}`
        ]);

        // Update boss health visually
        setBoss(prev => prev ? { ...prev, health: newHealth, attacking: true } : null);

        // Make units attack animation
        setUnits(prev => prev.map(unit => ({ ...unit, attacking: true })));
        setTimeout(() => {
          setUnits(prev => prev.map(unit => ({ ...unit, attacking: false })));
          setBoss(prev => prev ? { ...prev, attacking: false } : null);
        }, 500);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, '🎉 Boss yenildi! Bölge ele geçirildi!']);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1000);

    return () => clearInterval(interval);
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
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Boss Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{resourceIcons[resourceRegion.resource_type as keyof typeof resourceIcons]}</span>
            {resourceRegion.resource_type.toUpperCase()} Boss Savaşı
            <Crown className="w-5 h-5 text-yellow-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Boss Canı:</span>
                <span>{bossHealth} / {maxBossHealth}</span>
              </div>
              <Progress value={healthPercentage} className="h-4" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Üretim Bonusu:</span>
                <div>+{resourceRegion.production_bonus}/saat</div>
              </div>
              <div>
                <span className="font-medium">Konum:</span>
                <div>({resourceRegion.q}, {resourceRegion.r})</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Battle Arena */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Canlı Savaş Arenası
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full h-64 bg-gradient-to-b from-green-200 to-green-400 border-2 border-gray-300 overflow-hidden">
            {/* Army Units */}
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`absolute transition-all duration-300 ${unit.attacking ? 'scale-110' : 'scale-100'}`}
                style={{
                  left: `${unit.x}px`,
                  top: `${unit.y}px`,
                  transform: unit.attacking ? 'translateX(10px)' : 'translateX(0px)'
                }}
              >
                <div className="relative">
                  {/* Unit Sprite */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg ${
                    unit.type === 'swordsman' ? 'bg-blue-600' :
                    unit.type === 'archer' ? 'bg-green-600' :
                    unit.type === 'cavalry' ? 'bg-red-600' :
                    'bg-purple-600'
                  }`}>
                    {unit.type === 'swordsman' ? '⚔️' :
                     unit.type === 'archer' ? '🏹' :
                     unit.type === 'cavalry' ? '🐎' :
                     '🔮'}
                  </div>
                  
                  {/* Health Bar */}
                  <div className="absolute -top-2 left-0 w-8 h-1 bg-gray-300 rounded">
                    <div 
                      className="h-full bg-green-500 rounded transition-all duration-300"
                      style={{ width: `${(unit.health / unit.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Attack Effect */}
                  {unit.attacking && (
                    <div className="absolute -right-2 top-0 text-red-500 font-bold animate-bounce">
                      💥
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Boss */}
            {boss && (
              <div
                className={`absolute transition-all duration-300 ${boss.attacking ? 'scale-110 animate-pulse' : 'scale-100'}`}
                style={{
                  left: `${boss.x}px`,
                  top: `${boss.y}px`
                }}
              >
                <div className="relative">
                  {/* Boss Sprite */}
                  <div className="w-16 h-16 bg-red-800 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-red-600">
                    👹
                  </div>
                  
                  {/* Boss Health Bar */}
                  <div className="absolute -top-3 left-0 w-16 h-2 bg-gray-300 rounded">
                    <div 
                      className="h-full bg-red-500 rounded transition-all duration-300"
                      style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
                    />
                  </div>

                  {/* Boss Attack Effect */}
                  {boss.attacking && (
                    <div className="absolute -left-4 top-4 text-orange-500 font-bold animate-ping">
                      🔥
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Battle Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {isActive && (
                <div className="absolute top-4 left-4 text-yellow-400 font-bold animate-pulse">
                  ⚔️ SAVAŞ DEVAM EDİYOR
                </div>
              )}
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
          <div className="max-h-32 overflow-y-auto space-y-1">
            {battleLog.slice(-5).map((log, index) => (
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
