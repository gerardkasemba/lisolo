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
    console.error('Erreur de lecture du localStorage:', error);
    return null;
  }
};

const setLocalData = <T,>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Erreur d\'écriture dans le localStorage:', error);
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
  const [newCommentsCount, setNewCommentsCount] = useState(0);

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

  const fetchRecentComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached comments first for immediate display
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
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const pollIds = [...new Set(commentsData.map(c => c.poll_id))];

        // Fetch user data
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, user_metadata')
          .in('id', userIds);

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
        setNewCommentsCount(0); // Reset new comments counter
      }
    } catch (err) {
      console.error('Erreur lors du chargement des commentaires:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue');
      
      // If we have cached comments but fetch failed, use those
      const cachedComments = getLocalData<Comment[]>('recentComments');
      if (cachedComments) {
        setComments(cachedComments);
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    fetchRecentComments();

    // Set up realtime subscription for comments
    const commentsChannel = supabase
      .channel('recent-comments-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        async (payload) => {
          if (isOffline) return;
          
          try {
            // Increment new comments counter for visual feedback
            setNewCommentsCount(prev => prev + 1);

            // Auto-refresh after a short delay to show the new comment
            setTimeout(() => {
              fetchRecentComments();
            }, 1000);
          } catch (error) {
            console.error('Erreur lors de la gestion du nouveau commentaire:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Auto-refresh when a comment is deleted
          setTimeout(() => {
            fetchRecentComments();
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Auto-refresh when a comment is updated
          setTimeout(() => {
            fetchRecentComments();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [isOffline, fetchRecentComments]);

  if (loading) {
    return (
      <section className="py-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl md:text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <FaComment className="mr-2 text-indigo-500" /> Commentaires récents
          </h3>
          <div className="text-center py-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
            <span>Chargement des commentaires...</span>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl md:text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <FaComment className="mr-2 text-indigo-500" /> Commentaires récents
          </h3>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center text-red-600 dark:text-red-300">
              <FaExclamationTriangle className="text-2xl mb-2" />
              <h4 className="font-medium">Erreur de chargement</h4>
              <p className="text-sm mt-2 max-w-md">{error}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaComment className="mr-2 text-indigo-500" /> Commentaires récents
          </h3>
          
          {/* New comments indicator */}
          {newCommentsCount > 0 && (
            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              {newCommentsCount} nouveau{newCommentsCount > 1 ? 'x' : ''}
            </div>
          )}
        </div>

        {isOffline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm text-center">
              Vous êtes hors ligne. Affichage des commentaires en cache.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">Aucun commentaire trouvé</p>
              <Link href="/create-poll" className="mt-3 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Soyez le premier à commenter
              </Link>
            </div>
          ) : (
            comments.map((comment) => {
              const userName = comment.user?.user_metadata?.name || 
                              comment.user?.email?.split('@')[0] || 
                              'Anonyme';
              const avatarUrl = comment.user?.user_metadata?.avatar_url;

              return (
                <div 
                  key={comment.id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={`Avatar de ${userName}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString('fr-FR', {
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
                      
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                      
                      {comment.poll && (
                        <Link 
                          href={`/polls/${comment.poll_id}`}
                          className="mt-3 inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline group"
                          prefetch={false}
                        >
                          <FaArrowRight className="mr-1 w-3 h-3 transition-transform group-hover:translate-x-1" />
                          <span className="max-w-[200px] sm:max-w-xs truncate">
                            "{comment.poll.question}"
                          </span>
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

        {comments.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/polls"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              prefetch={false}
            >
              <FaComment className="mr-2" />
              Voir tous les sondages
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}