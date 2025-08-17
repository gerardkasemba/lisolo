'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaComment, FaArrowRight, FaExclamationTriangle, FaUser } from 'react-icons/fa';
import Image from 'next/image';

// Reuse the same interfaces you already defined
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

// Utility functions for offline support
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

  useEffect(() => {
    const fetchRecentComments = async () => {
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
          // First fetch the comments
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

          // Get user IDs from comments
          const userIds = commentsData.map(c => c.user_id);
          const pollIds = commentsData.map(c => c.poll_id);

          // Fetch user data from auth.users
          const { data: usersData } = await supabase
            .from('users')
            .select('id, email, user_metadata')
            .in('id', userIds)
            .eq('aud', 'authenticated');

          // Fetch poll data
          const { data: pollsData } = await supabase
            .from('polls')
            .select('id, question, category, region')
            .in('id', pollIds);

          // Combine the data
          const combinedData = commentsData.map(comment => ({
            ...comment,
            user: usersData?.find(u => u.id === comment.user_id),
            poll: pollsData?.find(p => p.id === comment.poll_id)
          }));

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
    };

    fetchRecentComments();

    // Set up realtime subscription for new comments
    const commentsChannel = supabase.channel('recent-comments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      }, async (payload) => {
        if (isOffline) return;
        
        try {
          // Fetch the new comment with user and poll data
          const { data: newCommentData, error: commentError } = await supabase
            .from('comments')
            .select('id, poll_id, user_id, content, created_at')
            .eq('id', payload.new.id)
            .single();

          if (commentError || !newCommentData) return;

          const { data: userData } = await supabase
            .from('users')
            .select('id, email, user_metadata')
            .eq('id', newCommentData.user_id)
            .single();

          const { data: pollData } = await supabase
            .from('polls')
            .select('id, question, category, region')
            .eq('id', newCommentData.poll_id)
            .single();

          const newComment = {
            ...newCommentData,
            user: userData || undefined,
            poll: pollData || undefined
          };

          setComments(prev => {
            const updated = [newComment, ...prev.slice(0, 9)]; // Keep only 10 most recent
            setLocalData('recentComments', updated);
            return updated;
          });
        } catch (error) {
          console.error('Error handling new comment:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [isOffline]);

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
          <FaComment className="mr-2 text-indigo-500" />  Commentaires récents
        </h3>
        
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
        
        {/* {comments.length > 0 && (
          <div className="mt-6 text-center">
            <Link
              href="/comments"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline"
              prefetch={false}
            >
              View all comments <FaArrowRight className="ml-1" />
            </Link>
          </div>
        )} */}
      </div>
    </section>
  );
}