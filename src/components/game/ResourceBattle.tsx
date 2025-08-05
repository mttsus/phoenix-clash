
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
  const { state, dispatch } = useGame();
  const { user } = useAuth();
  const [isBattling, setIsBattling] = useState(false);

  if (!region) return null;

  const resourceIcons = {
    wood: '🪵',
    gold: '🪙',
    iron: '⚒️',
    wheat: '🌾',
    stone: '🪨'
  };

  const startLiveBattle = async () => {
    if (!user || state.army.length === 0) {
      toast.error('Savaş için ordunuz olmalı!');
      return;
    }

    // Start the live battle in the arena
    dispatch({
      type: 'START_BATTLE',
      payload: {
        battleType: 'resource',
        resourceRegion: region,
        playerArmy: [...state.army]
      }
    });

    // Close the dialog and let the battle arena handle the rest
    onClose();
    toast.success('Canlı savaş başlıyor! Savaş alanına yönlendiriliyorsunuz...');
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

          {/* Live Battle Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🎮 Canlı Savaş Modu</h4>
            <p className="text-xs text-blue-700">
              Boss ile canlı savaş alanında karşılaşacaksınız. Ordunuzun boss'la savaştığını gerçek zamanlı izleyebileceksiniz!
            </p>
          </div>

          {/* Battle Button */}
          <div className="flex gap-2">
            <Button
              onClick={startLiveBattle}
              disabled={isBattling || state.army.length === 0 || (isOwned && region.boss_health === region.max_boss_health)}
              className="flex-1"
              variant={isOwned ? "outline" : "default"}
            >
              {isOwned ? (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Bölgeniz
                </>
              ) : (
                <>
                  <Sword className="w-4 h-4 mr-2" />
                  Canlı Savaş Başlat
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
