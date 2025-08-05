
import { useEffect } from 'react';
import { useTutorial } from '@/hooks/useTutorial';
import { useGame } from '@/contexts/GameContext';

interface TutorialTrackerProps {
  onCastleMoved?: () => void;
  onCastleClicked?: () => void;
  onConstructionStarted?: () => void;
  onConstructionCompleted?: () => void;
  onBuildingUpgraded?: () => void;
  onArmyProduced?: (totalArmy: number) => void;
  onBattleStarted?: () => void;
}

export const TutorialTracker = ({
  onCastleMoved,
  onCastleClicked,
  onConstructionStarted,
  onConstructionCompleted,
  onBuildingUpgraded,
  onArmyProduced,
  onBattleStarted
}: TutorialTrackerProps) => {
  const { currentStep, completeStep } = useTutorial();
  const { state } = useGame();

  useEffect(() => {
    if (!currentStep) return;

    // Castle moved check
    if (currentStep.id === 'move_castle' && onCastleMoved) {
      completeStep('move_castle');
    }
  }, [onCastleMoved, currentStep, completeStep]);

  useEffect(() => {
    if (!currentStep) return;

    // Castle clicked check
    if (currentStep.id === 'enter_castle' && onCastleClicked) {
      completeStep('enter_castle');
    }
  }, [onCastleClicked, currentStep, completeStep]);

  useEffect(() => {
    if (!currentStep) return;

    // Construction started check
    if (currentStep.id === 'start_construction' && onConstructionStarted) {
      completeStep('start_construction');
    }
  }, [onConstructionStarted, currentStep, completeStep]);

  useEffect(() => {
    if (!currentStep) return;

    // Construction completed check
    if (currentStep.id === 'wait_construction' && onConstructionCompleted) {
      completeStep('wait_construction');
    }
  }, [onConstructionCompleted, currentStep, completeStep]);

  useEffect(() => {
    if (!currentStep) return;

    // Building upgraded check
    if (currentStep.id === 'upgrade_building' && onBuildingUpgraded) {
      completeStep('upgrade_building');
    }
  }, [onBuildingUpgraded, currentStep, completeStep]);

  useEffect(() => {
    if (!currentStep) return;

    // Army production check
    if (currentStep.id === 'produce_army' && onArmyProduced) {
      const totalArmy = state.army.reduce((total, unit) => total + unit.count, 0);
      if (totalArmy >= 1000) {
        completeStep('produce_army');
      }
    }
  }, [onArmyProduced, currentStep, completeStep, state.army]);

  useEffect(() => {
    if (!currentStep) return;

    // Battle started check
    if (currentStep.id === 'battle_enemy' && onBattleStarted) {
      completeStep('battle_enemy');
    }
  }, [onBattleStarted, currentStep, completeStep]);

  return null; // This component doesn't render anything
};
