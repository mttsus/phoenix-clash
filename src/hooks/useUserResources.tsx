
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Resources {
  wood: number;
  gold: number;
  iron: number;
  wheat: number;
  stone: number;
}

export const useUserResources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resources>({
    wood: 0,
    gold: 0,
    iron: 0,
    wheat: 0,
    stone: 0
  });
  const [loading, setLoading] = useState(true);

  // Load user resources from database
  useEffect(() => {
    if (user) {
      loadResources();
    }
  }, [user]);

  const loadResources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_resources')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No resources found, create initial resources
          await createInitialResources();
        } else {
          console.error('Error loading resources:', error);
          toast.error('Kaynaklar yüklenemedi');
        }
      } else if (data) {
        setResources({
          wood: data.wood,
          gold: data.gold,
          iron: data.iron,
          wheat: data.wheat,
          stone: data.stone
        });
      }
    } catch (error) {
      console.error('Error loading resources:', error);
      toast.error('Kaynaklar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const createInitialResources = async () => {
    if (!user) return;

    try {
      const initialResources = {
        user_id: user.id,
        wood: 1000000,
        gold: 1000000,
        iron: 1000000,
        wheat: 1000000,
        stone: 1000000
      };

      const { error } = await supabase
        .from('user_resources')
        .insert(initialResources);

      if (error) {
        console.error('Error creating initial resources:', error);
        toast.error('Başlangıç kaynakları oluşturulamadı');
      } else {
        setResources({
          wood: initialResources.wood,
          gold: initialResources.gold,
          iron: initialResources.iron,
          wheat: initialResources.wheat,
          stone: initialResources.stone
        });
      }
    } catch (error) {
      console.error('Error creating initial resources:', error);
    }
  };

  const updateResources = async (newResources: Partial<Resources>) => {
    if (!user) return false;

    const updatedResources = { ...resources, ...newResources };
    
    // Check if resources would go negative
    if (Object.values(updatedResources).some(value => value < 0)) {
      toast.error('Yeterli kaynağınız yok!');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_resources')
        .update({
          wood: updatedResources.wood,
          gold: updatedResources.gold,
          iron: updatedResources.iron,
          wheat: updatedResources.wheat,
          stone: updatedResources.stone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating resources:', error);
        toast.error('Kaynaklar güncellenemedi');
        return false;
      }

      setResources(updatedResources);
      return true;
    } catch (error) {
      console.error('Error updating resources:', error);
      toast.error('Kaynaklar güncellenemedi');
      return false;
    }
  };

  const canAfford = (cost: number) => {
    return Object.values(resources).every(resource => resource >= cost);
  };

  const spendResources = async (cost: number) => {
    if (!canAfford(cost)) {
      toast.error('Yeterli kaynağınız yok!');
      return false;
    }

    const newResources = {
      wood: resources.wood - cost,
      gold: resources.gold - cost,
      iron: resources.iron - cost,
      wheat: resources.wheat - cost,
      stone: resources.stone - cost
    };

    return await updateResources(newResources);
  };

  return {
    resources,
    loading,
    updateResources,
    canAfford,
    spendResources,
    refreshResources: loadResources
  };
};
