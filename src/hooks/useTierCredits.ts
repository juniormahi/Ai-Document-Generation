import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ToolCategory = 
  | 'images_generated'
  | 'videos_generated'
  | 'chat_messages'
  | 'voiceovers_generated'
  | 'documents_generated'
  | 'presentations_generated'
  | 'spreadsheets_generated'
  | 'books_generated';

export type UserTier = 'free' | 'standard' | 'premium';

// Define limits per tier for each tool
const TIER_LIMITS: Record<ToolCategory, Record<UserTier, number>> = {
  images_generated: { free: 10, standard: 50, premium: 100 },
  videos_generated: { free: 2, standard: 10, premium: 30 },
  chat_messages: { free: 50, standard: 200, premium: 999 }, // 999 = effectively unlimited
  voiceovers_generated: { free: 5, standard: 25, premium: 100 },
  documents_generated: { free: 5, standard: 25, premium: 100 },
  presentations_generated: { free: 3, standard: 15, premium: 50 },
  spreadsheets_generated: { free: 5, standard: 25, premium: 100 },
  books_generated: { free: 2, standard: 10, premium: 30 },
};

// Calculate credits based on content size
export function calculateCredits(type: 'document' | 'presentation' | 'book', size: number): number {
  // Small: 1 credit, Medium: 2 credits, Large: 3-5 credits
  if (type === 'presentation') {
    if (size <= 5) return 1;
    if (size <= 10) return 2;
    if (size <= 15) return 3;
    if (size <= 20) return 4;
    return 5; // 20+ slides
  }
  if (type === 'document') {
    // Based on word count or sections
    if (size <= 500) return 1;
    if (size <= 1500) return 2;
    if (size <= 3000) return 3;
    if (size <= 5000) return 4;
    return 5; // 5000+ words
  }
  if (type === 'book') {
    // Books always cost more due to image generation
    if (size <= 5) return 3; // 5 pages
    if (size <= 10) return 5; // 10 pages
    return 7; // 10+ pages
  }
  return 1;
}

interface UseTierCreditsResult {
  tier: UserTier;
  isPremium: boolean;
  isStandard: boolean;
  creditLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  loading: boolean;
  refetch: () => Promise<void>;
  getUpgradeMessage: () => string;
  checkAndNotify: (newUsage: number) => Promise<void>;
}

export function useTierCredits(category: ToolCategory): UseTierCreditsResult {
  const { user } = useAuth();
  const [tier, setTier] = useState<UserTier>('free');
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async (checkNotification = false) => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Get user role using security definer function to bypass RLS
      const { data: roleData } = await supabase
        .rpc('get_user_role', { _user_id: user.uid });

      const userTier = (roleData as UserTier) || 'free';
      setTier(userTier);

      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select(category)
        .eq('user_id', user.uid)
        .eq('date', today)
        .maybeSingle();

      const newUsage = usageData?.[category] || 0;
      const prevUsage = creditsUsed;
      setCreditsUsed(newUsage);

      // Check if we should send 80% notification
      if (checkNotification && newUsage > prevUsage && user.email) {
        const limit = TIER_LIMITS[category][userTier];
        if (limit > 0 && limit !== 999) {
          const threshold80 = Math.floor(limit * 0.8);
          if (newUsage === threshold80) {
            // Send notification in background
            supabase.functions.invoke('notify-credit-limit', {
              body: {
                userId: user.uid,
                email: user.email,
                category,
                currentUsage: newUsage,
              },
            }).catch(err => console.error('Notification error:', err));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tier credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits(false); // Initial fetch without notification check
  }, [user?.uid, category]);

  const creditLimit = TIER_LIMITS[category][tier];
  const creditsRemaining = Math.max(0, creditLimit - creditsUsed);
  const isPremium = tier === 'premium';
  const isStandard = tier === 'standard';

  const getUpgradeMessage = (): string => {
    const standardLimit = TIER_LIMITS[category].standard;
    const premiumLimit = TIER_LIMITS[category].premium;
    
    if (tier === 'free') {
      return `Upgrade for ${standardLimit}/day`;
    } else if (tier === 'standard') {
      return `Upgrade to Premium for ${premiumLimit}/day`;
    }
    return '';
  };

  // Check if usage hit 80% threshold and send notification
  const checkAndNotify = async (newUsage: number) => {
    if (!user?.uid || !user?.email) return;
    
    const limit = TIER_LIMITS[category][tier];
    if (limit === 0 || limit === 999) return; // Skip unlimited
    
    const threshold80 = Math.floor(limit * 0.8);
    
    // Only notify when exactly hitting 80%
    if (newUsage === threshold80) {
      try {
        await supabase.functions.invoke('notify-credit-limit', {
          body: {
            userId: user.uid,
            email: user.email,
            category,
            currentUsage: newUsage,
          },
        });
        console.log('80% credit notification sent for', category);
      } catch (error) {
        console.error('Failed to send credit notification:', error);
      }
    }
  };

  return {
    tier,
    isPremium,
    isStandard,
    creditLimit,
    creditsUsed,
    creditsRemaining,
    loading,
    refetch: () => fetchCredits(true), // Refetch with notification check
    getUpgradeMessage,
    checkAndNotify,
  };
}

// Export limits for reference
export { TIER_LIMITS };
