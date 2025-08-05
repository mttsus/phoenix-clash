
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

  const resourceRegion = state.battleState.resourceRegion;
  const playerArmy = state.battleState.playerArmy;

  useEffect(() => {
    if (resourceRegion) {
      setBossHealth(resourceRegion.boss_health);
      setMaxBossHealth(resourceRegion.max_boss_health);
      setBattleLog([`${resourceRegion.resource_type.toUpperCase()} Boss'u ile savaş başlıyor!`]);
      setIsActive(true);
      
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

        // Calculate army damage per second
        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.1); // 10% of total damage per second
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-10), // Keep only last 10 messages
          `Ordu ${damagePerSecond} hasar veriyor! Boss canı: ${newHealth}/${maxBossHealth}`
        ]);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, '🎉 Boss yenildi! Bölge ele geçirildi!']);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1000);

    // Boss also attacks back (optional - makes it more interesting)
    const bossAttackInterval = setInterval(() => {
      setBattleLog(prev => [
        ...prev.slice(-10),
        `Boss saldırıyor! Ordunuz direniyor...`
      ]);
    }, 3000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      clearInterval(bossAttackInterval);
    };
  }, [resourceRegion, playerArmy, maxBossHealth]);

  const completeBattle = async (victory: boolean) => {
    if (!resourceRegion || !user) return;

    setIsActive(false);
    
    try {
      const totalArmyPower = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
      const damageDealt = resourceRegion.boss_health - bossHealth;

      // Save battle result
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

      // Update region
      const updateData: any = {
        boss_health: bossHealth
      };

      if (victory) {
        updateData.owner_id = user.id;
        updateData.captured_at = new Date().toISOString();
        updateData.boss_health = resourceRegion.max_boss_health; // Reset for next attacker
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

    // End battle and return to map
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

      {/* Army Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Ordunuz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {playerArmy.map(unit => (
              <div key={unit.id} className="flex justify-between text-sm">
                <span>{unit.count}x {unit.type}</span>
                <span>{unit.damage * unit.count} hasar</span>
              </div>
            ))}
            <div className="border-t pt-2">
              <div className="flex justify-between font-medium">
                <span>Toplam Güç:</span>
                <span>{playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battle Log */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Canlı Savaş Raporu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {battleLog.map((log, index) => (
              <div key={index} className="text-sm font-mono p-2 bg-gray-50 rounded">
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
