// utils/notifications.ts
import { supabase } from '@/lib/supabase';
export async function subscribeToPushNotifications(userId: string) {
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
}

export async function unsubscribeFromPushNotifications(userId: string) {
  const swRegistration = await navigator.serviceWorker.ready;
  const subscription = await swRegistration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('user_id', userId);
  }
}