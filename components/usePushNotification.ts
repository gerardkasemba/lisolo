// components/usePushNotification.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UsePushNotificationReturn {
  playerId: string | null;
  error: string | null;
}

export function usePushNotification(userId: string | null): UsePushNotificationReturn {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping push notification registration');
      return;
    }
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const OneSignal = (window as any).OneSignal || [];
      OneSignal.push(function () {
        OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: true },
        });

        // Listen for subscription changes
        OneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
          console.log('Subscription state changed:', isSubscribed);
          if (isSubscribed) {
            try {
              const id = await OneSignal.getUserId();
              if (!id) {
                setError('Failed to obtain OneSignal player ID');
                return;
              }
              setPlayerId(id);
              console.log('OneSignal player ID:', id);

              // Save to Supabase
              const { error: dbError } = await supabase
                .from('user_push_subscriptions')
                .upsert({ user_id: userId, player_id: id });

              if (dbError) {
                setError(dbError.message);
                console.error('Supabase error:', dbError.message);
              }
            } catch (err) {
              console.error('Error getting player ID:', err);
              setError(String(err));
            }
          }
        });

        // Ask for permission right away if not enabled
        OneSignal.isPushNotificationsEnabled().then((enabled: boolean) => {
          if (!enabled) {
            console.log('Requesting push permission...');
            OneSignal.registerForPushNotifications();
          }
        });
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [userId]);

  return { playerId, error };
}
