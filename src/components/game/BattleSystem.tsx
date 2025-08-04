
import { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const TOWER_HEALTH = 1000;
const TOWER_COUNT = 9; // 3x3 grid

export const BattleSystem = () => {
  const { state, dispatch } = useGame();
  const [battleState, setBattleState] = useState<{
    inBattle: boolean;
    towers: Array<{ id: number; health: number; destroyed: boolean }>;
    enemyCastle: { health: number };
    battleLog: string[];
  }>({
    inBattle: false,
    towers: Array.from({ length: TOWER_COUNT }, (_, i) => ({
      id: i,
      health: TOWER_HEALTH,
      destroyed: false
    })),
    enemyCastle: { health: 5000 },
    battleLog: []
  });

  const startBattle = () => {
    setBattleState(prev => ({
      ...prev,
      inBattle: true,
      battleLog: ['Savaş başladı!', '']
    }));
    
    // Basit savaş simülasyonu
    simulateBattle();
  };

  const simulateBattle = () => {
    let log = ['Savaş başladı!'];
    let won = false;
    
    // Temel savaş mantığı simülasyonu
    const totalArmyCount = state.army.reduce((total, unit) => total + unit.count, 0);
    
    if (totalArmyCount >= 500) {
      log.push(`${totalArmyCount} askerle saldırıya geçildi!`);
      log.push('Kuleler yıkılıyor...');
      log.push('Düşman kalesi ele geçirildi!');
      won = true;
    } else {
      log.push(`${totalArmyCount} asker yeterli değil!`);
      log.push('Savaş kaybedildi...');
      won = false;
    }
    
    setTimeout(() => {
      setBattleState(prev => ({
        ...prev,
        inBattle: false,
        battleLog: log
      }));
      
      dispatch({ type: 'BATTLE_RESULT', payload: { won } });
      
      if (won) {
        // Zafer ödülü - 3000 kaynak
        dispatch({ 
          type: 'UPDATE_RESOURCES', 
          payload: {
            wood: state.resources.wood + 3000,
            gold: state.resources.gold + 3000,
            iron: state.resources.iron + 3000,
            wheat: state.resources.wheat + 3000,
            stone: state.resources.stone + 3000
          }
        });
      }
    }, 3000);
  };

  const getActiveTowers = () => {
    return battleState.towers.filter(tower => !tower.destroyed).length;
  };

  return (
    <div className="h-full flex flex-col p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Savaş Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Aktif Kuleler:</span>
                <span>{getActiveTowers()} / {TOWER_COUNT}</span>
              </div>
              <Progress value={(getActiveTowers() / TOWER_COUNT) * 100} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span>Düşman Kalesi:</span>
                <span>{battleState.enemyCastle.health} HP</span>
              </div>
              <Progress value={(battleState.enemyCastle.health / 5000) * 100} />
            </div>
            
            <div className="flex justify-between">
              <span>Savaş Durumu:</span>
              <Badge variant={battleState.inBattle ? "destructive" : "secondary"}>
                {battleState.inBattle ? "Savaş Devam Ediyor" : "Beklemede"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Savaş Kontrolü</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={startBattle}
              disabled={battleState.inBattle || state.army.length === 0}
              className="w-full"
              variant={battleState.inBattle ? "destructive" : "default"}
            >
              {battleState.inBattle ? "Savaş Devam Ediyor..." : "Savaşa Başla"}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              <div>Gerekli Minimum Asker: 500</div>
              <div>Mevcut Asker: {state.army.reduce((total, unit) => total + unit.count, 0)}</div>
              <div>Ardışık Yenilgi: {state.consecutiveLosses}/3</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">Savaş Günlüğü</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-64 overflow-y-auto text-sm font-mono">
            {battleState.battleLog.map((log, index) => (
              <div key={index} className="text-muted-foreground">
                {log}
              </div>
            ))}
            {battleState.battleLog.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                Henüz savaş yapılmadı
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
