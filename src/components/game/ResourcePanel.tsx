
import { useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUserResources } from '@/hooks/useUserResources';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const ResourcePanel = () => {
  const { state, dispatch } = useGame();
  const { resources, loading, addResources } = useUserResources();

  // Sync database resources with game state
  useEffect(() => {
    if (resources && !loading) {
      dispatch({
        type: 'UPDATE_RESOURCES',
        payload: {
          wood: resources.wood,
          gold: resources.gold,
          iron: resources.iron,
          wheat: resources.wheat,
          stone: resources.stone
        }
      });
    }
  }, [resources, loading, dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'PRODUCE_RESOURCES' });
    }, 60000); // Her dakika kaynak üretimi simülasyonu

    return () => clearInterval(interval);
  }, [dispatch]);

  const resourceIcons = {
    wood: '🪵',
    gold: '🪙',
    iron: '⚒️',
    wheat: '🌾',
    stone: '🪨'
  };

  const formatResource = (amount: number) => {
    return amount.toLocaleString();
  };

  const handleResourceCollection = async () => {
    // Collect building production bonus
    const buildingBonuses = state.castleBuildings.reduce((acc, building) => {
      if (building.isBuilding || building.isUpgrading) return acc;
      
      const bonus = building.level * 200; // Increased bonus for manual collection
      switch (building.type) {
        case 'lumber_mill': acc.wood += bonus; break;
        case 'mine': acc.gold += bonus; break;
        case 'forge': acc.iron += bonus; break;
        case 'farm': acc.wheat += bonus; break;
        case 'quarry': acc.stone += bonus; break;
      }
      return acc;
    }, { wood: 0, gold: 0, iron: 0, wheat: 0, stone: 0 });

    if (Object.values(buildingBonuses).some(v => v > 0)) {
      await addResources(buildingBonuses);
    } else {
      dispatch({ type: 'PRODUCE_RESOURCES' });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center px-6 bg-card">
        <div>Kaynaklar yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-between px-6 bg-card">
      <div className="flex items-center space-x-6">
        {Object.entries(state.resources).map(([key, value]) => (
          <div key={key} className="flex items-center space-x-2">
            <span className="text-2xl">{resourceIcons[key as keyof typeof resourceIcons]}</span>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground capitalize">{key}</span>
              <span className="text-lg font-bold">{formatResource(value)}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center space-x-4">
        {state.isRestructuringMode && (
          <Badge variant="destructive" className="animate-pulse">
            Yeniden Yapılanma Modu (+50% Üretim)
          </Badge>
        )}
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Üretim Hızı</div>
          <div className="text-lg font-bold">
            {Math.round(state.productionRate * (state.isRestructuringMode ? 1.5 : 1))}/saat
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleResourceCollection}
        >
          Kaynak Topla
        </Button>
      </div>
    </div>
  );
};
