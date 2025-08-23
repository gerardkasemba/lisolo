'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { FaSlidersH, FaFilm, FaSync, FaLandmark, FaMicrochip, FaRunning, FaUtensils, FaPlane, FaHeartbeat, FaGraduationCap, FaTags, FaPlus, FaArrowRight, FaFire, FaChartLine, FaComment, FaMapMarkerAlt, FaVoteYea } from 'react-icons/fa';
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
            .slice(0, 6);
          
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
          <Image src="/PamojaLogoMain1.svg"
            alt="PamojaKongo Logo"
            width={100}
            height={100}
          />
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

      <section className="py-8 md:py-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative mb-8">
            {/* Main Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {/* Icon with gradient background */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg blur-sm opacity-60"></div>
                  <div className="relative bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-lg flex items-center justify-center shadow-lg">
                    <FaFire className="text-white text-xl" />
                  </div>
                </div>
                
                {/* Title with gradient text */}
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
                    Sondages tendances
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Les sujets les plus populaires en ce moment
                  </p>
                </div>
              </div>

              {/* Interactive Stats and Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                {/* Live indicator */}
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">En direct</span>
                </div>

                {/* View options */}
                {/* <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <FaSlidersH className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <FaSync className="text-gray-600 dark:text-gray-300" />
                  </button>
                </div> */}
              </div>
            </div>

            {/* Sub-header with additional info */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {/* Trending tags */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tendances :</span>
                <div className="flex flex-wrap gap-2">
                  {['Politique', 'Sport', 'Techno', 'Culture'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats counter */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <FaChartLine className="text-green-500" />
                  <span>+24% cette semaine</span>
                </div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-1">
                  <FaUsers className="text-purple-500" />
                  <span>2.4K participants</span>
                </div>
              </div>
            </div>

            {/* Time filter tabs */}
            {/* <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 w-fit">
              {[
                { label: '24h', value: '24h' },
                { label: '7j', value: '7d' },
                { label: '30j', value: '30d' },
                { label: 'Tout', value: 'all' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    tab.value === '24h'
                      ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div> */}

            {/* Decorative elements */}
            <div className="absolute -top-2 -right-2 w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-xl opacity-40"></div>
            <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full blur-xl opacity-30"></div>
          </div>
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
      <section className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-12 md:py-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-100 dark:bg-indigo-900/20 rounded-full -translate-x-36 -translate-y-36 opacity-50"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full translate-x-48 translate-y-48 opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Desktop Grid - Fixed equal sizes */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              'Divertissement',
              'Politique',
              'Technologie',
              'Sports',
              'Cuisine',
              'Voyages',
              'Santé',
              'Éducation',
            ].map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="h-full" // Ensure motion div takes full height
              >
                <Link
                  href={`/category/${encodeURIComponent(category)}`}
                  className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center border border-white/20 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-400 h-full flex flex-col" // Added flex and h-full
                >
                  <div className={`mx-auto ${getCategoryColor(category).bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg flex-shrink-0`}>
                    {getCategoryIcon(category, 'lg')}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-[3rem] flex items-center justify-center">
                    {category}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 flex-grow mb-3">
                    {getCategoryDescription(category)}
                  </p>
                  <div className="text-xs text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                    Explorer →
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mobile Carousel - Fixed equal sizes */}
          <div className="md:hidden mb-8">
            <div className="flex overflow-x-auto gap-4 px-2 py-4 -mx-2 snap-x snap-mandatory scrollbar-hide" role="region" aria-label="Carrousel de catégories">
              {['Divertissement', 'Politique', 'Technologie', 'Sports', 'Cuisine', 'Voyages', 'Santé', 'Éducation'].map((category, index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex-shrink-0 w-36 h-48 snap-center" // Fixed height for mobile
                >
                  <Link
                    href={`/category/${encodeURIComponent(category)}`}
                    className="block bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg p-4 text-center border border-white/20 dark:border-gray-700/50 transition-all duration-300 h-full flex flex-col"
                  >
                    <div className={`mx-auto ${getCategoryColor(category).bg} w-12 h-12 rounded-xl flex items-center justify-center mb-3 flex-shrink-0`}>
                      {getCategoryIcon(category, 'md')}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2 line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                      {category}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 flex-grow">
                      {getCategoryDescription(category)}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center"
              aria-label="Instruction pour glisser"
            >
              <FaArrowRight className="mr-2 w-4 h-4 animate-pulse" aria-hidden="true" />
              Glissez pour explorer
            </motion.div>
          </div>

          {/* Tablet Grid (optional) - Fixed equal sizes */}
          <div className="hidden sm:md:grid md:hidden grid-cols-2 gap-4 mb-12">
            {[
              'Divertissement',
              'Politique',
              'Technologie',
              'Sports',
            ].map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <Link
                  href={`/category/${encodeURIComponent(category)}`}
                  className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-5 text-center border border-white/20 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-400 h-full flex flex-col"
                >
                  <div className={`mx-auto ${getCategoryColor(category).bg} w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg flex-shrink-0`}>
                    {getCategoryIcon(category, 'lg')}
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 min-h-[2.5rem] flex items-center justify-center">
                    {category}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 flex-grow mb-2">
                    {getCategoryDescription(category)}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-center"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 dark:border-gray-700/50">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Votre opinion compte
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Rejoignez la conversation et faites entendre votre voix sur les sujets qui vous passionnent
              </p>
              <Link
                href={user ? '/auth/create' : '/auth/login'}
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <FaPlus className="mr-3 w-5 h-5" />
                {user ? 'Créer un sondage' : 'Commencer maintenant'}
              </Link>
              {!user && (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Inscription rapide et gratuite
                </p>
              )}
            </div>
          </motion.div>
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