
import { useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUserResources } from '@/hooks/useUserResources';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export const ResourcePanel = () => {
  const { state, dispatch } = useGame();
  const { resources, loading, refreshResources } = useUserResources();

  // Sync resources with game context when they change
  useEffect(() => {
    if (!loading) {
      dispatch({ type: 'SET_RESOURCES', payload: resources });
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center px-6 bg-card">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Kaynaklar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-between px-6 bg-card">
      <div className="flex items-center space-x-6">
        {Object.entries(resources).map(([key, value]) => (
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
          onClick={() => refreshResources()}
        >
          Yenile
        </Button>
      </div>
    </div>
  );
};
