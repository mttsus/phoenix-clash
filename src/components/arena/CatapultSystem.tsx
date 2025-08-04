
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Clock } from 'lucide-react';

interface Catapult {
  id: string;
  team: number;
  position_x: number;
  position_y: number;
  health: number;
  max_health: number;
  damage: number;
  range_radius: number;
  reload_time: number;
  last_shot_at: string | null;
  is_destroyed: boolean;
}

interface CatapultSystemProps {
  roomId: string;
  myTeam: number;
}

export const CatapultSystem = ({ roomId, myTeam }: CatapultSystemProps) => {
  const [catapults, setCatapults] = useState<Catapult[]>([]);
  const [selectedCatapult, setSelectedCatapult] = useState<Catapult | null>(null);
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetchCatapults();
    subscribeToCatapultUpdates();
  }, [roomId]);

  const fetchCatapults = async () => {
    const { data, error } = await supabase
      .from('game_catapults')
      .select('*')
      .eq('room_id', roomId)
      .eq('team', myTeam)
      .eq('is_destroyed', false);

    if (data && !error) {
      setCatapults(data);
    }
  };

  const subscribeToCatapultUpdates = () => {
    const channel = supabase
      .channel('catapult-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_catapults',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          fetchCatapults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const canFire = (catapult: Catapult): boolean => {
    if (!catapult.last_shot_at) return true;
    
    const lastShot = new Date(catapult.last_shot_at);
    const now = new Date();
    const timeSinceLastShot = (now.getTime() - lastShot.getTime()) / 1000;
    
    return timeSinceLastShot >= catapult.reload_time;
  };

  const getRemainingCooldown = (catapult: Catapult): number => {
    if (!catapult.last_shot_at) return 0;
    
    const lastShot = new Date(catapult.last_shot_at);
    const now = new Date();
    const timeSinceLastShot = (now.getTime() - lastShot.getTime()) / 1000;
    
    return Math.max(0, catapult.reload_time - timeSinceLastShot);
  };

  const fireCatapult = async (catapultId: string, targetX: number, targetY: number) => {
    const catapult = catapults.find(c => c.id === catapultId);
    if (!catapult || !canFire(catapult)) return;

    // Menzil kontrolü
    const distance = Math.sqrt(
      Math.pow(targetX - catapult.position_x, 2) + 
      Math.pow(targetY - catapult.position_y, 2)
    );

    if (distance > catapult.range_radius) {
      return; // Menzil dışı
    }

    // Mancınığı ateşle
    await supabase
      .from('game_catapults')
      .update({ last_shot_at: new Date().toISOString() })
      .eq('id', catapultId);

    // Hedef bölgedeki düşman birimi ara
    const { data: enemyUnits } = await supabase
      .from('game_units')
      .select('*')
      .eq('room_id', roomId)
      .neq('team', myTeam)
      .eq('is_alive', true);

    if (enemyUnits) {
      // En yakın düşman birimini bul (50 birim yarıçapında)
      const nearbyEnemies = enemyUnits.filter(unit => {
        const unitDistance = Math.sqrt(
          Math.pow(unit.position_x - targetX, 2) + 
          Math.pow(unit.position_y - targetY, 2)
        );
        return unitDistance <= 50; // Patlama yarıçapı
      });

      // Hasar ver
      for (const enemy of nearbyEnemies) {
        const newHealth = Math.max(0, enemy.health - catapult.damage);
        await supabase
          .from('game_units')
          .update({
            health: newHealth,
            is_alive: newHealth > 0
          })
          .eq('id', enemy.id);
      }
    }

    // Olay kaydı
    await supabase.from('game_events').insert([{
      room_id: roomId,
      event_type: 'catapult_shot',
      team: myTeam,
      data: {
        catapult_id: catapultId,
        target_x: targetX,
        target_y: targetY,
        damage: catapult.damage,
        enemies_hit: enemyUnits?.length || 0
      }
    }]);
  };

  const quickAttack = async (catapultId: string) => {
    // Düşman ana üssüne yakın rastgele konum
    const enemyBaseX = myTeam === 1 ? 800 : 200;
    const enemyBaseY = 200;
    const targetX = enemyBaseX + (Math.random() - 0.5) * 100;
    const targetY = enemyBaseY + (Math.random() - 0.5) * 100;
    
    await fireCatapult(catapultId, targetX, targetY);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Mancınıklarınız ({catapults.length})
      </div>

      <div className="space-y-3">
        {catapults.map((catapult) => (
          <div
            key={catapult.id}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedCatapult?.id === catapult.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:bg-muted/50'
            }`}
            onClick={() => setSelectedCatapult(catapult)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span className="font-medium text-sm">Mancınık</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {catapult.damage} Hasar
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Can: {catapult.health}/{catapult.max_health}</span>
                <span>{Math.round((catapult.health / catapult.max_health) * 100)}%</span>
              </div>
              <Progress 
                value={(catapult.health / catapult.max_health) * 100} 
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>Menzil: {catapult.range_radius}</span>
              {!canFire(catapult) && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Clock className="w-3 h-3" />
                  <span>{Math.ceil(getRemainingCooldown(catapult))}s</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  quickAttack(catapult.id);
                }}
                disabled={!canFire(catapult)}
              >
                {canFire(catapult) ? 'Hızlı Saldırı' : 'Yeniden Yükleniyor...'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedCatapult && (
        <div className="space-y-2 p-3 bg-muted rounded">
          <div className="font-medium text-sm">Seçili Mancınık</div>
          <div className="text-xs text-muted-foreground">
            Pozisyon: ({Math.round(selectedCatapult.position_x)}, {Math.round(selectedCatapult.position_y)})
          </div>
          <div className="text-xs text-muted-foreground">
            Yeniden Yükleme: {selectedCatapult.reload_time}s
          </div>
          {!canFire(selectedCatapult) && (
            <div className="text-xs text-orange-600">
              Kalan süre: {Math.ceil(getRemainingCooldown(selectedCatapult))}s
            </div>
          )}
        </div>
      )}

      {catapults.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          Hiç mancınık kalmadı!
        </div>
      )}
    </div>
  );
};
