
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type TutorialStep = 
  | 'move_castle'
  | 'enter_castle' 
  | 'build_structure'
  | 'wait_construction'
  | 'upgrade_building'
  | 'train_army'
  | 'battle_enemy'
  | 'completed';

interface TutorialProgress {
  current_step: TutorialStep;
  tutorial_completed: boolean;
  step_data: Record<string, any>;
  completed_steps: string[];
}

export const useTutorial = () => {
  const { user } = useAuth();
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTutorialProgress();
    }
  }, [user]);

  const loadTutorialProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_tutorial_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Tutorial progress yüklenemedi:', error);
        return;
      }

      setTutorialProgress(data);
    } catch (error) {
      console.error('Tutorial progress yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTutorialStep = async (nextStep: TutorialStep, stepData: Record<string, any> = {}) => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('update_tutorial_step', {
        new_step: nextStep,
        step_data_update: stepData
      });

      if (error) {
        console.error('Tutorial step güncellenemedi:', error);
        return false;
      }

      // Give reward for completing step
      if (nextStep !== 'completed') {
        await supabase.rpc('complete_tutorial_step_reward');
        toast.success('🎉 Tutorial adımı tamamlandı! 100,000 kaynak kazandınız!');
      }

      // Reload progress
      await loadTutorialProgress();
      return true;
    } catch (error) {
      console.error('Tutorial step güncellenemedi:', error);
      return false;
    }
  };

  const completeTutorial = async () => {
    return await updateTutorialStep('completed');
  };

  return {
    tutorialProgress,
    loading,
    updateTutorialStep,
    completeTutorial,
    isTutorialActive: tutorialProgress && !tutorialProgress.tutorial_completed,
    currentStep: tutorialProgress?.current_step || 'move_castle'
  };
};
