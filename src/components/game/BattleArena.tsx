
import { useGame } from '@/contexts/GameContext';
import { BattleField } from '@/components/battle/BattleField';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const BattleArena = () => {
  const { state, dispatch } = useGame();

  if (!state.battleState.inBattle) {
    return null;
  }

  return (
    <Dialog 
      open={state.battleState.inBattle} 
      onOpenChange={() => dispatch({ type: 'END_BATTLE' })}
    >
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <BattleField />
      </DialogContent>
    </Dialog>
  );
};
