
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Swords, Users, Shield } from 'lucide-react';

interface Unit {
  id: string;
  team: number;
  unit_type: string;
  position_x: number;
  position_y: number;
  health: number;
  max_health: number;
  damage: number;
  speed: number;
  is_alive: boolean;
}

interface UnitSystemProps {
  roomId: string;
  myTeam: number;
}

export const UnitSystem = ({ roomId, myTeam }: UnitSystemProps) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitCounts, setUnitCounts] = useState({
    minion: 0,
    champion: 0,
    siege: 0
  });

  useEffect(() => {
    fetchUnits();
    subscribeToUnitUpdates();
  }, [roomId]);

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from('game_units')
      .select('*')
      .eq('room_id', roomId)
      .eq('team', myTeam)
      .eq('is_alive', true);

    if (data && !error) {
      setUnits(data);
      updateUnitCounts(data);
    }
  };

  const updateUnitCounts = (unitData: Unit[]) => {
    const counts = {
      minion: unitData.filter(u => u.unit_type === 'minion').length,
      champion: unitData.filter(u => u.unit_type === 'champion').length,
      siege: unitData.filter(u => u.unit_type === 'siege').length
    };
    setUnitCounts(counts);
  };

  const subscribeToUnitUpdates = () => {
    const channel = supabase
      .channel('unit-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_units',
          filter: `room_id=eq.${roomId}`
        },
        () => {
          fetchUnits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const spawnUnit = async (unitType: 'minion' | 'champion' | 'siege') => {
    let health, damage, speed;
    
    switch (unitType) {
      case 'minion':
        health = 100;
        damage = 20;
        speed = 60;
        break;
      case 'champion':
        health = 300;
        damage = 50;
        speed = 40;
        break;
      case 'siege':
        health = 200;
        damage = 40;
        speed = 30;
        break;
    }

    // Kendi üssümüze yakın rastgele pozisyon
    const baseX = myTeam === 1 ? 200 : 800;
    const baseY = 400;
    const spawnX = baseX + (Math.random() - 0.5) * 100;
    const spawnY = baseY + (Math.random() - 0.5) * 100;

    const { data, error } = await supabase
      .from('game_units')
      .insert([{
        room_id: roomId,
        team: myTeam,
        unit_type: unitType,
        position_x: spawnX,
        position_y: spawnY,
        health: health,
        max_health: health,
        damage: damage,
        speed: speed
      }])
      .select()
      .single();

    if (data && !error) {
      // Olay kaydı
      await supabase.from('game_events').insert([{
        room_id: roomId,
        event_type: 'unit_spawned',
        team: myTeam,
        data: {
          unit_id: data.id,
          unit_type: unitType,
          position: { x: spawnX, y: spawnY }
        }
      }]);
    }
  };

  const moveUnitsForward = async () => {
    // Tüm birimlerimizi düşman üssüne doğru hareket ettir
    const enemyBaseX = myTeam === 1 ? 800 : 200;
    const enemyBaseY = 200;

    for (const unit of units) {
      // Hedefe doğru bir adım at
      const deltaX = enemyBaseX - unit.position_x;
      const deltaY = enemyBaseY - unit.position_y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10) { // Hedefe henüz ulaşmadıysa
        const stepSize = unit.speed / 10; // Hız faktörü
        const newX = unit.position_x + (deltaX / distance) * stepSize;
        const newY = unit.position_y + (deltaY / distance) * stepSize;

        await supabase
          .from('game_units')
          .update({
            position_x: newX,
            position_y: newY,
            target_x: enemyBaseX,
            target_y: enemyBaseY
          })
          .eq('id', unit.id);
      }
    }
  };

  const getUnitIcon = (type: string) => {
    switch (type) {
      case 'champion':
        return <Swords className="w-4 h-4" />;
      case 'siege':
        return <Shield className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getUnitLabel = (type: string) => {
    switch (type) {
      case 'champion':
        return 'Şampiyon';
      case 'siege':
        return 'Kuşatma';
      default:
        return 'Asker';
    }
  };

  const getUnitColor = (type: string) => {
    switch (type) {
      case 'champion':
        return 'text-yellow-600';
      case 'siege':
        return 'text-purple-600';
      default:
        return 'text-blue-600';
    }
  };

  const totalUnits = units.length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Toplam birim: {totalUnits}
      </div>

      {/* Birim İstatistikleri */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm">Askerler</span>
          </div>
          <Badge variant="outline">{unitCounts.minion}</Badge>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-yellow-600" />
            <span className="text-sm">Şampiyonlar</span>
          </div>
          <Badge variant="outline">{unitCounts.champion}</Badge>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="text-sm">Kuşatma</span>
          </div>
          <Badge variant="outline">{unitCounts.siege}</Badge>
        </div>
      </div>

      {/* Birim Oluşturma */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Yeni Birim Oluştur</div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => spawnUnit('minion')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Asker (+20 Hasar)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => spawnUnit('champion')}
            className="flex items-center gap-2"
          >
            <Swords className="w-4 h-4" />
            Şampiyon (+50 Hasar)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => spawnUnit('siege')}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Kuşatma (+40 Hasar)
          </Button>
        </div>
      </div>

      {/* Birim Kontrolleri */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Birim Kontrolleri</div>
        <Button
          size="sm"
          className="w-full"
          onClick={moveUnitsForward}
          disabled={totalUnits === 0}
        >
          Tüm Birimleri İlerlet
        </Button>
      </div>

      {/* Aktif Birimler Listesi */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        <div className="text-sm font-medium">Aktif Birimler</div>
        {units.slice(0, 10).map((unit) => (
          <div key={unit.id} className="p-2 border rounded text-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                {getUnitIcon(unit.unit_type)}
                <span className={`font-medium ${getUnitColor(unit.unit_type)}`}>
                  {getUnitLabel(unit.unit_type)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {unit.damage} DMG
              </Badge>
            </div>
            <Progress 
              value={(unit.health / unit.max_health) * 100} 
              className="h-1"
            />
            <div className="text-muted-foreground mt-1">
              {unit.health}/{unit.max_health} HP
            </div>
          </div>
        ))}
        {units.length > 10 && (
          <div className="text-center text-muted-foreground text-xs">
            +{units.length - 10} daha...
          </div>
        )}
      </div>

      {totalUnits === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          Hiç birim yok. Yeni birimler oluşturun!
        </div>
      )}
    </div>
  );
};
