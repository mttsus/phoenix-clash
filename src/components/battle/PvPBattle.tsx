
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

  const enemy = state.battleState.enemy;
  const playerArmy = state.battleState.playerArmy;

  useEffect(() => {
    if (enemy) {
      setEnemyHealth(maxEnemyHealth);
      setBattleLog([`${enemy.username} kalesine saldırı başlıyor!`]);
      setIsActive(true);
      
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

        // Calculate army damage per second
        const totalDamage = playerArmy.reduce((total, unit) => total + (unit.damage * unit.count), 0);
        const damagePerSecond = Math.floor(totalDamage * 0.2); // 20% of total damage per second for PvP
        
        const newHealth = Math.max(0, currentHealth - damagePerSecond);
        
        setBattleLog(prev => [
          ...prev.slice(-10), // Keep only last 10 messages
          `Ordu ${damagePerSecond} hasar veriyor! ${enemy.username} kale canı: ${newHealth}/${maxEnemyHealth}`
        ]);

        if (newHealth <= 0) {
          setBattleLog(prev => [...prev, `🎉 ${enemy.username} kalesi yenildi! Zafer kazandınız!`]);
          setTimeout(() => completeBattle(true), 2000);
        }

        return newHealth;
      });
    }, 1000);

    // Enemy castle also defends (makes it more interesting)
    const defenseInterval = setInterval(() => {
      setBattleLog(prev => [
        ...prev.slice(-10),
        `${enemy.username} kalesi savunma yapıyor! Kuleler ateş ediyor...`
      ]);
    }, 3000);

    // Cleanup on unmount
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

      // Save battle result to database
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
        // Don't throw error, just log it - battle should still complete
      }

      if (victory) {
        // Victory rewards
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

      // Update battle result in context
      dispatch({ type: 'BATTLE_RESULT', payload: { won: victory } });

    } catch (err) {
      console.error('PvP battle completion error:', err);
      toast.error('Savaş tamamlanırken bir hata oluştu');
    }

    // End battle and return to map
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

      {/* Army Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Saldıran Ordunuz
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
                <span>Toplam Saldırı Gücü:</span>
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
