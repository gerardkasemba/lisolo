import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Poll, Comment, Reply } from '@/types/profiles';
import { usePushNotification } from '../../usePushNotification';
import { messaging } from '@/lib/firebase';

// ... other imports and types remain unchanged

export function usePollData(pollId: number) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<{ [key: string]: number }>({});
  const [userVote, setUserVote] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({
    votes: 'connecting',
    comments: 'connecting',
    replies: 'connecting',
  });

  // Push notifications setup (unchanged)
  const { playerId, error: pushError } = usePushNotification(currentUserId);
  useEffect(() => {
    if (pushError) console.error('Push notification error:', pushError);
    if (playerId) console.log('OneSignal player ID:', playerId);
  }, [pushError, playerId]);

    // Firebase push notification subscription
  const subscribeToPush = useCallback(async () => {
    if (!messaging || typeof window === 'undefined') {
      console.warn('Push notifications not supported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BiCZdjm2QZQMowHhVl7T3cp6Dcvhu9txwR-3kB8MOBw', // Replace with your VAPID public key
        });

        // Send subscription to API route
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            userId: currentUserId,
            region: poll?.region,
          }),
        });
        if (!response.ok) throw new Error('Failed to save subscription');
        console.log('Subscribed to push notifications');
      } else {
        console.warn('Notification permission denied');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
  }, [currentUserId, poll?.region]);

  // Trigger subscription when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      subscribeToPush();
    }
  }, [isAuthenticated, currentUserId, subscribeToPush]);

  // Memoized comment thread builder (unchanged)
  const buildThreadedComments = useCallback((comments: Comment[], replies: Reply[]): Comment[] => {
    const replyMap = new Map<number, Reply[]>();
    replies.forEach((reply) => {
      const commentReplies = replyMap.get(reply.comment_id) || [];
      commentReplies.push(reply);
      replyMap.set(reply.comment_id, commentReplies);
    });
    return comments.map((comment) => ({
      ...comment,
      children: replyMap.get(comment.id) || [],
    }));
  }, []);

  // Realtime subscription with retry logic
  const setupRealtimeSubscription = useCallback(
    (channelName: string, config: any, onPayload?: (payload: any) => void) => {
      let retryCount = 0;
      const maxRetries = 5;
      let channel: any;

      const connect = () => {
        channel = supabase
          .channel(channelName)
          .on('postgres_changes', config, (payload) => {
            if (onPayload) onPayload(payload); // Call the callback
          })
          .subscribe((status, err) => {
            // Update connection status based on subscription status
            setConnectionStatus((prev) => ({
              ...prev,
              [channelName]: status.toLowerCase(),
            }));

            if (status === 'SUBSCRIBED') {
              console.log(`${channelName} channel subscribed`);
              retryCount = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error(`${channelName} channel status: ${status}`, err || '');
              if (retryCount < maxRetries) {
                retryCount++;
                const delay = Math.min(1000 * 2 ** retryCount, 30000); // Exponential backoff
                setTimeout(connect, delay);
              }
            }
          });
      };

      connect();

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
          setConnectionStatus((prev) => ({
            ...prev,
            [channelName]: 'disconnected',
          }));
        }
      };
    },
    []
  );

  // Initial data fetch (unchanged)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check auth status
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setCurrentUserId(user?.id || null);

      // Fetch poll data
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('id, question, category, region, options, image_url, created_by, created_at, updated_at')
        .eq('id', pollId)
        .single();
      if (pollError) throw pollError;
      setPoll(pollData);

      // Fetch votes
      const { data: voteData, error: voteError } = await supabase
        .from('votes')
        .select('option')
        .eq('poll_id', pollId);
      if (voteError) throw voteError;
      const voteCounts = voteData.reduce((acc, vote) => {
        acc[vote.option] = (acc[vote.option] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      setVotes(voteCounts);

      // Fetch user vote if authenticated
      if (user) {
        const { data: userVoteData, error: userVoteError } = await supabase
          .from('votes')
          .select('option')
          .eq('poll_id', pollId)
          .eq('user_id', user.id)
          .single();
        if (userVoteError && userVoteError.code !== 'PGRST116') throw userVoteError;
        setUserVote(userVoteData?.option || null);
      }

      // Fetch comments and replies
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('id, poll_id, content, user_id, created_at')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: false });
      if (commentError) throw commentError;

      const { data: replyData, error: replyError } = await supabase
        .from('comment_replies')
        .select('id, comment_id, content, user_id, created_at, parent_reply_id')
        .in('comment_id', commentData?.map((c) => c.id) || [])
        .order('created_at', { ascending: false });
      if (replyError) throw replyError;

      setComments(buildThreadedComments(commentData || [], replyData || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [pollId, buildThreadedComments]);

  useEffect(() => {
    fetchData();

    // Setup realtime subscriptions
    const cleanups = [
      setupRealtimeSubscription(`votes:${pollId}`, {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`,
      }, (payload) => {
        setVotes((prev) => ({
          ...prev,
          [payload.new.option]: (prev[payload.new.option] || 0) + 1,
        }));
      }),

      setupRealtimeSubscription(`votes:${pollId}:delete`, {
        event: 'DELETE',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`,
      }, (payload) => {
        setVotes((prev) => {
          const newVotes = { ...prev };
          if (payload.old.option in newVotes) {
            newVotes[payload.old.option] = Math.max((newVotes[payload.old.option] || 0) - 1, 0);
          }
          return newVotes;
        });
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user && payload.old.user_id === user.id) {
            setUserVote(null);
          }
        });
      }),

      setupRealtimeSubscription(`comments:${pollId}`, {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `poll_id=eq.${pollId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComments((prev) => buildThreadedComments([...prev, payload.new as Comment], []));
        } else if (payload.eventType === 'UPDATE') {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === payload.new.id ? { ...comment, content: payload.new.content } : comment
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setComments((prev) => prev.filter((comment) => comment.id !== payload.old.id));
        }
      }),

      setupRealtimeSubscription(`replies:${pollId}`, {
        event: '*',
        schema: 'public',
        table: 'comment_replies',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReply = payload.new as Reply;
          setComments((prev) =>
            prev.map((comment) => {
              if (comment.id === newReply.comment_id) {
                return { ...comment, children: [...(comment.children || []), newReply] };
              }
              return comment;
            })
          );
        } else if (payload.eventType === 'UPDATE') {
          setComments((prev) =>
            prev.map((comment) => ({
              ...comment,
              children: (comment.children || []).map((reply) =>
                reply.id === payload.new.id ? { ...reply, content: payload.new.content } : reply
              ),
            }))
          );
        } else if (payload.eventType === 'DELETE') {
          setComments((prev) =>
            prev.map((comment) => ({
              ...comment,
              children: (comment.children || []).filter((reply) => reply.id !== payload.old.id),
            }))
          );
        }
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pollId, fetchData, buildThreadedComments, setupRealtimeSubscription]);

  return {
    poll,
    votes,
    userVote,
    setUserVote,
    comments,
    loading,
    error,
    isAuthenticated,
    currentUserId,
    connectionStatus,
  };
}