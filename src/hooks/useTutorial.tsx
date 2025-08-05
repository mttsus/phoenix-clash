
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
        .maybeSingle();

      if (error) {
        console.error('Tutorial progress yüklenemedi:', error);
        return;
      }

      if (!data) {
        console.log('Tutorial verisi yok, yeni tutorial başlatılıyor...');
        const { data: newTutorial, error: insertError } = await supabase
          .from('user_tutorial_progress')
          .insert({
            user_id: user.id,
            current_step: 'move_castle',
            tutorial_completed: false,
            step_data: {},
            completed_steps: []
          })
          .select()
          .single();

        if (insertError) {
          console.error('Yeni tutorial oluşturulamadı:', insertError);
          return;
        }

        const tutorialData: TutorialProgress = {
          current_step: newTutorial.current_step,
          tutorial_completed: false,
          step_data: {},
          completed_steps: []
        };
        setTutorialProgress(tutorialData);
        setLoading(false);
        return;
      }

      const tutorialData: TutorialProgress = {
        current_step: data.current_step,
        tutorial_completed: data.tutorial_completed || false,
        step_data: typeof data.step_data === 'object' && data.step_data !== null 
          ? data.step_data as Record<string, any>
          : {},
        completed_steps: data.completed_steps || []
      };

      setTutorialProgress(tutorialData);
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

      if (nextStep !== 'completed') {
        await supabase.rpc('complete_tutorial_step_reward');
        toast.success('🎉 Tutorial adımı tamamlandı! 100,000 kaynak kazandınız!');
      }

      await loadTutorialProgress();
      return true;
    } catch (error) {
      console.error('Tutorial step güncellenemedi:', error);
      return false;
    }
  };

  const skipTutorial = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .update({
          tutorial_completed: true,
          current_step: 'completed',
          completed_steps: ['move_castle', 'enter_castle', 'build_structure', 'wait_construction', 'upgrade_building', 'train_army', 'battle_enemy']
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Tutorial atlanamadı:', error);
        return false;
      }

      // Final reward vermek için
      await supabase.rpc('complete_tutorial_step_reward');
      toast.success('🎉 Tutorial atlandı! Hoşgeldin bonusu aldınız!');
      
      await loadTutorialProgress();
      return true;
    } catch (error) {
      console.error('Tutorial atlanamadı:', error);
      return false;
    }
  };

  const completeTutorial = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase.rpc('update_tutorial_step', {
        new_step: 'completed',
        step_data_update: {}
      });

      if (error) {
        console.error('Tutorial tamamlanamadı:', error);
        return false;
      }

      toast.success('🎉 Tutorial tamamlandı! Oyunun tüm özelliklerine erişiminiz açıldı!');
      
      await loadTutorialProgress();
      
      window.location.reload();
      
      return true;
    } catch (error) {
      console.error('Tutorial tamamlanamadı:', error);
      return false;
    }
  };

  // Auto-advance tutorial based on game state detection
  const checkAndAdvanceTutorial = async () => {
    if (!tutorialProgress || tutorialProgress.tutorial_completed) return;

    // Bu fonksiyon ile otomatik adım geçişi yapılabilir
    // Şu anda manual olarak bırakıyorum ama ileride oyun eventleri ile tetiklenebilir
  };

  return {
    tutorialProgress,
    loading,
    updateTutorialStep,
    skipTutorial,
    completeTutorial,
    checkAndAdvanceTutorial,
    isTutorialActive: tutorialProgress && !tutorialProgress.tutorial_completed,
    currentStep: tutorialProgress?.current_step || 'move_castle'
  };
};
