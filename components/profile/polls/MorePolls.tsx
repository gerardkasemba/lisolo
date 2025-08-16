'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { FaVoteYea, FaComment, FaChartBar } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PollOption {
  text: string;
  image_url?: string;
  id?: number;
}

interface Poll {
  id: number;
  question: string;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at?: string;
  region: string | null;
  created_by: string | null;
  options: PollOption[];
}

interface Vote {
  option: string;
}

interface PollWithStats extends Poll {
  total_votes: number;
  comment_count: number;
  options: {
    id?: number; // Make id optional
    text: string;
    image_url?: string;
    votes: number;
    percentage: number;
  }[];
  created_at: string;
  updated_at?: string;
}

interface MorePollsProps {
  currentPollId: number;
  category: string | null;
}

export default function MorePolls({ currentPollId, category }: MorePollsProps) {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const fetchPolls = useCallback(async () => {
    if (!category) {
      setLoading(false);
      setError('Aucune catégorie spécifiée');
      return;
    }

    try {
      setLoading(true);
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(
          `
            id,
            question,
            category,
            image_url,
            created_at,
            updated_at,
            region,
            created_by,
            options,
            votes (count),
            comments (count)
          `
        )
        .eq('category', category)
        .neq('id', currentPollId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (pollsError) {
        throw new Error(pollsError.message);
      }

      const pollsWithOptions = await Promise.all(
        pollsData.map(async (poll: Poll & { votes: { count: number }[]; comments: { count: number }[] }) => {
          const { data: votesData } = await supabase
            .from('votes')
            .select('option')
            .eq('poll_id', poll.id);

          const voteCounts = votesData?.reduce((acc: Record<string, number>, vote: Vote) => {
            acc[vote.option] = (acc[vote.option] || 0) + 1;
            return acc;
          }, {}) || {};

          const totalVotes = poll.votes[0]?.count || 0;

          const optionsWithVotes = poll.options.map((option: PollOption) => ({
            ...option,
            votes: voteCounts[option.text] || 0,
            percentage: totalVotes > 0 ? Math.round(((voteCounts[option.text] || 0) / totalVotes) * 100) : 0,
          }));

          return {
            ...poll,
            options: optionsWithVotes,
            total_votes: totalVotes,
            comment_count: poll.comments?.[0]?.count || 0,
          };
        })
      );

      setPolls(pollsWithOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la récupération des sondages');
    } finally {
      setLoading(false);
    }
  }, [category, currentPollId, supabase]);

  useEffect(() => {
    fetchPolls();

    if (!category) return;

    const subscription = supabase
      .channel(`polls:category=${category}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'polls',
          filter: `category=eq.${category}`,
        },
        async (payload) => {
          if (payload.new.id !== currentPollId) {
            const { data: votesData } = await supabase
              .from('votes')
              .select('option')
              .eq('poll_id', payload.new.id);

            const { data: commentData } = await supabase
              .from('comments')
              .select('count')
              .eq('poll_id', payload.new.id);

            const voteCounts = votesData?.reduce((acc: Record<string, number>, vote: Vote) => {
              acc[vote.option] = (acc[vote.option] || 0) + 1;
              return acc;
            }, {}) || {};

            const totalVotes = votesData?.length || 0;

            const optionsWithVotes = payload.new.options.map((option: PollOption) => ({
              ...option,
              votes: voteCounts[option.text] || 0,
              percentage: totalVotes > 0 ? Math.round(((voteCounts[option.text] || 0) / totalVotes) * 100) : 0,
            }));

            setPolls((prev) => [
              {
                ...payload.new,
                options: optionsWithVotes,
                total_votes: totalVotes,
                comment_count: commentData?.[0]?.count || 0,
                updated_at: payload.new.updated_at || new Date().toISOString(),
              } as PollWithStats,
              ...prev.slice(0, 9),
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          setPolls((prev) => {
            const pollIndex = prev.findIndex((p) => p.id === payload.new.poll_id);
            if (pollIndex === -1 || payload.new.poll_id === currentPollId) {
              return prev;
            }

            return prev.map((poll, index) => {
              if (index !== pollIndex) return poll;

              const optionIndex = poll.options.findIndex((o) => o.text === payload.new.option);
              if (optionIndex === -1) return poll;

              const newOptions = [...poll.options];
              newOptions[optionIndex] = {
                ...newOptions[optionIndex],
                votes: newOptions[optionIndex].votes + 1,
              };

              const totalVotes = poll.total_votes + 1;

              const updatedOptions = newOptions.map((option) => ({
                ...option,
                percentage: Math.round((option.votes / totalVotes) * 100),
              }));

              return {
                ...poll,
                options: updatedOptions,
                total_votes: totalVotes,
              };
            });
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          setPolls((prev) => {
            const pollIndex = prev.findIndex((p) => p.id === payload.new.poll_id);
            if (pollIndex === -1 || payload.new.poll_id === currentPollId) {
              return prev;
            }

            return prev.map((poll, index) => {
              if (index !== pollIndex) return poll;
              return {
                ...poll,
                comment_count: poll.comment_count + 1,
              };
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [category, currentPollId, fetchPolls, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-2 text-gray-700 dark:text-gray-300">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-700 dark:text-red-300 text-sm">Erreur : {error}</div>
    );
  }

  if (!polls.length) {
    return (
      <div className="text-gray-600 dark:text-gray-300 text-sm">
        Aucun autre sondage dans cette catégorie.
      </div>
    );
  }

  return (
<div className="space-y-6">
  {polls.map((poll) => (
    <div
      key={poll.id}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg"
    >
      <div className="p-5 flex gap-4">
        {/* Image container - top left */}
        {poll.image_url && (
          <div className="flex-shrink-0 w-24 h-24 relative rounded-lg overflow-hidden">
            <img
              src={poll.image_url}
              alt={poll.question}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        
        {/* Content container */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3 gap-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white line-clamp-2">
              {poll.question}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 flex-shrink-0">
              {poll.category || 'Sans catégorie'}
            </span>
          </div>
          
          <div className="mb-4 space-y-3">
            {poll.options.map((option) => (
              <div key={`${option.id}-${option.text}`} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                    {option.text}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    {option.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${option.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-4">
              <div className="flex items-center">
                <FaVoteYea className="mr-1" />
                <span>{poll.total_votes} votes</span>
              </div>
              <div className="flex items-center">
                <FaComment className="mr-1" />
                <span>{poll.comment_count} commentaires</span>
              </div>
            </div>
            <div className="flex items-center">
              <IoMdTime className="mr-1" />
              <span>
                {formatDistanceToNow(new Date(poll.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>
          
          <Link
            href={`/polls/${poll.id}`}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <FaChartBar className="mr-2" />
            Voir les résultats
          </Link>
        </div>
      </div>
    </div>
  ))}
  
  {category && (
    <div className="mt-6 text-center">
      <Link
        href={`/category/${encodeURIComponent(category)}`}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        Découvrir plus dans cette catégorie →
      </Link>
    </div>
  )}
</div>
  );
}