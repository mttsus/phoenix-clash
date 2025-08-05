
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';

interface CastleInteriorProps {
  castle: {
    id: string;
    user_id: string;
    username: string;
    q: number;
    r: number;
    s: number;
  };
  onClose: () => void;
  onConstructionStarted?: () => void;
  onConstructionCompleted?: () => void;
  onBuildingUpgraded?: () => void;
  onArmyProduced?: (totalArmy: number) => void;
}

interface Building {
  id: string;
  type: string;
  level: number;
  completion_time: string | null;
}

interface ArmyUnit {
  id: string;
  type: 'swordsman' | 'archer' | 'cavalry' | 'mage_fire' | 'mage_ice' | 'mage_lightning';
  count: number;
}

export const CastleInterior = ({ 
  castle, 
  onClose,
  onConstructionStarted,
  onConstructionCompleted,
  onBuildingUpgraded,
  onArmyProduced
}: CastleInteriorProps) => {
  const { state, dispatch } = useGame();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [constructing, setConstructing] = useState(false);
  const [newBuildingType, setNewBuildingType] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [buildingToUpgrade, setBuildingToUpgrade] = useState('');
  const [producing, setProducing] = useState(false);
  const [unitTypeToProduce, setUnitTypeToProduce] = useState<ArmyUnit['type']>('swordsman');

  useEffect(() => {
    loadBuildings();
  }, [castle]);

  const loadBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('owner_id', castle.user_id);

      if (error) {
        console.error('Error loading buildings:', error);
        return;
      }

      // Map the data to match our Building interface
      const buildingsData: Building[] = (data || []).map(building => ({
        id: building.id,
        type: building.type,
        level: building.level,
        completion_time: building.completion_time
      }));

      setBuildings(buildingsData);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const startConstruction = async (buildingType: string) => {
    if (!buildingType.trim()) {
      toast.error('Lütfen bir bina tipi girin');
      return;
    }

    setConstructing(true);
    try {
      const { data, error } = await supabase
        .from('buildings')
        .insert([{
          owner_id: castle.user_id,
          type: buildingType,
          level: 1,
          completion_time: new Date(Date.now() + 60000).toISOString() // 1 minute
        }])
        .select();

      if (error) {
        console.error('Construction start error:', error);
        toast.error('İnşaat başlatılamadı: ' + error.message);
        setConstructing(false);
        return;
      }

      toast.success(`${buildingType} inşaatı başladı!`);
      loadBuildings();
      setConstructing(false);
      setNewBuildingType('');
      
      // Tutorial event trigger
      if (onConstructionStarted) {
        onConstructionStarted();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Beklenmeyen bir hata oluştu');
      setConstructing(false);
    }
  };

  const upgradeBuilding = async (buildingId: string) => {
    if (!buildingId) {
      toast.error('Lütfen yükseltilecek binayı seçin');
      return;
    }

    setUpgrading(true);
    try {
      const building = buildings.find(b => b.id === buildingId);
      if (!building) {
        toast.error('Bina bulunamadı');
        setUpgrading(false);
        return;
      }

      const { data, error } = await supabase
        .from('buildings')
        .update({
          level: building.level + 1
        })
        .eq('id', buildingId)
        .select();

      if (error) {
        console.error('Upgrade error:', error);
        toast.error('Yükseltme yapılamadı: ' + error.message);
        setUpgrading(false);
        return;
      }

      toast.success(`${building.type} seviye ${building.level + 1}'e yükseltildi!`);
      loadBuildings();
      setUpgrading(false);
      setBuildingToUpgrade('');
      
      // Tutorial event trigger
      if (onBuildingUpgraded) {
        onBuildingUpgraded();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Beklenmeyen bir hata oluştu');
      setUpgrading(false);
    }
  };

  const produceUnit = (unitType: ArmyUnit['type']) => {
    setProducing(true);
    const newUnit = {
      id: Math.random().toString(36).substring(7),
      type: unitType,
      count: 100,
      damage: 50,
      health: 100
    };

    dispatch({ type: 'CREATE_ARMY_UNIT', payload: newUnit });
    toast.success(`${unitType} üretildi!`);
    setProducing(false);
    setUnitTypeToProduce(unitType);
    
    // Tutorial event trigger - check if we reached 1000 total army
    if (onArmyProduced) {
      const totalArmy = state.army.reduce((total, unit) => total + unit.count, 0);
      onArmyProduced(totalArmy);
    }
  };

  useEffect(() => {
    // Check for completed constructions
    const completedBuildings = buildings.filter(
      building => building.completion_time && new Date(building.completion_time) <= new Date()
    );
    
    if (completedBuildings.length > 0 && onConstructionCompleted) {
      onConstructionCompleted();
    }
  }, [buildings, onConstructionCompleted]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{castle.username} Kalesi</CardTitle>
        <CardDescription>Kale içi yönetim ekranı</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="new-building">Yeni Bina İnşa Et</Label>
          <div className="flex gap-2">
            <Input
              id="new-building"
              value={newBuildingType}
              onChange={(e) => setNewBuildingType(e.target.value)}
              placeholder="Bina tipi (örneğin: kışla)"
            />
            <Button onClick={() => startConstruction(newBuildingType)} disabled={constructing}>
              {constructing ? 'İnşa Ediliyor...' : 'İnşa Et'}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="upgrade-building">Bina Yükselt</Label>
          <div className="flex gap-2">
            <select
              id="upgrade-building"
              className="border rounded px-2 py-1"
              value={buildingToUpgrade}
              onChange={(e) => setBuildingToUpgrade(e.target.value)}
            >
              <option value="">Bina Seç</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.type} (Seviye {building.level})
                </option>
              ))}
            </select>
            <Button onClick={() => upgradeBuilding(buildingToUpgrade)} disabled={upgrading}>
              {upgrading ? 'Yükseltiliyor...' : 'Yükselt'}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="produce-unit">Asker Üret</Label>
          <div className="flex gap-2">
            <select
              id="produce-unit"
              className="border rounded px-2 py-1"
              value={unitTypeToProduce}
              onChange={(e) => setUnitTypeToProduce(e.target.value as ArmyUnit['type'])}
            >
              <option value="swordsman">Kılıçlı</option>
              <option value="archer">Okçu</option>
              <option value="cavalry">Atlı</option>
              <option value="mage_fire">Ateş Büyücüsü</option>
              <option value="mage_ice">Buz Büyücüsü</option>
              <option value="mage_lightning">Yıldırım Büyücüsü</option>
            </select>
            <Button onClick={() => produceUnit(unitTypeToProduce)} disabled={producing}>
              {producing ? 'Üretiliyor...' : 'Üret'}
            </Button>
          </div>
        </div>
        
        <Button variant="outline" onClick={onClose}>Kapat</Button>
      </CardContent>
    </Card>
  );
};
