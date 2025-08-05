import { useState, useEffect } from 'react';
import { useUserResources } from '@/hooks/useUserResources';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hammer, Clock, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTutorial } from '@/hooks/useTutorial';

interface Building {
  id: string;
  type: 'mine' | 'forge' | 'farm' | 'quarry' | 'warehouse';
  level: number;
  isBuilding: boolean;
  buildStartTime?: number;
  upgradeStartTime?: number;
  x: number;
  y: number;
}

interface BuildingType {
  name: string;
  description: string;
  icon: string;
  baseProduction: number;
  baseCost: number;
  resource: string;
}

const buildingTypes: Record<string, BuildingType> = {
  mine: {
    name: 'Altın Madeni',
    description: 'Altın üretir',
    icon: '🏭',
    baseProduction: 100,
    baseCost: 1000,
    resource: 'gold'
  },
  forge: {
    name: 'Demir Ocağı', 
    description: 'Demir üretir',
    icon: '⚒️',
    baseProduction: 80,
    baseCost: 800,
    resource: 'iron'
  },
  farm: {
    name: 'Çiftlik',
    description: 'Buğday üretir',
    icon: '🌾',
    baseProduction: 120,
    baseCost: 600,
    resource: 'wheat'
  },
  quarry: {
    name: 'Taş Ocağı',
    description: 'Taş üretir',
    icon: '🪨',
    baseProduction: 90,
    baseCost: 700,
    resource: 'stone'
  },
  warehouse: {
    name: 'Ambar',
    description: 'Odun üretir',
    icon: '🪵',
    baseProduction: 110,
    baseCost: 500,
    resource: 'wood'
  }
};

const buildSlots = [
  { id: 1, x: 1, y: 1 },
  { id: 2, x: 3, y: 1 },
  { id: 3, x: 5, y: 1 },
  { id: 4, x: 1, y: 3 },
  { id: 5, x: 3, y: 3 },
  { id: 6, x: 5, y: 3 },
  { id: 7, x: 1, y: 5 },
  { id: 8, x: 3, y: 5 },
  { id: 9, x: 5, y: 5 }
];

