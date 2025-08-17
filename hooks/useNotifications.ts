// hooks/useNotifications.ts
"use client"
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useNotifications(userId: string) {
  const subscribeToPushNotifications = async (userId: string) => {
    if (!('serviceWorker' in navigator)) return null;
    
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });

    // Store subscription in Supabase
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: userId,
        subscription: JSON.stringify(subscription),
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return subscription;
  };

  useEffect(() => {
    if (!('Notification' in window) || !userId) return;

    const requestPermission = async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPushNotifications(userId);
      }
    };

    requestPermission();

    // Rest of your existing code...
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(
                payload.new.type === 'comment' 
                  ? 'Nouveau commentaire en réponse au vôtre' 
                  : 'Quelqu\'un a répondu à votre commentaire',
                {
                  body: 'You have a new interaction',
                  icon: '/iweb-app-manifest-192x192.png',
                  data: { url: `/polls/${payload.new.poll_id}` }
                }
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}