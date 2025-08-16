'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { FaPoll, FaFilm, FaLandmark, FaMicrochip, FaRunning, FaUtensils, FaPlane, FaHeartbeat, FaGraduationCap, FaTags, FaPlus, FaArrowRight, FaFire, FaChartLine, FaComment, FaMapMarkerAlt, FaVoteYea } from 'react-icons/fa';
import {
  FaTheaterMasks,
  FaMusic,
  FaTshirt,
  FaUsers,
  FaDollarSign,
  FaLeaf,
  FaTractor,
  FaCross,
  FaBook,
  FaHome,
  FaLaugh,
  FaExclamationTriangle
} from 'react-icons/fa';
import RecentCommentsSection from '@/components/RecentCommentsSection';

interface Poll {
  id: number;
  question: string;
  category: string;
  region: string | null;
  options: { text: string; image_url: string | null }[];
  image_url?: string;
  vote_count?: number;
  comment_count?: number;
}

export default function ClientPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [trendingPolls, setTrendingPolls] = useState<Poll[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isOffline, setIsOffline] = useState(!isOnline()); // Moved to top level
  const router = useRouter();

  // Network status event listeners
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

  // Splash screen and data fetching
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    const fetchData = async () => {
      try {
        // Check user session
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Try to get data from localStorage first
        const localPolls = getLocalData<Poll[]>('allPolls');
        const localTrending = getLocalData<Poll[]>('trendingPolls');
        const localCategories = getLocalData<string[]>('categories');

        if (localPolls && localTrending && localCategories) {
          setPolls(localPolls);
          setTrendingPolls(localTrending);
          setCategories(localCategories);
        }

        // If online, fetch fresh data and update localStorage
        if (!isOffline) {
          // Fetch polls
          const { data: pollData, error: pollError } = await supabase
            .from('polls')
            .select('id, question, category, region, options, image_url, created_at')
            .order('created_at', { ascending: false });
          if (pollError) throw new Error(`Poll fetch error: ${pollError.message}`);

          // Fetch comment counts for all polls
          const { data: commentData, error: commentError } = await supabase
            .from('comments')
            .select('poll_id, id')
            .in('poll_id', pollData?.map(poll => poll.id) || []);
          
          if (commentError) throw new Error(`Comment fetch error: ${commentError.message}`);

          // Create a map of poll_id to comment count
          const commentCounts = commentData.reduce((acc, comment) => {
            acc[comment.poll_id] = (acc[comment.poll_id] || 0) + 1;
            return acc;
          }, {} as { [key: number]: number });

          // Add comment_count to each poll
          const pollsWithComments = pollData?.map(poll => ({
            ...poll,
            comment_count: commentCounts[poll.id] || 0
          })) || [];

          setPolls(pollsWithComments);
          setLocalData('allPolls', pollsWithComments);

          // Fetch trending polls (top 3 by vote count in last 7 days)
          const { data: voteData, error: voteError } = await supabase
            .from('votes')
            .select('poll_id')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          if (voteError) throw new Error(`Vote fetch error: ${voteError.message}`);

          const voteCounts = voteData.reduce((acc, vote) => {
            acc[vote.poll_id] = (acc[vote.poll_id] || 0) + 1;
            return acc;
          }, {} as { [key: number]: number });

          const trending = pollsWithComments
            .map((poll) => ({ 
              ...poll, 
              vote_count: voteCounts[poll.id] || 0 
            }))
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
            .slice(0, 3);
          
          setTrendingPolls(trending);
          setLocalData('trendingPolls', trending);

          // Fetch categories
          const uniqueCategories = Array.from(
            new Set(
              pollsWithComments
                .map((poll) => poll.category)
                .filter(Boolean)
            )
          );
          setCategories(uniqueCategories);
          setLocalData('categories', uniqueCategories);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        
        // Fallback to cached data if available
        const localPolls = getLocalData<Poll[]>('allPolls');
        if (localPolls) {
          setPolls(localPolls);
          setTrendingPolls(getLocalData<Poll[]>('trendingPolls') || []);
          setCategories(getLocalData<string[]>('categories') || []);
        }
      } finally {
        setLoading(false);
      }
    };

    const syncPendingChanges = async () => {
      if (isOffline) return;
      
      const changes = getPendingChanges();
      if (changes.length === 0) return;

      try {
        for (const change of changes) {
          switch (change.type) {
            case 'newPoll':
              await supabase.from('polls').insert(change.payload);
              break;
            case 'updatedPoll':
              await supabase.from('polls').update(change.payload).eq('id', change.payload.id);
              break;
            case 'deletedPoll':
              await supabase.from('polls').delete().eq('id', change.payload.id);
              break;
          }
        }
        clearPendingChanges();
        await fetchData();
      } catch (error) {
        console.error('Error syncing pending changes:', error);
      }
    };

    fetchData();

    const pollsChannel = supabase.channel('polls-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls'
      }, async (payload) => {
        if (!isOffline) {
          await fetchData();
        } else {
          addPendingChange({
            type: `${payload.eventType}Poll`,
            payload: payload.eventType === 'DELETE' ? payload.old : payload.new
          });
        }
      })
      .subscribe();

    if (!isOffline) {
      syncPendingChanges();
    }

    return () => {
      clearTimeout(splashTimer);
      supabase.removeChannel(pollsChannel);
    };
  }, [isOffline]);

  // Rest of your component (splash screen, loading, error, and JSX) remains unchanged
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="animate-pulse">
          <div className="bg-indigo-600 p-4 rounded-xl shadow-lg">
            <FaPoll className="text-white text-6xl" />
          </div>
        </div>
        <h1 className="mt-6 text-3xl font-bold text-indigo-600">Lisolo</h1>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-700 dark:text-red-300">
          <p className="font-medium text-lg">Erreur</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 px-4 py-2 rounded"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900 dark:text-white">
      {/* Rest of your JSX remains unchanged */}
      <section className="bg-indigo-50 dark:bg-gray-800 py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              La Voix du Peuple
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-base md:text-lg text-gray-600 dark:text-gray-300">
              Participez aux tendances qui façonnent notre communauté
            </p>
          </div>
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              'Divertissement',
              'Politique',
              'Polémique',
              'Technologie',
              'Sports',
              'Cuisine',
              'Voyages',
              'Santé',
              'Éducation',
              'Culture',
              'Musique',
              'Mode',
              'Société',
              'Économie',
              'Environnement',
              'Agriculture',
              'Religion',
              'Histoire',
              'Vie quotidienne',
              'Humour',
            ]
              .sort(() => Math.random() - 0.5) // Shuffle the array
              .slice(0, 8) // Take the first 8 elements
              .map((category) => (
                <Link
                  key={category}
                  href={`/category/${encodeURIComponent(category)}`}
                  className="bg-white dark:bg-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 text-center group border border-gray-100 dark:border-gray-600"
                >
                  <div className={`mx-auto ${getCategoryColor(category).bg} w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors`}>
                    {getCategoryIcon(category)}
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">{category}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getCategoryDescription(category)}</p>
                </Link>
              ))}
          </div>
          <div className="md:hidden pb-2">
            <div className="flex overflow-x-auto gap-3 px-1 py-2 -mx-1 snap-x snap-mandatory" role="region" aria-label="Carrousel de catégories">
              {['Divertissement', 'Politique', 'Technologie', 'Sports', 'Cuisine', 'Voyages', 'Santé', 'Éducation'].map((category) => (
                <Link
                  key={category}
                  href={`/category/${encodeURIComponent(category)}`}
                  className="flex-shrink-0 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-xs hover:shadow-sm p-4 text-center border border-gray-100 dark:border-gray-600 snap-center"
                >
                  <div className={`mx-auto ${getCategoryColor(category).bg} w-10 h-10 rounded-full flex items-center justify-center mb-2`}>
                    {getCategoryIcon(category, 'sm')}
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 dark:text-white">{category}</h3>
                </Link>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, repeat: 3, repeatType: 'reverse' }}
              className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center"
              aria-label="Instruction pour glisser"
            >
              <FaArrowRight className="mr-2 w-4 h-4" aria-hidden="true" />
              Glissez pour voir plus
            </motion.div>
          </div>
          <div className="text-center mt-10">
            <Link
              href={user ? '/auth/create' : '/auth/login'}
              className="inline-flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
            >
              <FaPlus className="mr-2" />
              {user ? 'Créer un sondage' : 'Commencer maintenant'}
            </Link>
          </div>
        </div>
      </section>
      <section className="py-8 md:py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl md:text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
            <FaFire className="text-orange-500 mr-2" /> Sondages tendances
          </h3>
          {trendingPolls.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-600 dark:text-gray-300">Aucun sondage tendance pour le moment.</p>
              <Link href="/creer-sondage" className="mt-3 inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Soyez le premier à créer un sondage
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {trendingPolls.map((poll) => (
                <Link key={poll.id} href={`/polls/${poll.id}`} className="group block transition-transform hover:scale-[1.02] active:scale-100">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all h-full flex flex-col">
                    <div className="flex items-start p-4 gap-3 border-b border-gray-100 dark:border-gray-700">
                      {poll.image_url && (
                        <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 relative">
                          <Image src={poll.image_url} alt={poll.question} fill className="object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white line-clamp-2">{poll.question}</h4>
                        <div className="flex flex-wrap items-center mt-2 gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center">
                            <FaChartLine className="mr-1" /> {poll.vote_count || 0} votes
                          </span>
                          <span className="inline-flex items-center">
                            <FaComment className="mr-1" /> {poll.comment_count || 0} commentaires
                          </span>
                          <span>{poll.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options de réponse:</h5>
                      {poll.options.slice(0, 3).map((option, idx) => (
                        <div key={idx} className="flex items-start">
                          <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-green-500' : idx === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 break-words">{option.text}</span>
                        </div>
                      ))}
                      {poll.options.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-5">+{poll.options.length - 3} autres réponses...</div>
                      )}
                    </div>
                    <div className="mt-auto p-4 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <FaMapMarkerAlt className="mr-1" /> {poll.region || 'Toutes régions'}
                      </span>
                      <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full flex items-center">
                        <FaVoteYea className="mr-1" /> Voter
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <RecentCommentsSection />
    </div>
  );
}

// Helper functions (unchanged)
function getLocalData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

function removeLocalData(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

function getPendingChanges(): Array<{ type: string; payload: any; timestamp: number }> {
  return getLocalData('pendingChanges') || [];
}

function addPendingChange(change: { type: string; payload: any }): void {
  const changes = getPendingChanges();
  changes.push({ ...change, timestamp: Date.now() });
  setLocalData('pendingChanges', changes);
}

function clearPendingChanges(): void {
  removeLocalData('pendingChanges');
}

function getCategoryIcon(category: string, size: string = 'md') {
  const className = size === 'sm' ? 'text-lg' : 'text-xl';
  switch (category) {
    case 'Divertissement': return <FaFilm className={`${className} text-purple-500`} />;
    case 'Politique': return <FaLandmark className={`${className} text-blue-500`} />;
    case 'Polémique': return <FaExclamationTriangle className={`${className} text-orange-500`} />;
    case 'Technologie': return <FaMicrochip className={`${className} text-indigo-500`} />;
    case 'Sports': return <FaRunning className={`${className} text-green-500`} />;
    case 'Cuisine': return <FaUtensils className={`${className} text-red-500`} />;
    case 'Voyages': return <FaPlane className={`${className} text-yellow-500`} />;
    case 'Santé': return <FaHeartbeat className={`${className} text-pink-500`} />;
    case 'Éducation': return <FaGraduationCap className={`${className} text-blue-400`} />;
    case 'Culture': return <FaTheaterMasks className={`${className} text-teal-500`} />;
    case 'Musique': return <FaMusic className={`${className} text-violet-500`} />;
    case 'Mode': return <FaTshirt className={`${className} text-rose-500`} />;
    case 'Société': return <FaUsers className={`${className} text-gray-500`} />;
    case 'Économie': return <FaDollarSign className={`${className} text-blue-600`} />;
    case 'Environnement': return <FaLeaf className={`${className} text-green-600`} />;
    case 'Agriculture': return <FaTractor className={`${className} text-lime-500`} />;
    case 'Religion': return <FaCross className={`${className} text-amber-500`} />;
    case 'Histoire': return <FaBook className={`${className} text-brown-500`} />;
    case 'Vie quotidienne': return <FaHome className={`${className} text-blue-300`} />;
    case 'Humour': return <FaLaugh className={`${className} text-yellow-400`} />;
    default: return <FaTags className={`${className} text-gray-500`} />;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'Divertissement': return { bg: 'bg-purple-100 dark:bg-purple-900/20' };
    case 'Politique': return { bg: 'bg-blue-100 dark:bg-blue-900/20' };
    case 'Polémique': return { bg: 'bg-orange-100 dark:bg-orange-900/20' };
    case 'Technologie': return { bg: 'bg-indigo-100 dark:bg-indigo-900/20' };
    case 'Sports': return { bg: 'bg-green-100 dark:bg-green-900/20' };
    case 'Cuisine': return { bg: 'bg-red-100 dark:bg-red-900/20' };
    case 'Voyages': return { bg: 'bg-yellow-100 dark:bg-yellow-900/20' };
    case 'Santé': return { bg: 'bg-pink-100 dark:bg-pink-900/20' };
    case 'Éducation': return { bg: 'bg-blue-50 dark:bg-blue-900/30' };
    case 'Culture': return { bg: 'bg-teal-100 dark:bg-teal-900/20' };
    case 'Musique': return { bg: 'bg-violet-100 dark:bg-violet-900/20' };
    case 'Mode': return { bg: 'bg-rose-100 dark:bg-rose-900/20' };
    case 'Société': return { bg: 'bg-gray-100 dark:bg-gray-900/20' };
    case 'Économie': return { bg: 'bg-blue-200 dark:bg-blue-800/20' };
    case 'Environnement': return { bg: 'bg-green-200 dark:bg-green-800/20' };
    case 'Agriculture': return { bg: 'bg-lime-100 dark:bg-lime-900/20' };
    case 'Religion': return { bg: 'bg-amber-100 dark:bg-amber-900/20' };
    case 'Histoire': return { bg: 'bg-brown-100 dark:bg-brown-900/20' };
    case 'Vie quotidienne': return { bg: 'bg-blue-50 dark:bg-blue-800/30' };
    case 'Humour': return { bg: 'bg-yellow-200 dark:bg-yellow-800/20' };
    default: return { bg: 'bg-gray-100 dark:bg-gray-600' };
  }
}

function getCategoryDescription(category: string) {
  switch (category) {
    case 'Divertissement': return 'Films, séries, musique';
    case 'Politique': return 'Actualités et débats';
    case 'Polémique': return 'Sujets qui font débat';
    case 'Technologie': return 'Nouvelles technologies';
    case 'Sports': return 'Tous les sports';
    case 'Cuisine': return 'Recettes et gastronomie';
    case 'Voyages': return 'Destinations et conseils';
    case 'Santé': return 'Bien-être et médecine';
    case 'Éducation': return 'Écoles et apprentissage';
    case 'Culture': return 'Art, littérature, traditions';
    case 'Musique': return 'Nouvelles sorties et concerts';
    case 'Mode': return 'Tendances et style';
    case 'Société': return 'Enjeux et dynamiques sociaux';
    case 'Économie': return 'Marchés et finances';
    case 'Environnement': return 'Écologie et durabilité';
    case 'Agriculture': return 'Techniques agricoles';
    case 'Religion': return 'Croyances et spiritualité';
    case 'Histoire': return 'Événements du passé';
    case 'Vie quotidienne': return 'Astuces pour le quotidien';
    case 'Humour': return 'Blagues et contenu amusant';
    default: return 'Voir les sondages';
  }
}