// components/UserActivities.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ActivityFeed from './ActivityFeed';
import PollStats from './PollStats';
import UserInteractions from './UserInteractions';
import type { ActivityItem, PollWithStats } from '@/types/activities';

type ActivityTab = 'activity' | 'polls' | 'interactions';

export default function UserActivities({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<ActivityTab>('activity');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ActivityItem[] | PollWithStats[] | null>(null);

  const isValidUUID = (uuid: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      if (!isValidUUID(userId)) {
        setError("Format de l'identifiant utilisateur non valide");
        setLoading(false);
        return;
      }

      try {
        let response;
        switch (activeTab) {
          case 'activity':
            response = await supabase.rpc('get_user_activities', {
              user_id: userId,
              limit_count: 20,
            });
            break;
          case 'polls':
            response = await supabase.rpc('get_user_polls_with_stats', {
              user_id: userId,
            });
            break;
          case 'interactions':
            response = await supabase.rpc('get_user_interactions', {
              user_id: userId,
              limit_count: 20,
            });
            break;
        }

        if (response.error) throw response.error;
        setData(response.data || null);
      } catch (err) {
        console.error('Erreur de récupération des données:', err);
        setError(err instanceof Error ? err.message : 'Impossible de charger les données');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, userId]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-sm">
          <div className="text-red-600 dark:text-red-300 font-medium">
            Erreur lors du chargement des données
          </div>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 px-4 py-2 rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
          <div className="text-gray-500 dark:text-gray-400 text-lg">
            {activeTab === 'activity' && 'Aucune activité trouvée'}
            {activeTab === 'polls' && 'Aucun sondage créé pour l’instant'}
            {activeTab === 'interactions' && 'Aucune interaction trouvée'}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'activity':
        return <ActivityFeed activities={data as ActivityItem[]} />;
      case 'polls':
        return <PollStats polls={data as PollWithStats[]} />;
      case 'interactions':
        return <UserInteractions interactions={data as ActivityItem[]} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['activity', 'polls'] as ActivityTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === tab
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            } transition-colors`}
            aria-selected={activeTab === tab}
          >
            {tab === 'activity' && 'Activités'}
            {tab === 'polls' && 'Mes sondages'}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {!loading && renderContent()}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-indigo-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}