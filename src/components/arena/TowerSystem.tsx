
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Castle, Zap, Cannon } from 'lucide-react';

interface Tower {
  id: string;
  team: number;
  position_x: number;
  position_y: number;
  tower_type: string;
  health: number;
  max_health: number;
  damage: number;
  range_radius: number;
  is_destroyed: boolean;
}

interface TowerSystemProps {
  roomId: string;
  myTeam: number;
}

export const TowerSystem = ({ roomId, myTeam }: TowerSystemProps) => {
  const [towers, setTowers] = useState<Tower[]>([]);
  const [selectedTower, setSelectedTower] = useState<Tower | null>(null);

  useEffect(() => {
    fetchTowers();
    subscribeToTowerUpdates();
  }, [roomId]);

  const fetchTowers = async () => {
    const { data, error } = await supabase
      .from('game_towers')
      .select('*')
      .eq('room_id', roomId)
      .eq('team', myTeam)
      .eq('is_destroyed', false);

    if (data && !error) {
      setTowers(data);
    }
  };

  const subscribeToTowerUpdates = () => {
    const channel = supabase
      .channel('tower-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_towers',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          fetchTowers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const upgradeTower = async (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    if (!tower) return;

    let newHealth = tower.health;
    let newMaxHealth = tower.max_health;
    let newDamage = tower.damage;

    // Basit upgrade sistemi
    if (tower.tower_type === 'basic') {
      newMaxHealth = 1500;
      newHealth = Math.min(tower.health + 200, newMaxHealth);
      newDamage = 150;
    } else if (tower.tower_type === 'cannon') {
      newMaxHealth = 2000;
      newHealth = Math.min(tower.health + 300, newMaxHealth);
      newDamage = 300;
    } else if (tower.tower_type === 'magic') {
      newMaxHealth = 1800;
      newHealth = Math.min(tower.health + 250, newMaxHealth);
      newDamage = 250;
    }

    await supabase
      .from('game_towers')
      .update({
        health: newHealth,
        max_health: newMaxHealth,
        damage: newDamage
      })
      .eq('id', towerId);

    // Olay kaydı
    await supabase.from('game_events').insert([{
      room_id: roomId,
      event_type: 'tower_upgraded',
      team: myTeam,
      data: { tower_id: towerId, tower_type: tower.tower_type }
    }]);
  };

  const repairTower = async (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    if (!tower) return;

    const healAmount = Math.min(300, tower.max_health - tower.health);
    const newHealth = tower.health + healAmount;

    await supabase
      .from('game_towers')
      .update({ health: newHealth })
      .eq('id', towerId);

    await supabase.from('game_events').insert([{
      room_id: roomId,
      event_type: 'tower_repaired',
      team: myTeam,
      data: { tower_id: towerId, heal_amount: healAmount }
    }]);
  };

  const getTowerIcon = (type: string) => {
    switch (type) {
      case 'cannon':
        return <Cannon className="w-4 h-4" />;
      case 'magic':
        return <Zap className="w-4 h-4" />;
      default:
        return <Castle className="w-4 h-4" />;
    }
  };

  const getTowerTypeLabel = (type: string) => {
    switch (type) {
      case 'cannon':
        return 'Top Kulesi';
      case 'magic':
        return 'Büyü Kulesi';
      default:
        return 'Temel Kule';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Takımınızın kuleleri ({towers.length})
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {towers.map((tower) => (
          <div
            key={tower.id}
            className={`p-3 border rounded cursor-pointer transition-colors ${
              selectedTower?.id === tower.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:bg-muted/50'
            }`}
            onClick={() => setSelectedTower(tower)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getTowerIcon(tower.tower_type)}
                <span className="font-medium text-sm">
                  {getTowerTypeLabel(tower.tower_type)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {tower.damage} Hasar
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Can: {tower.health}/{tower.max_health}</span>
                <span>{Math.round((tower.health / tower.max_health) * 100)}%</span>
              </div>
              <Progress 
                value={(tower.health / tower.max_health) * 100} 
                className="h-2"
              />
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              Menzil: {tower.range_radius}
            </div>
          </div>
        ))}
      </div>

      {selectedTower && (
        <div className="space-y-2 p-3 bg-muted rounded">
          <div className="font-medium text-sm">Seçili Kule Kontrolleri</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => repairTower(selectedTower.id)}
              disabled={selectedTower.health >= selectedTower.max_health}
            >
              Onar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => upgradeTower(selectedTower.id)}
            >
              Geliştir
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Pozisyon: ({Math.round(selectedTower.position_x)}, {Math.round(selectedTower.position_y)})
          </div>
        </div>
      )}

      {towers.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          Hiç kule kalmadı!
        </div>
      )}
    </div>
  );
};
