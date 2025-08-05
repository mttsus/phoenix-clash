
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/contexts/GameContext';
import { useUserResources } from '@/hooks/useUserResources';
import { useTutorial } from '@/hooks/useTutorial';
import { Swords, ShieldIcon, Target, Zap, Flame, Snowflake } from 'lucide-react';
import { toast } from 'sonner';

const unitTypes = [
  { 
    id: 'swordsman', 
    name: 'Kılıççı', 
    icon: '⚔️', 
    health: 100, 
    damage: 25, 
    cost: 500,
    description: 'Yakın dövüş uzmanı'
  },
  { 
    id: 'archer', 
    name: 'Okçu', 
    icon: '🏹', 
    health: 75, 
    damage: 30, 
    cost: 600,
    description: 'Uzak mesafe saldırısı'
  },
  { 
    id: 'cavalry', 
    name: 'Süvari', 
    icon: '🐎', 
    health: 120, 
    damage: 35, 
    cost: 800,
    description: 'Hızlı ve güçlü'
  },
  { 
    id: 'mage_fire', 
    name: 'Ateş Büyücüsü', 
    icon: '🔥', 
    health: 80, 
    damage: 40, 
    cost: 1000,
    description: 'Alan hasarı verir'
  },
  { 
    id: 'mage_ice', 
    name: 'Buz Büyücüsü', 
    icon: '❄️', 
    health: 85, 
    damage: 35, 
    cost: 1000,
    description: 'Düşmanları yavaşlatır'
  },
  { 
    id: 'mage_lightning', 
    name: 'Şimşek Büyücüsü', 
    icon: '⚡', 
    health: 75, 
    damage: 45, 
    cost: 1200,
    description: 'Hızlı ve sürpriz saldırı'
  },
] as const;

export const ArmyPanel = () => {
  const { state, dispatch } = useGame();
  const { resources, canAfford, spendResources } = useUserResources();
  const { tutorialProgress, isTutorialActive, currentStep, updateTutorialStep } = useTutorial();
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  const createUnit = async (unitTypeId: string, quantity: number = 100) => {
    const unitType = unitTypes.find(u => u.id === unitTypeId);
    if (!unitType) return;

    const totalCost = unitType.cost * quantity;
    const success = await spendResources(totalCost);
    if (!success) return;

    // Mevcut aynı türden birimi bul veya yeni bir tane oluştur
    const existingUnitIndex = state.army.findIndex(unit => unit.type === unitTypeId);
    
    if (existingUnitIndex !== -1) {
      // Mevcut birimin sayısını artır
      const updatedArmy = [...state.army];
      updatedArmy[existingUnitIndex] = {
        ...updatedArmy[existingUnitIndex],
        count: updatedArmy[existingUnitIndex].count + quantity
      };
      
      // Army'yi güncelle (dispatch ile değil, doğrudan state'i güncelleyelim)
      dispatch({ type: 'SET_ARMY', payload: updatedArmy });
    } else {
      // Yeni birim oluştur
      const newUnit = {
        id: `${unitTypeId}_${Date.now()}`,
        type: unitTypeId as any,
        count: quantity,
        health: unitType.health,
        damage: unitType.damage
      };

      dispatch({ type: 'CREATE_ARMY_UNIT', payload: newUnit });
    }

    toast.success(`${quantity} adet ${unitType.name} eğitildi!`);

    // Tutorial check for army training
    if (isTutorialActive && currentStep === 'train_army') {
      const totalArmyCount = state.army.reduce((sum, unit) => sum + unit.count, 0) + quantity;
      
      // Check if we have at least 1 of each unit type and 1000+ total
      const unitTypesInArmy = new Set([...state.army.map(u => u.type), unitTypeId]);
      const hasAllUnitTypes = unitTypesInArmy.size >= 6;
      
      if (totalArmyCount >= 1000 && hasAllUnitTypes) {
        await updateTutorialStep('battle_enemy');
        toast.success('🎉 Tutorial: Ordu hazır! Şimdi düşmanla savaşın!');
      } else {
        const remaining = Math.max(0, 1000 - totalArmyCount);
        const missingTypes = 6 - unitTypesInArmy.size;
        toast.info(`Tutorial: ${remaining} asker ve ${missingTypes} farklı tür kaldı`);
      }
    }
  };

  const getTotalArmyCount = () => {
    return state.army.reduce((total, unit) => total + unit.count, 0);
  };

  const getUniqueUnitTypes = () => {
    return new Set(state.army.map(unit => unit.type)).size;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Ordu Yönetimi
            {isTutorialActive && currentStep === 'train_army' && (
              <Badge variant="default" className="bg-yellow-500">
                Tutorial
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline">
              Toplam: {getTotalArmyCount()} asker
            </Badge>
            <Badge variant="outline">
              Çeşit: {getUniqueUnitTypes()}/6
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tutorial guidance */}
          {isTutorialActive && currentStep === 'train_army' && (
            <div className="p-3 bg-yellow-100 border-2 border-yellow-400 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                🎯 6 farklı asker türünden en az 1000 asker üretin
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                İlerleme: {getTotalArmyCount()}/1000 asker, {getUniqueUnitTypes()}/6 tür
              </p>
            </div>
          )}

          {/* Unit Training */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Asker Eğitimi</h3>
            <div className="grid grid-cols-1 gap-2">
              {unitTypes.map((unit) => (
                <div key={unit.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{unit.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{unit.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ❤️{unit.health} ⚔️{unit.damage}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">
                        {unit.cost * 100} kaynak (100 adet)
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createUnit(unit.id, 100)}
                        disabled={!canAfford(unit.cost * 100)}
                        className="h-7 text-xs"
                      >
                        Eğit (100)
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Army */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Mevcut Ordu</h3>
            {state.army.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Henüz asker yok
              </div>
            ) : (
              <div className="space-y-2">
                {state.army.map((unit) => {
                  const unitType = unitTypes.find(u => u.id === unit.type);
                  return (
                    <div key={unit.id} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{unitType?.icon}</span>
                        <span className="text-sm font-medium">{unitType?.name}</span>
                      </div>
                      <Badge variant="outline">
                        {unit.count} adet
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
