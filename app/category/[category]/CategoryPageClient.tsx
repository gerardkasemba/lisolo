// app/category/[category]/CategoryPageClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FiFilter, FiX, FiSliders, FiRefreshCw, FiGlobe, FiList, FiPercent } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { FaVoteYea, FaComment } from 'react-icons/fa';
import { IoMdTime } from 'react-icons/io';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Define categories array
const categories = [
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
];

// Define interfaces for type safety
interface PollOption {
  text: string;
  image_url?: string;
  id?: number;
}

interface Vote {
  option: string;
}

interface Region {
  id: string;
  name: string;
  created_at: string;
}

interface PollOptionWithStats {
  id?: number;
  text: string;
  image_url?: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: number;
  question: string;
  category: string | null;
  region: string | null;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  options: PollOption[];
}

interface PollWithStats extends Poll {
  total_votes: number;
  comment_count: number;
  options: PollOptionWithStats[];
}

// Props for the CategoryPageClient component
interface CategoryPageClientProps {
  category: string;
}

export default function CategoryPageClient({ category }: CategoryPageClientProps) {
  const [polls, setPolls] = useState<PollWithStats[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(decodeURIComponent(category));
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [votePercentage, setVotePercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Fetch regions from Supabase
  const fetchRegions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('regions').select('id, name, created_at');
      if (error) throw new Error(`Regions fetch error: ${error.message}`);
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  }, [supabase]);

  // Fetch polls with vote and comment counts, applying filters
  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('polls')
        .select(
          `
            id,
            question,
            category,
            region,
            image_url,
            created_at,
            updated_at,
            options,
            votes (count),
            comments (count)
          `
        )
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      if (selectedRegion) {
        query = query.eq('region', selectedRegion);
      }

      const { data: pollsData, error: pollsError } = await query;

      if (pollsError) {
        throw new Error(`Poll fetch error: ${pollsError.message}`);
      }

      const pollsWithStats = await Promise.all(
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

          const maxPercentage = Math.max(...optionsWithVotes.map((opt) => opt.percentage), 0);

          return {
            ...poll,
            options: optionsWithVotes,
            total_votes: totalVotes,
            comment_count: poll.comments?.[0]?.count || 0,
            max_percentage: maxPercentage,
          };
        })
      );

      const filteredPolls = pollsWithStats.filter((poll) => poll.max_percentage >= votePercentage);

      setPolls(filteredPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError(error instanceof Error ? error.message : 'Une erreur inconnue est survenue');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedRegion, votePercentage, supabase]);

  // Effect to fetch regions and polls
  useEffect(() => {
    fetchRegions();
    fetchPolls();
  }, [fetchRegions, fetchPolls]);

  // Effect for real-time subscriptions
  useEffect(() => {
    if (!selectedCategory) return;

    const subscription = supabase
      .channel(`polls:category=${selectedCategory}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'polls',
          filter: selectedCategory ? `category=eq.${selectedCategory}` : undefined,
        },
        async (payload) => {
          if (selectedRegion && payload.new.region !== selectedRegion) return;

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

          const maxPercentage = Math.max(
            ...optionsWithVotes.map((opt: PollOptionWithStats) => opt.percentage),
            0
          );

          if (maxPercentage < votePercentage) return;

          setPolls((prev) => [
            {
              id: payload.new.id,
              question: payload.new.question,
              category: payload.new.category,
              region: payload.new.region,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at || new Date().toISOString(),
              options: optionsWithVotes,
              total_votes: totalVotes,
              comment_count: commentData?.[0]?.count || 0,
              max_percentage: maxPercentage,
            } as PollWithStats,
            ...prev.slice(0, 9),
          ]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          setPolls((prev) => {
            const pollIndex = prev.findIndex((p) => p.id === payload.new.poll_id);
            if (pollIndex === -1) return prev;

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
                percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
              }));

              const maxPercentage = Math.max(...updatedOptions.map((opt) => opt.percentage), 0);

              if (maxPercentage < votePercentage) return poll;

              return {
                ...poll,
                options: updatedOptions,
                total_votes: totalVotes,
                max_percentage: maxPercentage,
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
            if (pollIndex === -1) return prev;

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
  }, [selectedCategory, selectedRegion, votePercentage, supabase]);

  // Reset filters to default values
  const resetFilters = () => {
    setSelectedCategory(decodeURIComponent(category));
    setSelectedRegion(null);
    setVotePercentage(0);
  };

  // Render loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-7xl w-full px-4 sm:px-6 lg:px-8 space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-40 w-full bg-gray-200 dark:bg-gray-700 rounded-md mb-4"></div>
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-700 dark:text-red-300 max-w-md w-full">
          <h3 className="font-medium text-lg">Erreur</h3>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 text-sm font-medium rounded-md transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Render main content
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiSliders className="text-indigo-600 dark:text-indigo-400" />
                Filtres avancés
              </h3>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                <FiRefreshCw size={14} />
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label htmlFor="category" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiList size={16} />
                  Catégorie
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value || '')}
                    className="appearance-none block w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiList className="text-gray-400" size={16} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="region" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiGlobe size={16} />
                  Région
                </label>
                <div className="relative">
                  <select
                    id="region"
                    value={selectedRegion || ''}
                    onChange={(e) => setSelectedRegion(e.target.value || null)}
                    className="appearance-none block w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Toutes les régions</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.name}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiGlobe className="text-gray-400" size={16} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="vote-percentage" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiPercent size={16} />
                  Votes minimum ({votePercentage}%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="vote-percentage"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={votePercentage}
                    onChange={(e) => setVotePercentage(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 w-8 text-center">
                    {votePercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="md:hidden fixed bottom-6 right-6 z-10">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
            >
              <FiFilter size={24} />
            </button>
          </div>
          {showMobileFilters && (
            <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
              <div className="w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Filtres
                  </h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FiX size={24} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FiList size={18} />
                      Catégorie
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value || '')}
                      className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Toutes les catégories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FiGlobe size={18} />
                      Région
                    </label>
                    <select
                      value={selectedRegion || ''}
                      onChange={(e) => setSelectedRegion(e.target.value || null)}
                      className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Toutes les régions</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.name}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <FiPercent size={18} />
                      Votes minimum ({votePercentage}%)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={votePercentage}
                        onChange={(e) => setVotePercentage(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={resetFilters}
                    className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw size={16} />
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          )}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Sondages dans la catégorie : {selectedCategory || 'Toutes'}
          </h2>
          {polls.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Aucun sondage correspondant aux critères sélectionnés.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {polls.map((poll) => (
                <Link key={poll.id} href={`/polls/${poll.id}`} className="block h-full">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-4 h-full flex flex-col">
                    <div className="flex gap-4 mb-3 flex-grow min-h-0">
                      {poll.image_url && (
                        <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden">
                          <Image
                            src={poll.image_url}
                            alt={poll.question}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                            {poll.question}
                          </h3>
                          <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full whitespace-nowrap flex-shrink-0">
                            {poll.region || 'Partout'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-2 flex-grow">
                          {poll.options.slice(0, 2).map((option) => (
                            <div key={`${option.id}-${option.text}`} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {option.text}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  {option.percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${option.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                          {poll.options.length > 2 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              +{poll.options.length - 2} autres options...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex space-x-3">
                        <div className="flex items-center">
                          <FaVoteYea className="mr-1 h-3 w-3" />
                          <span>{poll.total_votes}</span>
                        </div>
                        <div className="flex items-center">
                          <FaComment className="mr-1 h-3 w-3" />
                          <span>{poll.comment_count}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <IoMdTime className="mr-1 h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(poll.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}