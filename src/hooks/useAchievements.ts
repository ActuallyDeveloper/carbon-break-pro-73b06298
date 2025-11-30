import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  requirement_type: string;
  requirement_value: number;
  reward_item_id: string | null;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  achievement: Achievement;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    fetchAchievements();

    // Real-time subscription for achievement updates
    const channel = supabase
      .channel(`achievements_updates:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achError } = await supabase
        .from('achievements')
        .select('*');

      if (achError) throw achError;

      // Fetch user's achievements with progress
      const { data: userAchs, error: userError } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', user.id);

      if (userError) throw userError;

      setAchievements(allAchievements || []);
      setUserAchievements(userAchs || []);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (requirementType: string, value: number) => {
    if (!user) return;

    try {
      // First update user_stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!stats) {
        await supabase.from('user_stats').insert({ user_id: user.id });
      }

      const updateData: any = {};
      updateData[requirementType] = (stats?.[requirementType] || 0) + value;

      await supabase
        .from('user_stats')
        .upsert({ user_id: user.id, ...updateData });

      // Check for achievements to unlock
      const relevantAchievements = achievements.filter(
        (ach) => ach.requirement_type === requirementType
      );

      for (const achievement of relevantAchievements) {
        const userAch = userAchievements.find(
          (ua) => ua.achievement_id === achievement.id
        );

        const currentProgress = updateData[requirementType];

        if (!userAch && currentProgress >= achievement.requirement_value) {
          // Unlock achievement
          const { error } = await supabase.from('user_achievements').insert({
            user_id: user.id,
            achievement_id: achievement.id,
            progress: currentProgress,
          });

          if (!error) {
            toast.success(`🎉 Achievement Unlocked: ${achievement.name}!`);
            
            // Award item if there's a reward
            if (achievement.reward_item_id) {
              await supabase.from('user_inventory').insert({
                user_id: user.id,
                item_id: achievement.reward_item_id,
              });
              toast.success('Reward item added to inventory!');
            }
          }
        } else if (userAch && userAch.progress < currentProgress) {
          // Update progress
          await supabase
            .from('user_achievements')
            .update({ progress: currentProgress })
            .eq('id', userAch.id);
        }
      }
    } catch (error: any) {
      console.error('Error updating progress:', error);
    }
  };

  return {
    achievements,
    userAchievements,
    loading,
    updateProgress,
    refetch: fetchAchievements,
  };
};
