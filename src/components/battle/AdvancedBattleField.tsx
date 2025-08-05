
import { useState } from 'react';
import { DefensiveBattle } from './DefensiveBattle';
import { BattleStrategy } from './BattleStrategy';
import { useGame } from '@/contexts/GameContext';

export const AdvancedBattleField = () => {
  const { state } = useGame();
  const [showStrategy, setShowStrategy] = useState(true);
  const [battleStrategy, setBattleStrategy] = useState(null);

  const handleStrategyComplete = (strategy: any) => {
    setBattleStrategy(strategy);
    setShowStrategy(false);
  };

  if (showStrategy) {
    return <BattleStrategy onStartBattle={handleStrategyComplete} />;
  }

  return (
    <DefensiveBattle 
      battleType={state.battleState.battleType || 'pvp'}
    />
  );
};
