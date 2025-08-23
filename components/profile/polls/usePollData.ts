// components/usePollData.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Poll, Comment, Reply } from '@/types/profiles';
import { usePushNotification } from '../../usePushNotification';

export function usePollData(pollId: number) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<{ [key: string]: number }>({});
  const [userVote, setUserVote] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  
  // Register for push notifications and log errors
  const { playerId, error: pushError } = usePushNotification(currentUserId);
  useEffect(() => {
    if (pushError) {
      console.error('Push notification setup error:', pushError);
    }
    if (playerId) {
      console.log('OneSignal player ID:', playerId);
    }
  }, [pushError, playerId]);

  const buildThreadedComments = (comments: Comment[], replies: Reply[]): Comment[] => {
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
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
        setCurrentUserId(user?.id || null);

        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select(
            `
              id, 
              question, 
              category, 
              region, 
              options, 
              image_url, 
              created_by,
              created_at,
              updated_at
            `
          )
          .eq('id', pollId)
          .single();
        if (pollError) throw new Error(`Poll fetch error: ${pollError.message}`);
        setPoll(pollData);

        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .select('option')
          .eq('poll_id', pollId);
        if (voteError) throw new Error(`Vote fetch error: ${voteError.message}`);
        const voteCounts = voteData.reduce((acc, vote) => {
          acc[vote.option] = (acc[vote.option] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
        setVotes(voteCounts);

        if (user) {
          const { data: userVoteData, error: userVoteError } = await supabase
            .from('votes')
            .select('option')
            .eq('poll_id', pollId)
            .eq('user_id', user.id)
            .single();
          if (userVoteError && userVoteError.code !== 'PGRST116') throw new Error(`User vote fetch error: ${userVoteError.message}`);
          setUserVote(userVoteData?.option || null);
        }

        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select('id, poll_id, content, user_id, created_at')
          .eq('poll_id', pollId)
          .order('created_at', { ascending: false });
        if (commentError) throw new Error(`Comment fetch error: ${commentError.message}`);

        const { data: replyData, error: replyError } = await supabase
          .from('comment_replies')
          .select('id, comment_id, content, user_id, created_at, parent_reply_id')
          .in('comment_id', commentData?.map((c) => c.id) || [])
          .order('created_at', { ascending: false });
        if (replyError) throw new Error(`Reply fetch error: ${replyError.message}`);

        setComments(buildThreadedComments(commentData || [], replyData || []));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue');
      } finally {
        setLoading(false);
      }
    };

    const voteChannel = supabase.channel(`votes:${pollId}`);
    voteChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `poll_id=eq.${pollId}` }, (payload) => {
        setVotes((prev) => ({
          ...prev,
          [payload.new.option]: (prev[payload.new.option] || 0) + 1,
        }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'votes', filter: `poll_id=eq.${pollId}` }, (payload) => {
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
      })
      .subscribe();

    const commentChannel = supabase.channel(`comments:${pollId}`);
    commentChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `poll_id=eq.${pollId}` }, (payload) => {
        setComments((prev) => buildThreadedComments([...prev, payload.new as Comment], []));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `poll_id=eq.${pollId}` }, (payload) => {
        setComments((prev) => prev.map((comment) =>
          comment.id === payload.new.id ? { ...comment, content: payload.new.content } : comment
        ));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `poll_id=eq.${pollId}` }, (payload) => {
        setComments((prev) => prev.filter((comment) => comment.id !== payload.old.id));
      })
      .subscribe();

    const replyChannel = supabase.channel(`comment_replies:${pollId}`);
    replyChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_replies', filter: `comment_id=in.(${comments.map(c => c.id).join(',') || '0'})` }, (payload) => {
        const newReply = payload.new as Reply;
        setComments((prev) => {
          const updatedComments = prev.map((comment) => {
            if (comment.id === newReply.comment_id) {
              return { ...comment, children: [...(comment.children || []), newReply] };
            }
            return comment;
          });
          return updatedComments;
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comment_replies' }, (payload) => {
        setComments((prev) => prev.map((comment) => ({
          ...comment,
          children: (comment.children || []).map((reply) =>
            reply.id === payload.new.id ? { ...reply, content: payload.new.content } : reply
          ),
        })));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comment_replies' }, (payload) => {
        setComments((prev) => prev.map((comment) => ({
          ...comment,
          children: (comment.children || []).filter((reply) => reply.id !== payload.old.id),
        })));
      })
      .subscribe();

    fetchData();

    return () => {
      supabase.removeChannel(voteChannel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(replyChannel);
    };
  }, [pollId, comments]);

  return { 
    poll, 
    votes, 
    userVote, 
    setUserVote, 
    comments, 
    loading, 
    error, 
    isAuthenticated, 
    currentUserId
  };
}