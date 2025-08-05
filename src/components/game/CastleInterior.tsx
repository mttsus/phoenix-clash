
import React, { useState, useEffect } from 'react';
import { useGame, CastleBuilding } from '@/contexts/GameContext';
import { useUserResources } from '@/hooks/useUserResources';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const BUILDING_TYPES = {
  lumber_mill: { name: 'Kereste Fabrikası', icon: '🪵', resource: 'wood' },
  mine: { name: 'Altın Madeni', icon: '🪙', resource: 'gold' },
  forge: { name: 'Demir Ocağı', icon: '⚒️', resource: 'iron' },
  farm: { name: 'Çiftlik', icon: '🌾', resource: 'wheat' },
  quarry: { name: 'Taş Ocağı', icon: '🪨', resource: 'stone' }
};

const BUILDING_COSTS = {
  build: { wood: 1000, gold: 1000, iron: 500, wheat: 500, stone: 1500 },
  upgrade: { wood: 500, gold: 500, iron: 250, wheat: 250, stone: 750 }
};

export const CastleInterior = () => {
  const { state, dispatch } = useGame();
  const { spendResources } = useUserResources();
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedBuildingType, setSelectedBuildingType] = useState<keyof typeof BUILDING_TYPES>('lumber_mill');

  // Check for completed constructions/upgrades
  useEffect(() => {
    const now = Date.now();
    state.castleBuildings.forEach(building => {
      if (building.isBuilding && building.buildStartTime && 
          now - building.buildStartTime >= 60000) { // 1 minute
        dispatch({ type: 'COMPLETE_BUILDING_CONSTRUCTION', payload: building.id });
        toast.success(`${BUILDING_TYPES[building.type].name} inşaatı tamamlandı!`);
      }
      
      if (building.isUpgrading && building.upgradeStartTime && 
          now - building.upgradeStartTime >= 60000) { // 1 minute
        dispatch({ type: 'COMPLETE_BUILDING_UPGRADE', payload: building.id });
        toast.success(`${BUILDING_TYPES[building.type].name} seviyesi artırıldı!`);
      }
    });
  }, [state.castleBuildings, dispatch]);

  const getBuildingAtPosition = (x: number, y: number) => {
    return state.castleBuildings.find(b => b.position.x === x && b.position.y === y);
  };

  const canBuildAtPosition = (x: number, y: number) => {
    return !getBuildingAtPosition(x, y);
  };

  const handleBuildingPlacement = async () => {
    if (!selectedPosition || !canBuildAtPosition(selectedPosition.x, selectedPosition.y)) {
      toast.error('Bu pozisyona bina yerleştirilemez!');
      return;
    }

    const success = await spendResources(BUILDING_COSTS.build);
    if (success) {
      const newBuilding: CastleBuilding = {
        id: `${selectedBuildingType}_${Date.now()}`,
        type: selectedBuildingType,
        level: 1,
        position: selectedPosition,
        isBuilding: true,
        buildStartTime: Date.now(),
        isUpgrading: false
      };

      dispatch({ type: 'ADD_CASTLE_BUILDING', payload: newBuilding });
      toast.success(`${BUILDING_TYPES[selectedBuildingType].name} inşaatı başladı!`);
      setSelectedPosition(null);
    }
  };

  const handleBuildingUpgrade = async (building: CastleBuilding) => {
    if (building.isBuilding || building.isUpgrading) {
      toast.error('Bu bina şu anda meşgul!');
      return;
    }

    const success = await spendResources(BUILDING_COSTS.upgrade);
    if (success) {
      dispatch({
        type: 'UPDATE_CASTLE_BUILDING',
        payload: {
          id: building.id,
          updates: {
            isUpgrading: true,
            upgradeStartTime: Date.now(),
            level: building.level + 1
          }
        }
      });
      toast.success(`${BUILDING_TYPES[building.type].name} geliştirilmeye başladı!`);
    }
  };

  const getBuildingProgress = (building: CastleBuilding) => {
    if (!building.isBuilding && !building.isUpgrading) return 100;
    
    const startTime = building.isBuilding ? building.buildStartTime : building.upgradeStartTime;
    if (!startTime) return 0;
    
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / 60000) * 100, 100); // 60 seconds = 100%
    return progress;
  };

  const renderBuildingGrid = () => {
    const grid = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const building = getBuildingAtPosition(x, y);
        const isSelected = selectedPosition?.x === x && selectedPosition?.y === y;
        
        grid.push(
          <div
            key={`${x}-${y}`}
            className={`
              w-20 h-20 border-2 border-dashed cursor-pointer flex flex-col items-center justify-center
              ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
              ${building ? 'bg-green-100 border-green-500' : 'hover:bg-gray-50'}
            `}
            onClick={() => {
              if (building) {
                // Show building details or upgrade option
              } else {
                setSelectedPosition({ x, y });
              }
            }}
          >
            {building ? (
              <div className="text-center">
                <div className="text-2xl">{BUILDING_TYPES[building.type].icon}</div>
                <div className="text-xs font-medium">Lv.{building.level}</div>
                {(building.isBuilding || building.isUpgrading) && (
                  <div className="w-full mt-1">
                    <Progress value={getBuildingProgress(building)} className="h-1" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-xs text-center">
                Boş<br />Alan
              </div>
            )}
          </div>
        );
      }
    }
    return grid;
  };

  return (
    <Dialog open={state.isCastleInteriorOpen} onOpenChange={() => dispatch({ type: 'CLOSE_CASTLE_INTERIOR' })}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kale İçi - Bina Yönetimi</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Building Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Bina Alanları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 p-4 bg-green-50 rounded-lg">
                  {renderBuildingGrid()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Building Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bina Seçimi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(BUILDING_TYPES).map(([key, building]) => (
                    <Button
                      key={key}
                      variant={selectedBuildingType === key ? "default" : "outline"}
                      onClick={() => setSelectedBuildingType(key as keyof typeof BUILDING_TYPES)}
                      className="flex items-center gap-2 justify-start"
                    >
                      <span className="text-lg">{building.icon}</span>
                      <span className="text-sm">{building.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedPosition && (
              <Card>
                <CardHeader>
                  <CardTitle>Bina Yerleştir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Seçilen bina: {BUILDING_TYPES[selectedBuildingType].name}
                    </div>
                    <div className="text-sm">
                      Maliyet: {Object.entries(BUILDING_COSTS.build).map(([resource, amount]) => 
                        `${amount} ${resource}`
                      ).join(', ')}
                    </div>
                    <Button onClick={handleBuildingPlacement} className="w-full">
                      Binayı İnşa Et
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Mevcut Binalar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {state.castleBuildings.map(building => (
                    <div key={building.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span>{BUILDING_TYPES[building.type].icon}</span>
                        <div>
                          <div className="text-xs font-medium">{BUILDING_TYPES[building.type].name}</div>
                          <div className="text-xs text-muted-foreground">Level {building.level}</div>
                        </div>
                      </div>
                      {!building.isBuilding && !building.isUpgrading ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleBuildingUpgrade(building)}
                        >
                          Geliştir
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {building.isBuilding ? 'İnşa Ediliyor' : 'Geliştiriliyor'}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {state.castleBuildings.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      Henüz bina yok
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
