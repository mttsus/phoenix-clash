import { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUserResources } from '@/hooks/useUserResources';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Building {
  id: string;
  type: 'barracks' | 'workshop' | 'tower' | 'wall';
  level: number;
  constructionTime: number;
  isUnderConstruction: boolean;
  startTime: number;
}

const BUILDING_COSTS = {
  barracks: 1000,
  workshop: 1500,
  tower: 2000,
  wall: 500
};

const CONSTRUCTION_TIMES = {
  barracks: 60000, // 1 minute
  workshop: 90000, // 1.5 minutes
  tower: 120000, // 2 minutes
  wall: 30000 // 30 seconds
};

const getBuildingName = (type: 'barracks' | 'workshop' | 'tower' | 'wall') => {
  switch (type) {
    case 'barracks': return 'Kışla';
    case 'workshop': return 'Atölye';
    case 'tower': return 'Kule';
    case 'wall': return 'Duvar';
    default: return 'Bina';
  }
};

export const CastleInterior = ({ 
  isOpen, 
  onClose,
  onConstructionStarted,
  onConstructionCompleted,
  onBuildingUpgraded 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onConstructionStarted?: () => void;
  onConstructionCompleted?: () => void;
  onBuildingUpgraded?: () => void;
}) => {
  const { resources, canAfford, spendResources } = useUserResources();
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    // Load buildings from local storage or database here
    // For now, let's initialize with an empty array
    setBuildings([]);
  }, []);

  const handleStartConstruction = async (buildingType: 'barracks' | 'workshop' | 'tower' | 'wall') => {
    if (!canAfford(BUILDING_COSTS[buildingType])) {
      toast.error('Yeterli kaynağınız yok!');
      return;
    }

    // Tutorial event
    onConstructionStarted?.();

    const success = await spendResources(BUILDING_COSTS[buildingType]);
    if (!success) return;

    const newBuilding: Building = {
      id: `${buildingType}_${Date.now()}`,
      type: buildingType,
      level: 1,
      constructionTime: CONSTRUCTION_TIMES[buildingType],
      isUnderConstruction: true,
      startTime: Date.now()
    };

    setBuildings(prev => [...prev, newBuilding]);
    toast.success(`${getBuildingName(buildingType)} inşaatı başlatıldı!`);

    // Simulate construction completion after 1 minute for tutorial
    setTimeout(() => {
      setBuildings(prev => 
        prev.map(building => 
          building.id === newBuilding.id 
            ? { ...building, isUnderConstruction: false }
            : building
        )
      );
      onConstructionCompleted?.(); // Tutorial event
      toast.success(`${getBuildingName(buildingType)} inşaatı tamamlandı!`);
    }, 60000); // 1 minute
  };

  const handleUpgrade = async (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const upgradeCost = BUILDING_COSTS[building.type] * building.level * 2;
    
    if (!canAfford(upgradeCost)) {
      toast.error('Yeterli kaynağınız yok!');
      return;
    }

    const success = await spendResources(upgradeCost);
    if (!success) return;

    setBuildings(prev => 
      prev.map(b => 
        b.id === buildingId 
          ? { ...b, level: b.level + 1 }
          : b
      )
    );

    onBuildingUpgraded?.(); // Tutorial event
    toast.success(`${getBuildingName(building.type)} seviye ${building.level + 1}'e yükseltildi!`);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Kale İçi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <h4 className="text-sm font-medium">Binalar</h4>
          <ul className="space-y-2">
            {buildings.map(building => (
              <li key={building.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{getBuildingName(building.type)} (Seviye {building.level})</p>
                    {building.isUnderConstruction ? (
                      <>
                        <p className="text-sm text-muted-foreground">İnşaat sürüyor...</p>
                        <Progress 
                          value={Math.min(100, ((Date.now() - building.startTime) / building.constructionTime) * 100)} 
                          className="h-2" 
                        />
                      </>
                    ) : (
                      <Button size="sm" onClick={() => handleUpgrade(building.id)}>
                        Seviye Yükselt (+{BUILDING_COSTS[building.type] * building.level * 2})
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          <h4 className="text-sm font-medium">İnşaat</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleStartConstruction('barracks')}>
              Kışla İnşa Et ({BUILDING_COSTS.barracks})
            </Button>
            <Button onClick={() => handleStartConstruction('workshop')}>
              Atölye İnşa Et ({BUILDING_COSTS.workshop})
            </Button>
            <Button onClick={() => handleStartConstruction('tower')}>
              Kule İnşa Et ({BUILDING_COSTS.tower})
            </Button>
            <Button onClick={() => handleStartConstruction('wall')}>
              Duvar İnşa Et ({BUILDING_COSTS.wall})
            </Button>
          </div>
          
          <Button variant="outline" onClick={onClose} className="w-full">
            Kapat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