interface CastleInteriorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CastleInterior = ({ isOpen, onClose }: CastleInteriorProps) => {
  const { user } = useAuth();
  const { resources, canAfford, spendResources, updateResources } = useUserResources();
  const { tutorialProgress, isTutorialActive, currentStep, updateTutorialStep } = useTutorial();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedBuildingType, setSelectedBuildingType] = useState<string>('');

  // Load buildings from localStorage on component mount
  useEffect(() => {
    if (user && isOpen) {
      const savedBuildings = localStorage.getItem(`castle_buildings_${user.id}`);
      if (savedBuildings) {
        setBuildings(JSON.parse(savedBuildings));
      }
    }
  }, [user, isOpen]);

  // Save buildings to localStorage whenever buildings change
  useEffect(() => {
    if (user && buildings.length > 0) {
      localStorage.setItem(`castle_buildings_${user.id}`, JSON.stringify(buildings));
    }
  }, [buildings, user]);

  // Handle building/upgrade timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBuildings(prev => prev.map(building => {
        // Check if building construction is complete
        if (building.isBuilding && building.buildStartTime && 
            now >= building.buildStartTime + 60000) {
          
          // Tutorial check for construction completion
          if (isTutorialActive && currentStep === 'wait_construction') {
            updateTutorialStep('upgrade_building');
            toast.success('🎉 Tutorial: İnşaat tamamlandı! Şimdi binayı geliştirin!');
          } else {
            toast.success(`${buildingTypes[building.type].name} inşaatı tamamlandı!`);
          }
          
          return { ...building, isBuilding: false, buildStartTime: undefined };
        }
        
        // Check if upgrade is complete
        if (building.upgradeStartTime && 
            now >= building.upgradeStartTime + 60000) {
          toast.success(`${buildingTypes[building.type].name} seviye ${building.level + 1} oldu!`);
          return { 
            ...building, 
            level: building.level + 1, 
            upgradeStartTime: undefined 
          };
        }
        
        return building;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTutorialActive, currentStep, updateTutorialStep]);

  // Production effect - now updates real resources
  useEffect(() => {
    const interval = setInterval(() => {
      const activeBuildings = buildings.filter(b => !b.isBuilding && !b.upgradeStartTime);
      if (activeBuildings.length > 0) {
        const production: any = {};
        
        activeBuildings.forEach(building => {
          const buildingType = buildingTypes[building.type];
          const productionAmount = Math.floor(buildingType.baseProduction * Math.pow(1.5, building.level) / 60); // per second
          production[buildingType.resource] = (production[buildingType.resource] || 0) + productionAmount;
        });
        
        if (Object.keys(production).length > 0) {
          // Convert to full resource update
          const resourceUpdate = {
            wood: resources.wood + (production.wood || 0),
            gold: resources.gold + (production.gold || 0),
            iron: resources.iron + (production.iron || 0),
            wheat: resources.wheat + (production.wheat || 0),
            stone: resources.stone + (production.stone || 0)
          };
          updateResources(resourceUpdate);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [buildings, resources, updateResources]);

  const getBuildingOnSlot = (slotId: number) => {
    const slot = buildSlots.find(s => s.id === slotId);
    if (!slot) return null;
    return buildings.find(b => b.x === slot.x && b.y === slot.y);
  };

  const canAffordUpgrade = (building: Building) => {
    const upgradeCost = buildingTypes[building.type].baseCost * Math.pow(2, building.level);
    return canAfford(upgradeCost);
  };

  const handleBuildBuilding = async () => {
    if (!selectedSlot || !selectedBuildingType) return;
    
    const slot = buildSlots.find(s => s.id === selectedSlot);
    if (!slot) return;

    const buildingType = buildingTypes[selectedBuildingType];
    const cost = buildingType.baseCost;

    const success = await spendResources(cost);
    if (!success) return;

    const newBuilding: Building = {
      id: `${selectedBuildingType}_${Date.now()}`,
      type: selectedBuildingType as any,
      level: 1,
      isBuilding: true,
      buildStartTime: Date.now(),
      x: slot.x,
      y: slot.y
    };

    setBuildings(prev => [...prev, newBuilding]);
    setSelectedSlot(null);
    setSelectedBuildingType('');
    
    // Tutorial check for starting construction
    if (isTutorialActive && currentStep === 'build_structure') {
      await updateTutorialStep('wait_construction');
      toast.success('🎉 Tutorial: İnşaat başladı! 1 dakika bekleyin...');
    } else {
      toast.success(`${buildingType.name} inşaatı başladı! 1 dakika sürecek.`);
    }
  };

  const handleUpgradeBuilding = async (building: Building) => {
    if (building.upgradeStartTime) return;

    const upgradeCost = buildingTypes[building.type].baseCost * Math.pow(2, building.level);
    const success = await spendResources(upgradeCost);
    if (!success) return;

    setBuildings(prev => prev.map(b => 
      b.id === building.id 
        ? { ...b, upgradeStartTime: Date.now() }
        : b
    ));

    // Tutorial check for upgrading building
    if (isTutorialActive && currentStep === 'upgrade_building') {
      await updateTutorialStep('train_army');
      toast.success('🎉 Tutorial: Bina geliştirildi! Şimdi ordu oluşturun!');
    } else {
      toast.success(`${buildingTypes[building.type].name} geliştirme başladı! 1 dakika sürecek.`);
    }
  };

  const getTimeRemaining = (startTime: number) => {
    const elapsed = Date.now() - startTime;
    const remaining = 60000 - elapsed; // 1 minute
    return Math.max(0, Math.ceil(remaining / 1000));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            🏰 Kale İçi Yönetimi
            <Badge variant="secondary">
              Toplam Bina: {buildings.length}/9
            </Badge>
            {isTutorialActive && (currentStep === 'build_structure' || currentStep === 'wait_construction' || currentStep === 'upgrade_building') && (
              <Badge variant="default" className="bg-yellow-500">
                Tutorial Aktif
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tutorial guidance overlay */}
        {isTutorialActive && (currentStep === 'build_structure' || currentStep === 'wait_construction' || currentStep === 'upgrade_building') && (
          <div className="mx-6 p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              {currentStep === 'build_structure' && '🎯 Boş bir alan seçin ve herhangi bir bina inşa edin'}
              {currentStep === 'wait_construction' && '⏰ İnşaat tamamlanması bekleniyor... (1 dakika)'}
              {currentStep === 'upgrade_building' && '⭐ Tamamlanan binayı geliştirin'}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          {/* Build Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {buildSlots.map(slot => {
              const building = getBuildingOnSlot(slot.id);
              const isSelected = selectedSlot === slot.id;

              return (
                <Card 
                  key={slot.id}
                  className={`relative h-32 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  } ${building ? 'bg-green-50' : 'bg-gray-50 border-dashed'}`}
                  onClick={() => !building && setSelectedSlot(slot.id)}
                >
                  <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                    {building ? (
                      <>
                        <div className="text-2xl mb-1">
                          {buildingTypes[building.type].icon}
                        </div>
                        <div className="text-xs font-medium text-center">
                          {buildingTypes[building.type].name}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Level {building.level}
                        </Badge>
                        
                        {building.isBuilding && building.buildStartTime && (
                          <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeRemaining(building.buildStartTime)}s
                          </div>
                        )}
                        
                        {building.upgradeStartTime && (
                          <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {getTimeRemaining(building.upgradeStartTime)}s
                          </div>
                        )}
                        
                        {!building.isBuilding && !building.upgradeStartTime && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1 text-xs h-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgradeBuilding(building);
                            }}
                            disabled={!canAffordUpgrade(building)}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Geliştir
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <Hammer className="w-8 h-8 text-gray-400 mb-2" />
                        <div className="text-xs text-gray-500">Boş Alan</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Building Selection */}
          {selectedSlot && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hammer className="w-5 h-5" />
                  Bina Seç
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {Object.entries(buildingTypes).map(([type, info]) => (
                    <Button
                      key={type}
                      variant={selectedBuildingType === type ? "default" : "outline"}
                      className="h-20 flex-col"
                      onClick={() => setSelectedBuildingType(type)}
                    >
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className="text-xs">{info.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {info.baseCost} kaynak
                      </div>
                    </Button>
                  ))}
                </div>
                
                {selectedBuildingType && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {buildingTypes[selectedBuildingType].name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {buildingTypes[selectedBuildingType].description} - 
                        Saatlik: {buildingTypes[selectedBuildingType].baseProduction}
                      </div>
                    </div>
                    <Button
                      onClick={handleBuildBuilding}
                      disabled={!canAfford(buildingTypes[selectedBuildingType].baseCost)}
                    >
                      <Hammer className="w-4 h-4 mr-2" />
                      İnşa Et
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Production Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Aktif Üretim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(buildingTypes).map(([type, info]) => {
                  const activeBuildings = buildings.filter(b => 
                    b.type === type && !b.isBuilding && !b.upgradeStartTime
                  );
                  const totalProduction = activeBuildings.reduce((sum, b) => 
                    sum + Math.floor(info.baseProduction * Math.pow(1.5, b.level)), 0
                  );

                  return (
                    <div key={type} className="text-center">
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className="text-xs font-medium">
                        {activeBuildings.length} Bina
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        +{totalProduction}/saat
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
