
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Sword, Shield, Crown, Coins } from 'lucide-react';

interface ResourceRegion {
  id: string;
  q: number;
  r: number;
  s: number;
  resource_type: string;
  owner_id?: string;
  boss_health: number;
  max_boss_health: number;
  production_bonus: number;
  captured_at?: string;
}

interface ResourceBattleProps {
  region: ResourceRegion | null;
  isOpen: boolean;
  onClose: () => void;
  onBattleComplete: () => void;
}

export const ResourceBattle = ({ region, isOpen, onClose, onBattleComplete }: ResourceBattleProps) => {
  const { state } = useGame();
  const { user } = useAuth();
  const [isBattling, setIsBattling] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  if (!region) return null;

  const resourceIcons = {
    wood: '🪵',
    gold: '🪙',
    iron: '⚒️',
    wheat: '🌾',
    stone: '🪨'
  };

  const startBattle = async () => {
    if (!user || state.army.length === 0) {
      toast.error('Savaş için ordunuz olmalı!');
      return;
    }

    setIsBattling(true);
    setBattleLog([]);
    
    // Calculate total army power
    const totalArmyPower = state.army.reduce((total, unit) => total + (unit.damage * unit.count), 0);
    const armyCount = state.army.reduce((total, unit) => total + unit.count, 0);
    
    // Simple battle calculation
    const damageDealt = Math.floor(totalArmyPower * (0.8 + Math.random() * 0.4));
    const newBossHealth = Math.max(0, region.boss_health - damageDealt);
    const victory = newBossHealth <= 0;
    
    const log = [
      `${armyCount} asker ile saldırıya geçtiniz!`,
      `Boss'a ${damageDealt} hasar verdiniz!`,
      victory ? '🎉 Boss'u yendiniz! Bölge artık sizin!' : `Boss'un kalan canı: ${newBossHealth}`
    ];
    
    setBattleLog(log);

    try {
      // Save battle result
      const { error: battleError } = await supabase
        .from('resource_battles')
        .insert({
          region_id: region.id,
          attacker_id: user.id,
          army_count: armyCount,
          damage_dealt: damageDealt,
          boss_health_remaining: newBossHealth,
          victory: victory,
          battle_log: log
        });

      if (battleError) {
        console.error('Battle log save error:', battleError);
      }

      // Update region
      const updateData: any = {
        boss_health: newBossHealth
      };

      if (victory) {
        updateData.owner_id = user.id;
        updateData.captured_at = new Date().toISOString();
        updateData.boss_health = region.max_boss_health; // Reset for next attacker
      }

      const { error: updateError } = await supabase
        .from('resource_regions')
        .update(updateData)
        .eq('id', region.id);

      if (updateError) {
        console.error('Region update error:', updateError);
        toast.error('Bölge güncellenemedi: ' + updateError.message);
      } else {
        if (victory) {
          toast.success(`🎉 ${region.resource_type.toUpperCase()} bölgesini ele geçirdiniz! +${region.production_bonus}/saat üretim bonusu!`);
        } else {
          toast.info(`Boss'a ${damageDealt} hasar verdiniz. Kalan can: ${newBossHealth}`);
        }
        onBattleComplete();
      }
    } catch (err) {
      console.error('Battle error:', err);
      toast.error('Savaş sırasında bir hata oluştu');
    } finally {
      setIsBattling(false);
    }
  };

  const isOwned = region.owner_id === user?.id;
  const healthPercentage = (region.boss_health / region.max_boss_health) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{resourceIcons[region.resource_type as keyof typeof resourceIcons]}</span>
            {region.resource_type.toUpperCase()} Bölgesi
            {isOwned && <Crown className="w-5 h-5 text-yellow-500" />}
          </DialogTitle>
          <DialogDescription>
            Konum: ({region.q}, {region.r}) • Üretim Bonusu: +{region.production_bonus}/saat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Boss Health */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Boss Canı</span>
              <span className="text-sm">{region.boss_health}/{region.max_boss_health}</span>
            </div>
            <Progress value={healthPercentage} className="h-3" />
          </div>

          {/* Owner Info */}
          {region.owner_id && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                {isOwned ? '✅ Bu bölge size ait!' : '👑 Bu bölgenin sahibi var'}
              </p>
            </div>
          )}

          {/* Army Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ordunuz</h4>
            {state.army.length === 0 ? (
              <p className="text-sm text-gray-500">Ordunuz bulunmuyor</p>
            ) : (
              <div className="space-y-1">
                {state.army.map(unit => (
                  <div key={unit.id} className="flex justify-between text-sm">
                    <span>{unit.count}x {unit.type}</span>
                    <span>{unit.damage * unit.count} hasar</span>
                  </div>
                ))}
                <div className="border-t pt-1">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Toplam</span>
                    <span>{state.army.reduce((total, unit) => total + (unit.damage * unit.count), 0)} hasar</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Battle Log */}
          {battleLog.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Savaş Raporu</h4>
              <div className="p-3 bg-gray-50 border rounded-lg space-y-1">
                {battleLog.map((log, index) => (
                  <p key={index} className="text-sm">{log}</p>
                ))}
              </div>
            </div>
          )}

          {/* Battle Button */}
          <div className="flex gap-2">
            <Button
              onClick={startBattle}
              disabled={isBattling || state.army.length === 0 || (isOwned && region.boss_health === region.max_boss_health)}
              className="flex-1"
              variant={isOwned ? "outline" : "default"}
            >
              {isBattling ? (
                <>
                  <Shield className="w-4 h-4 mr-2 animate-spin" />
                  Savaşıyor...
                </>
              ) : isOwned ? (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Bölgeniz
                </>
              ) : (
                <>
                  <Sword className="w-4 h-4 mr-2" />
                  Savaş
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
