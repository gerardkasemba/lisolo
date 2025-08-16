'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import PollCard from './PollCard';
import LoadingIndicator from './LoadingIndicator';
import ErrorDisplay from './ErrorDisplay';
import Link from 'next/link';

interface Poll {
  id: number;
  question: string;
  options: { text: string; image_url: string | null }[];
  image_url?: string;
  region: string | null;
  category: string | null;
  created_at: string;
  votes_count: number;
  comments_count: number;
}

interface UserPollsProps {
  userId: string;
}

export default function UserPolls({ userId }: UserPollsProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pollsPerPage = 10;

  const fetchUserPolls = useCallback(async (isInitialLoad = false) => {
    const loadingState = isInitialLoad ? setLoading : setLoadingMore;
    loadingState(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || user.id !== userId) {
        throw new Error('Authentication failed or user ID mismatch');
      }

      const { data: pollsData, error: pollsError, count } = await supabase
        .from('polls')
        .select('*', { count: 'exact' })
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .range(page * pollsPerPage, (page + 1) * pollsPerPage - 1);

      if (pollsError) throw new Error(pollsError.message);

      if (!pollsData || pollsData.length === 0) {
        if (isInitialLoad) setPolls([]);
        setHasMore(false);
        return;
      }

      setHasMore((count || 0) > (page + 1) * pollsPerPage);

      const pollIds = pollsData.map(poll => poll.id);
      const { count: votesCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .in('poll_id', pollIds);

      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .in('poll_id', pollIds);

      const pollsWithCounts = pollsData.map(poll => ({
        ...poll,
        votes_count: votesCount || 0,
        comments_count: commentsCount || 0
      }));

      setPolls(prev => isInitialLoad ? pollsWithCounts : [...prev, ...pollsWithCounts]);

    } catch (error: any) {
      setError(error.message || 'An unknown error occurred');
    } finally {
      loadingState(false);
    }
  }, [userId, page]);

  useEffect(() => {
    fetchUserPolls(true);
  }, [userId]);

  useEffect(() => {
    if (page > 0) fetchUserPolls(false);
  }, [page]);

  useEffect(() => {
    if (!userId || loading) return;

    const pollsChannel = supabase
      .channel('user-polls')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls',
        filter: `created_by=eq.${userId}`
      }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        setPolls(prevPolls => {
          if (eventType === 'INSERT') {
            return [{
              id: newRecord.id,
              question: newRecord.question,
              options: newRecord.options,
              image_url: newRecord.image_url || undefined,
              region: newRecord.region,
              category: newRecord.category,
              created_at: newRecord.created_at,
              votes_count: 0,
              comments_count: 0
            }, ...prevPolls];
          }
          if (eventType === 'UPDATE') {
            return prevPolls.map(poll => 
              poll.id === newRecord.id ? { 
                ...poll,
                question: newRecord.question,
                options: newRecord.options,
                image_url: newRecord.image_url || undefined,
                region: newRecord.region,
                category: newRecord.category
              } : poll
            );
          }
          if (eventType === 'DELETE') {
            return prevPolls.filter(poll => poll.id !== oldRecord.id);
          }
          return prevPolls;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(pollsChannel); };
  }, [userId, loading]);

  if (loading) return <LoadingIndicator message="Loading your polls..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => fetchUserPolls(true)} />;
  if (polls.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
        Your Polls ({polls.length})
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {polls.map((poll) => (
          <PollCard 
            key={poll.id} 
            poll={poll} 
            onDelete={() => handleDeletePoll(poll.id)} 
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );

  async function handleDeletePoll(pollId: number) {
    if (confirm('Are you sure you want to delete this poll?')) {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) setError(error.message);
    }
  }
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-600 dark:text-gray-300">You haven't created any polls yet.</p>
      <Link
        href="/create-poll"
        className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        Create Your First Poll
      </Link>
    </div>
  );
}