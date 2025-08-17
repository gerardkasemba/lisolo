'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaComment, FaArrowRight, FaExclamationTriangle, FaUser } from 'react-icons/fa';
import Image from 'next/image';

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

interface Poll {
  id: number;
  question: string;
  category?: string | null;
  region?: string | null;
}

interface Comment {
  id: number;
  poll_id: number;
  user_id: string;
  content: string;
  created_at: string;
  user?: AuthUser;
  poll?: Poll;
}

const getLocalData = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

const setLocalData = <T,>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

export default function RecentCommentsSection() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [channel, setChannel] = useState<any>(null);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, user_metadata')
        .eq('id', userId)
        .single();
      return data || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }, []);

  const fetchPollData = useCallback(async (pollId: number) => {
    try {
      const { data } = await supabase
        .from('polls')
        .select('id, question, category, region')
        .eq('id', pollId)
        .single();
      return data || null;
    } catch (error) {
      console.error('Error fetching poll:', error);
      return null;
    }
  }, []);

  const fetchAndCombineComments = useCallback(async (commentData: Comment[]) => {
    const combinedComments: Comment[] = [];
    
    for (const comment of commentData) {
      const [user, poll] = await Promise.all([
        fetchUserData(comment.user_id),
        fetchPollData(comment.poll_id)
      ]);
      
      combinedComments.push({
        ...comment,
        user: user || undefined,
        poll: poll || undefined
      });
    }
    
    return combinedComments;
  }, [fetchUserData, fetchPollData]);

  const initializeComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached comments first
      const cachedComments = getLocalData<Comment[]>('recentComments');
      if (cachedComments) {
        setComments(cachedComments);
      }

      // Only fetch from server if online
      if (!isOffline) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, poll_id, user_id, content, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (commentsError) throw commentsError;
        if (!commentsData || commentsData.length === 0) {
          setComments([]);
          setLocalData('recentComments', []);
          return;
        }

        const combinedData = await fetchAndCombineComments(commentsData);
        setComments(combinedData);
        setLocalData('recentComments', combinedData);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // If we have cached comments but fetch failed, use those
      const cachedComments = getLocalData<Comment[]>('recentComments');
      if (cachedComments) {
        setComments(cachedComments);
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline, fetchAndCombineComments]);

  // Initialize comments and realtime subscription
  useEffect(() => {
    initializeComments();

    // Only setup realtime if online
    if (isOffline) return;

    const commentsChannel = supabase
      .channel('recent-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        async (payload) => {
          try {
            const newComment = payload.new as Comment;
            const [user, poll] = await Promise.all([
              fetchUserData(newComment.user_id),
              fetchPollData(newComment.poll_id)
            ]);

            const enrichedComment = {
              ...newComment,
              user: user || undefined,
              poll: poll || undefined
            };

            setComments(prev => {
              const updated = [enrichedComment, ...prev.slice(0, 9)]; // Keep only 10 most recent
              setLocalData('recentComments', updated);
              return updated;
            });
          } catch (error) {
            console.error('Error handling new comment:', error);
          }
        }
      )
      .subscribe();

    setChannel(commentsChannel);

    return () => {
      if (commentsChannel) {
        supabase.removeChannel(commentsChannel);
      }
    };
  }, [initializeComments, isOffline, fetchUserData, fetchPollData]);

  // Handle online/offline changes
  useEffect(() => {
    if (!isOffline && channel === null) {
      // Re-initialize if we come back online
      initializeComments();
    }
  }, [isOffline, channel, initializeComments]);

  if (loading) {
    return (
      <div className="text-center py-8 flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
        <span>Loading comments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <div className="flex flex-col items-center text-red-600 dark:text-red-300">
          <FaExclamationTriangle className="text-2xl mb-2" />
          <h4 className="font-medium">Error loading comments</h4>
          <p className="text-sm mt-2 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-xl md:text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
          <FaComment className="mr-2 text-indigo-500" /> Commentaires récents
        </h3>
        
        {isOffline && (
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
            <p className="text-yellow-700 dark:text-yellow-300">
              You're offline. Showing cached comments. New comments will appear when you're back online.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No comments found</p>
              <Link href="/create-poll" className="mt-3 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Be the first to comment
              </Link>
            </div>
          ) : (
            comments.map((comment) => {
              const userName = comment.user?.user_metadata?.name || 
                            comment.user?.email?.split('@')[0] || 
                            'Anonymous';
              const avatarUrl = comment.user?.user_metadata?.avatar_url;

              return (
                <div 
                  key={comment.id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={`${userName}'s avatar`}
                          width={40}
                          height={40}
                          className="rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <FaUser className="text-indigo-600 dark:text-indigo-300" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {comment.poll?.category && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                            {comment.poll.category}
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      
                      {comment.poll && (
                        <Link 
                          href={`/polls/${comment.poll_id}`}
                          className="mt-2 inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                          prefetch={false}
                        >
                          <FaArrowRight className="mr-1 w-3 h-3" />
                          "{comment.poll.question}"
                          {comment.poll.region && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({comment.poll.region})
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}