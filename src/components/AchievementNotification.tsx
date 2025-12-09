import { useEffect, useState } from 'react';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

const AchievementNotificationPopup = ({ achievement, onClose }: AchievementNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
    
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed top-4 right-4 z-50 max-w-sm transition-all duration-300 ${
        isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 p-1">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-amber-400/20 to-yellow-400/30 animate-pulse" />
        
        <div className="relative rounded-lg bg-background/95 backdrop-blur-sm p-4">
          <button 
            onClick={() => { setIsExiting(true); setTimeout(onClose, 300); }}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">
                  Achievement Unlocked!
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-foreground truncate">
                {achievement.name}
              </h3>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {achievement.description}
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500" />
        </div>
      </div>
    </div>
  );
};

export function useAchievementNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`achievement_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const achievementId = (payload.new as { achievement_id: string }).achievement_id;
          
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('id', achievementId)
            .single();

          if (achievement) {
            setNotifications(prev => [...prev, achievement as Achievement]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return { notifications, removeNotification };
}

export const AchievementNotificationContainer = () => {
  const { notifications, removeNotification } = useAchievementNotifications();

  return (
    <>
      {notifications.map((achievement, index) => (
        <div key={achievement.id} style={{ top: `${(index * 120) + 16}px` }} className="fixed right-4 z-50">
          <AchievementNotificationPopup 
            achievement={achievement} 
            onClose={() => removeNotification(achievement.id)} 
          />
        </div>
      ))}
    </>
  );
};

export default AchievementNotificationContainer;
