// app/api/send-notification/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createConfiguration, DefaultApi } from '@onesignal/node-onesignal';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Correct configuration for v5.2.0-beta1
const configuration = createConfiguration({
  restApiKey: process.env.ONESIGNAL_API_KEY!,
  // optionally, for organization-level endpoints:
  // organizationApiKey: process.env.ONESIGNAL_ORG_API_KEY!
});


const onesignalClient = new DefaultApi(configuration);

export async function POST(request: Request) {
  try {
    const { table, record } = await request.json();

    if (table !== 'comments' && table !== 'comment_replies') {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const { user_id, poll_id, comment_id } = record;

    // Fetch target user
    let targetUserId: string | null = null;
    if (table === 'comments') {
      const { data: poll, error } = await supabase
        .from('polls')
        .select('created_by')
        .eq('id', poll_id)
        .single();
      if (error) throw new Error(`Poll fetch error: ${error.message}`);
      targetUserId = poll?.created_by;
    } else if (table === 'comment_replies') {
      const { data: comment, error } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', comment_id)
        .single();
      if (error) throw new Error(`Comment fetch error: ${error.message}`);
      targetUserId = comment?.user_id;
    }

    if (targetUserId && targetUserId !== user_id) {
      // Fetch player IDs
      const { data: subscriptions, error } = await supabase
        .from('user_push_subscriptions')
        .select('player_id')
        .eq('user_id', targetUserId);
      if (error) throw new Error(`Subscription fetch error: ${error.message}`);

      if (subscriptions && subscriptions.length > 0) {
        const playerIds = subscriptions.map((sub) => sub.player_id);
        
        // Create notification payload
        const notification = {
          app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          include_player_ids: playerIds,
          headings: { en: table === 'comments' ? 'New Comment on Your Poll' : 'New Reply to Your Comment' },
          contents: { 
            en: table === 'comments' 
              ? 'Someone commented on your poll!' 
              : 'Someone replied to your comment!' 
          },
          small_icon: 'notification-icon'
        };

        await onesignalClient.createNotification(notification);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}