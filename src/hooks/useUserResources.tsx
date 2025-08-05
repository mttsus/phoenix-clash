
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserResources {
  id: string;
  user_id: string;
  wood: number;
  gold: number;
  iron: number;
  wheat: number;
  stone: number;
  created_at: string;
  updated_at: string;
}

export const useUserResources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<UserResources | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('user_resources')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching resources:', error);
        return;
      }

      setResources(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateResources = async (updates: Partial<Pick<UserResources, 'wood' | 'gold' | 'iron' | 'wheat' | 'stone'>>) => {
    if (!user || !resources) return false;

    try {
      const { data, error } = await supabase
        .from('user_resources')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating resources:', error);
        toast.error('Kaynak güncellenirken hata oluştu');
        return false;
      }

      setResources(data);
      return true;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Bir hata oluştu');
      return false;
    }
  };

  const spendResources = async (cost: { wood?: number; gold?: number; iron?: number; wheat?: number; stone?: number }) => {
    if (!resources) return false;

    const newResources = {
      wood: resources.wood - (cost.wood || 0),
      gold: resources.gold - (cost.gold || 0),
      iron: resources.iron - (cost.iron || 0),
      wheat: resources.wheat - (cost.wheat || 0),
      stone: resources.stone - (cost.stone || 0),
    };

    // Check if user has enough resources
    if (newResources.wood < 0 || newResources.gold < 0 || newResources.iron < 0 || 
        newResources.wheat < 0 || newResources.stone < 0) {
      toast.error('Yetersiz kaynak!');
      return false;
    }

    return await updateResources(newResources);
  };

  const addResources = async (addition: { wood?: number; gold?: number; iron?: number; wheat?: number; stone?: number }) => {
    if (!resources) return false;

    const newResources = {
      wood: resources.wood + (addition.wood || 0),
      gold: resources.gold + (addition.gold || 0),
      iron: resources.iron + (addition.iron || 0),
      wheat: resources.wheat + (addition.wheat || 0),
      stone: resources.stone + (addition.stone || 0),
    };

    return await updateResources(newResources);
  };

  return {
    resources,
    loading,
    updateResources,
    spendResources,
    addResources,
    refetch: fetchResources
  };
};
