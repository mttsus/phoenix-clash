
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'move_castle',
    title: 'Kaleyi Taşı',
    description: 'Haritadaki boş bir alana tıklayarak kalenizi taşıyın',
    reward: 100000,
    completed: false
  },
  {
    id: 'enter_castle',
    title: 'Kaleye Gir',
    description: 'Kalenize tıklayarak kale içi ekranını açın',
    reward: 100000,
    completed: false
  },
  {
    id: 'start_construction',
    title: 'İnşaat Başlat',
    description: 'Kale içinde bir bina inşaatı başlatın',
    reward: 100000,
    completed: false
  },
  {
    id: 'wait_construction',
    title: 'İnşaatı Bekle',
    description: 'İnşaatın tamamlanmasını bekleyin (1 dakika)',
    reward: 100000,
    completed: false
  },
  {
    id: 'upgrade_building',
    title: 'Bina Geliştir',
    description: 'Tamamlanan binayı bir seviye yükseltin',
    reward: 100000,
    completed: false
  },
  {
    id: 'produce_army',
    title: 'Asker Üret',
    description: '6 farklı asker türünden üretim yaparak toplam 1000 asker elde edin',
    reward: 100000,
    completed: false
  },
  {
    id: 'battle_enemy',
    title: 'Savaş Başlat',
    description: 'Haritadaki bir düşman kalesine saldırarak savaş başlatın',
    reward: 100000,
    completed: false
  }
];

export const useTutorial = () => {
  const { user } = useAuth();
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>(TUTORIAL_STEPS);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [tutorialActive, setTutorialActive] = useState(false);
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

      if (error && error.code !== 'PGRST116') {
        console.error('Tutorial progress load error:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        // İlk kez giren kullanıcı - eğitimi başlat
        await initializeTutorial();
      } else {
        // Mevcut ilerlemeyi yükle
        const completedSteps = data.completed_steps || [];
        const updatedSteps = TUTORIAL_STEPS.map(step => ({
          ...step,
          completed: completedSteps.includes(step.id)
        }));
        
        setTutorialSteps(updatedSteps);
        
        const nextStep = updatedSteps.find(step => !step.completed);
        if (nextStep && !data.tutorial_completed) {
          setCurrentStep(nextStep);
          setTutorialActive(true);
        } else {
          setTutorialActive(false);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setLoading(false);
    }
  };

  const initializeTutorial = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .insert({
          user_id: user.id,
          completed_steps: [],
          tutorial_completed: false,
          current_step: TUTORIAL_STEPS[0].id
        });

      if (error) {
        console.error('Tutorial initialization error:', error);
        return;
      }

      setCurrentStep(TUTORIAL_STEPS[0]);
      setTutorialActive(true);
      toast.success('Hoşgeldiniz! Eğitim görevleri başladı.');
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const completeStep = async (stepId: string) => {
    if (!user || !currentStep || currentStep.id !== stepId) return false;

    try {
      // Adımı tamamlandı olarak işaretle
      const updatedSteps = tutorialSteps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      );
      setTutorialSteps(updatedSteps);

      // Ödül ver
      const { error: rewardError } = await supabase.rpc('add_tutorial_reward', {
        reward_amount: currentStep.reward
      });

      if (rewardError) {
        console.error('Reward error:', rewardError);
      }

      // Veritabanını güncelle
      const completedSteps = updatedSteps.filter(s => s.completed).map(s => s.id);
      const nextStep = updatedSteps.find(step => !step.completed);
      
      const { error } = await supabase
        .from('user_tutorial_progress')
        .update({
          completed_steps: completedSteps,
          current_step: nextStep?.id || null,
          tutorial_completed: !nextStep
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Tutorial progress update error:', error);
        return false;
      }

      // Sonraki adıma geç
      if (nextStep) {
        setCurrentStep(nextStep);
        toast.success(`✅ Görev tamamlandı! +${currentStep.reward.toLocaleString()} kaynak kazandınız!`);
        toast.info(`📋 Yeni görev: ${nextStep.title}`);
      } else {
        setTutorialActive(false);
        setCurrentStep(null);
        toast.success('🎉 Tüm eğitim görevleri tamamlandı! Artık oyunu özgürce oynayabilirsiniz.');
      }

      return true;
    } catch (err) {
      console.error('Unexpected error:', err);
      return false;
    }
  };

  const skipTutorial = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_tutorial_progress')
        .update({
          tutorial_completed: true,
          current_step: null
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Tutorial skip error:', error);
        return;
      }

      setTutorialActive(false);
      setCurrentStep(null);
      toast.info('Eğitim görevleri atlandı.');
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  return {
    tutorialSteps,
    currentStep,
    tutorialActive,
    loading,
    completeStep,
    skipTutorial
  };
};
