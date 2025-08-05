
import { useGame } from '@/contexts/GameContext';
import { ResourceBossBattle } from './ResourceBossBattle';
import { PvPBattle } from './PvPBattle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const BattleField = () => {
  const { state, dispatch } = useGame();

  // If no battle is active, show empty state
  if (!state.battleState.inBattle) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Savaş Alanı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Şu anda aktif bir savaş bulunmuyor. Haritadan bir bölgeye saldırarak savaş başlatabilirsiniz.
            </p>
            <Button 
              onClick={() => dispatch({ type: 'END_BATTLE' })}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Haritaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resource region battle
  if (state.battleState.battleType === 'resource') {
    return <ResourceBossBattle />;
  }

  // PvP battle
  if (state.battleState.battleType === 'pvp') {
    return <PvPBattle />;
  }

  return (
    <div className="h-full flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Bilinmeyen Savaş Türü</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Bilinmeyen savaş türü tespit edildi.
          </p>
          <Button 
            onClick={() => dispatch({ type: 'END_BATTLE' })}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Haritaya Dön
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
