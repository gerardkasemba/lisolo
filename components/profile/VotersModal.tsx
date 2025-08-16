// components/VotersModal.tsx
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { FaTimes } from 'react-icons/fa';

interface Voter {
  user_id: string;
  email: string;
  username: string | null;
  region_name: string | null;
  voted_at: string;
}

interface VotersModalProps {
  pollId: number;
  votesCount: number;
  trigger: React.ReactNode;
}

export default function VotersModal({ pollId, votesCount, trigger }: VotersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>('all');

  const fetchVoters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_poll_voters', { poll_id: pollId });

      if (error) throw error;

      if (!Array.isArray(data)) {
        throw new Error('Tableau des votants attendu');
      }

      setVoters(
        data.map(voter => ({
          user_id: voter.user_id,
          email: voter.email,
          username: voter.username || voter.email.split('@')[0],
          region_name: voter.region_name || 'Inconnu',
          voted_at: voter.voted_at,
        }))
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des votants:', error);
      setVoters([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setIsOpen(true);
    await fetchVoters();
  };

  // Compute unique regions for filter dropdown
const regions = useMemo(() => {
  const uniqueRegions = Array.from(
    new Set(voters.map(voter => voter.region_name || 'Inconnu'))
  );
  return ['all', ...uniqueRegions.sort()];
}, [voters]);

  // Filter voters based on selected region
  const filteredVoters = useMemo(() => {
    if (regionFilter === 'all') return voters;
    return voters.filter(voter => voter.region_name === regionFilter);
  }, [voters, regionFilter]);

  // Summarize votes per region
  const voteSummary = useMemo(() => {
    const summary = voters.reduce((acc, voter) => {
      const region = voter.region_name || 'Inconnu';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0]));
  }, [voters]);

  // Total number of voters
  const totalVoters = voters.length;

  return (
    <>
      <div onClick={openModal}>{trigger}</div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-8 text-left shadow-2xl transition-all">
                  <div className="flex justify-between items-center mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-2xl font-bold text-gray-900 dark:text-white"
                    >
                      Votants pour ce sondage
                    </Dialog.Title>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      aria-label="Fermer la fenêtre"
                    >
                      <FaTimes className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Total Voters */}
                  <div className="mb-6">
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      Total des votants : {totalVoters}
                    </p>
                  </div>

                  {/* Filter Section */}
                  <div className="mb-6">
                    <label
                      htmlFor="region-filter"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
                    >
                      Filtrer par région
                    </label>
                    <select
                      id="region-filter"
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                    >
                      {regions.map(region => (
                        <option key={region} value={region}>
                          {region === 'all' ? 'Toutes les régions' : region}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vote Summary Section */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Résumé des votes par région
                    </h4>
                    {voteSummary.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400">Aucun vote disponible</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {voteSummary.map(([region, count]) => (
                          <div
                            key={region}
                            className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm"
                          >
                            <span className="text-gray-700 dark:text-gray-200 font-medium">
                              {region}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {count} vote{count > 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Voters List */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Liste des votants
                    </h4>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-b-3 border-indigo-500"></div>
                      </div>
                    ) : filteredVoters.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        Aucune donnée de votants disponible
                      </p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        {filteredVoters.map((voter) => (
                          <div
                            key={`${voter.user_id}-${voter.voted_at}`}
                            className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                ID: {voter.user_id}
                              </p>
                              <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span>{voter.region_name}</span>
                                <span>•</span>
                                <span>
                                  A voté le {new Date(voter.voted_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}